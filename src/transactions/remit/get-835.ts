/**
 * `get835` — extract a typed {@link X12Remittance} from a parsed X12
 * 005010X221A1 transaction set. Walk the body segments via a small
 * state machine guided by the dogfooded loop spec (see
 * {@link "./loop-spec.js".REMIT_835_LOOP_2000}). Lenient on parse: every
 * recoverable deviation surfaces as a warning, never a throw. Money is
 * decoded as {@link "../../decimal.js".X12Decimal} (never `parseFloat`).
 * Balance invariants run after the walk and emit
 * `X12_835_REMIT_BALANCE_MISMATCH` on mismatch — the model is NEVER
 * silently rebalanced.
 *
 * Spec source: WPC TR3 `005010X221A1` — Health Care Claim Payment/Advice.
 */

import { X12Decimal } from "../../decimal.js";
import { lookupCarc } from "../../code-lists/carc.js";
import { lookupClpStatus } from "../../code-lists/clp-status.js";
import { lookupRarc } from "../../code-lists/rarc.js";
import { getSegmentValue, type X12Segment } from "../../parser/segment.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import { unknownCarc, unknownRarc, type X12ParseWarning } from "../../parser/warnings.js";
import { checkClaimBalance, checkRemitTotalBalance, checkServiceLineBalance } from "./balance.js";
import type {
  X12RemitAdjustment,
  X12RemitAddress,
  X12RemitAmount,
  X12RemitClaim,
  X12RemitContact,
  X12RemitParty,
  X12RemitPaymentHeader,
  X12RemitPerson,
  X12RemitProvider,
  X12RemitProviderAdjustment,
  X12RemitReference,
  X12RemitRemark,
  X12RemitServiceLine,
  X12RemitTrace,
  X12Remittance,
} from "./types.js";

/**
 * Extract a typed {@link X12Remittance} from an 835 transaction set.
 * Pure function — no I/O, no global state. Returns `undefined` only if
 * the input transaction's ST-01 is not `"835"` (mis-routed call); every
 * other deviation is recoverable and surfaces on `result.warnings`.
 *
 * @example
 * ```ts
 * import { parseX12, get835 } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const group of ix.groups) {
 *   for (const tx of group.transactions) {
 *     if (tx.st.elements[1] !== "835") continue;
 *     const remit = get835(ix.delimiters, tx);
 *     remit?.payment.totalActualPayment.toString();
 *     for (const claim of remit?.claims ?? []) {
 *       claim.totalPaymentAmount.toString();
 *     }
 *   }
 * }
 * ```
 */
