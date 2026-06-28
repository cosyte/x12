/**
 * `get820Payments` — extract a typed {@link X12PremiumPayments} from a
 * parsed X12 `005010X218` transaction set (820 Payroll Deducted and Other
 * Group Premium Payment for Insurance Products). Walk the body segments via
 * a small state machine guided by the dogfooded loop spec (see
 * {@link "./loop-spec.js".PREMIUM_820_LOOP_2000A}). Lenient on parse: every
 * recoverable deviation is preserved verbatim, never thrown. Money is
 * decoded as {@link "../../decimal.js".X12Decimal} (never `parseFloat` —
 * float arithmetic destroys cents on a real-world premium remittance).
 *
 * Spec source: WPC TR3 `005010X218`.
 */

import { X12Decimal } from "../../decimal.js";
import {
  collectElementValues,
  elementDecimal,
  elementDecimalOrZero,
  elementOptional,
  elementValue,
  type X12Segment,
} from "../../parser/segment.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import type { X12ParseWarning } from "../../parser/warnings.js";
import type {
  X12PremiumAddress,
  X12PremiumAdjustment,
  X12PremiumDate,
  X12PremiumEntity,
  X12PremiumOpenItem,
  X12PremiumParty,
  X12PremiumPaymentHeader,
  X12PremiumPayments,
  X12PremiumPerson,
  X12PremiumReference,
  X12PremiumRemittance,
  X12PremiumTrace,
} from "./types.js";

/**
 * Extract a typed {@link X12PremiumPayments} from an 820 transaction set.
 * Pure function — no I/O, no global state. Returns `undefined` only if the
 * input transaction's ST-01 is not `"820"` (mis-routed call); every other
 * deviation is recoverable and the verbatim segments remain on
 * `tx.segments`.
 *
 * @example
 * ```ts
 * import { parseX12, get820Payments } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
 * if (tx !== undefined) {
 *   const prem = get820Payments(ix.delimiters, tx);
 *   prem?.payment.totalPremiumAmount.toString();
 *   for (const r of prem?.remittances ?? []) {
 *     r.openItems[0]?.amountPaid.toString();
 *   }
 * }
 * ```
 */
export function get820Payments(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12PremiumPayments | undefined {
  if (tx.st.elements[1] !== "820") return undefined;

  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);

  let payment: X12PremiumPaymentHeader = EMPTY_HEADER;
  const traces: X12PremiumTrace[] = [];
  let receiver: X12PremiumParty | undefined;
  let remitter: X12PremiumParty | undefined;
  let lastParty: "receiver" | "remitter" | undefined;
  const remittances: RemittanceAccumulator[] = [];
  let current: RemittanceAccumulator | undefined;

  /** Close the in-flight remittance loop. */
  const flushRemittance = (): void => {
    if (current !== undefined) remittances.push(current);
    current = undefined;
  };

  for (let i = 0; i < body.length; i += 1) {
    const seg = body[i];
    if (seg === undefined) continue;
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    void position;
    switch (seg.id) {
      case "BPR": {
        payment = decodeBpr(seg, delimiters);
        break;
      }
      case "TRN": {
        traces.push(decodeTrn(seg, delimiters));
        break;
      }
      case "N1": {
        // A header-level party. Once a remittance loop is open, N1 belongs
        // to that loop's party identification (Loop 2100A) and is preserved
        // verbatim only — the typed surface carries receiver / remitter at
        // the header.
        if (current !== undefined) break;
        const qualifier = elementValue(seg, 1, delimiters);
        const party = decodeN1(seg, delimiters);
        if (qualifier === "PE") {
          receiver = party;
          lastParty = "receiver";
        } else if (qualifier === "PR" || qualifier === "RM") {
          remitter = party;
          lastParty = "remitter";
        } else {
          lastParty = undefined;
        }
        break;
      }
      case "N3": {
        if (current !== undefined) break;
        const lines = collectElementValues(seg, 1, 2, delimiters);
        if (lastParty === "receiver" && receiver !== undefined) {
          receiver = withAddress(receiver, withLines(receiver.address ?? EMPTY_ADDRESS, lines));
        } else if (lastParty === "remitter" && remitter !== undefined) {
          remitter = withAddress(remitter, withLines(remitter.address ?? EMPTY_ADDRESS, lines));
        }
        break;
      }
      case "N4": {
        if (current !== undefined) break;
        const address = decodeN4(seg, delimiters);
        if (lastParty === "receiver" && receiver !== undefined) {
          receiver = withAddress(
            receiver,
            mergeAddress(receiver.address ?? EMPTY_ADDRESS, address),
          );
        } else if (lastParty === "remitter" && remitter !== undefined) {
          remitter = withAddress(
            remitter,
            mergeAddress(remitter.address ?? EMPTY_ADDRESS, address),
          );
        }
        break;
      }
      case "ENT": {
        // Opens an organization-summary remittance loop (Loop 2000A).
        flushRemittance();
        lastParty = undefined;
        current = openRemittance(decodeEnt(seg, delimiters), undefined);
        break;
      }
      case "NM1": {
        // An NM1 immediately after an ENT (no individual, no open items yet)
        // names the party for that organization-summary loop (Loop 2100A).
        // Any other NM1 opens a fresh individual remittance loop.
        const person = decodeNm1(seg, delimiters);
        if (
          current !== undefined &&
          current.individual === undefined &&
          current.openItems.length === 0
        ) {
          current.individual = person;
        } else {
          flushRemittance();
          lastParty = undefined;
          current = openRemittance(undefined, person);
        }
        break;
      }
      case "RMR": {
        if (current === undefined) break;
        const item = decodeRmr(seg, delimiters);
        if (item !== undefined) current.openItems.push(item);
        break;
      }
      case "ADX": {
        if (current === undefined) break;
        const adjustment = decodeAdx(seg, delimiters);
        if (adjustment !== undefined) current.adjustments.push(adjustment);
        break;
      }
      case "REF": {
        const ref = decodeRef(seg, delimiters);
        if (current !== undefined) current.references.push(ref);
        else if (lastParty === "receiver" && receiver !== undefined) {
          receiver = withReference(receiver, ref);
        } else if (lastParty === "remitter" && remitter !== undefined) {
          remitter = withReference(remitter, ref);
        }
        break;
      }
      case "DTM": {
        if (current === undefined) break;
        const date = decodeDtm(seg, delimiters);
        if (date !== undefined) current.dates.push(date);
        break;
      }
      default: {
        // NTE / CUR / PER / RDM / N2 and other optional segments stay on
        // tx.segments verbatim; the v1 typed surface does not enumerate
        // every optional segment.
        break;
      }
    }
  }

  flushRemittance();

  return Object.freeze({
    payment,
    traces: Object.freeze(traces.slice()),
    receiver,
    remitter,
    remittances: Object.freeze(remittances.map(freezeRemittance)),
    warnings: Object.freeze(warnings.slice()),
  });
}

