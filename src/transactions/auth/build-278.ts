/**
 * `build278Request` / `build278Response` - pure-function builders for a
 * 005010 278 Health Care Services Review: Request for Review (`005010X217`)
 * and Response (`005010X216`). NEVER auto-sends, NEVER opens a socket, NEVER
 * touches the filesystem. The library mechanically emits the review it is
 * told; a spec whose UMO → requester → subscriber → (dependent) → reviews
 * tree cannot form a valid HL hierarchy is REFUSED via {@link
 * "./build-errors.js".ServicesReview278BuildError}.
 *
 * The HL spine is the 278's safety primitive, so the builder OWNS it: it
 * computes every HL-01 id (sequential within the transaction), HL-02 parent
 * pointer (20 → 21 → 22 → 23 → EV/SS), and HL-04 has-child flag from the
 * nested tree. Callers never hand-code the spine - a structurally
 * inconsistent hierarchy is therefore unrepresentable, and the SE-01 segment
 * count is correct by construction.
 *
 * **The certification decision is response-only and safety-critical.**
 * {@link build278Request} REFUSES a review carrying a `decision`; {@link
 * build278Response} emits the supplied HCR-01 `actionCode` VERBATIM - never
 * inferred, never upgraded - so the response round-trips the exact outcome
 * the caller supplied through {@link "./get-278.js".get278Response}.
 *
 * The read side ({@link "./get-278.js".get278Request} / {@link
 * "./get-278.js".get278Response}) is lenient - a real 278 with a broken HL
 * parent pointer is WARNED, never rejected. The builder takes the opposite
 * stance: it REFUSES rather than emit a hierarchy a downstream consumer would
 * have to repair. A caller that must reproduce a knowingly-malformed payer
 * artifact drops to {@link
 * "../../builder/build-interchange.js".buildInterchange}, which applies no
 * domain guard.
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single GS..GE
 * functional group (GS-01 `"HI"`) containing a single ST..SE 278 transaction
 * set (ST-03 per direction), spec-clean and round-trippable through {@link
 * parseX12}.
 */

import { AUTH_278_BUILD_ERROR_CODES, ServicesReview278BuildError } from "./build-errors.js";
import type {
  Build278DependentSpec,
  Build278EntitySpec,
  Build278MemberSpec,
  Build278ReviewSpec,
  Build278Spec,
  Build278SubscriberSpec,
} from "./build-278-types.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";
import { requireCallerArray } from "../../builder/caller-array.js";
import { requireCallerSegment } from "../../builder/caller-segment.js";
import { renderCallerValue } from "../../builder/caller-value.js";
import { makeCallerEscaper } from "../../builder/caller-string.js";
import { requireControlNumber } from "../../builder/caller-control-number.js";

/**
 * Refuse with this module's typed error, for {@link requireCallerArray}. A
 * forged array-like where the HL spine expects a review list makes the
 * hierarchy structurally impossible, so it reuses
 * `X12_278_BUILD_INVALID_HIERARCHY` rather than minting a code. @internal
 */
function refuseHierarchy(message: string): never {
  throw new ServicesReview278BuildError(
    AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_HIERARCHY,
    message,
  );
}

/**
 * Refuse with this module's typed error, for {@link makeCallerEscaper}. A
 * non-string element value is a non-hierarchy precondition failure, so it takes
 * `X12_278_BUILD_INVALID_SPEC` rather than the hierarchy code. @internal
 */
function refuseSpec(message: string): never {
  throw new ServicesReview278BuildError(
    AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
    message,
  );
}

/** GS-01 functional identifier code for the 278. `HI` = Health Care Services Review Information. @internal */
const X12_278_FUNCTIONAL_ID = "HI";

/** GS-07 standards agency code - `X` for ASC X12. @internal */
const X12_AGENCY_CODE = "X";

/** ST-03 / GS-08 version + release for each builder entry point. @internal */
type ServicesReviewVersion = "005010X217" | "005010X216";