export function get835(delimiters: Delimiters, tx: X12TransactionSet): X12Remittance | undefined {
  if (tx.st.elements[1] !== "835") return undefined;

  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);

  // Mutable accumulators — frozen into the returned model at the end.
  let payment: X12RemitPaymentHeader = EMPTY_HEADER;
  const traces: X12RemitTrace[] = [];
  let payer: X12RemitParty | undefined;
  let payee: X12RemitParty | undefined;
  let lastParty: "payer" | "payee" | undefined;
  const claims: ClaimAccumulator[] = [];
  const providerAdjustments: X12RemitProviderAdjustment[] = [];
  let currentClaim: ClaimAccumulator | undefined;
  let currentServiceLine: ServiceLineAccumulator | undefined;
  let currentNm1Provider: NM1ProviderAccumulator | undefined;
  let currentNm1Person: NM1PersonAccumulator | undefined;

  /** Close the in-flight Loop 2110. */
  const flushServiceLine = (): void => {
    if (currentServiceLine !== undefined && currentClaim !== undefined) {
      currentClaim.serviceLines.push(freezeServiceLine(currentServiceLine));
    }
    currentServiceLine = undefined;
  };

  /** Close the in-flight Loop 2100. */
  const flushClaim = (): void => {
    flushServiceLine();
    if (currentClaim !== undefined) {
      claims.push(currentClaim);
    }
    currentClaim = undefined;
  };

  for (let i = 0; i < body.length; i += 1) {
    const seg = body[i];
    if (seg === undefined) continue;
    // 1-based segment position inside the body for warning positional context.
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    switch (seg.id) {
      case "BPR": {
        payment = decodeBpr(seg, delimiters);
        break;
      }
      case "TRN": {
        traces.push(decodeTrn(seg, delimiters));
        break;
      }
      case "CUR":
      case "DTM": {
        if (seg.id === "DTM" && currentServiceLine !== undefined) {
          attachServiceLineDtm(currentServiceLine, seg, delimiters);
        } else if (seg.id === "DTM" && currentClaim !== undefined) {
          attachClaimDtm(currentClaim, seg, delimiters);
        }
        // CUR / header DTM not surfaced on the v1 model — verbatim segment
        // remains on tx.segments for callers who need it.
        break;
      }
      case "N1": {
        // Closing any in-flight claim / NM1 / service-line so a new party
        // opens a clean Loop 1000A/B.
        flushClaim();
        currentNm1Provider = undefined;
        currentNm1Person = undefined;
        const qualifier = el(seg, 1, delimiters);
        const partyAcc: X12RemitParty = decodeN1(seg, delimiters);
        if (qualifier === "PR") {
          payer = partyAcc;
          lastParty = "payer";
        } else if (qualifier === "PE") {
          payee = partyAcc;
          lastParty = "payee";
        } else {
          lastParty = undefined;
        }
        break;
      }
      case "N3": {
        if (currentClaim !== undefined || currentServiceLine !== undefined) break;
        const lines = collectElements(seg, 1, 2, delimiters);
        if (lastParty === "payer" && payer !== undefined) {
          payer = withAddress(payer, withLines(payer.address ?? EMPTY_ADDRESS, lines));
        } else if (lastParty === "payee" && payee !== undefined) {
          payee = withAddress(payee, withLines(payee.address ?? EMPTY_ADDRESS, lines));
        }
        break;
      }
      case "N4": {
        if (currentClaim !== undefined || currentServiceLine !== undefined) break;
        const address = decodeN4(seg, delimiters);
        if (lastParty === "payer" && payer !== undefined) {
          payer = withAddress(payer, mergeAddress(payer.address ?? EMPTY_ADDRESS, address));
        } else if (lastParty === "payee" && payee !== undefined) {
          payee = withAddress(payee, mergeAddress(payee.address ?? EMPTY_ADDRESS, address));
        }
        break;
      }
      case "REF": {
        const ref = decodeRef(seg, delimiters);
        if (currentServiceLine !== undefined) currentServiceLine.references.push(ref);
        else if (currentClaim !== undefined) currentClaim.references.push(ref);
        else if (lastParty === "payer" && payer !== undefined) payer = withReference(payer, ref);
        else if (lastParty === "payee" && payee !== undefined) payee = withReference(payee, ref);
        break;
      }
      case "PER": {
        const contact = decodePer(seg, delimiters);
        if (currentClaim !== undefined || currentServiceLine !== undefined) break;
        if (lastParty === "payer" && payer !== undefined) payer = withContact(payer, contact);
        else if (lastParty === "payee" && payee !== undefined) payee = withContact(payee, contact);
        break;
      }
      case "LX": {
        // Header number — opens Loop 2000. We don't surface LX itself
        // (header-grouping artifact). Flush any straggler.
        flushClaim();
        lastParty = undefined;
        break;
      }
      case "CLP": {
        flushClaim();
        lastParty = undefined;
        currentClaim = openClaim(seg, delimiters);
        currentNm1Provider = undefined;
        currentNm1Person = undefined;
        break;
      }
      case "CAS": {
        const adjustments = decodeCasAdjustments(seg, delimiters, warnings, position);
        if (currentServiceLine !== undefined) {
          for (const a of adjustments) currentServiceLine.adjustments.push(a);
        } else if (currentClaim !== undefined) {
          for (const a of adjustments) currentClaim.adjustments.push(a);
        }
        break;
      }
      case "NM1": {
        if (currentClaim === undefined) break;
        const qualifier = el(seg, 1, delimiters);
        const decoded = decodeNm1(seg, delimiters);
        switch (qualifier) {
          case "QC": {
            currentClaim.patient = decoded.person;
            currentNm1Person = { kind: "patient" };
            break;
          }
          case "IL": {
            currentClaim.subscriber = decoded.person;
            currentNm1Person = { kind: "subscriber" };
            break;
          }
          case "74": {
            currentClaim.correctedPatient = decoded.person;
            currentNm1Person = { kind: "correctedPatient" };
            break;
          }
          case "82": {
            // Per X221A1: NM1*82 in Loop 2100 is the Service Provider
            // (rendering / billing). The Phase 4 model exposes
            // `serviceProvider` directly; if a payer sends a second NM1*82
            // (rare) it is treated as `renderingProvider` so neither value
            // is silently dropped.
            if (currentClaim.serviceProvider === undefined) {
              currentClaim.serviceProvider = decoded.provider;
            } else {
              currentClaim.renderingProvider = decoded.provider;
            }
            currentNm1Provider = { kind: "serviceProvider" };
            break;
          }
          default: {
            // Other NM1 qualifiers (TT crossover carrier, PR other payer,
            // GB / GR / 77 — service location): verbatim segment stays on
            // tx.segments; the typed v1 surface does not enumerate them
            // (additive in later phases).
            currentNm1Person = undefined;
            currentNm1Provider = undefined;
            break;
          }
        }
        break;
      }
      case "MIA":
      case "MOA": {
        // Inpatient / outpatient adjudication info. Decode their RARC
        // codes onto the claim's `remarks` list (`system: "HE"`); the
        // verbatim MIA / MOA payment-amount fields are not surfaced on
        // the v1 model (additive later).
        if (currentClaim === undefined) break;
        const remarks =
          seg.id === "MIA"
            ? collectMiaRemarks(seg, delimiters)
            : collectMoaRemarks(seg, delimiters);
        for (const code of remarks) {
          const entry = lookupRarc(code);
          if (entry === undefined) warnings.push(unknownRarc(position, code));
          currentClaim.remarks.push({ system: "HE", code, description: entry?.description });
        }
        break;
      }
      case "AMT": {
        const amount = decodeAmt(seg, delimiters);
        if (amount === undefined) break;
        if (currentServiceLine !== undefined) currentServiceLine.amounts.push(amount);
        else if (currentClaim !== undefined) currentClaim.amounts.push(amount);
        break;
      }
      case "QTY": {
        // Surfaced verbatim on tx.segments; v1 helper does not destructure
        // QTY-2 quantities (additive later).
        break;
      }
      case "LQ": {
        if (currentClaim === undefined && currentServiceLine === undefined) break;
        const remark = decodeLq(seg, delimiters, warnings, position);
        if (remark === undefined) break;
        if (currentServiceLine !== undefined) currentServiceLine.remarks.push(remark);
        else if (currentClaim !== undefined) currentClaim.remarks.push(remark);
        break;
      }
      case "SVC": {
        flushServiceLine();
        currentServiceLine = openServiceLine(seg, delimiters);
        break;
      }
      case "PLB": {
        flushClaim();
        for (const p of decodePlb(seg, delimiters)) providerAdjustments.push(p);
        break;
      }
      default: {
        // Anything else (NTE header notes, RDM, TS3/TS2) is preserved on
        // tx.segments verbatim; the v1 helper does not enumerate every
        // optional segment.
        break;
      }
    }
    void currentNm1Provider;
    void currentNm1Person;
  }

  flushClaim();

  // Freeze the claim accumulators into the public read-only shape, then
  // run the three balance invariants.
  const finalClaims = claims.map((c, idx) => {
    const frozen = freezeClaim(c);
    const claimPos: X12Position = { segmentIndex: c.clpSegmentIndex, transactionIndex: 0 };
    const claimWarn = checkClaimBalance(frozen, claimPos);
    if (claimWarn !== undefined) warnings.push(claimWarn);
    for (const lineWarn of checkServiceLineBalance(frozen, claimPos)) warnings.push(lineWarn);
    void idx;
    return frozen;
  });
  const remitTotalWarn = checkRemitTotalBalance(
    payment.totalActualPayment,
    finalClaims,
    providerAdjustments,
    { segmentIndex: 0, transactionIndex: 0 },
  );
  if (remitTotalWarn !== undefined) warnings.push(remitTotalWarn);

  return Object.freeze({
    payment,
    traces: Object.freeze(traces.slice()),
    payer,
    payee,
    claims: Object.freeze(finalClaims),
    providerAdjustments: Object.freeze(providerAdjustments.slice()),
    warnings: Object.freeze(warnings.slice()),
  });
}

