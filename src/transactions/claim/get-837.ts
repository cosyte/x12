/**
 * `get837Claims` - extract a typed {@link X12_837Submission} from a parsed
 * X12 005010 837 transaction set (Professional `X222A2`, Institutional
 * `X223A3`, or Dental `X224A2`). Walks the body via a state machine
 * guided by the dogfooded loop spec (see
 * `./loop-spec.ts`). Lenient on parse: every recoverable deviation
 * surfaces as a warning, never a throw. Money is decoded as
 * {@link "../../decimal.js".X12Decimal} (never `parseFloat`). HL
 * parent-pointer integrity is enforced - mismatches emit
 * `X12_HL_PARENT_MISMATCH` and `X12_HL_PARENT_LEVEL_INVALID`; the
 * walker NEVER silently re-numbers the hierarchy.
 *
 * Spec source: WPC TR3s `005010X222A2` (Professional), `005010X223A3`
 * (Institutional), `005010X224A2` (Dental); X12 005010 base spec for
 * envelope + cross-cutting segments (NM1, N3, N4, REF, PER, DTP, AMT).
 *
 * Phase 5 known limitations (documented in CHANGELOG):
 * - **Loop 2320/2330 (Other Subscriber / Other Payer)** captured at the
 *   surface level only: SBR-01 payer responsibility code and the
 *   adjacent NM1*IL / NM1*PR entities. Detailed CAS / OI / MOA
 *   breakdown inside Loop 2320 is deferred to Phase 9 (companion-guide
 *   tolerance).
 * - **Loop 2410 (Drug Identification, 837P)** captures LIN qualifier +
 *   code and the optional CTP quantity + UCUM unit. REF inside 2410 is
 *   preserved on tx.segments verbatim but not typed onto the model.
 * - **Loop 2420 (Service-Line Provider Names)** captures the NM1
 *   entities verbatim on `serviceLine.providers`; per-provider PRV +
 *   address are not yet typed at the line level.
 * - **CN1 contract information** preserved on tx.segments verbatim, not
 *   typed onto the model.
 * - **Companion-guide enforcement** (e.g. Availity's required REF*EA at
 *   the billing provider) deferred to Phase 9 (profile system).
 * - **Builder** (`build837P`/`I`/`D`) deferred to Phase 8.
 *
 * None of these are silent - verbatim segments remain on
 * `tx.segments` so a consumer can drop down to raw element access for
 * anything the typed surface does not yet expose.
 */

import { X12Decimal } from "../../decimal.js";
import { lookupCarc } from "../../code-lists/carc.js";
import { wireLookup } from "../../parser/lookup.js";
import {
  collectElementValues,
  componentOptional,
  elementDecimal,
  elementDecimalOrZero,
  elementOptional,
  elementValue,
  type X12DecimalWarningSink,
  type X12Segment,
} from "../../parser/segment.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import {
  REQUIRED_LOOPS,
  entitySegmentDiscardedAfterLx,
  hlParentLevelInvalid,
  hlParentMismatch,
  missingRequiredLoop,
  payToAddressRepeated,
  serviceLineDropped,
  serviceLineNotDecoded,
  serviceSegmentWithoutLx,
  unknown837Variant,
  unknownCarc,
  unknownHiQualifier,
  type X12ParseWarning,
} from "../../parser/warnings.js";
import { statesAnAddress } from "./address-segments.js";
import type { X12RemitAdjustment } from "../remit/types.js";
import {
  isDiagnosisQualifier,
  isProcedureQualifier,
  resolveHiQualifier,
  type X12HiCategory,
  type X12HiCodeSystem,
} from "../../code-lists/hi-qualifiers.js";
import type {
  X12Claim,
  X12Claim837Variant,
  X12ClaimAddress,
  X12ClaimAmount,
  X12ClaimContact,
  X12ClaimDate,
  X12ClaimEntity,
  X12ClaimHiCode,
  X12ClaimMember,
  X12ClaimNote,
  X12ClaimReference,
  X12HierarchicalLevel,
  X12LineAdjudication,
  X12LineDrug,
  X12OtherSubscriber,
  X12SubscriberInfo,
  X12ToothInformation,
  X12_837ServiceLine,
  X12_837Submission,
} from "./types.js";

/**
 * Map ST-03 implementation-convention reference → 837 variant.
 *
 * Built through {@link "../../parser/lookup.js".wireLookup} because the key
 * is document bytes. As a plain object literal (which it was through
 * `a33c208`) an ST-03 of `constructor` / `valueOf` / `toString` /
 * `__proto__` resolved TRUTHY, so `variant` became a function or
 * `Object.prototype`, `X12_837_UNKNOWN_VARIANT` never fired, and
 * `openServiceLine` - which answers `undefined` for anything that is not
 * `P` / `I` / `D` - dropped EVERY Loop 2400 off the model with no warning
 * on any channel. @internal
 */
const VARIANT_BY_ICR: Readonly<Record<string, X12Claim837Variant>> = wireLookup({
  "005010X222A2": "P",
  "005010X223A3": "I",
  "005010X224A2": "D",
});

/**
 * Map SVx segment id → 837 variant for fall-back detection. Same
 * null-prototype construction and the same reason: `seg.id` is the
 * segment's first element, read off the wire. @internal
 */
const VARIANT_BY_SV_SEGMENT: Readonly<Record<string, X12Claim837Variant>> = wireLookup({
  SV1: "P",
  SV2: "I",
  SV3: "D",
});

/**
 * HL level codes per X12 0736 + 837 TR3 conventions. `INFORMATION_SOURCE`
 * is the billing provider (top of the tree); `SUBSCRIBER` is the
 * insurance subscriber; `DEPENDENT` is a non-subscriber patient.
 *
 * @example
 * ```ts
 * import { HL_LEVEL_CODES } from "@cosyte/x12";
 * HL_LEVEL_CODES.INFORMATION_SOURCE; // "20"
 * HL_LEVEL_CODES.SUBSCRIBER;         // "22"
 * HL_LEVEL_CODES.DEPENDENT;          // "23"
 * ```
 */
export const HL_LEVEL_CODES = Object.freeze({
  INFORMATION_SOURCE: "20",
  INFORMATION_RECEIVER: "21",
  SUBSCRIBER: "22",
  DEPENDENT: "23",
} as const);

/**
 * NM1-01 entity-identifier codes used by the 837 walker to route an NM1
 * onto the right entity slot. Curated to the qualifiers the v1 walker
 * recognizes; an NM1 with a qualifier outside this set falls into the
 * Loop 2310x / 2420x line-provider verbatim bucket. Frozen for type
 * safety + IntelliSense - consumers should rarely need these (they're a
 * walker-internal vocabulary), but they're exported for tests + the
 * Phase 8 builder API. @example NM1_QUALIFIERS.BILLING_PROVIDER → "85".
 */
export const NM1_QUALIFIERS = Object.freeze({
  SUBMITTER: "41",
  RECEIVER: "40",
  BILLING_PROVIDER: "85",
  PAY_TO_ADDRESS: "87",
  PAY_TO_PLAN: "PE",
  SUBSCRIBER: "IL",
  PAYER: "PR",
  PATIENT: "QC",
} as const);

/**
 * Per-level expected parent level. Billing provider (level 20) has no
 * parent. Subscriber (level 22) MUST be parented by billing provider.
 * Dependent / patient (level 23) MUST be parented by subscriber.
 * Violations fire `X12_HL_PARENT_LEVEL_INVALID`. @internal
 *
 * Null-prototype for the same reason as the two tables above: `hl.levelCode`
 * is HL-03, read off the wire. As a literal, an HL-03 of `constructor` /
 * `valueOf` / `__proto__` answered a truthy expectation no parent could ever
 * match, so the walker raised `X12_HL_PARENT_LEVEL_INVALID` against a level
 * it has no expectation for - a fabricated non-conformance claim, where an
 * honest unknown level code such as `99` is correctly tolerated. The 271 /
 * 277 / 278 readers share `src/transactions/shared/hl.ts`, which has always
 * guarded this read with `hasOwnProperty`; this local copy did not.
 */
const EXPECTED_PARENT_LEVEL: Readonly<Record<string, string | undefined>> = wireLookup({
  [HL_LEVEL_CODES.INFORMATION_SOURCE]: undefined,
  [HL_LEVEL_CODES.SUBSCRIBER]: HL_LEVEL_CODES.INFORMATION_SOURCE,
  [HL_LEVEL_CODES.DEPENDENT]: HL_LEVEL_CODES.SUBSCRIBER,
});

/**
 * Extract a typed {@link X12_837Submission} from an 837 transaction set.
 * Pure function - no I/O, no global state. Returns `undefined` when the
 * input transaction's ST-01 is not `"837"` (mis-routed call); every other
 * deviation is recoverable and surfaces on `submission.warnings`.
 *
 * @example
 * ```ts
 * import { parseX12, get837Claims } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const group of ix.groups) {
 *   for (const tx of group.transactions) {
 *     if (tx.st.elements[1] !== "837") continue;
 *     const sub = get837Claims(ix.delimiters, tx);
 *     sub?.variant;                  // "P" / "I" / "D" / "unknown"
 *     for (const claim of sub?.claims ?? []) {
 *       claim.totalCharge.toString();
 *       claim.diagnoses[0]?.codeSystem; // "ICD-10-CM"
 *     }
 *   }
 * }
 * ```
 */
