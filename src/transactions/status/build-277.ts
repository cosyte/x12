/**
 * `build277` / `build277CA` — pure-function builders for a 005010 277 Claim
 * Status Response (`005010X212`) and 277CA Claim Acknowledgment
 * (`005010X214`). NEVER auto-sends, NEVER opens a socket, NEVER touches the
 * filesystem. The library mechanically emits the response it is told; a
 * spec whose informationSources → receivers → providers → subscribers →
 * (dependents) tree cannot form a valid HL hierarchy is REFUSED via {@link
 * "./build-errors.js".ClaimStatus277BuildError}.
 *
 * The HL spine is the 277's safety primitive, so the builder OWNS it: it
 * computes every HL-01 id (sequential within the transaction), HL-02 parent
 * pointer (20 → 21 → 19 → 22 → 23), and HL-04 has-child flag from the
 * nested tree. Callers never hand-code the spine — a structurally
 * inconsistent hierarchy is therefore unrepresentable, and the SE-01
 * segment count is correct by construction.
 *
 * The read side ({@link "./get-277.js".get277Status}) is lenient — a real
 * 277 with a broken HL parent pointer is WARNED, never rejected. The builder
 * takes the opposite stance: it REFUSES rather than emit a hierarchy a
 * downstream consumer would have to repair. A caller that must reproduce a
 * knowingly-malformed payer artifact drops to {@link
 * "../../builder/build-interchange.js".buildInterchange}, which applies no
 * domain guard.
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single GS..GE
 * functional group (GS-01 `"HN"`) containing a single ST..SE 277
 * transaction set (ST-03 per variant), spec-clean and round-trippable
 * through {@link parseX12}. The builder emits segments in TR3 loop order so
 * a well-formed spec round-trips through `get277Status` /
 * `get277CADisposition` field-for-field.
 */

import { CLAIM_STATUS_277_BUILD_ERROR_CODES, ClaimStatus277BuildError } from "./build-errors.js";
import type {
  Build277ClaimSpec,
  Build277DependentSpec,
  Build277EntitySpec,
  Build277InformationReceiverSpec,
  Build277InformationSourceSpec,
  Build277MemberSpec,
  Build277ProviderSpec,
  Build277ReferenceSpec,
  Build277ServiceLineSpec,
  Build277Spec,
  Build277StatusSpec,
  Build277SubscriberSpec,
} from "./build-277-types.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";
import { escapeRelease } from "../../parser/release.js";

/** GS-01 functional identifier code for the 277. `HN` = Health Care Claim Status Notification. @internal */
const X12_277_FUNCTIONAL_ID = "HN";

/** GS-07 standards agency code — `X` for ASC X12. @internal */
const X12_AGENCY_CODE = "X";

/** ST-03 / GS-08 version + release for each builder entry point. @internal */
type ClaimStatusVersion = "005010X212" | "005010X214";

/** HL-03 level codes for the spine the builder computes. @internal */
const HL_LEVEL = {
  SOURCE: "20",
  RECEIVER: "21",
  PROVIDER: "19",
  SUBSCRIBER: "22",
  DEPENDENT: "23",
} as const;

/**
 * `build277` — assemble a 005010X212 277 Claim Status Response around the
 * supplied spec.
 *
 * @example
 * ```ts
 * import { build277, X12Decimal } from "@cosyte/x12";
 * const ix = build277({
 *   envelope: {
 *     senderId: "MEDPAY", receiverId: "PROVIDER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   informationSources: [{
 *     entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
 *     receivers: [{
 *       entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CLEARINGHOUSE", idQualifier: "46", idCode: "CH001" },
 *       providers: [{
 *         entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *         subscribers: [{
 *           member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
 *           claims: [{ trace: { traceTypeCode: "2", referenceId: "CLAIM001" }, statuses: [{ statuses: [{ categoryCode: "A2", statusCode: "20" }] }] }],
 *         }],
 *       }],
 *     }],
 *   }],
 * });
 * ```
 */
export function build277(spec: Build277Spec): X12Interchange {
  return buildClaimStatus("005010X212", spec);
}

/**
 * `build277CA` — assemble a 005010X214 277CA Claim Acknowledgment around the
 * supplied spec. Identical body to {@link build277}; only the ST-03 / GS-08
 * version differs (so the parsed result is admitted by
 * {@link "./get-277.js".get277CADisposition} and carries
 * `transactionType: "claim-acknowledgment"`).
 *
 * @example
 * ```ts
 * import { build277CA } from "@cosyte/x12";
 * declare const spec: import("@cosyte/x12").Build277Spec;
 * const ix = build277CA(spec); // ST-03 = 005010X214
 * ```
 */