/** HL-03 level codes for the spine the builder computes. @internal */
const HL_LEVEL = {
  UMO: "20",
  REQUESTER: "21",
  SUBSCRIBER: "22",
  DEPENDENT: "23",
} as const;

/** Default review HL-03 level code when the spec omits it. @internal */
const DEFAULT_REVIEW_LEVEL = "EV";

/**
 * The only two HL-03 level codes a 278 review may carry: `EV` at Loop 2000E and
 * `SS` at Loop 2000F.
 *
 * **Grounded OUTSIDE this repo, because checking a spec claim against this
 * package's own reader is not a check** (`X12-SVC-ELEMENT-MAP-OFF-BY-ONE`), and
 * this guard now REJECTS callers. TR3 005010X217 is a paid X12 document and
 * nobody here has read it. The source used is a published payer implementation
 * of X217, the Indiana Medicaid FFS / Kepro "278 Health Care Services Review
 * Information - Request" guide, whose per-loop HL03 tables each read
 * `Total Codes: 250, Included: 1`:
 *
 * ```text
 * Loop 2000A -> 20 Information Source      Loop 2000D -> 23 Dependent
 * Loop 2000B -> 21 Information Receiver    Loop 2000E -> EV Event
 * Loop 2000C -> 22 Subscriber              Loop 2000F -> SS Services
 * ```
 *
 * **The negative control is in that table.** The same extraction over the same
 * document answers something DIFFERENT at four of the six loops, so it is not a
 * source that returns the same thing for every input - which is the test
 * `X12-277-SVC07-NOT-DECODED` set for any usage or code-list claim here.
 *
 * This is the one HL-03 in the library the caller supplies. Every other level
 * on every builder's spine is a module constant selected by tree position, so
 * `Build278ReviewSpec.levelCode` is the only place an out-of-enum level can
 * enter - which is why the guard is a two-member list here and nothing
 * anywhere else. @internal
 */
const REVIEW_LEVEL_CODES: readonly string[] = Object.freeze(["EV", "SS"]);

/**
 * `build278Request` - assemble a 005010X217 278 Request for Review around the
 * supplied spec. Refuses any review carrying an HCR `decision` (HCR is
 * response-only), and any review whose HL-03 `levelCode` is outside
 * `EV` / `SS`.
 *
 * @example
 * ```ts
 * import { build278Request } from "@cosyte/x12";
 * const ix = build278Request({
 *   envelope: {
 *     senderId: "SUBMITTER", receiverId: "UMOPAYER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   header: { structurePurposeCode: "0078", purposeCode: "13", referenceId: "AUTHREQ-202606" },
 *   utilizationManagementOrganization: { entityIdentifierCode: "X3", entityTypeQualifier: "2", name: "UTILIZATION REVIEW CO", idQualifier: "PI", idCode: "UMO001" },
 *   requester: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "RENDERING CLINIC", idQualifier: "XX", idCode: "1234567893" },
 *   subscriber: {
 *     member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
 *     reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1" }],
 *   },
 * });
 * ```
 */
export function build278Request(spec: Build278Spec): X12Interchange {
  return buildServicesReview("005010X217", "request", spec);
}

/**
 * `build278Response` - assemble a 005010X216 278 Response around the supplied
 * spec. The HCR `actionCode` on each review's `decision` is emitted VERBATIM
 * (never inferred), so the response round-trips the exact certification
 * outcome through {@link "./get-278.js".get278Response}. A review whose HL-03
 * `levelCode` is outside `EV` / `SS` is REFUSED, because that round trip is
 * what an out-of-enum level breaks: the emitted review loop is one no reader
 * opens, so the decision fails to decode.
 *
 * @example
 * ```ts
 * import { build278Response } from "@cosyte/x12";
 * declare const base: import("@cosyte/x12").Build278Spec;
 * const ix = build278Response({
 *   ...base,
 *   subscriber: {
 *     ...base.subscriber,
 *     reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I", decision: { actionCode: "A1", reviewIdentificationNumber: "AUTH123456" } }],
 *   },
 * }); // ST-03 = 005010X216, HCR*A1*AUTH123456
 * ```
 */