export function get837Claims(
  delimiters: Delimiters,
  tx: X12TransactionSet,
  opts?: { readonly type?: "P" | "I" | "D" },
): X12_837Submission | undefined {
  if (tx.st.elements[1] !== "837") return undefined;

  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);

  // Variant detection - ST-03 first, then SVx fallback, then unknown.
  const implementationConventionReference = tx.st.elements[3];
  const explicitType: X12Claim837Variant | undefined = opts?.type;
  const variantFromIcr =
    implementationConventionReference !== undefined && implementationConventionReference !== ""
      ? VARIANT_BY_ICR[implementationConventionReference]
      : undefined;
  let variantFromSegment: X12Claim837Variant | undefined;
  for (const seg of body) {
    const fromSv = VARIANT_BY_SV_SEGMENT[seg.id];
    if (fromSv !== undefined) {
      variantFromSegment = fromSv;
      break;
    }
  }
  const variant: X12Claim837Variant =
    explicitType ?? variantFromIcr ?? variantFromSegment ?? "unknown";

  if (variant === "unknown") {
    // Anchor the ST, which is `tx.segments[0]` and carries the ST-03 this
    // resolution reads. Through `93b2428` the index was 1, which in a
    // transaction-scoped position is `tx.segments[1]` - the BHT, a segment
    // that has nothing to do with variant resolution and that the walk below
    // never even visits for this purpose. `segmentIndex: 0` is NOT a neutral
    // sentinel here; it names a real segment, and that segment is the right
    // one. No `elementIndex` is set on purpose: one of this code's two routes
    // is an ST-03 that is absent or empty, where `ST*837*0001~` has no
    // element 3 at all, so naming one would point a consumer at a slot that
    // is not on the wire.
    warnings.push(unknown837Variant({ segmentIndex: 0, transactionIndex: 0 }));
  }

  // Hierarchy + entity accumulators.
  const hierarchies: X12HierarchicalLevel[] = [];
  const hlIndex: Map<string, X12HierarchicalLevel> = new Map();
  let currentBillingHl: X12HierarchicalLevel | undefined;
  let currentSubscriberHl: X12HierarchicalLevel | undefined;
  let currentPatientHl: X12HierarchicalLevel | undefined;

  let submitter: X12ClaimEntity | undefined;
  let receiver: X12ClaimEntity | undefined;
  let billingProvider: X12ClaimEntity | undefined;
  let payToAddress: X12ClaimAddress | undefined;
  /**
   * The address the CURRENT `NM1*87` has built so far, reset at each one.
   *
   * `payToAddress` is a bare accumulator with no entity object to own it, so
   * unlike every other party it had nothing to be replaced at a repeated
   * `NM1*87`: an `N3` / `N4` after the second one wrote onto whatever the
   * first left, `withLines` appending and `mergeAddress` falling back, and
   * the model came back holding a street from each of two addresses with
   * `warnings: []`. This binding is that missing object identity - the two
   * address arms read and write it, never `payToAddress`, so values from two
   * occurrences can never meet.
   *
   * @internal
   */
  let pendingPayToAddress: X12ClaimAddress | undefined;
  /**
   * True once an `NM1*87` has been routed to the pay-to slot in the CURRENT
   * Loop 2000A. Reset beside `payToAddress` at the Loop 2000A `HL`, because
   * a first `NM1*87` under a later billing provider is a first and not a
   * repeat. Only the pay-to route sets it, so an `NM1*87` arriving while a
   * `CLM` is open - which falls through to the Loop 2310 branch and never
   * reaches this slot - neither warns nor arms the warning.
   *
   * @internal
   */
  let payToAddressNamed = false;
  let payToPlan: X12ClaimEntity | undefined;
  let currentSubscriberMember: X12ClaimMember | undefined;
  let currentPayer: X12ClaimEntity | undefined;
  let currentPatientMember: X12ClaimMember | undefined;
  let pendingSubscriberInfo: X12SubscriberInfo = EMPTY_SUBSCRIBER_INFO;
  let pendingPatientInfo: X12SubscriberInfo = EMPTY_SUBSCRIBER_INFO;

  const claims: X12Claim[] = [];
  let currentClaim: ClaimAccumulator | undefined;
  let currentServiceLine: ServiceLineAccumulator | undefined;
  let currentOtherSubscriber: OtherSubscriberAccumulator | undefined;
  let currentAdjudication: AdjudicationAccumulator | undefined;
  let context: WalkerContext = { kind: "header" };

  /**
   * True between an LX that opened no Loop 2400 and the next flush. It is
   * what tells the two silences apart at an SVx that finds no line: this one
   * has already been reported at its LX, and re-reporting it per service
   * segment would say the same loss twice under two codes. An SVx reaching
   * `false` here had no line open, which nothing reported until now. That is
   * NOT the same as "had no LX": an LX in an earlier claim is still an LX.
   * @internal
   */
  let droppedLineReported = false;

  /** Active entity for trailing N3/N4/REF/PER attachment. @internal */
  let activeEntity: ActiveEntity | undefined;

  /**
   * True between an LX that dropped its line with no CLM open AND had an
   * entity loop open at it, and the next segment that opens a loop of any
   * kind. It is what lets the walker report the cost of that reset: while it
   * holds, an N3 / N4 / PER / REF reaches no party, and that discard is this
   * package's own doing rather than the document's shape.
   *
   * SCOPED, NOT LATCHED, for the same reason `droppedLineReported` is: it is
   * cleared beside every other assignment to `activeEntity` (HL, SBR's Loop
   * 2320 branch, NM1, CLM, and the LX routes that open a line), so a party
   * named after the stray LX is outside this scope again and its own trailing
   * segments are silent, whether or not they attach (some kinds reach no party
   * on any release). A latching flag would report every later unattached
   * segment in the transaction, including shapes that were silent before this
   * code existed.
   * @internal
   */
  let entityLoopClosedByStrayLx = false;

  const flushAdjudication = (): void => {
    if (currentAdjudication !== undefined && currentServiceLine !== undefined) {
      currentServiceLine.adjudications.push(freezeAdjudication(currentAdjudication));
    }
    currentAdjudication = undefined;
  };

  const flushServiceLine = (): void => {
    flushAdjudication();
    if (currentServiceLine !== undefined && currentClaim !== undefined) {
      // A line whose SVx never decoded carries the accumulator's seeded
      // `X12Decimal.ZERO` in `charge` / `units`. That is a stand-in, not a
      // read, and no decimal sink was ever consulted for it - so the only
      // channel that can say so is this warning. Retention is unchanged:
      // the line is still pushed and every segment stays on `tx.segments`.
      if (!currentServiceLine.serviceSegmentDecoded) {
        warnings.push(serviceLineNotDecoded(currentServiceLine.position));
      }
      currentClaim.serviceLines.push(freezeServiceLine(currentServiceLine));
    }
    currentServiceLine = undefined;
    // The one place `currentServiceLine` is cleared is the one place the
    // drop flag is cleared, so the two can never disagree about whether the
    // SVx arriving next belongs to a Loop 2400 anyone tried to open.
    droppedLineReported = false;
  };

  /**
   * Report an SV1 / SV2 / SV3 that found no line to decode into, and only
   * where nothing has reported that loss already. Hoisted beside the flush
   * helpers for the same reason they are: one arrow for the whole walk
   * rather than one per service segment.
   * @internal
   */
  const reportOrphanServiceSegment = (position: X12Position): void => {
    if (droppedLineReported) return;
    warnings.push(serviceSegmentWithoutLx(position));
  };

  /**
   * Report an N3 / N4 / PER / REF discarded because a stray LX closed the
   * entity loop it belonged to.
   *
   * The flag alone is the condition, and that is sound only because of the
   * invariant beside it: it is cleared next to EVERY other assignment to
   * `activeEntity`, so while it holds, `activeEntity` is undefined and the
   * attach the caller just performed was a no-op. **A new `activeEntity`
   * assignment site that does not clear it would make this message false**,
   * which is why the clears sit beside the assignments rather than in one
   * place remote from them.
   * @internal
   */
  const reportDiscardedEntitySegment = (position: X12Position): void => {
    if (!entityLoopClosedByStrayLx) return;
    warnings.push(entitySegmentDiscardedAfterLx(position));
  };

  const flushOtherSubscriber = (): void => {
    if (currentOtherSubscriber !== undefined && currentClaim !== undefined) {
      currentClaim.otherSubscribers.push(freezeOtherSubscriber(currentOtherSubscriber));
    }
    currentOtherSubscriber = undefined;
  };

  const flushClaim = (): void => {
    flushServiceLine();
    flushOtherSubscriber();
    if (currentClaim !== undefined) {
      claims.push(freezeClaim(currentClaim));
    }
    currentClaim = undefined;
  };

  // Hoisted once - every N3/N4/PER/REF call shares the same mutator bag,
  // closing over the outer `let` bindings. Keeping the bag out of the loop
  // avoids re-allocating a dozen arrow functions per body segment and
  // collapses the long tail of branch-coverage "dead arrows" that would
  // otherwise appear (each per-iteration bag had ~12 setters, only one
  // of which fired per segment).
  const entityMutators: EntityMutators = {
    setBillingProvider: (next) => {
      billingProvider = next;
    },
    setSubmitter: (next) => {
      submitter = next;
    },
    setReceiver: (next) => {
      receiver = next;
    },
    setPayToPlan: (next) => {
      payToPlan = next;
    },
    // Setters for `subscriber` / `patient` route through `withCurrent`,
    // which short-circuits when the current value is undefined - so the
    // cast inside the spread is sound. Setters for `otherSubscriber` /
    // `otherPayer` are only reached after an SBR in Loop 2320 opened
    // `currentOtherSubscriber`, and the `activeEntity.kind` discriminator
    // can only flip to those values from that same code path.
    setSubscriber: (next) => {
      currentSubscriberMember = {
        ...(currentSubscriberMember as X12ClaimMember),
        entity: next,
      };
    },
    setPayer: (next) => {
      currentPayer = next;
    },
    setPatient: (next) => {
      currentPatientMember = { ...(currentPatientMember as X12ClaimMember), entity: next };
    },
    setPayToAddress: (next) => {
      pendingPayToAddress = next;
      // The commit rule, and the whole reason this slice had to scope the
      // emit side in from the start. `build837P/I/D` gates Loop 2010AB on
      // `payToAddress !== undefined` and `emitAddress` writes N3 only for
      // non-empty lines and N4 only for a defined field, so on this slot an
      // emptied value is not a neutral absence - it re-emits as no pay-to
      // loop at all, or as a bare `NM1*87`, both positive statements about
      // where a payment goes that no sender made. So the current occurrence
      // takes the slot only when it states an address the emit side would
      // write at least one segment for. An occurrence that states none
      // leaves a stated one alone; the `undefined` arm is only the case
      // where there is nothing to leave alone, and it is what keeps a lone
      // `NM1*87` + valueless `N3` reading exactly as it did at 0.0.12.
      if (statesAnAddress(next) || payToAddress === undefined) payToAddress = next;
    },
    setOtherSubscriber: (next) => {
      (currentOtherSubscriber as OtherSubscriberAccumulator).otherSubscriber = next;
    },
    setOtherPayer: (next) => {
      (currentOtherSubscriber as OtherSubscriberAccumulator).otherPayer = next;
    },
    getCurrentBillingProvider: () => billingProvider,
    getCurrentSubmitter: () => submitter,
    getCurrentReceiver: () => receiver,
    getCurrentPayToPlan: () => payToPlan,
    getCurrentSubscriber: () => currentSubscriberMember?.entity,
    getCurrentPayer: () => currentPayer,
    getCurrentPatient: () => currentPatientMember?.entity,
    // Deliberately the CURRENT occurrence's accumulator, never the committed
    // slot: this is the getter both address arms build onto, and reading the
    // committed slot here is exactly what fused two `NM1*87`s.
    getCurrentPayToAddress: () => pendingPayToAddress,
    getCurrentOtherSubscriber: () => currentOtherSubscriber?.otherSubscriber,
    getCurrentOtherPayer: () => currentOtherSubscriber?.otherPayer,
  };

  for (let i = 0; i < body.length; i += 1) {
    const seg = body[i];
    if (seg === undefined) continue;
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    // Every decimal read below routes its `X12_UNPARSEABLE_DECIMAL` here; the
    // helper narrows the position to the failing element itself.
    const sink: X12DecimalWarningSink = { warnings, position };
    switch (seg.id) {
      case "HL": {
        // Hierarchy boundary - flush any in-flight claim/line.
        flushClaim();
        const hl = decodeHl(seg, delimiters);
        hierarchies.push(hl);
        validateHl(hl, hlIndex, position, warnings);
        hlIndex.set(hl.hlId, hl);
        if (hl.levelCode === HL_LEVEL_CODES.INFORMATION_SOURCE) {
          currentBillingHl = hl;
          currentSubscriberHl = undefined;
          currentPatientHl = undefined;
          // Entering a new billing provider - reset billing-only state but
          // hold submitter/receiver (header scope) across HLs.
          billingProvider = undefined;
          payToAddress = undefined;
          pendingPayToAddress = undefined;
          payToAddressNamed = false;
          payToPlan = undefined;
          context = { kind: "loop2000A" };
        } else if (hl.levelCode === HL_LEVEL_CODES.SUBSCRIBER) {
          currentSubscriberHl = hl;
          currentPatientHl = undefined;
          currentSubscriberMember = undefined;
          currentPayer = undefined;
          currentPatientMember = undefined;
          pendingSubscriberInfo = EMPTY_SUBSCRIBER_INFO;
          context = { kind: "loop2000B" };
        } else if (hl.levelCode === HL_LEVEL_CODES.DEPENDENT) {
          currentPatientHl = hl;
          currentPatientMember = undefined;
          pendingPatientInfo = EMPTY_SUBSCRIBER_INFO;
          context = { kind: "loop2000C" };
        } else {
          context = { kind: "header" };
        }
        activeEntity = undefined;
        entityLoopClosedByStrayLx = false;
        break;
      }
      case "SBR": {
        const info = decodeSbr(seg, delimiters);
        if (context.kind === "loop2000B") {
          pendingSubscriberInfo = info;
        } else if (currentClaim !== undefined) {
          // Loop 2320 - other subscriber. Open accumulator; payer follows
          // via NM1*IL / NM1*PR.
          flushOtherSubscriber();
          currentOtherSubscriber = {
            payerResponsibilityCode: info.payerResponsibilityCode ?? "",
            individualRelationshipCode: info.individualRelationshipCode,
            claimFilingIndicator: info.claimFilingIndicator,
            otherSubscriber: undefined,
            otherPayer: undefined,
          };
          activeEntity = { kind: "otherSubscriber" };
          // Beside the assignment, per the invariant on the flag - but note
          // this branch cannot run while the flag holds, because Loop 2320
          // requires an open claim and the flag requires none. It has no red
          // control for that reason, and it is here so the invariant survives
          // a later change to either condition rather than because a document
          // can reach it today.
          entityLoopClosedByStrayLx = false;
        }
        break;
      }
      case "PAT": {
        const info = decodePat(seg, delimiters);
        if (context.kind === "loop2000C") {
          pendingPatientInfo = info;
        } else if (context.kind === "loop2000B") {
          // PAT may also appear in subscriber HL when patient = subscriber
          // (relationship code carries the assertion).
          pendingSubscriberInfo = mergeSubscriberInfo(pendingSubscriberInfo, info);
        }
        break;
      }
      case "NM1": {
        const qualifier = elementValue(seg, 1, delimiters);
        const entity = decodeNm1(seg, delimiters);
        // Every route below assigns `activeEntity`, including the final
        // `else`, so the stray-LX scope ends here whatever this NM1 resolves
        // to. Clearing once at the top of the case is what keeps the flag
        // scoped rather than latched: a party named after the stray LX is
        // outside that scope again, and an NM1 this walker cannot route leaves
        // the following segments as silent as they were before this code
        // existed. Outside that scope is not the same as addressable: whether
        // a trailing segment then reaches the party depends on the kind and on
        // the party, and this reader does not surface every kind on every one
        // (`attachContact` has no route for a patient or a pay-to address).
        entityLoopClosedByStrayLx = false;
        // Route the NM1 by qualifier + context.
        if (qualifier === NM1_QUALIFIERS.SUBMITTER) {
          submitter = entity;
          activeEntity = { kind: "submitter" };
        } else if (qualifier === NM1_QUALIFIERS.RECEIVER) {
          receiver = entity;
          activeEntity = { kind: "receiver" };
        } else if (qualifier === NM1_QUALIFIERS.BILLING_PROVIDER && context.kind === "loop2000A") {
          billingProvider = entity;
          activeEntity = { kind: "billingProvider" };
        } else if (qualifier === NM1_QUALIFIERS.PAY_TO_ADDRESS && context.kind === "loop2000A") {
          // The 005010 X222A2/X223A3/X224A2 specs use NM1*87 only for the
          // pay-to ADDRESS; the name is preserved on tx.segments but not
          // re-surfaced as a separate entity until a real consumer asks.
          // The TR3s allow Loop 2010AB at most once per Loop 2000A, and the
          // model has one slot for it, so a repeat is reported rather than
          // resolved silently - the resolution below cannot put both
          // addresses on the model and this is the only thing that says so.
          if (payToAddressNamed) warnings.push(payToAddressRepeated(position));
          payToAddressNamed = true;
          // A fresh accumulator per occurrence: this is the assignment that
          // ends the fusion. Without it the next N3/N4 builds onto the
          // previous NM1*87's address instead of onto an empty one.
          pendingPayToAddress = undefined;
          activeEntity = { kind: "payToAddress" };
        } else if (
          qualifier === NM1_QUALIFIERS.PAY_TO_PLAN &&
          context.kind === "loop2000A" &&
          variant === "I"
        ) {
          payToPlan = entity;
          activeEntity = { kind: "payToPlan" };
        } else if (qualifier === NM1_QUALIFIERS.SUBSCRIBER && context.kind === "loop2000B") {
          currentSubscriberMember = { entity, info: pendingSubscriberInfo };
          activeEntity = { kind: "subscriber" };
        } else if (qualifier === NM1_QUALIFIERS.PAYER && context.kind === "loop2000B") {
          currentPayer = entity;
          activeEntity = { kind: "payer" };
        } else if (qualifier === NM1_QUALIFIERS.PATIENT && context.kind === "loop2000C") {
          currentPatientMember = { entity, info: pendingPatientInfo };
          activeEntity = { kind: "patient" };
        } else if (
          currentOtherSubscriber !== undefined &&
          (qualifier === NM1_QUALIFIERS.SUBSCRIBER || qualifier === NM1_QUALIFIERS.PATIENT)
        ) {
          currentOtherSubscriber.otherSubscriber = entity;
          activeEntity = { kind: "otherSubscriber" };
        } else if (currentOtherSubscriber !== undefined && qualifier === NM1_QUALIFIERS.PAYER) {
          currentOtherSubscriber.otherPayer = entity;
          activeEntity = { kind: "otherPayer" };
        } else if (currentClaim !== undefined) {
          // Loop 2310x - provider role at claim level (rendering /
          // referring / supervising / service facility / attending /
          // operating / other operating, etc.). Surface on
          // claim.providers verbatim; the qualifier discriminates the
          // role for the consumer.
          if (currentServiceLine !== undefined) {
            currentServiceLine.providers.push(entity);
          } else {
            currentClaim.providers.push(entity);
          }
          activeEntity = { kind: "lineProvider" };
        } else {
          activeEntity = undefined;
        }
        break;
      }
      case "N3": {
        const lines = collectElementValues(seg, 1, 2, delimiters);
        attachAddressLines(lines, activeEntity, entityMutators);
        reportDiscardedEntitySegment(position);
        break;
      }
      case "N4": {
        const partial = decodeN4(seg, delimiters);
        attachAddressFields(partial, activeEntity, entityMutators);
        reportDiscardedEntitySegment(position);
        break;
      }
      case "PER": {
        const contact = decodePer(seg, delimiters);
        attachContact(contact, activeEntity, entityMutators);
        reportDiscardedEntitySegment(position);
        break;
      }
      case "REF": {
        const ref = decodeRef(seg, delimiters);
        if (currentAdjudication !== undefined) break;
        if (currentServiceLine !== undefined) {
          currentServiceLine.references.push(ref);
        } else if (currentClaim !== undefined) {
          currentClaim.references.push(ref);
        } else {
          // The one REF route that can reach no party. The other two land on
          // a line or a claim, and neither is reachable while the flag holds
          // (the stray-LX route requires no CLM open, and a CLM clears it),
          // so the report belongs here rather than at the top of the case.
          attachReference(ref, activeEntity, entityMutators);
          reportDiscardedEntitySegment(position);
        }
        break;
      }
      case "CLM": {
        flushClaim();
        if (
          currentBillingHl === undefined ||
          currentSubscriberHl === undefined ||
          currentSubscriberMember === undefined ||
          currentPayer === undefined
        ) {
          // A claim with no enclosing hierarchy is structurally
          // illegal - flag with X12_MISSING_REQUIRED_LOOP. The walker
          // still attempts to extract the claim header.
          if (currentBillingHl === undefined) {
            warnings.push(missingRequiredLoop(position, REQUIRED_LOOPS.BILLING_PROVIDER_2000A));
          }
          if (currentSubscriberHl === undefined) {
            warnings.push(missingRequiredLoop(position, REQUIRED_LOOPS.SUBSCRIBER_2000B));
          }
          if (currentSubscriberMember === undefined && currentSubscriberHl !== undefined) {
            warnings.push(missingRequiredLoop(position, REQUIRED_LOOPS.SUBSCRIBER_NAME_2010BA));
          }
          if (currentPayer === undefined && currentSubscriberHl !== undefined) {
            warnings.push(missingRequiredLoop(position, REQUIRED_LOOPS.PAYER_NAME_2010BB));
          }
        }
        currentClaim = openClaim(
          seg,
          delimiters,
          {
            variant,
            hierarchy: currentPatientHl ?? currentSubscriberHl,
            billingProvider,
            payToAddress,
            payToPlan,
            subscriber: currentSubscriberMember,
            payer: currentPayer,
            patient: currentPatientMember,
          },
          sink,
        );
        activeEntity = undefined;
        entityLoopClosedByStrayLx = false;
        context = { kind: "loop2300" };
        break;
      }
      case "DTP": {
        const date = decodeDtp(seg, delimiters);
        if (date === undefined) break;
        if (currentAdjudication !== undefined) {
          if (date.qualifier === "573") currentAdjudication.dateAdjudicated = date.value;
        } else if (currentServiceLine !== undefined) {
          currentServiceLine.dates.push(date);
        } else if (currentClaim !== undefined) {
          currentClaim.dates.push(date);
        }
        break;
      }
      case "HI": {
        if (currentClaim === undefined) break;
        const codes = decodeHi(seg, delimiters, warnings, position);
        for (const code of codes) {
          if (isDiagnosisQualifier(code.qualifier)) {
            currentClaim.diagnoses.push(code);
          } else if (isProcedureQualifier(code.qualifier)) {
            currentClaim.procedures.push(code);
          } else {
            currentClaim.otherHi.push(code);
          }
        }
        break;
      }
      case "NTE": {
        const note = decodeNte(seg, delimiters);
        if (note === undefined) break;
        if (currentServiceLine !== undefined) currentServiceLine.notes.push(note);
        else if (currentClaim !== undefined) currentClaim.notes.push(note);
        break;
      }
      case "AMT": {
        const amount = decodeAmt(seg, delimiters, sink);
        if (amount === undefined) break;
        if (currentAdjudication !== undefined) break;
        if (currentServiceLine !== undefined) currentServiceLine.amounts.push(amount);
        else if (currentClaim !== undefined) currentClaim.amounts.push(amount);
        break;
      }
      case "LX": {
        flushServiceLine();
        // An LX that opens no accumulator takes its whole Loop 2400 off the
        // model: the SVx that follows finds no line to decode into, and the
        // line is never pushed onto any claim. Both routes here are silent
        // at `a33c208` and both are the same loss to a consumer, so both
        // warn, at the LX itself - the one segment present in every case,
        // and the anchor `X12_837_SERVICE_LINE_NOT_DECODED` already uses.
        //
        // Route 1: no CLM is open, so there is no claim to attach a line to.
        // Route 2: `openServiceLine` answers `undefined` because the
        // submission's variant is not P / I / D, so there is no line shape
        // to build. Nothing is fabricated for either: synthesizing a claim
        // or guessing a variant would invent structure the sender did not
        // send, which is the failure mode this reader exists to avoid.
        //
        // DO NOT RESTRUCTURE THIS CASE, AND DO NOT LET ANY ROUTE OUT OF IT
        // SKIP `activeEntity = undefined`. That is the whole rule. No count of
        // how many statements this case differs from some earlier base by is
        // stated here: two successive drafts published one, both were wrong,
        // and the number is worthless to a reader anyway - `git log -p` is
        // exact and never goes stale. What matters is why: an earlier draft
        // returned early on the SECOND route and skipped that route's reset,
        // which let a trailing bare `N3` / `N4` / `PER` reach whatever party
        // the last `NM1` had left active, wherever this reader surfaces that
        // segment kind on that party at all, and route 1 was doing the same
        // thing through `93b2428`. Trading a warned omission for a silent
        // mis-attribution is the wrong direction.
        if (currentClaim === undefined) {
          warnings.push(serviceLineDropped(position));
          droppedLineReported = true;
          // Route 1 is the one path out of this case that used to skip the
          // reset below, and skipping it is the mirror image of the draft the
          // comment above warns about: through `93b2428` a trailing
          // `REF` / `N3` / `N4` / `PER` after a dropped `LX` reached whichever
          // party the last `NM1` left active, wherever this reader surfaces
          // that segment kind on that party at all - measured on a payer,
          // which surfaces all three of an address, a reference and a contact:
          // a line-item control number, a street address and a contact landing
          // on a LATER claim's payer, silently.
          //
          // THIS IS A TRADE, NOT A FREE WIN, AND THE COST IS MEASURED. The
          // TR3s nest Loop 2400 inside Loop 2300 and say nothing about an `LX`
          // anywhere else, so which party a segment after a STRAY `LX` belongs
          // to is not spec-derivable in either direction. Where the `LX` was
          // injected into an entity loop, the segments that follow it really
          // were that entity's, and discarding them LOSES a conformant
          // address, secondary id and contact that base attributed correctly -
          // pinned as a residual test.
          //
          // 🩺 THE DISCARD IS NO LONGER SILENT, AND THAT IS A DIFFERENT CODE
          // AT A DIFFERENT SEGMENT. `X12_837_SERVICE_LINE_DROPPED`, pushed
          // just above, reports the SERVICE LINE's loss and names no entity
          // segment; it is not and never was a report of this discard, and a
          // draft that said the loss was "already reported at that LX" was
          // measured false. What reports it is
          // `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, raised at each
          // discarded `N3` / `N4` / `PER` / `REF` itself, because the loss is
          // per segment and the segment is what a consumer resolves back
          // through `tx.segments`. The flag set below is what scopes it.
          //
          // Do NOT cite `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` here even
          // now that both warn: that item warns and RETAINS on the model
          // through `recordOrphan`, so its warning and its retained segment
          // can never disagree, and nothing in this route puts the discarded
          // segment on the typed model. A draft cited it as licensing the
          // silence and was refuted; it is no better as a precedent for the
          // warning. The direction is still chosen on this library's own
          // invariant rather than on a precedent or a clause: a
          // mis-attribution puts a value on an object the sender never put it
          // on, indistinguishable from real data, whereas the bytes of a
          // discarded segment are still on `tx.segments`.

          // Only where an entity loop was actually open: with none open at
          // ANY stray `LX` in this scope, the segments that follow reached no
          // party in released `0.0.10` either, and that silence is not this
          // code's to break.
          //
          // 🩺 `||=`, NEVER `=`. A SECOND stray `LX` finds `activeEntity`
          // already `undefined` - the first one nulled it on the next line -
          // so a plain assignment would CLEAR a scope that is still in force
          // and re-silence the exact loss this code exists to name. Measured
          // on `NM1*PR ~ LX ~ LX ~ N3 ~ REF ~ PER`: the payer keeps its
          // address, `2U` id and contact in `0.0.10` and loses all three
          // here, so the loss is real and a cleared flag would report none of
          // it - while six surfaces say the scope ends only where a loop is
          // opened, and a stray `LX` opens none. Its own red control.
          entityLoopClosedByStrayLx ||= activeEntity !== undefined;
          activeEntity = undefined;
          break;
        }
        currentServiceLine = openServiceLine(seg, delimiters, currentClaim.variant, position);
        if (currentServiceLine === undefined) {
          warnings.push(serviceLineDropped(position));
          droppedLineReported = true;
        }
        activeEntity = undefined;
        // Same note as the SBR branch: this tail is past the `currentClaim`
        // check above, so it cannot run while the flag holds, and it has no
        // red control. Kept beside the assignment so the invariant does not
        // depend on that coincidence holding forever.
        entityLoopClosedByStrayLx = false;
        context = { kind: "loop2400" };
        break;
      }
      // A service segment with no line open to decode into is a loss the
      // walker used to take in silence. Two ways to reach it, and only one
      // was ever reported: an LX that opened nothing already warned at the
      // LX (`droppedLineReported`), while a segment with no Loop 2400 open
      // at all had no anchor to warn at and so reported on no channel - a
      // charge, a quantity, a procedure code and its modifiers off the wire
      // and onto nothing. `reportOrphanServiceSegment` closes only the
      // second: it anchors at the service segment itself, because that is
      // the only segment the case has. Note the condition is "no line open",
      // NOT "no LX in the file": an LX in an earlier claim is still an LX.
      //
      // It does NOT decode the segment. The charge is SV1-02 / SV2-03 and
      // the units SV1-04 / SV2-05 / SV3-06, so reading a service segment
      // into a line the walker never opened is how a mis-read charge gets
      // minted. Refusing to read is the safe half; doing it silently was the
      // defect. This says nothing about VARIANT resolution, which happens
      // before the walk and scans every SVx in the body: an orphan segment
      // is eligible for that fallback like any other, which is pre-existing
      // and disclosed in KNOWN-LIMITATIONS.md rather than changed here.
      case "SV1": {
        if (currentServiceLine !== undefined) decodeSv1(currentServiceLine, seg, delimiters, sink);
        else reportOrphanServiceSegment(position);
        break;
      }
      case "SV2": {
        if (currentServiceLine !== undefined) decodeSv2(currentServiceLine, seg, delimiters, sink);
        else reportOrphanServiceSegment(position);
        break;
      }
      case "SV3": {
        if (currentServiceLine !== undefined) decodeSv3(currentServiceLine, seg, delimiters, sink);
        else reportOrphanServiceSegment(position);
        break;
      }
      case "TOO": {
        if (currentServiceLine !== undefined && currentServiceLine.variant === "D") {
          const tooth = decodeTooth(seg, delimiters);
          if (tooth !== undefined) currentServiceLine.toothInformation.push(tooth);
        }
        break;
      }
      case "LIN": {
        if (currentServiceLine === undefined || currentServiceLine.variant !== "P") break;
        currentServiceLine.drug = {
          qualifier: elementValue(seg, 2, delimiters),
          code: elementValue(seg, 3, delimiters),
          quantity: undefined,
          unitOfMeasure: undefined,
        };
        break;
      }
      case "CTP": {
        if (
          currentServiceLine === undefined ||
          currentServiceLine.variant !== "P" ||
          currentServiceLine.drug === undefined
        ) {
          break;
        }
        currentServiceLine.drug = {
          ...currentServiceLine.drug,
          quantity: elementDecimal(seg, 4, delimiters, sink),
          unitOfMeasure: componentOptional(seg, 5, 1, delimiters),
        };
        break;
      }
      case "SVD": {
        flushAdjudication();
        if (currentServiceLine === undefined) break;
        currentAdjudication = openAdjudication(seg, delimiters, sink);
        break;
      }
      case "CAS": {
        if (currentAdjudication !== undefined) {
          for (const a of decodeCas(seg, delimiters, warnings, position)) {
            currentAdjudication.adjustments.push(a);
          }
        }
        break;
      }
      case "SE": {
        break;
      }
      default: {
        // Anything else (PWK, CN1, K3, CR1/CR2, HCP, FRM, MEA, PRV, DMG,
        // OI, MOA, …) is preserved on tx.segments verbatim; the typed v1
        // surface does not enumerate every optional segment.
        break;
      }
    }
  }

  flushClaim();

  return Object.freeze({
    variant,
    implementationConventionReference,
    submitter,
    receiver,
    hierarchies: Object.freeze(hierarchies.slice()),
    claims: Object.freeze(claims.slice()),
    warnings: Object.freeze(warnings.slice()),
  });
}