export function build277CA(spec: Build277Spec): X12Interchange {
  return buildClaimStatus("005010X214", spec);
}

/**
 * Shared emit path for both variants. `version` fixes the GS-08 / ST-03
 * reference; everything else is driven by the spec. Mirrors how
 * `build837P/I/D` delegate to a single `buildClaim837`. @internal
 */
function buildClaimStatus(version: ClaimStatusVersion, spec: Build277Spec): X12Interchange {
  const { envelope } = spec;

  // ---- Structural preconditions (refuse an impossible spine) ------------

  enforceStructuralSpec(spec);

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
  const esc = (value: string): string => escapeRelease(value, delimiters);

  const seg = (parts: readonly string[]): string => {
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
    X12_277_FUNCTIONAL_ID,
    esc(applicationSenderCode),
    esc(applicationReceiverCode),
    groupDate,
    groupTime,
    esc(envelope.groupControlNumber),
    X12_AGENCY_CODE,
    version,
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = seg(["ST", "277", esc(stControlNumber), version]);

  // ---- Body segments — emit the computed HL spine depth-first -----------

  const body: string[] = [];
  const hlCounter: HlCounter = { next: 1 };
  for (const source of spec.informationSources) {
    emitSource(source, body, ctx, hlCounter);
  }

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
 * Refuse a structurally impossible spec before any emit. Covers the HL
 * spine (no sources / childless source / receiver / provider; a subscriber
 * with neither claims nor dependents; a dependent with no claims) and the
 * per-claim / per-status preconditions (a claim that would not materialize
 * on read; a status whose first composite has no category code). PHI-clean:
 * messages carry indices + counts, never names / member ids. @internal
 */
function enforceStructuralSpec(spec: Build277Spec): void {
  if (spec.informationSources.length === 0) {
    throw new ClaimStatus277BuildError(
      CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
      "build277: at least one information source (HL level 20) is required.",
    );
  }
  for (let s = 0; s < spec.informationSources.length; s += 1) {
    const source = spec.informationSources[s];
    if (source === undefined) continue;
    if (source.receivers.length === 0) {
      throw new ClaimStatus277BuildError(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
        `build277: information source at index ${String(s)} has no receiver (HL level 21) child.`,
      );
    }
    for (let r = 0; r < source.receivers.length; r += 1) {
      const receiver = source.receivers[r];
      if (receiver === undefined) continue;
      if (receiver.providers.length === 0) {
        throw new ClaimStatus277BuildError(
          CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
          `build277: receiver at source[${String(s)}].receiver[${String(r)}] has no provider (HL level 19) child.`,
        );
      }
      for (let p = 0; p < receiver.providers.length; p += 1) {
        const provider = receiver.providers[p];
        if (provider === undefined) continue;
        const locator = `source[${String(s)}].receiver[${String(r)}].provider[${String(p)}]`;
        if (provider.subscribers.length === 0) {
          throw new ClaimStatus277BuildError(
            CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
            `build277: provider at ${locator} has no subscriber (HL level 22) child.`,
          );
        }
        for (let u = 0; u < provider.subscribers.length; u += 1) {
          const subscriber = provider.subscribers[u];
          if (subscriber === undefined) continue;
          enforceSubscriber(subscriber, `${locator}.subscriber[${String(u)}]`);
        }
      }
    }
  }
}

/** @internal */
function enforceSubscriber(subscriber: Build277SubscriberSpec, locator: string): void {
  const claims = subscriber.claims ?? [];
  const dependents = subscriber.dependents ?? [];
  if (claims.length === 0 && dependents.length === 0) {
    throw new ClaimStatus277BuildError(
      CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
      `build277: subscriber at ${locator} has neither a claim nor a dependent.`,
    );
  }
  for (let c = 0; c < claims.length; c += 1) {
    const claim = claims[c];
    if (claim !== undefined) enforceClaim(claim, `${locator}.claim[${String(c)}]`, c === 0);
  }
  for (let d = 0; d < dependents.length; d += 1) {
    const dependent = dependents[d];
    if (dependent === undefined) continue;
    const depLocator = `${locator}.dependent[${String(d)}]`;
    if (dependent.claims.length === 0) {
      throw new ClaimStatus277BuildError(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
        `build277: dependent at ${depLocator} has no claim.`,
      );
    }
    for (let c = 0; c < dependent.claims.length; c += 1) {
      const claim = dependent.claims[c];
      if (claim !== undefined) enforceClaim(claim, `${depLocator}.claim[${String(c)}]`, c === 0);
    }
  }
}

/**
 * Refuse a claim that would not materialize on read (no trace AND no
 * statuses AND no service lines) and any status whose first composite lacks
 * a category code. Only a TRN opens a new Loop 2200 on read, so every claim
 * past the first under a subscriber / dependent MUST carry a trace — without
 * one its STC / REF / DTP would silently fold into the prior claim. @internal
 */
function enforceClaim(claim: Build277ClaimSpec, locator: string, isFirst: boolean): void {
  const statuses = claim.statuses ?? [];
  const serviceLines = claim.serviceLines ?? [];
  if (claim.trace === undefined && statuses.length === 0 && serviceLines.length === 0) {
    throw new ClaimStatus277BuildError(
      CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_SPEC,
      `build277: claim at ${locator} has no trace, status, or service line (it would not materialize on read).`,
    );
  }
  if (!isFirst && claim.trace === undefined) {
    throw new ClaimStatus277BuildError(
      CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_SPEC,
      `build277: claim at ${locator} past the first under its subscriber / dependent has no trace (it would merge into the prior claim on read).`,
    );
  }
  for (let i = 0; i < statuses.length; i += 1) {
    enforceStatus(statuses[i], `${locator}.status[${String(i)}]`);
  }
  for (let l = 0; l < serviceLines.length; l += 1) {
    const line = serviceLines[l];
    if (line === undefined) continue;
    const lineStatuses = line.statuses ?? [];
    for (let i = 0; i < lineStatuses.length; i += 1) {
      enforceStatus(lineStatuses[i], `${locator}.line[${String(l)}].status[${String(i)}]`);
    }
  }
}

/** @internal */
function enforceStatus(status: Build277StatusSpec | undefined, locator: string): void {
  if (status === undefined) return;
  const first = status.statuses[0];
  if (first === undefined || first.categoryCode === "") {
    throw new ClaimStatus277BuildError(
      CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_SPEC,
      `build277: STC at ${locator} requires a non-empty category code on its first composite (STC-01).`,
    );
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

/** Emit a Loop 2000A information source HL + its receiver subtree. @internal */
function emitSource(
  source: Build277InformationSourceSpec,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, "", HL_LEVEL.SOURCE, "1"]));
  emitEntity(source.entity, body, ctx);
  for (const receiver of source.receivers) {
    emitReceiver(receiver, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000B information receiver HL + its provider subtree. @internal */
function emitReceiver(
  receiver: Build277InformationReceiverSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.RECEIVER, "1"]));
  emitEntity(receiver.entity, body, ctx);
  for (const provider of receiver.providers) {
    emitProvider(provider, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000C service provider HL (level 19) + its subscriber subtree. @internal */
function emitProvider(
  provider: Build277ProviderSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.PROVIDER, "1"]));
  emitEntity(provider.entity, body, ctx);
  for (const subscriber of provider.subscribers) {
    emitSubscriber(subscriber, hlId, body, ctx, counter);
  }
}

/**
 * Emit a Loop 2000D subscriber HL + member NM1 + subscriber-level claims +
 * dependents. The member NM1 is emitted BEFORE the first claim because the
 * read side only consumes an NM1 when no claim is open. @internal
 */
function emitSubscriber(
  subscriber: Build277SubscriberSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  const dependents = subscriber.dependents ?? [];
  const hasChild = dependents.length > 0 ? "1" : "0";
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.SUBSCRIBER, hasChild]));

  if (subscriber.member !== undefined) emitMember(subscriber.member, body, ctx);
  for (const claim of subscriber.claims ?? []) emitClaim(claim, body, ctx);

  for (const dependent of dependents) {
    emitDependent(dependent, hlId, body, ctx, counter);
  }
}