export function build278Response(spec: Build278Spec): X12Interchange {
  return buildServicesReview("005010X216", "response", spec);
}

/**
 * Shared emit path for both directions. `version` fixes the GS-08 / ST-03
 * reference and `direction` gates the HCR decision (response-only); the rest
 * is driven by the spec. Mirrors how `build277` / `build277CA` delegate to a
 * single `buildClaimStatus`. @internal
 */
function buildServicesReview(
  version: ServicesReviewVersion,
  direction: "request" | "response",
  spec: Build278Spec,
): X12Interchange {
  const { envelope } = spec;

  // ---- Structural preconditions (refuse an impossible spine) ------------

  enforceStructuralSpec(spec, direction);

  // ---- Delimiter resolution + escape helper -----------------------------

  const elementSeparator = envelope.elementSeparator ?? "*";
  const repetitionSeparator = envelope.repetitionSeparator ?? "^";
  const componentSeparator = envelope.componentSeparator ?? ":";
  const segmentTerminator = envelope.segmentTerminator ?? "~";
  const delimiters = {
    element: elementSeparator,
    repetition: repetitionSeparator,
    component: componentSeparator,
    segment: segmentTerminator,
  };
  const esc = makeCallerEscaper(delimiters, "build278", refuseSpec);

  const seg = (parts: readonly string[]): string => {
    requireCallerSegment(parts, "build278", refuseSpec);
    let end = parts.length;
    while (end > 1 && parts[end - 1] === "") end -= 1;
    return parts.slice(0, end).join(elementSeparator) + segmentTerminator;
  };

  const comp = (components: readonly string[]): string => {
    const escaped = components.map(esc);
    let end = escaped.length;
    while (end > 0 && escaped[end - 1] === "") end -= 1;
    return escaped.slice(0, end).join(componentSeparator);
  };

  const ctx: EmitContext = { seg, esc, comp };

  // ---- ISA envelope -----------------------------------------------------

  const senderQualifier = envelope.senderQualifier ?? "ZZ";
  const receiverQualifier = envelope.receiverQualifier ?? "ZZ";
  const usageIndicator = envelope.usageIndicator ?? "P";
  // ---- Envelope control numbers -----------------------------------------
  //
  // Refused before the envelope is assembled, because every one of the three
  // pairs was silent on an empty value and two of them were silent in different
  // ways: `padControl("", 9)` FABRICATES `"000000000"` into ISA-13 / IEA-02,
  // while GS-06 / GE-02 and ST-02 / SE-02 reach the wire through `esc`, which
  // early-returns on `""`, so the required element is LOST.
  //
  // 🛑 SAY `warnings: []`, NEVER "the pair reconciled against itself". That is
  // true only of `buildInterchange` and `build999`, which join untrimmed. THIS
  // builder's `seg` trims a trailing empty element, so the trailer carried no
  // GE-02 and no SE-02 at all - measured at `28b417f` in all seven domain
  // builders (`GE*1~`, and `SE*15~`/`17~`/`18~`/`19~`/`21~`/`22~`/`25~`), with
  // GS-06 and ST-02 empty mid-segment and `warnings: []` throughout. A draft
  // published the `buildInterchange` reading as the class and pass 2 measured
  // it false here. The refuse-rather-than-warn reasoning is in
  // `src/builder/caller-control-number.ts`.
  //
  // Placed here rather than at the top of the function, so every guard ABOVE
  // this line keeps its precedence. It does NOT preserve every ordering, and a
  // draft of this comment claimed it did: a defect this builder detects LATER,
  // during body assembly, now reports THIS refusal instead, on this module's
  // own `*_INVALID_SPEC` code. Measured in `build999` and disclosed in
  // `CHANGELOG.md`; do not restate it as "the same first refusal as before".
  requireControlNumber(
    envelope.interchangeControlNumber,
    "ISA-13 / IEA-02",
    "interchangeControlNumber",
    "build278",
    refuseSpec,
  );
  requireControlNumber(
    envelope.groupControlNumber,
    "GS-06 / GE-02",
    "groupControlNumber",
    "build278",
    refuseSpec,
  );
  requireControlNumber(
    envelope.transactionSetControlNumber,
    "ST-02 / SE-02",
    "transactionSetControlNumber",
    "build278",
    refuseSpec,
  );

  const interchangeControlNumber = padControl(envelope.interchangeControlNumber, 9);
  const isa =
    [
      "ISA",
      "00",
      pad(" ", 10),
      "00",
      pad(" ", 10),
      pad(senderQualifier, 2),
      pad(envelope.senderId, 15),
      pad(receiverQualifier, 2),
      pad(envelope.receiverId, 15),
      pad(envelope.interchangeDate, 6),
      pad(envelope.interchangeTime, 4),
      repetitionSeparator,
      "00501",
      interchangeControlNumber,
      "0",
      usageIndicator,
      componentSeparator,
    ].join(elementSeparator) + segmentTerminator;

  // ---- GS / ST ----------------------------------------------------------

  const groupDate = envelope.groupDate ?? expandYY(envelope.interchangeDate);
  const groupTime = envelope.groupTime ?? envelope.interchangeTime;
  const applicationSenderCode = envelope.applicationSenderCode ?? envelope.senderId;
  const applicationReceiverCode = envelope.applicationReceiverCode ?? envelope.receiverId;

  const gs = seg([
    "GS",
    X12_278_FUNCTIONAL_ID,
    esc(applicationSenderCode),
    esc(applicationReceiverCode),
    esc(groupDate),
    esc(groupTime),
    esc(envelope.groupControlNumber),
    X12_AGENCY_CODE,
    version,
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = seg(["ST", "278", esc(stControlNumber), version]);

  // ---- BHT header -------------------------------------------------------

  const { header } = spec;
  const bht = seg([
    "BHT",
    esc(header.structurePurposeCode),
    esc(header.purposeCode ?? ""),
    esc(header.referenceId ?? ""),
    esc(header.date ?? ""),
    esc(header.time ?? ""),
    esc(header.transactionTypeCode ?? ""),
  ]);

  // ---- Body segments - emit the computed HL spine depth-first -----------

  const body: string[] = [bht];
  const hlCounter: HlCounter = { next: 1 };

  const umoHlId = String(hlCounter.next);
  hlCounter.next += 1;
  body.push(ctx.seg(["HL", umoHlId, "", HL_LEVEL.UMO, "1"]));
  emitEntity(spec.utilizationManagementOrganization, body, ctx);

  const requesterHlId = String(hlCounter.next);
  hlCounter.next += 1;
  body.push(ctx.seg(["HL", requesterHlId, umoHlId, HL_LEVEL.REQUESTER, "1"]));
  emitEntity(spec.requester, body, ctx);

  emitSubscriber(spec.subscriber, requesterHlId, direction, body, ctx, hlCounter);

  // ---- SE / GE / IEA ----------------------------------------------------

  const seCount = body.length + 2;
  const se = seg(["SE", String(seCount), esc(stControlNumber)]);
  const ge = seg(["GE", "1", esc(envelope.groupControlNumber)]);
  const iea = seg(["IEA", "1", interchangeControlNumber]);

  const raw = isa + gs + st + body.join("") + se + ge + iea;

  // Final round-trip through `parseX12` so the returned interchange is
  // bit-identical with the parsed form every other helper consumes.
  return parseX12(raw);
}

// ---------------------------------------------------------------------------
// Structural guards.
// ---------------------------------------------------------------------------

/**
 * Refuse a structurally impossible spec before any emit. Covers the HL spine
 * (a subscriber with neither a review nor a dependent; a dependent with no
 * review) and the per-review preconditions (an HL-03 level code outside
 * `EV` / `SS`; a review with no `requestCategoryCode`; a request review
 * carrying an HCR decision; a response review whose decision `actionCode` is
 * empty). PHI-clean: messages carry structural indices, counts and X12 control
 * codes, never names / member ids / traces. @internal
 */
function enforceStructuralSpec(spec: Build278Spec, direction: "request" | "response"): void {
  const subscriber = spec.subscriber;
  const subscriberReviews = requireCallerArray(
    subscriber.reviews,
    "build278: spec.subscriber.reviews",
    refuseHierarchy,
  );
  if (subscriberReviews.length === 0 && subscriber.dependent === undefined) {
    throw new ServicesReview278BuildError(
      AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_HIERARCHY,
      "build278: subscriber has neither a review (HL level EV/SS) nor a dependent (HL level 23).",
    );
  }
  for (let r = 0; r < subscriberReviews.length; r += 1) {
    const review = subscriberReviews[r];
    if (review !== undefined) enforceReview(review, `subscriber.review[${String(r)}]`, direction);
  }
  const dependent = subscriber.dependent;
  if (dependent !== undefined) {
    const dependentReviews = requireCallerArray(
      dependent.reviews,
      "build278: spec.subscriber.dependent.reviews",
      refuseHierarchy,
    );
    if (dependentReviews.length === 0) {
      throw new ServicesReview278BuildError(
        AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_HIERARCHY,
        "build278: dependent has no review (HL level EV/SS) child.",
      );
    }
    for (let r = 0; r < dependentReviews.length; r += 1) {
      const review = dependentReviews[r];
      if (review !== undefined) enforceReview(review, `dependent.review[${String(r)}]`, direction);
    }
  }
}

/**
 * Refuse a review whose HL-03 level code is outside `EV` / `SS`, a review with
 * no request category code, a request review carrying an HCR decision
 * (response-only), or a response decision with an empty action code. Recurses
 * into nested service reviews.
 *
 * **The HL-03 arm is `REFUSAL-MESSAGE-PHI-ECHO`'s second half, and its failure
 * mode is worth stating precisely rather than escalating.** `levelCode` is
 * typed `"EV" | "SS"`, but a JS or JSON caller reaches this with anything, and
 * `esc` only type-checks and escapes - it never constrained the value. The read
 * side is deliberately tolerant at these two levels (they attach under a
 * subscriber OR a dependent, so they are absent from `get-278.ts`'s
 * expected-parent map), so an out-of-enum HL-03 falls to its `else` arm, the
 * review loop never opens, and the review **fails to decode**. It does not
 * decode WRONGLY: nothing is mis-read, no certification decision comes back as
 * a different decision, and the bytes stay on `tx.segments`. That is the better
 * of the two failure modes - but the HCR-01 certification action is a
 * safety-critical field this library places verbatim and never infers, and
 * emitting a document in which it silently disappears is the emit side being
 * lenient on the strict half of Postel's Law. So the builder refuses, exactly
 * as `build834` refuses a maintenance type it cannot name.
 *
 * **No caller who was getting the review into the document is broken by it.**
 * An out-of-enum level never produced a decodable review, so there is no value
 * that worked and stops working; a TypeScript caller could not reach the arm at
 * all. An ABSENT `levelCode` still defaults to `EV` and is untouched. @internal
 */
function enforceReview(
  review: Build278ReviewSpec,
  locator: string,
  direction: "request" | "response",
): void {
  // Resolved through the SAME `?? DEFAULT_REVIEW_LEVEL` expression `emitReview`
  // uses, deliberately, rather than testing `review.levelCode !== undefined`.
  // `null` is what a `JSON.parse`d spec carries for an absent optional, and
  // `??` answers it as absent; a guard that tested `undefined` alone refused a
  // spec the emitter would have defaulted to `EV` and built cleanly. That is
  // `X12-CALLER-VALUE-RESIDUALS`' recorded regression in the other direction,
  // and this file's own test caught it before it shipped.
  const resolvedLevel = review.levelCode ?? DEFAULT_REVIEW_LEVEL;
  if (!REVIEW_LEVEL_CODES.includes(resolvedLevel)) {
    throw new ServicesReview278BuildError(
      AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
      `build278: review at ${locator} has HL-03 level code ${renderCallerValue(resolvedLevel)}; ` +
        `a review level must be "EV" (patient event) or "SS" (service). A level outside those two ` +
        `emits a well-formed document whose review loop no reader opens, so the review and its HCR-01 ` +
        `certification decision would not decode.`,
    );
  }
  if (review.requestCategoryCode === "") {
    throw new ServicesReview278BuildError(
      AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
      `build278: review at ${locator} requires a non-empty request category code (UM-01).`,
    );
  }
  if (review.decision !== undefined) {
    if (direction === "request") {
      throw new ServicesReview278BuildError(
        AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
        `build278: review at ${locator} carries an HCR certification decision, which is response-only.`,
      );
    }
    if (review.decision.actionCode === "") {
      throw new ServicesReview278BuildError(
        AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
        `build278: response review at ${locator} has an HCR decision with an empty action code (HCR-01).`,
      );
    }
  }
  const nested = requireCallerArray(
    review.reviews,
    `build278: review at ${locator}: reviews`,
    refuseHierarchy,
  );
  for (let r = 0; r < nested.length; r += 1) {
    const child = nested[r];
    if (child !== undefined) enforceReview(child, `${locator}.review[${String(r)}]`, direction);
  }
}

// ---------------------------------------------------------------------------
// Loop emitters.
// ---------------------------------------------------------------------------

interface EmitContext {
  readonly seg: (parts: readonly string[]) => string;
  readonly esc: (value: string) => string;
  readonly comp: (components: readonly string[]) => string;
}

interface HlCounter {
  next: number;
}

/**
 * Emit the Loop 2000C subscriber HL + member NM1/DMG + subscriber-level
 * reviews + an optional dependent subtree. @internal
 */
function emitSubscriber(
  subscriber: Build278SubscriberSpec,
  parentHlId: string,
  direction: "request" | "response",
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.SUBSCRIBER, "1"]));

  if (subscriber.member !== undefined) emitMember(subscriber.member, body, ctx);
  for (const review of subscriber.reviews ?? []) {
    emitReview(review, hlId, direction, body, ctx, counter);
  }
  if (subscriber.dependent !== undefined) {
    emitDependent(subscriber.dependent, hlId, direction, body, ctx, counter);
  }
}