// ---------------------------------------------------------------------------
// Internal accumulator types (mutable during the walk, frozen at the end).
// ---------------------------------------------------------------------------

/** Mutable in-flight Loop 2100 state. @internal */
interface ClaimAccumulator {
  readonly clpSegmentIndex: number;
  readonly patientControlNumber: string;
  readonly claimStatusCode: string;
  readonly claimStatusDescription: string | undefined;
  readonly totalChargeAmount: X12Decimal;
  readonly totalPaymentAmount: X12Decimal;
  readonly patientResponsibilityAmount: X12Decimal;
  readonly claimFilingIndicatorCode: string | undefined;
  readonly payerClaimControlNumber: string | undefined;
  readonly facilityTypeCode: string | undefined;
  readonly claimFrequencyCode: string | undefined;
  patient: X12RemitPerson | undefined;
  subscriber: X12RemitPerson | undefined;
  correctedPatient: X12RemitPerson | undefined;
  serviceProvider: X12RemitProvider | undefined;
  renderingProvider: X12RemitProvider | undefined;
  servicePeriodStart: string | undefined;
  servicePeriodEnd: string | undefined;
  readonly adjustments: X12RemitAdjustment[];
  readonly references: X12RemitReference[];
  readonly amounts: X12RemitAmount[];
  readonly remarks: X12RemitRemark[];
  readonly serviceLines: X12RemitServiceLine[];
}