// ---------------------------------------------------------------------------
// Walker context + active-entity routing types.
// ---------------------------------------------------------------------------

type WalkerContext =
  | { readonly kind: "header" }
  | { readonly kind: "loop2000A" }
  | { readonly kind: "loop2000B" }
  | { readonly kind: "loop2000C" }
  | { readonly kind: "loop2300" }
  | { readonly kind: "loop2400" };

type ActiveEntity =
  | { readonly kind: "submitter" }
  | { readonly kind: "receiver" }
  | { readonly kind: "billingProvider" }
  | { readonly kind: "payToAddress" }
  | { readonly kind: "payToPlan" }
  | { readonly kind: "subscriber" }
  | { readonly kind: "payer" }
  | { readonly kind: "patient" }
  | { readonly kind: "otherSubscriber" }
  | { readonly kind: "otherPayer" }
  | { readonly kind: "lineProvider" };

// ---------------------------------------------------------------------------
// Segment decoders. Element reads use the shared `elementValue` /
// `elementOptional` / `componentOptional` / `elementDecimal[OrZero]` /
// `collectElementValues` helpers from `parser/segment.ts`.
// ---------------------------------------------------------------------------

function decodeHl(seg: X12Segment, delimiters: Delimiters): X12HierarchicalLevel {
  return Object.freeze({
    hlId: elementValue(seg, 1, delimiters),
    parentHlId: elementOptional(seg, 2, delimiters),
    levelCode: elementValue(seg, 3, delimiters),
    hasChild: elementValue(seg, 4, delimiters),
  });
}