/** Emit a Loop 2000E dependent HL + member NM1 + claims. @internal */
function emitDependent(
  dependent: Build277DependentSpec,
  parentHlId: string,
  body: string[],
  ctx: EmitContext,
  counter: HlCounter,
): void {
  const hlId = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", hlId, parentHlId, HL_LEVEL.DEPENDENT, "0"]));

  if (dependent.member !== undefined) emitMember(dependent.member, body, ctx);
  for (const claim of dependent.claims) emitClaim(claim, body, ctx);
}

/**
 * Emit a Loop 2200 claim. Order is load-bearing: the TRN opens the claim;
 * claim-level STC / REF / DTP must precede any SVC (after an SVC the read
 * side attaches REF / DTP to the line). @internal
 */
function emitClaim(claim: Build277ClaimSpec, body: string[], ctx: EmitContext): void {
  if (claim.trace !== undefined) {
    body.push(
      ctx.seg([
        "TRN",
        ctx.esc(claim.trace.traceTypeCode),
        ctx.esc(claim.trace.referenceId),
        ctx.esc(claim.trace.originatingCompanyId ?? ""),
        ctx.esc(claim.trace.supplementalReferenceId ?? ""),
      ]),
    );
  }
  for (const status of claim.statuses ?? []) emitStatus(status, body, ctx);
  for (const ref of claim.references ?? []) body.push(emitRef(ref, ctx));
  for (const date of claim.dates ?? []) emitDate(date, body, ctx);
  for (const line of claim.serviceLines ?? []) emitServiceLine(line, body, ctx);
}