/** Mutable in-flight Loop 2110 state. @internal */
interface ServiceLineAccumulator {
  readonly productServiceIdQualifier: string;
  readonly productServiceId: string;
  readonly modifiers: string[];
  readonly chargeAmount: X12Decimal;
  readonly paymentAmount: X12Decimal;
  readonly revenueCode: string | undefined;
  readonly paidUnitsOfService: X12Decimal | undefined;
  readonly originalServiceId: string | undefined;
  readonly originalServiceIdQualifier: string | undefined;
  serviceDateStart: string | undefined;
  serviceDateEnd: string | undefined;
  readonly adjustments: X12RemitAdjustment[];
  readonly references: X12RemitReference[];
  readonly amounts: X12RemitAmount[];
  readonly remarks: X12RemitRemark[];
}

/** Marker for the active NM1 person role (used only by the state machine, not surfaced). @internal */
interface NM1PersonAccumulator {
  readonly kind: "patient" | "subscriber" | "correctedPatient";
}
/** Marker for the active NM1 provider role. @internal */
interface NM1ProviderAccumulator {
  readonly kind: "serviceProvider" | "renderingProvider";
}

// ---------------------------------------------------------------------------
// Segment decoders.
// ---------------------------------------------------------------------------

/** Read element n (1-indexed); return "" if missing. @internal */
function el(seg: X12Segment, n: number, delimiters: Delimiters): string {
  return getSegmentValue(seg, String(n).padStart(2, "0"), delimiters) ?? "";
}
/** Read element n (1-indexed); return undefined if missing or empty. @internal */
function elOpt(seg: X12Segment, n: number, delimiters: Delimiters): string | undefined {
  const v = getSegmentValue(seg, String(n).padStart(2, "0"), delimiters);
  return v === undefined || v === "" ? undefined : v;
}
/** Read composite component p of element n (both 1-indexed). @internal */
function elComp(seg: X12Segment, n: number, p: number, delimiters: Delimiters): string | undefined {
  const v = getSegmentValue(seg, `${String(n).padStart(2, "0")}-${String(p)}`, delimiters);
  return v === undefined || v === "" ? undefined : v;
}
/** Read element n as X12Decimal; undefined if missing/empty/malformed. @internal */
function elDec(seg: X12Segment, n: number, delimiters: Delimiters): X12Decimal | undefined {
  const raw = elOpt(seg, n, delimiters);
  if (raw === undefined) return undefined;
  return X12Decimal.fromString(raw);
}
/** Read element n as X12Decimal, defaulting to ZERO when absent/malformed. @internal */
function elDecZero(seg: X12Segment, n: number, delimiters: Delimiters): X12Decimal {
  return elDec(seg, n, delimiters) ?? X12Decimal.ZERO;
}
/** Collect non-empty elements between start..end inclusive (1-indexed). @internal */
function collectElements(
  seg: X12Segment,
  start: number,
  end: number,
  delimiters: Delimiters,
): string[] {
  const out: string[] = [];
  for (let i = start; i <= end; i += 1) {
    const v = elOpt(seg, i, delimiters);
    if (v !== undefined) out.push(v);
  }
  return out;
}