function validateHl(
  hl: X12HierarchicalLevel,
  index: Map<string, X12HierarchicalLevel>,
  position: X12Position,
  warnings: X12ParseWarning[],
): void {
  const expectedParent: string | undefined = EXPECTED_PARENT_LEVEL[hl.levelCode];
  if (expectedParent === undefined) {
    // Top-level (info-source) or unknown level - only parent-mismatch
    // check applies (parent must be absent for "20"; an unknown level is
    // surfaced verbatim, no synthesized expectation).
    if (hl.levelCode === HL_LEVEL_CODES.INFORMATION_SOURCE && hl.parentHlId !== undefined) {
      warnings.push(hlParentMismatch(position));
    }
    return;
  }
  if (hl.parentHlId === undefined) {
    warnings.push(hlParentMismatch(position));
    return;
  }
  const parent = index.get(hl.parentHlId);
  if (parent === undefined) {
    warnings.push(hlParentMismatch(position));
    return;
  }
  if (parent.levelCode !== expectedParent) {
    warnings.push(hlParentLevelInvalid(position));
  }
}

function decodeSbr(seg: X12Segment, delimiters: Delimiters): X12SubscriberInfo {
  return Object.freeze({
    payerResponsibilityCode: elementOptional(seg, 1, delimiters),
    individualRelationshipCode: elementOptional(seg, 2, delimiters),
    groupNumber: elementOptional(seg, 3, delimiters),
    groupName: elementOptional(seg, 4, delimiters),
    claimFilingIndicator: elementOptional(seg, 9, delimiters),
  });
}