/** Emit the Loop 2000D dependent HL + member NM1/DMG + reviews. @internal */
function emitDependent(
  dependent: Build278DependentSpec,
  parentHlId: string,
  direction: "request" | "response",
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.DEPENDENT, "1"]));

  if (dependent.member !== undefined) emitMember(dependent.member, body, ctx);
  for (const review of dependent.reviews) {
    emitReview(review, hlId, direction, body, ctx, counter);
  }
}

/**
 * Emit a Loop 2000E/2000F review HL + its UM / HCR / HI / NM1 / TRN / REF /
 * DTP / MSG detail, then recurse into any nested service reviews. HL-04 is
 * `"1"` when nested reviews are present. @internal
 */
function emitReview(
  review: Build278ReviewSpec,
  parentHlId: string,
  direction: "request" | "response",
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  const nested = review.reviews ?? [];
  const hasChild = nested.length > 0 ? "1" : "0";
  const levelCode = review.levelCode ?? DEFAULT_REVIEW_LEVEL;
  body.push(ctx.seg(["HL", hlId, parentHlId, ctx.esc(levelCode), hasChild]));

  for (const trace of review.traces ?? []) {
    body.push(
      ctx.seg([
        "TRN",
        ctx.esc(trace.traceTypeCode),
        ctx.esc(trace.referenceId),
        ctx.esc(trace.originatingCompanyId ?? ""),
        ctx.esc(trace.supplementalReferenceId ?? ""),
      ]),
    );
  }

  body.push(
    ctx.seg([
      "UM",
      ctx.esc(review.requestCategoryCode),
      ctx.esc(review.certificationTypeCode ?? ""),
      ctx.esc(review.serviceTypeCode ?? ""),
      "",
      "",
      ctx.esc(review.levelOfServiceCode ?? ""),
    ]),
  );

  if (review.decision !== undefined) {
    body.push(
      ctx.seg([
        "HCR",
        ctx.esc(review.decision.actionCode),
        ctx.esc(review.decision.reviewIdentificationNumber ?? ""),
        ctx.esc(review.decision.reasonCode ?? ""),
        ctx.esc(review.decision.secondSurgicalOpinionCode ?? ""),
      ]),
    );
  }

  for (const ref of review.references ?? []) {
    body.push(
      ctx.seg(["REF", ctx.esc(ref.qualifier), ctx.esc(ref.value), ctx.esc(ref.description ?? "")]),
    );
  }

  for (const date of review.dates ?? []) {
    body.push(
      ctx.seg(["DTP", ctx.esc(date.qualifier), ctx.esc(date.formatQualifier), ctx.esc(date.value)]),
    );
  }

  const diagnoses = review.diagnoses ?? [];
  if (diagnoses.length > 0) {
    body.push(ctx.seg(["HI", ...diagnoses.map((dx) => ctx.comp([dx.qualifier, dx.code]))]));
  }

  for (const message of review.messages ?? []) {
    body.push(ctx.seg(["MSG", ctx.esc(message)]));
  }

  for (const provider of review.providers ?? []) emitEntity(provider, body, ctx);

  for (const child of nested) {
    emitReview(child, hlId, direction, body, ctx, counter);
  }
}