/** @internal */
function decodeBpr(seg: X12Segment, delimiters: Delimiters): X12RemitPaymentHeader {
  return Object.freeze({
    transactionHandlingCode: el(seg, 1, delimiters),
    totalActualPayment: elDecZero(seg, 2, delimiters),
    creditDebitFlag: el(seg, 3, delimiters),
    method: el(seg, 4, delimiters),
    paymentFormatCode: elOpt(seg, 5, delimiters),
    paymentDate: el(seg, 16, delimiters),
  });
}

/** @internal */
function decodeTrn(seg: X12Segment, delimiters: Delimiters): X12RemitTrace {
  return Object.freeze({
    traceTypeCode: el(seg, 1, delimiters),
    referenceId: el(seg, 2, delimiters),
    originatingCompanyId: elOpt(seg, 3, delimiters),
    originatingCompanySupplementalCode: elOpt(seg, 4, delimiters),
  });
}

/** @internal */
function decodeN1(seg: X12Segment, delimiters: Delimiters): X12RemitParty {
  return Object.freeze({
    entityIdentifierCode: el(seg, 1, delimiters),
    name: el(seg, 2, delimiters),
    idQualifier: elOpt(seg, 3, delimiters),
    idCode: elOpt(seg, 4, delimiters),
    address: undefined,
    additionalIdentifiers: Object.freeze([]),
    contacts: Object.freeze([]),
  });
}

/** @internal */
function decodeN4(seg: X12Segment, delimiters: Delimiters): X12RemitAddress {
  return Object.freeze({
    lines: Object.freeze([]),
    city: elOpt(seg, 1, delimiters),
    state: elOpt(seg, 2, delimiters),
    postalCode: elOpt(seg, 3, delimiters),
    countryCode: elOpt(seg, 4, delimiters),
  });
}

/** @internal */
function decodeRef(seg: X12Segment, delimiters: Delimiters): X12RemitReference {
  return Object.freeze({
    qualifier: el(seg, 1, delimiters),
    value: el(seg, 2, delimiters),
    description: elOpt(seg, 3, delimiters),
  });
}

/** @internal */
function decodePer(seg: X12Segment, delimiters: Delimiters): X12RemitContact {
  const comms: { qualifier: string; value: string }[] = [];
  for (const [qIdx, vIdx] of [
    [3, 4],
    [5, 6],
    [7, 8],
  ] as const) {
    const q = elOpt(seg, qIdx, delimiters);
    const v = elOpt(seg, vIdx, delimiters);
    if (q !== undefined && v !== undefined) comms.push(Object.freeze({ qualifier: q, value: v }));
  }
  return Object.freeze({
    contactFunctionCode: el(seg, 1, delimiters),
    name: elOpt(seg, 2, delimiters),
    communications: Object.freeze(comms),
  });
}

/** @internal */
function decodeAmt(seg: X12Segment, delimiters: Delimiters): X12RemitAmount | undefined {
  const amount = elDec(seg, 2, delimiters);
  if (amount === undefined) return undefined;
  return Object.freeze({
    qualifier: el(seg, 1, delimiters),
    amount,
  });
}

/** @internal */
function decodeLq(
  seg: X12Segment,
  delimiters: Delimiters,
  warnings: X12ParseWarning[],
  position: X12Position,
): X12RemitRemark | undefined {
  const system = el(seg, 1, delimiters);
  const code = el(seg, 2, delimiters);
  if (code === "") return undefined;
  let description: string | undefined;
  if (system === "HE") {
    const entry = lookupRarc(code);
    if (entry === undefined) warnings.push(unknownRarc(position, code));
    description = entry?.description;
  }
  return Object.freeze({ system, code, description });
}

/** @internal */
function collectMiaRemarks(seg: X12Segment, delimiters: Delimiters): readonly string[] {
  // MIA-05, MIA-20: remark codes (per TR3 X221A1).
  const out: string[] = [];
  for (const idx of [5, 20]) {
    const v = elOpt(seg, idx, delimiters);
    if (v !== undefined) out.push(v);
  }
  return out;
}