function decodePat(seg: X12Segment, delimiters: Delimiters): X12SubscriberInfo {
  return Object.freeze({
    payerResponsibilityCode: undefined,
    individualRelationshipCode: elementOptional(seg, 1, delimiters),
    groupNumber: undefined,
    groupName: undefined,
    claimFilingIndicator: undefined,
  });
}

function mergeSubscriberInfo(base: X12SubscriberInfo, next: X12SubscriberInfo): X12SubscriberInfo {
  return Object.freeze({
    payerResponsibilityCode: next.payerResponsibilityCode ?? base.payerResponsibilityCode,
    individualRelationshipCode: next.individualRelationshipCode ?? base.individualRelationshipCode,
    groupNumber: next.groupNumber ?? base.groupNumber,
    groupName: next.groupName ?? base.groupName,
    claimFilingIndicator: next.claimFilingIndicator ?? base.claimFilingIndicator,
  });
}

function decodeNm1(seg: X12Segment, delimiters: Delimiters): X12ClaimEntity {
  return Object.freeze({
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    entityTypeQualifier: elementValue(seg, 2, delimiters),
    name: elementValue(seg, 3, delimiters),
    firstName: elementOptional(seg, 4, delimiters),
    middleName: elementOptional(seg, 5, delimiters),
    suffix: elementOptional(seg, 7, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
    address: undefined,
    contacts: Object.freeze([]),
    references: Object.freeze([]),
  });
}

function decodeN4(seg: X12Segment, delimiters: Delimiters): X12ClaimAddress {
  return Object.freeze({
    lines: Object.freeze([]),
    city: elementOptional(seg, 1, delimiters),
    state: elementOptional(seg, 2, delimiters),
    postalCode: elementOptional(seg, 3, delimiters),
    countryCode: elementOptional(seg, 4, delimiters),
  });
}

function decodeRef(seg: X12Segment, delimiters: Delimiters): X12ClaimReference {
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    value: elementValue(seg, 2, delimiters),
    description: elementOptional(seg, 3, delimiters),
  });
}

function decodePer(seg: X12Segment, delimiters: Delimiters): X12ClaimContact {
  const comms: { qualifier: string; value: string }[] = [];
  for (const [qIdx, vIdx] of [
    [3, 4],
    [5, 6],
    [7, 8],
  ] as const) {
    const q = elementOptional(seg, qIdx, delimiters);
    const v = elementOptional(seg, vIdx, delimiters);
    if (q !== undefined && v !== undefined) comms.push(Object.freeze({ qualifier: q, value: v }));
  }
  return Object.freeze({
    contactFunctionCode: elementValue(seg, 1, delimiters),
    name: elementOptional(seg, 2, delimiters),
    communications: Object.freeze(comms),
  });
}

function decodeDtp(seg: X12Segment, delimiters: Delimiters): X12ClaimDate | undefined {
  const qualifier = elementOptional(seg, 1, delimiters);
  const formatQualifier = elementValue(seg, 2, delimiters);
  const value = elementOptional(seg, 3, delimiters);
  if (qualifier === undefined || value === undefined) return undefined;
  return Object.freeze({ qualifier, formatQualifier, value });
}

function decodeHi(
  seg: X12Segment,
  delimiters: Delimiters,
  warnings: X12ParseWarning[],
  position: X12Position,
): X12ClaimHiCode[] {
  const out: X12ClaimHiCode[] = [];
  for (let comp = 1; comp <= 12; comp += 1) {
    const qualifier = componentOptional(seg, comp, 1, delimiters);
    const code = componentOptional(seg, comp, 2, delimiters);
    if (qualifier === undefined && code === undefined) continue;
    const dateQualifier = componentOptional(seg, comp, 3, delimiters);
    const date = componentOptional(seg, comp, 4, delimiters);
    const monetary = componentOptional(seg, comp, 5, delimiters);
    const quantity = componentOptional(seg, comp, 6, delimiters);
    const versionId = componentOptional(seg, comp, 7, delimiters);
    const poaIndicator = componentOptional(seg, comp, 9, delimiters);
    const resolved = qualifier === undefined ? undefined : resolveHiQualifier(qualifier);
    const codeSystem: X12HiCodeSystem = resolved?.system ?? "unknown";
    const category: X12HiCategory = resolved?.category ?? "unknown";
    if (qualifier !== undefined && resolved === undefined) {
      warnings.push(unknownHiQualifier(position));
    }
    out.push(
      Object.freeze({
        qualifier: qualifier ?? "",
        codeSystem,
        category,
        code: code ?? "",
        dateQualifier,
        date,
        monetaryAmount: monetary === undefined ? undefined : X12Decimal.fromString(monetary),
        quantity: quantity === undefined ? undefined : X12Decimal.fromString(quantity),
        versionId,
        poaIndicator,
      }),
    );
  }
  return out;
}