/** Emit an NM1 entity (UMO / requester / provider). @internal */
function emitEntity(entity: Build278EntitySpec, body: string[], ctx: EmitContext): void {
  body.push(
    ctx.seg([
      "NM1",
      ctx.esc(entity.entityIdentifierCode),
      ctx.esc(entity.entityTypeQualifier),
      ctx.esc(entity.name),
      "",
      "",
      "",
      "",
      ctx.esc(entity.idQualifier ?? ""),
      ctx.esc(entity.idCode ?? ""),
    ]),
  );
}

/** Emit an NM1 member name (subscriber / dependent) + optional DMG. @internal */
function emitMember(member: Build278MemberSpec, body: string[], ctx: EmitContext): void {
  body.push(
    ctx.seg([
      "NM1",
      ctx.esc(member.entityIdentifierCode),
      ctx.esc(member.entityTypeQualifier),
      ctx.esc(member.lastName ?? ""),
      ctx.esc(member.firstName ?? ""),
      ctx.esc(member.middleName ?? ""),
      "",
      ctx.esc(member.suffix ?? ""),
      ctx.esc(member.idQualifier ?? ""),
      ctx.esc(member.idCode ?? ""),
    ]),
  );
  if (member.dateOfBirth !== undefined || member.genderCode !== undefined) {
    body.push(
      ctx.seg(["DMG", "D8", ctx.esc(member.dateOfBirth ?? ""), ctx.esc(member.genderCode ?? "")]),
    );
  }
}

// ---------------------------------------------------------------------------
// String helpers - mirror the `build277` emit primitives.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always 9).
 * Throws {@link ServicesReview278BuildError} if the value already exceeds the
 * width. @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new ServicesReview278BuildError(
    AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
    `build278: control number ${renderCallerValue(value)} exceeds the ${String(width)}-char spec limit.`,
  );
}

/**
 * Expand a 6-digit YYMMDD into CCYYMMDD for GS-04. Years `00`–`49` are 21st
 * century, `50`–`99` are 20th. A value already in CCYYMMDD form passes
 * through unchanged. @internal
 */
function expandYY(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  if (Number.isNaN(yy)) return yymmdd;
  const century = yy < 50 ? "20" : "19";
  return century + yymmdd;
}