/** @internal */
function collectMoaRemarks(seg: X12Segment, delimiters: Delimiters): readonly string[] {
  // MOA-03 through MOA-07: remark codes.
  const out: string[] = [];
  for (let idx = 3; idx <= 7; idx += 1) {
    const v = elOpt(seg, idx, delimiters);
    if (v !== undefined) out.push(v);
  }
  return out;
}

/**
 * Decode a CAS segment into 1-6 flat adjustments. CAS carries
 * `CAS-01` group code + up to 6 (reason / amount / quantity) triples at
 * positions (2,3,4), (5,6,7), (8,9,10), (11,12,13), (14,15,16),
 * (17,18,19). Any triple whose reason+amount are BOTH absent is skipped.
 * @internal
 */
function decodeCasAdjustments(
  seg: X12Segment,
  delimiters: Delimiters,
  warnings: X12ParseWarning[],
  position: X12Position,
): readonly X12RemitAdjustment[] {
  const groupCode = el(seg, 1, delimiters);
  const out: X12RemitAdjustment[] = [];
  for (let triple = 0; triple < 6; triple += 1) {
    const base = 2 + triple * 3;
    const reasonCode = elOpt(seg, base, delimiters);
    const amount = elDec(seg, base + 1, delimiters);
    const quantity = elDec(seg, base + 2, delimiters);
    if (reasonCode === undefined && amount === undefined) continue;
    const code = reasonCode ?? "";
    const entry = code === "" ? undefined : lookupCarc(code);
    if (entry === undefined && code !== "") warnings.push(unknownCarc(position, code));
    out.push(
      Object.freeze({
        groupCode,
        reasonCode: code,
        reasonDescription: entry?.description,
        amount: amount ?? X12Decimal.ZERO,
        quantity,
      }),
    );
  }
  return out;
}

/** Decoded NM1 split into person + provider shapes; caller picks. @internal */
function decodeNm1(
  seg: X12Segment,
  delimiters: Delimiters,
): { person: X12RemitPerson; provider: X12RemitProvider } {
  const entityIdentifierCode = el(seg, 1, delimiters);
  const entityTypeQualifier = el(seg, 2, delimiters);
  const lastOrOrg = elOpt(seg, 3, delimiters);
  const firstName = elOpt(seg, 4, delimiters);
  const middleName = elOpt(seg, 5, delimiters);
  const suffix = elOpt(seg, 7, delimiters);
  const idQualifier = elOpt(seg, 8, delimiters);
  const idCode = elOpt(seg, 9, delimiters);
  void entityTypeQualifier;
  return {
    person: Object.freeze({
      entityIdentifierCode,
      lastName: lastOrOrg,
      firstName,
      middleName,
      suffix,
      idQualifier,
      idCode,
    }),
    provider: Object.freeze({
      entityIdentifierCode,
      name: lastOrOrg,
      idQualifier,
      idCode,
    }),
  };
}

/**
 * Open a fresh Loop 2100 accumulator from a CLP segment. CLP-02 status
 * code description comes from the bundled snapshot (or `undefined`); the
 * verbatim status code is always preserved. @internal
 */
function openClaim(seg: X12Segment, delimiters: Delimiters): ClaimAccumulator {
  const claimStatusCode = el(seg, 2, delimiters);
  const claimStatusDescription = lookupClpStatus(claimStatusCode)?.description;
  const facilityTypeCode = elComp(seg, 8, 1, delimiters) ?? elOpt(seg, 8, delimiters);
  const claimFrequencyCode = elComp(seg, 8, 3, delimiters);
  return {
    clpSegmentIndex: 0, // populated in the future when we surface positions
    patientControlNumber: el(seg, 1, delimiters),
    claimStatusCode,
    claimStatusDescription,
    totalChargeAmount: elDecZero(seg, 3, delimiters),
    totalPaymentAmount: elDecZero(seg, 4, delimiters),
    patientResponsibilityAmount: elDecZero(seg, 5, delimiters),
    claimFilingIndicatorCode: elOpt(seg, 6, delimiters),
    payerClaimControlNumber: elOpt(seg, 7, delimiters),
    facilityTypeCode,
    claimFrequencyCode,
    patient: undefined,
    subscriber: undefined,
    correctedPatient: undefined,
    serviceProvider: undefined,
    renderingProvider: undefined,
    servicePeriodStart: undefined,
    servicePeriodEnd: undefined,
    adjustments: [],
    references: [],
    amounts: [],
    remarks: [],
    serviceLines: [],
  };
}