/** Emit a Loop 2220 service line (SVC + its STC / REF / DTP). @internal */
function emitServiceLine(line: Build277ServiceLineSpec, body: string[], ctx: EmitContext): void {
  const svc01 = ctx.comp([
    line.serviceIdQualifier ?? "",
    line.procedureCode ?? "",
    ...(line.modifiers ?? []),
  ]);
  body.push(
    ctx.seg([
      "SVC",
      svc01,
      line.lineChargeAmount === undefined ? "" : ctx.esc(line.lineChargeAmount.toString()),
      line.linePaymentAmount === undefined ? "" : ctx.esc(line.linePaymentAmount.toString()),
      ctx.esc(line.revenueCode ?? ""),
    ]),
  );
  for (const status of line.statuses ?? []) emitStatus(status, body, ctx);
  for (const ref of line.references ?? []) body.push(emitRef(ref, ctx));
  for (const date of line.dates ?? []) emitDate(date, body, ctx);
}

/**
 * Emit one STC segment. STC-01 / STC-10 / STC-11 are C043 composites; the
 * headline date / action / amounts live in STC-02..06; the message in
 * STC-12. @internal
 */
function emitStatus(status: Build277StatusSpec, body: string[], ctx: EmitContext): void {
  const composite = (index: number): string => {
    const code = status.statuses[index];
    if (code === undefined) return "";
    return ctx.comp([code.categoryCode, code.statusCode ?? "", code.entityCode ?? ""]);
  };
  body.push(
    ctx.seg([
      "STC",
      composite(0),
      ctx.esc(status.statusEffectiveDate ?? ""),
      ctx.esc(status.actionCode ?? ""),
      status.totalChargeAmount === undefined ? "" : ctx.esc(status.totalChargeAmount.toString()),
      status.paymentAmount === undefined ? "" : ctx.esc(status.paymentAmount.toString()),
      ctx.esc(status.adjudicationDate ?? ""),
      "",
      "",
      "",
      composite(1),
      composite(2),
      ctx.esc(status.message ?? ""),
    ]),
  );
}

/** Emit an NM1 entity (payer / receiver / provider). @internal */
function emitEntity(entity: Build277EntitySpec, body: string[], ctx: EmitContext): void {
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

/** Emit an NM1 member name (subscriber / dependent). @internal */
function emitMember(member: Build277MemberSpec, body: string[], ctx: EmitContext): void {
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
}

/** @internal */
function emitRef(ref: Build277ReferenceSpec, ctx: EmitContext): string {
  return ctx.seg([
    "REF",
    ctx.esc(ref.qualifier),
    ctx.esc(ref.value),
    ctx.esc(ref.description ?? ""),
  ]);
}

/** @internal */
function emitDate(
  date: { qualifier: string; formatQualifier: string; value: string },
  body: string[],
  ctx: EmitContext,
): void {
  body.push(
    ctx.seg(["DTP", ctx.esc(date.qualifier), ctx.esc(date.formatQualifier), ctx.esc(date.value)]),
  );
}

// ---------------------------------------------------------------------------
// String helpers — mirror the `build835` / `build837` emit primitives.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always
 * 9). Throws {@link ClaimStatus277BuildError} if the value already exceeds
 * the width. @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new ClaimStatus277BuildError(
    CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_SPEC,
    `build277: control number "${value}" exceeds the ${String(width)}-char spec limit.`,
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