// ---------------------------------------------------------------------------
// Internal accumulator (mutable during the walk, frozen at the end).
// ---------------------------------------------------------------------------

/** Mutable in-flight remittance loop (Loop 2000A / individual). @internal */
interface RemittanceAccumulator {
  readonly entity: X12PremiumEntity | undefined;
  individual: X12PremiumPerson | undefined;
  readonly references: X12PremiumReference[];
  readonly dates: X12PremiumDate[];
  readonly openItems: X12PremiumOpenItem[];
  readonly adjustments: X12PremiumAdjustment[];
}

/** @internal */
function openRemittance(
  entity: X12PremiumEntity | undefined,
  individual: X12PremiumPerson | undefined,
): RemittanceAccumulator {
  return {
    entity,
    individual,
    references: [],
    dates: [],
    openItems: [],
    adjustments: [],
  };
}

/** @internal */
function freezeRemittance(acc: RemittanceAccumulator): X12PremiumRemittance {
  return Object.freeze({
    entity: acc.entity,
    individual: acc.individual,
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
    openItems: Object.freeze(acc.openItems.slice()),
    adjustments: Object.freeze(acc.adjustments.slice()),
  });
}

// ---------------------------------------------------------------------------
// Segment decoders.
// ---------------------------------------------------------------------------

/** @internal */
function decodeBpr(seg: X12Segment, delimiters: Delimiters): X12PremiumPaymentHeader {
  return Object.freeze({
    transactionHandlingCode: elementValue(seg, 1, delimiters),
    totalPremiumAmount: elementDecimalOrZero(seg, 2, delimiters),
    creditDebitFlag: elementValue(seg, 3, delimiters),
    method: elementValue(seg, 4, delimiters),
    paymentFormatCode: elementOptional(seg, 5, delimiters),
    paymentDate: elementValue(seg, 16, delimiters),
  });
}