/** Open a fresh Loop 2110 accumulator from an SVC segment. @internal */
function openServiceLine(seg: X12Segment, delimiters: Delimiters): ServiceLineAccumulator {
  const productServiceIdQualifier = elComp(seg, 1, 1, delimiters) ?? "";
  const productServiceId = elComp(seg, 1, 2, delimiters) ?? "";
  const modifiers: string[] = [];
  for (let comp = 3; comp <= 6; comp += 1) {
    const m = elComp(seg, 1, comp, delimiters);
    if (m !== undefined) modifiers.push(m);
  }
  const revenueCode = elOpt(seg, 5, delimiters);
  const paidUnitsOfService = elDec(seg, 7, delimiters);
  const originalServiceIdQualifier = elComp(seg, 6, 1, delimiters);
  const originalServiceId = elComp(seg, 6, 2, delimiters);
  return {
    productServiceIdQualifier,
    productServiceId,
    modifiers,
    chargeAmount: elDecZero(seg, 2, delimiters),
    paymentAmount: elDecZero(seg, 3, delimiters),
    revenueCode,
    paidUnitsOfService,
    originalServiceId,
    originalServiceIdQualifier,
    serviceDateStart: undefined,
    serviceDateEnd: undefined,
    adjustments: [],
    references: [],
    amounts: [],
    remarks: [],
  };
}

/**
 * Attach a DTM to the in-flight claim. DTM-01 qualifier `232` =
 * Statement From, `233` = Statement To. @internal
 */
function attachClaimDtm(claim: ClaimAccumulator, seg: X12Segment, delimiters: Delimiters): void {
  const qualifier = el(seg, 1, delimiters);
  const date = elOpt(seg, 2, delimiters);
  if (date === undefined) return;
  if (qualifier === "232") claim.servicePeriodStart = date;
  else if (qualifier === "233") claim.servicePeriodEnd = date;
}

/**
 * Attach a DTM to the in-flight service line. DTM-01 qualifier `472` =
 * Service date (single), `150`/`151` = Service Period Start/End. @internal
 */
function attachServiceLineDtm(
  line: ServiceLineAccumulator,
  seg: X12Segment,
  delimiters: Delimiters,
): void {
  const qualifier = el(seg, 1, delimiters);
  const formatQualifier = el(seg, 3, delimiters);
  const date = elOpt(seg, 2, delimiters) ?? elOpt(seg, 4, delimiters);
  if (date === undefined) return;
  void formatQualifier;
  if (qualifier === "472" || qualifier === "150") line.serviceDateStart = date;
  if (qualifier === "472" || qualifier === "151") line.serviceDateEnd = date;
}

/**
 * Decode a PLB segment into a list of flat provider-level adjustments.
 * PLB-01 = provider ID, PLB-02 = fiscal period date (CCYYMMDD). PLB-03
 * through PLB-14 carry up to 6 (composite reason + amount) pairs, with
 * each composite carrying reason-code + optional reference identifier
 * across two components. @internal
 */