function decodeNte(seg: X12Segment, delimiters: Delimiters): X12ClaimNote | undefined {
  const note = elementOptional(seg, 2, delimiters);
  if (note === undefined) return undefined;
  return Object.freeze({
    noteReferenceCode: elementValue(seg, 1, delimiters),
    description: note,
  });
}

function decodeAmt(
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): X12ClaimAmount | undefined {
  const amount = elementDecimal(seg, 2, delimiters, sink);
  if (amount === undefined) return undefined;
  return Object.freeze({ qualifier: elementValue(seg, 1, delimiters), amount });
}

function decodeCas(
  seg: X12Segment,
  delimiters: Delimiters,
  warnings: X12ParseWarning[],
  position: X12Position,
): readonly X12RemitAdjustment[] {
  const sink: X12DecimalWarningSink = { warnings, position };
  const groupCode = elementValue(seg, 1, delimiters);
  const out: X12RemitAdjustment[] = [];
  for (let triple = 0; triple < 6; triple += 1) {
    const base = 2 + triple * 3;
    const reasonCode = elementOptional(seg, base, delimiters);
    const amount = elementDecimal(seg, base + 1, delimiters, sink);
    const quantity = elementDecimal(seg, base + 2, delimiters, sink);
    if (reasonCode === undefined && amount === undefined) continue;
    const code = reasonCode ?? "";
    const entry = code === "" ? undefined : lookupCarc(code);
    if (entry === undefined && code !== "") warnings.push(unknownCarc(position));
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

function decodeTooth(seg: X12Segment, delimiters: Delimiters): X12ToothInformation | undefined {
  const qualifier = elementValue(seg, 1, delimiters);
  const toothCode = elementValue(seg, 2, delimiters);
  if (toothCode === "") return undefined;
  const surfaces: string[] = [];
  for (let p = 1; p <= 5; p += 1) {
    const s = componentOptional(seg, 3, p, delimiters);
    if (s !== undefined) surfaces.push(s);
  }
  return Object.freeze({ qualifier, toothCode, surfaces: Object.freeze(surfaces) });
}

// ---------------------------------------------------------------------------
// Claim / service-line accumulators.
// ---------------------------------------------------------------------------

interface ClaimAccumulator {
  readonly variant: X12Claim837Variant;
  readonly hierarchy: X12HierarchicalLevel | undefined;
  readonly billingProvider: X12ClaimEntity | undefined;
  readonly payToAddress: X12ClaimAddress | undefined;
  readonly payToPlan: X12ClaimEntity | undefined;
  readonly subscriber: X12ClaimMember | undefined;
  readonly payer: X12ClaimEntity | undefined;
  readonly patient: X12ClaimMember | undefined;
  readonly claimId: string;
  readonly totalCharge: X12Decimal;
  readonly placeOfServiceCode: string | undefined;
  readonly facilityCodeQualifier: string | undefined;
  readonly claimFrequencyCode: string | undefined;
  readonly providerSignatureOnFile: string | undefined;
  readonly providerAcceptAssignment: string | undefined;
  readonly benefitsAssignment: string | undefined;
  readonly releaseOfInformationCode: string | undefined;
  readonly dates: X12ClaimDate[];
  readonly diagnoses: X12ClaimHiCode[];
  readonly procedures: X12ClaimHiCode[];
  readonly otherHi: X12ClaimHiCode[];
  readonly notes: X12ClaimNote[];
  readonly amounts: X12ClaimAmount[];
  readonly references: X12ClaimReference[];
  readonly providers: X12ClaimEntity[];
  readonly otherSubscribers: X12OtherSubscriber[];
  readonly serviceLines: X12_837ServiceLine[];
}

type ServiceLineAccumulator =
  | ServiceLinePAccumulator
  | ServiceLineIAccumulator
  | ServiceLineDAccumulator;

interface ServiceLineBaseAccumulator {
  readonly lineNumber: string;
  /** Position of the LX that opened this line - the warning's anchor. @internal */
  readonly position: X12Position;
  /**
   * Set by whichever of `decodeSv1` / `decodeSv2` / `decodeSv3` matches this
   * line's variant. False at flush means nothing on the service segment was
   * ever read, so `charge` / `units` below are seeded stand-ins. @internal
   */
  serviceSegmentDecoded: boolean;
  charge: X12Decimal;
  units: X12Decimal;
  unitOfMeasure: string | undefined;
  placeOfServiceCode: string | undefined;
  readonly dates: X12ClaimDate[];
  readonly references: X12ClaimReference[];
  readonly amounts: X12ClaimAmount[];
  readonly notes: X12ClaimNote[];
  readonly providers: X12ClaimEntity[];
  drug: X12LineDrug | undefined;
  readonly adjudications: X12LineAdjudication[];
}

interface ServiceLinePAccumulator extends ServiceLineBaseAccumulator {
  readonly variant: "P";
  procedureQualifier: string;
  procedureCode: string;
  modifiers: string[];
  diagnosisPointers: string[];
  emergencyIndicator: string | undefined;
  epsdtIndicator: string | undefined;
  familyPlanningIndicator: string | undefined;
}

interface ServiceLineIAccumulator extends ServiceLineBaseAccumulator {
  readonly variant: "I";
  revenueCode: string;
  procedureQualifier: string | undefined;
  procedureCode: string | undefined;
  modifiers: string[];
  serviceLineRate: X12Decimal | undefined;
  nonCoveredCharge: X12Decimal | undefined;
}

interface ServiceLineDAccumulator extends ServiceLineBaseAccumulator {
  readonly variant: "D";
  procedureQualifier: string;
  procedureCode: string;
  modifiers: string[];
  oralCavityArea: string[];
  toothInformation: X12ToothInformation[];
  prosthesisCrownInlayCode: string | undefined;
}

interface OtherSubscriberAccumulator {
  readonly payerResponsibilityCode: string;
  readonly individualRelationshipCode: string | undefined;
  readonly claimFilingIndicator: string | undefined;
  otherSubscriber: X12ClaimEntity | undefined;
  otherPayer: X12ClaimEntity | undefined;
}

interface AdjudicationAccumulator {
  readonly otherPayerId: string;
  readonly amountPaid: X12Decimal;
  readonly procedureQualifier: string | undefined;
  readonly procedureCode: string | undefined;
  readonly paidUnits: X12Decimal | undefined;
  readonly adjustments: X12RemitAdjustment[];
  dateAdjudicated: string | undefined;
}

const EMPTY_SUBSCRIBER_INFO: X12SubscriberInfo = Object.freeze({
  payerResponsibilityCode: undefined,
  individualRelationshipCode: undefined,
  groupNumber: undefined,
  groupName: undefined,
  claimFilingIndicator: undefined,
});

/**
 * The HL-resolved enclosing context the walker hands to {@link openClaim}
 * when a CLM segment opens a Loop 2300. Bundled so adding another piece
 * of context (e.g. Phase 9's profile reference) doesn't grow the
 * function signature. @internal
 */
interface ClaimContext {
  readonly variant: X12Claim837Variant;
  readonly hierarchy: X12HierarchicalLevel | undefined;
  readonly billingProvider: X12ClaimEntity | undefined;
  readonly payToAddress: X12ClaimAddress | undefined;
  readonly payToPlan: X12ClaimEntity | undefined;
  readonly subscriber: X12ClaimMember | undefined;
  readonly payer: X12ClaimEntity | undefined;
  readonly patient: X12ClaimMember | undefined;
}

/** Open a fresh CLM accumulator. @internal */
function openClaim(
  seg: X12Segment,
  delimiters: Delimiters,
  ctx: ClaimContext,
  sink: X12DecimalWarningSink,
): ClaimAccumulator {
  const {
    variant,
    hierarchy,
    billingProvider,
    payToAddress,
    payToPlan,
    subscriber,
    payer,
    patient,
  } = ctx;
  return {
    variant,
    hierarchy,
    billingProvider,
    payToAddress,
    payToPlan,
    subscriber,
    payer,
    patient,
    claimId: elementValue(seg, 1, delimiters),
    totalCharge: elementDecimalOrZero(seg, 2, delimiters, sink),
    placeOfServiceCode: componentOptional(seg, 5, 1, delimiters),
    facilityCodeQualifier: componentOptional(seg, 5, 2, delimiters),
    claimFrequencyCode: componentOptional(seg, 5, 3, delimiters),
    providerSignatureOnFile: elementOptional(seg, 6, delimiters),
    providerAcceptAssignment: elementOptional(seg, 7, delimiters),
    benefitsAssignment: elementOptional(seg, 8, delimiters),
    releaseOfInformationCode: elementOptional(seg, 9, delimiters),
    dates: [],
    diagnoses: [],
    procedures: [],
    otherHi: [],
    notes: [],
    amounts: [],
    references: [],
    providers: [],
    otherSubscribers: [],
    serviceLines: [],
  };
}

function openServiceLine(
  seg: X12Segment,
  delimiters: Delimiters,
  variant: X12Claim837Variant,
  position: X12Position,
): ServiceLineAccumulator | undefined {
  const lineNumber = elementValue(seg, 1, delimiters);
  const base: ServiceLineBaseAccumulator = {
    lineNumber,
    position,
    serviceSegmentDecoded: false,
    charge: X12Decimal.ZERO,
    units: X12Decimal.ZERO,
    unitOfMeasure: undefined,
    placeOfServiceCode: undefined,
    dates: [],
    references: [],
    amounts: [],
    notes: [],
    providers: [],
    drug: undefined,
    adjudications: [],
  };
  if (variant === "P") {
    return {
      ...base,
      variant: "P",
      procedureQualifier: "",
      procedureCode: "",
      modifiers: [],
      diagnosisPointers: [],
      emergencyIndicator: undefined,
      epsdtIndicator: undefined,
      familyPlanningIndicator: undefined,
    };
  }
  if (variant === "I") {
    return {
      ...base,
      variant: "I",
      revenueCode: "",
      procedureQualifier: undefined,
      procedureCode: undefined,
      modifiers: [],
      serviceLineRate: undefined,
      nonCoveredCharge: undefined,
    };
  }
  if (variant === "D") {
    return {
      ...base,
      variant: "D",
      procedureQualifier: "",
      procedureCode: "",
      modifiers: [],
      oralCavityArea: [],
      toothInformation: [],
      prosthesisCrownInlayCode: undefined,
    };
  }
  return undefined;
}

function decodeSv1(
  acc: ServiceLineAccumulator,
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): void {
  if (acc.variant !== "P") return;
  acc.serviceSegmentDecoded = true;
  acc.procedureQualifier = componentOptional(seg, 1, 1, delimiters) ?? "";
  acc.procedureCode = componentOptional(seg, 1, 2, delimiters) ?? "";
  const mods: string[] = [];
  for (let p = 3; p <= 6; p += 1) {
    const m = componentOptional(seg, 1, p, delimiters);
    if (m !== undefined) mods.push(m);
  }
  acc.modifiers = mods;
  acc.charge = elementDecimalOrZero(seg, 2, delimiters, sink);
  acc.unitOfMeasure = elementOptional(seg, 3, delimiters);
  acc.units = elementDecimalOrZero(seg, 4, delimiters, sink);
  acc.placeOfServiceCode = elementOptional(seg, 5, delimiters);
  const pointers: string[] = [];
  for (let p = 1; p <= 4; p += 1) {
    const v = componentOptional(seg, 7, p, delimiters);
    if (v !== undefined) pointers.push(v);
  }
  acc.diagnosisPointers = pointers;
  acc.emergencyIndicator = elementOptional(seg, 9, delimiters);
  acc.epsdtIndicator = elementOptional(seg, 11, delimiters);
  acc.familyPlanningIndicator = elementOptional(seg, 12, delimiters);
}

function decodeSv2(
  acc: ServiceLineAccumulator,
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): void {
  if (acc.variant !== "I") return;
  acc.serviceSegmentDecoded = true;
  acc.revenueCode = elementValue(seg, 1, delimiters);
  acc.procedureQualifier = componentOptional(seg, 2, 1, delimiters);
  acc.procedureCode = componentOptional(seg, 2, 2, delimiters);
  const mods: string[] = [];
  for (let p = 3; p <= 6; p += 1) {
    const m = componentOptional(seg, 2, p, delimiters);
    if (m !== undefined) mods.push(m);
  }
  acc.modifiers = mods;
  acc.charge = elementDecimalOrZero(seg, 3, delimiters, sink);
  acc.unitOfMeasure = elementOptional(seg, 4, delimiters);
  acc.units = elementDecimalOrZero(seg, 5, delimiters, sink);
  acc.serviceLineRate = elementDecimal(seg, 6, delimiters, sink);
  acc.nonCoveredCharge = elementDecimal(seg, 7, delimiters, sink);
}

function decodeSv3(
  acc: ServiceLineAccumulator,
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): void {
  if (acc.variant !== "D") return;
  acc.serviceSegmentDecoded = true;
  acc.procedureQualifier = componentOptional(seg, 1, 1, delimiters) ?? "";
  acc.procedureCode = componentOptional(seg, 1, 2, delimiters) ?? "";
  const mods: string[] = [];
  for (let p = 3; p <= 6; p += 1) {
    const m = componentOptional(seg, 1, p, delimiters);
    if (m !== undefined) mods.push(m);
  }
  acc.modifiers = mods;
  acc.charge = elementDecimalOrZero(seg, 2, delimiters, sink);
  acc.placeOfServiceCode = elementOptional(seg, 3, delimiters);
  const cavities: string[] = [];
  for (let p = 1; p <= 5; p += 1) {
    const v = componentOptional(seg, 4, p, delimiters);
    if (v !== undefined) cavities.push(v);
  }
  acc.oralCavityArea = cavities;
  acc.prosthesisCrownInlayCode = elementOptional(seg, 5, delimiters);
  acc.units = elementDecimalOrZero(seg, 6, delimiters, sink);
}

function openAdjudication(
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): AdjudicationAccumulator {
  return {
    otherPayerId: elementValue(seg, 1, delimiters),
    amountPaid: elementDecimalOrZero(seg, 2, delimiters, sink),
    procedureQualifier: componentOptional(seg, 3, 1, delimiters),
    procedureCode: componentOptional(seg, 3, 2, delimiters),
    paidUnits: elementDecimal(seg, 5, delimiters, sink),
    adjustments: [],
    dateAdjudicated: undefined,
  };
}

// ---------------------------------------------------------------------------
// Address / contact / reference attachment helpers.
//
// Each helper takes an `ActiveEntity` discriminator plus a small bag of
// getter/setter callbacks (so the walker can hold the outer-scope `let`
// bindings without needing a class). Returning early on `undefined`
// entity keeps the walker code straight-line.
// ---------------------------------------------------------------------------

/**
 * Single shared mutator bag the walker hoists once at the top of the
 * function body and passes to every {@link attachAddressLines} /
 * {@link attachAddressFields} / {@link attachContact} /
 * {@link attachReference} call. Closes over the outer `let` bindings, so
 * the getters read live values. Reusing a single bag (vs. constructing
 * one per segment) is both cheaper at runtime and produces a smaller
 * branch-coverage surface - see the `entityMutators` declaration in
 * `get837Claims` for the closure rationale.
 *
 * @internal
 */
interface EntityMutators {
  setBillingProvider: (next: X12ClaimEntity) => void;
  setSubmitter: (next: X12ClaimEntity) => void;
  setReceiver: (next: X12ClaimEntity) => void;
  setPayToPlan: (next: X12ClaimEntity) => void;
  setSubscriber: (next: X12ClaimEntity) => void;
  setPayer: (next: X12ClaimEntity) => void;
  setPatient: (next: X12ClaimEntity) => void;
  setPayToAddress: (next: X12ClaimAddress) => void;
  setOtherSubscriber: (next: X12ClaimEntity) => void;
  setOtherPayer: (next: X12ClaimEntity) => void;
  getCurrentBillingProvider: () => X12ClaimEntity | undefined;
  getCurrentSubmitter: () => X12ClaimEntity | undefined;
  getCurrentReceiver: () => X12ClaimEntity | undefined;
  getCurrentPayToPlan: () => X12ClaimEntity | undefined;
  getCurrentSubscriber: () => X12ClaimEntity | undefined;
  getCurrentPayer: () => X12ClaimEntity | undefined;
  getCurrentPatient: () => X12ClaimEntity | undefined;
  getCurrentPayToAddress: () => X12ClaimAddress | undefined;
  getCurrentOtherSubscriber: () => X12ClaimEntity | undefined;
  getCurrentOtherPayer: () => X12ClaimEntity | undefined;
}

function attachAddressLines(
  lines: readonly string[],
  entity: ActiveEntity | undefined,
  mut: EntityMutators,
): void {
  if (entity === undefined) return;
  const apply = (current: X12ClaimEntity): X12ClaimEntity =>
    withAddress(current, withLines(current.address ?? EMPTY_ADDRESS, lines));
  switch (entity.kind) {
    case "submitter":
      withCurrent(mut.getCurrentSubmitter(), apply, mut.setSubmitter);
      break;
    case "receiver":
      withCurrent(mut.getCurrentReceiver(), apply, mut.setReceiver);
      break;
    case "billingProvider":
      withCurrent(mut.getCurrentBillingProvider(), apply, mut.setBillingProvider);
      break;
    case "payToPlan":
      withCurrent(mut.getCurrentPayToPlan(), apply, mut.setPayToPlan);
      break;
    case "subscriber":
      withCurrent(mut.getCurrentSubscriber(), apply, mut.setSubscriber);
      break;
    case "payer":
      withCurrent(mut.getCurrentPayer(), apply, mut.setPayer);
      break;
    case "patient":
      withCurrent(mut.getCurrentPatient(), apply, mut.setPatient);
      break;
    case "payToAddress": {
      const addr = mut.getCurrentPayToAddress() ?? EMPTY_ADDRESS;
      mut.setPayToAddress(withLines(addr, lines));
      break;
    }
    case "otherSubscriber":
      withCurrent(mut.getCurrentOtherSubscriber(), apply, mut.setOtherSubscriber);
      break;
    case "otherPayer":
      withCurrent(mut.getCurrentOtherPayer(), apply, mut.setOtherPayer);
      break;
    case "lineProvider":
      break;
  }
}

function attachAddressFields(
  fromN4: X12ClaimAddress,
  entity: ActiveEntity | undefined,
  mut: EntityMutators,
): void {
  if (entity === undefined) return;
  const apply = (current: X12ClaimEntity): X12ClaimEntity =>
    withAddress(current, mergeAddress(current.address ?? EMPTY_ADDRESS, fromN4));
  switch (entity.kind) {
    case "submitter":
      withCurrent(mut.getCurrentSubmitter(), apply, mut.setSubmitter);
      break;
    case "receiver":
      withCurrent(mut.getCurrentReceiver(), apply, mut.setReceiver);
      break;
    case "billingProvider":
      withCurrent(mut.getCurrentBillingProvider(), apply, mut.setBillingProvider);
      break;
    case "payToPlan":
      withCurrent(mut.getCurrentPayToPlan(), apply, mut.setPayToPlan);
      break;
    case "subscriber":
      withCurrent(mut.getCurrentSubscriber(), apply, mut.setSubscriber);
      break;
    case "payer":
      withCurrent(mut.getCurrentPayer(), apply, mut.setPayer);
      break;
    case "patient":
      withCurrent(mut.getCurrentPatient(), apply, mut.setPatient);
      break;
    case "payToAddress": {
      const addr = mut.getCurrentPayToAddress() ?? EMPTY_ADDRESS;
      mut.setPayToAddress(mergeAddress(addr, fromN4));
      break;
    }
    case "otherSubscriber":
      withCurrent(mut.getCurrentOtherSubscriber(), apply, mut.setOtherSubscriber);
      break;
    case "otherPayer":
      withCurrent(mut.getCurrentOtherPayer(), apply, mut.setOtherPayer);
      break;
    case "lineProvider":
      break;
  }
}

function attachContact(
  contact: X12ClaimContact,
  entity: ActiveEntity | undefined,
  mut: EntityMutators,
): void {
  if (entity === undefined) return;
  const apply = (current: X12ClaimEntity): X12ClaimEntity => withContact(current, contact);
  switch (entity.kind) {
    case "submitter":
      withCurrent(mut.getCurrentSubmitter(), apply, mut.setSubmitter);
      break;
    case "receiver":
      withCurrent(mut.getCurrentReceiver(), apply, mut.setReceiver);
      break;
    case "billingProvider":
      withCurrent(mut.getCurrentBillingProvider(), apply, mut.setBillingProvider);
      break;
    case "subscriber":
      withCurrent(mut.getCurrentSubscriber(), apply, mut.setSubscriber);
      break;
    case "payer":
      withCurrent(mut.getCurrentPayer(), apply, mut.setPayer);
      break;
    /* v8 ignore start */
    case "patient":
    case "payToAddress":
    case "payToPlan":
    case "otherSubscriber":
    case "otherPayer":
    case "lineProvider":
      // PER is not surfaced on these entities in Phase 5 - verbatim
      // segment is preserved on tx.segments for callers who need it.
      // (v8-ignored: structurally unreachable in v1; exists for switch
      // exhaustiveness on ActiveEntity.)
      break;
    /* v8 ignore stop */
  }
}

function attachReference(
  ref: X12ClaimReference,
  entity: ActiveEntity | undefined,
  mut: EntityMutators,
): void {
  if (entity === undefined) return;
  const apply = (current: X12ClaimEntity): X12ClaimEntity => withReference(current, ref);
  switch (entity.kind) {
    case "submitter":
      withCurrent(mut.getCurrentSubmitter(), apply, mut.setSubmitter);
      break;
    case "receiver":
      withCurrent(mut.getCurrentReceiver(), apply, mut.setReceiver);
      break;
    case "billingProvider":
      withCurrent(mut.getCurrentBillingProvider(), apply, mut.setBillingProvider);
      break;
    case "subscriber":
      withCurrent(mut.getCurrentSubscriber(), apply, mut.setSubscriber);
      break;
    case "payer":
      withCurrent(mut.getCurrentPayer(), apply, mut.setPayer);
      break;
    case "patient":
      withCurrent(mut.getCurrentPatient(), apply, mut.setPatient);
      break;
    /* v8 ignore start */
    case "payToAddress":
    case "payToPlan":
    case "otherSubscriber":
    case "otherPayer":
    case "lineProvider":
      // REF surfaces directly on the in-flight claim / service line
      // before this routing fires; these entity kinds never receive a
      // REF in v1. (v8-ignored: switch-exhaustive defensive cases.)
      break;
    /* v8 ignore stop */
  }
}

function withCurrent<T>(
  current: T | undefined,
  apply: (current: T) => T,
  setter: (next: T) => void,
): void {
  if (current === undefined) return;
  setter(apply(current));
}

const EMPTY_ADDRESS: X12ClaimAddress = Object.freeze({
  lines: Object.freeze([]),
  city: undefined,
  state: undefined,
  postalCode: undefined,
  countryCode: undefined,
});

function withAddress(entity: X12ClaimEntity, address: X12ClaimAddress): X12ClaimEntity {
  return Object.freeze({ ...entity, address });
}
function withLines(address: X12ClaimAddress, lines: readonly string[]): X12ClaimAddress {
  return Object.freeze({ ...address, lines: Object.freeze([...address.lines, ...lines]) });
}
function mergeAddress(base: X12ClaimAddress, fromN4: X12ClaimAddress): X12ClaimAddress {
  return Object.freeze({
    lines: base.lines,
    city: fromN4.city ?? base.city,
    state: fromN4.state ?? base.state,
    postalCode: fromN4.postalCode ?? base.postalCode,
    countryCode: fromN4.countryCode ?? base.countryCode,
  });
}
function withContact(entity: X12ClaimEntity, contact: X12ClaimContact): X12ClaimEntity {
  return Object.freeze({
    ...entity,
    contacts: Object.freeze([...entity.contacts, contact]),
  });
}
function withReference(entity: X12ClaimEntity, ref: X12ClaimReference): X12ClaimEntity {
  return Object.freeze({
    ...entity,
    references: Object.freeze([...entity.references, ref]),
  });
}

// ---------------------------------------------------------------------------
// Freezing accumulators into the readonly public shape.
// ---------------------------------------------------------------------------

function freezeAdjudication(acc: AdjudicationAccumulator): X12LineAdjudication {
  return Object.freeze({
    otherPayerId: acc.otherPayerId,
    amountPaid: acc.amountPaid,
    procedureQualifier: acc.procedureQualifier,
    procedureCode: acc.procedureCode,
    paidUnits: acc.paidUnits,
    adjustments: Object.freeze(acc.adjustments.slice()),
    dateAdjudicated: acc.dateAdjudicated,
  });
}

function freezeServiceLine(acc: ServiceLineAccumulator): X12_837ServiceLine {
  const base = {
    lineNumber: acc.lineNumber,
    charge: acc.charge,
    units: acc.units,
    unitOfMeasure: acc.unitOfMeasure,
    placeOfServiceCode: acc.placeOfServiceCode,
    dates: Object.freeze(acc.dates.slice()),
    references: Object.freeze(acc.references.slice()),
    amounts: Object.freeze(acc.amounts.slice()),
    notes: Object.freeze(acc.notes.slice()),
    providers: Object.freeze(acc.providers.slice()),
    drug: acc.drug,
    adjudications: Object.freeze(acc.adjudications.slice()),
  };
  if (acc.variant === "P") {
    return Object.freeze({
      ...base,
      variant: "P" as const,
      procedureQualifier: acc.procedureQualifier,
      procedureCode: acc.procedureCode,
      modifiers: Object.freeze(acc.modifiers.slice()),
      diagnosisPointers: Object.freeze(acc.diagnosisPointers.slice()),
      emergencyIndicator: acc.emergencyIndicator,
      epsdtIndicator: acc.epsdtIndicator,
      familyPlanningIndicator: acc.familyPlanningIndicator,
    });
  }
  if (acc.variant === "I") {
    return Object.freeze({
      ...base,
      variant: "I" as const,
      revenueCode: acc.revenueCode,
      procedureQualifier: acc.procedureQualifier,
      procedureCode: acc.procedureCode,
      modifiers: Object.freeze(acc.modifiers.slice()),
      serviceLineRate: acc.serviceLineRate,
      nonCoveredCharge: acc.nonCoveredCharge,
    });
  }
  return Object.freeze({
    ...base,
    variant: "D" as const,
    procedureQualifier: acc.procedureQualifier,
    procedureCode: acc.procedureCode,
    modifiers: Object.freeze(acc.modifiers.slice()),
    oralCavityArea: Object.freeze(acc.oralCavityArea.slice()),
    toothInformation: Object.freeze(acc.toothInformation.slice()),
    prosthesisCrownInlayCode: acc.prosthesisCrownInlayCode,
  });
}

function freezeOtherSubscriber(acc: OtherSubscriberAccumulator): X12OtherSubscriber {
  return Object.freeze({
    payerResponsibilityCode: acc.payerResponsibilityCode,
    individualRelationshipCode: acc.individualRelationshipCode,
    claimFilingIndicator: acc.claimFilingIndicator,
    otherSubscriber: acc.otherSubscriber,
    otherPayer: acc.otherPayer,
  });
}

function freezeClaim(acc: ClaimAccumulator): X12Claim {
  return Object.freeze({
    variant: acc.variant,
    hierarchy: acc.hierarchy,
    billingProvider: acc.billingProvider,
    payToAddress: acc.payToAddress,
    payToPlan: acc.payToPlan,
    subscriber: acc.subscriber,
    payer: acc.payer,
    patient: acc.patient,
    claimId: acc.claimId,
    totalCharge: acc.totalCharge,
    placeOfServiceCode: acc.placeOfServiceCode,
    facilityCodeQualifier: acc.facilityCodeQualifier,
    claimFrequencyCode: acc.claimFrequencyCode,
    providerSignatureOnFile: acc.providerSignatureOnFile,
    providerAcceptAssignment: acc.providerAcceptAssignment,
    benefitsAssignment: acc.benefitsAssignment,
    releaseOfInformationCode: acc.releaseOfInformationCode,
    dates: Object.freeze(acc.dates.slice()),
    diagnoses: Object.freeze(acc.diagnoses.slice()),
    procedures: Object.freeze(acc.procedures.slice()),
    otherHi: Object.freeze(acc.otherHi.slice()),
    notes: Object.freeze(acc.notes.slice()),
    amounts: Object.freeze(acc.amounts.slice()),
    references: Object.freeze(acc.references.slice()),
    providers: Object.freeze(acc.providers.slice()),
    otherSubscribers: Object.freeze(acc.otherSubscribers.slice()),
    serviceLines: Object.freeze(acc.serviceLines.slice()),
  });
}