/** @internal */
function decodeTrn(seg: X12Segment, delimiters: Delimiters): X12PremiumTrace {
  return Object.freeze({
    traceTypeCode: elementValue(seg, 1, delimiters),
    referenceId: elementValue(seg, 2, delimiters),
    originatingCompanyId: elementOptional(seg, 3, delimiters),
    originatingCompanySupplementalCode: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeN1(seg: X12Segment, delimiters: Delimiters): X12PremiumParty {
  return Object.freeze({
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    name: elementValue(seg, 2, delimiters),
    idQualifier: elementOptional(seg, 3, delimiters),
    idCode: elementOptional(seg, 4, delimiters),
    address: undefined,
    references: Object.freeze([]),
  });
}

/** @internal */
function decodeN4(seg: X12Segment, delimiters: Delimiters): X12PremiumAddress {
  return Object.freeze({
    lines: Object.freeze([]),
    city: elementOptional(seg, 1, delimiters),
    state: elementOptional(seg, 2, delimiters),
    postalCode: elementOptional(seg, 3, delimiters),
    countryCode: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeRef(seg: X12Segment, delimiters: Delimiters): X12PremiumReference {
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    value: elementValue(seg, 2, delimiters),
    description: elementOptional(seg, 3, delimiters),
  });
}

/** @internal */
function decodeDtm(seg: X12Segment, delimiters: Delimiters): X12PremiumDate | undefined {
  const value = elementOptional(seg, 2, delimiters);
  if (value === undefined) return undefined;
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    value,
  });
}

/** @internal */
function decodeEnt(seg: X12Segment, delimiters: Delimiters): X12PremiumEntity {
  return Object.freeze({
    assignedNumber: elementOptional(seg, 1, delimiters),
    entityIdentifierCode: elementOptional(seg, 2, delimiters),
    idQualifier: elementOptional(seg, 3, delimiters),
    idCode: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeNm1(seg: X12Segment, delimiters: Delimiters): X12PremiumPerson {
  return Object.freeze({
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    lastName: elementOptional(seg, 3, delimiters),
    firstName: elementOptional(seg, 4, delimiters),
    middleName: elementOptional(seg, 5, delimiters),
    suffix: elementOptional(seg, 7, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
  });
}

/**
 * Decode an RMR open-item reference. RMR-01 reference qualifier, RMR-02
 * reference id, RMR-03 payment action code, RMR-04 amount paid, RMR-05
 * amount due (terms / original). Skipped if neither qualifier nor reference
 * id is present (an RMR with no open-item identity carries no usable line).
 * @internal
 */
function decodeRmr(seg: X12Segment, delimiters: Delimiters): X12PremiumOpenItem | undefined {
  const qualifier = elementValue(seg, 1, delimiters);
  const referenceId = elementValue(seg, 2, delimiters);
  if (qualifier === "" && referenceId === "") return undefined;
  return Object.freeze({
    qualifier,
    referenceId,
    paymentActionCode: elementOptional(seg, 3, delimiters),
    amountPaid: elementDecimalOrZero(seg, 4, delimiters),
    amountDue: elementDecimal(seg, 5, delimiters),
  });
}

/**
 * Decode an ADX adjustment. ADX-01 monetary adjustment (signed), ADX-02
 * adjustment reason code, ADX-03 / ADX-04 optional reference qualifier +
 * id. Skipped if the amount is absent. @internal
 */
function decodeAdx(seg: X12Segment, delimiters: Delimiters): X12PremiumAdjustment | undefined {
  const amount = elementDecimal(seg, 1, delimiters);
  if (amount === undefined) return undefined;
  return Object.freeze({
    amount,
    reasonCode: elementValue(seg, 2, delimiters),
    referenceQualifier: elementOptional(seg, 3, delimiters),
    referenceId: elementOptional(seg, 4, delimiters),
  });
}

// ---------------------------------------------------------------------------
// Party / address mutators (immutable — return a new party with the change).
// ---------------------------------------------------------------------------

const EMPTY_ADDRESS: X12PremiumAddress = Object.freeze({
  lines: Object.freeze([]),
  city: undefined,
  state: undefined,
  postalCode: undefined,
  countryCode: undefined,
});

const EMPTY_HEADER: X12PremiumPaymentHeader = Object.freeze({
  transactionHandlingCode: "",
  totalPremiumAmount: X12Decimal.ZERO,
  creditDebitFlag: "",
  method: "",
  paymentFormatCode: undefined,
  paymentDate: "",
});

/** @internal */
function withAddress(party: X12PremiumParty, address: X12PremiumAddress): X12PremiumParty {
  return Object.freeze({ ...party, address });
}

/** @internal */
function withReference(party: X12PremiumParty, ref: X12PremiumReference): X12PremiumParty {
  return Object.freeze({ ...party, references: Object.freeze([...party.references, ref]) });
}

/** @internal */
function withLines(address: X12PremiumAddress, lines: readonly string[]): X12PremiumAddress {
  return Object.freeze({ ...address, lines: Object.freeze([...address.lines, ...lines]) });
}

/** @internal */
function mergeAddress(base: X12PremiumAddress, fromN4: X12PremiumAddress): X12PremiumAddress {
  return Object.freeze({
    lines: base.lines,
    city: fromN4.city ?? base.city,
    state: fromN4.state ?? base.state,
    postalCode: fromN4.postalCode ?? base.postalCode,
    countryCode: fromN4.countryCode ?? base.countryCode,
  });
}