function decodePlb(seg: X12Segment, delimiters: Delimiters): readonly X12RemitProviderAdjustment[] {
  const providerId = el(seg, 1, delimiters);
  const fiscalPeriodDate = el(seg, 2, delimiters);
  const out: X12RemitProviderAdjustment[] = [];
  for (let pair = 0; pair < 6; pair += 1) {
    const composite = 3 + pair * 2;
    const amount = elDec(seg, composite + 1, delimiters);
    const reasonCode = elComp(seg, composite, 1, delimiters);
    const subCode = elComp(seg, composite, 2, delimiters);
    if (amount === undefined && reasonCode === undefined) continue;
    out.push(
      Object.freeze({
        providerId,
        fiscalPeriodDate,
        reasonCode: reasonCode ?? "",
        subCode,
        amount: amount ?? X12Decimal.ZERO,
      }),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Address / party mutators (immutable — return a new party with the change).
// ---------------------------------------------------------------------------

const EMPTY_ADDRESS: X12RemitAddress = Object.freeze({
  lines: Object.freeze([]),
  city: undefined,
  state: undefined,
  postalCode: undefined,
  countryCode: undefined,
});

const EMPTY_HEADER: X12RemitPaymentHeader = Object.freeze({
  transactionHandlingCode: "",
  totalActualPayment: X12Decimal.ZERO,
  creditDebitFlag: "",
  method: "",
  paymentFormatCode: undefined,
  paymentDate: "",
});

/** @internal */
function withAddress(party: X12RemitParty, address: X12RemitAddress): X12RemitParty {
  return Object.freeze({ ...party, address });
}

/** @internal */
function withReference(party: X12RemitParty, ref: X12RemitReference): X12RemitParty {
  return Object.freeze({
    ...party,
    additionalIdentifiers: Object.freeze([...party.additionalIdentifiers, ref]),
  });
}

/** @internal */
function withContact(party: X12RemitParty, contact: X12RemitContact): X12RemitParty {
  return Object.freeze({ ...party, contacts: Object.freeze([...party.contacts, contact]) });
}

/** @internal */
function withLines(address: X12RemitAddress, lines: readonly string[]): X12RemitAddress {
  return Object.freeze({ ...address, lines: Object.freeze([...address.lines, ...lines]) });
}

/** @internal */
function mergeAddress(base: X12RemitAddress, fromN4: X12RemitAddress): X12RemitAddress {
  return Object.freeze({
    lines: base.lines,
    city: fromN4.city ?? base.city,
    state: fromN4.state ?? base.state,
    postalCode: fromN4.postalCode ?? base.postalCode,
    countryCode: fromN4.countryCode ?? base.countryCode,
  });
}

// ---------------------------------------------------------------------------
// Freezing accumulators into the readonly public shape.
// ---------------------------------------------------------------------------

/** @internal */
function freezeServiceLine(acc: ServiceLineAccumulator): X12RemitServiceLine {
  return Object.freeze({
    productServiceIdQualifier: acc.productServiceIdQualifier,
    productServiceId: acc.productServiceId,
    modifiers: Object.freeze(acc.modifiers.slice()),
    chargeAmount: acc.chargeAmount,
    paymentAmount: acc.paymentAmount,
    revenueCode: acc.revenueCode,
    paidUnitsOfService: acc.paidUnitsOfService,
    originalServiceId: acc.originalServiceId,
    originalServiceIdQualifier: acc.originalServiceIdQualifier,
    serviceDateStart: acc.serviceDateStart,
    serviceDateEnd: acc.serviceDateEnd,
    adjustments: Object.freeze(acc.adjustments.slice()),
    references: Object.freeze(acc.references.slice()),
    amounts: Object.freeze(acc.amounts.slice()),
    remarks: Object.freeze(acc.remarks.slice()),
  });
}

/** @internal */
function freezeClaim(acc: ClaimAccumulator): X12RemitClaim {
  // Voiding the props on ClaimAccumulator we don't use yet — Phase 8 will
  // expose CLP segment position so balance-warning positions can point at
  // the exact claim.
  void acc.clpSegmentIndex;
  return Object.freeze({
    patientControlNumber: acc.patientControlNumber,
    claimStatusCode: acc.claimStatusCode,
    claimStatusDescription: acc.claimStatusDescription,
    totalChargeAmount: acc.totalChargeAmount,
    totalPaymentAmount: acc.totalPaymentAmount,
    patientResponsibilityAmount: acc.patientResponsibilityAmount,
    claimFilingIndicatorCode: acc.claimFilingIndicatorCode,
    payerClaimControlNumber: acc.payerClaimControlNumber,
    facilityTypeCode: acc.facilityTypeCode,
    claimFrequencyCode: acc.claimFrequencyCode,
    adjustments: Object.freeze(acc.adjustments.slice()),
    patient: acc.patient,
    subscriber: acc.subscriber,
    correctedPatient: acc.correctedPatient,
    serviceProvider: acc.serviceProvider,
    renderingProvider: acc.renderingProvider,
    servicePeriodStart: acc.servicePeriodStart,
    servicePeriodEnd: acc.servicePeriodEnd,
    references: Object.freeze(acc.references.slice()),
    amounts: Object.freeze(acc.amounts.slice()),
    remarks: Object.freeze(acc.remarks.slice()),
    serviceLines: Object.freeze(acc.serviceLines.slice()),
  });
}
