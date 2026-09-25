/**
 * `build277RequestForAdditionalInformation` - a pure-function builder for a
 * 277 Health Care Claim Request for Additional Information (`006020X313`).
 * NEVER sends, NEVER opens a socket, NEVER touches the filesystem.
 *
 * **What it writes.** GS-01 `HN`, `006020X313` in GS-08 and ST-03, the BHT, and
 * each hierarchical level depth-first with its NM1 names, its claim-level
 * requests (TRN, STC, REF, DTP, QTY, AMT, then each SVC service line with its
 * STC, REF and DTP) and then its subordinate levels. Every code and qualifier
 * is written exactly as given, each C043 composite with all four components,
 * C043-04 included. The builder computes HL-01 and HL-02 from the nesting and
 * nothing else: no BHT code, level code, child code or qualifier is supplied
 * for the caller, because no carried source states which ones the guide
 * requires. ISA-12 is the package's default, `00501`, unless the caller gives
 * one.
 *
 * **What it refuses**, each with a typed, code-tagged
 * {@link "./build-errors.js".Rfai277BuildError} and no interchange: no
 * hierarchical level, no claim-level request, a request with no trace, a status
 * composite whose C043-01 or C043-02 is empty, and a service line with no SVC.
 * Those are the absences the base X12 006020 277 makes mandatory, and no other
 * element is refused on a mandatory ground. A spec that is not shaped like one
 * is refused too. No refusal message carries a value from the document.
 *
 * The result is round-tripped through {@link parseX12}, so what is returned is
 * exactly what `get277RequestForAdditionalInformation` reads back.
 */

import { requireCallerArray } from "../../builder/caller-array.js";
import { requireControlNumber } from "../../builder/caller-control-number.js";
import { requireCallerDecimal } from "../../builder/caller-decimal.js";
import { requireCallerSegment } from "../../builder/caller-segment.js";
import { makeCallerEscaper } from "../../builder/caller-string.js";
import type { X12Decimal } from "../../decimal.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";
import type {
  Build277RfaiDateSpec,
  Build277RfaiEntitySpec,
  Build277RfaiLevelSpec,
  Build277RfaiReferenceSpec,
  Build277RfaiRequestSpec,
  Build277RfaiServiceLineSpec,
  Build277RfaiSpec,
  Build277RfaiStatusSpec,
} from "./build-277-rfai-types.js";
import { RFAI_277_BUILD_ERROR_CODES, Rfai277BuildError } from "./build-errors.js";

/** The name every refusal leads with. @internal */
const AT = "build277RequestForAdditionalInformation";

/** GS-01 for the 277: `HN`, per the carried base standard. @internal */
const FUNCTIONAL_ID = "HN";

/** GS-08 and ST-03. @internal */
const GUIDE = "006020X313";

/** GS-07, `X` for ASC X12. @internal */
const AGENCY_CODE = "X";

/** ISA-12 when the caller gives none: the package's existing default. @internal */
const DEFAULT_INTERCHANGE_CONTROL_VERSION = "00501";

/** STC-01, STC-10 and STC-11 hold at most three composites. @internal */
const MAX_STATUS_CODES = 3;

/** SVC-01-3 to SVC-01-6 hold at most four modifiers. @internal */
const MAX_MODIFIERS = 4;

/**
 * Refuse a spec that is not shaped like one. The shared caller guards call back
 * into this with a message that names the builder and the type, never a value.
 * @internal
 */
function refuseSpec(message: string): never {
  throw new Rfai277BuildError(RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_INVALID_SPEC, message);
}

/** Write a caller `X12Decimal`, refusing anything that is not one. @internal */
function escDec(value: X12Decimal, esc: (value: string) => string): string {
  return esc(requireCallerDecimal(value, AT, refuseSpec).toString());
}

/**
 * Build a 277 request for additional information declaring `006020X313`.
 *
 * @example
 * ```ts
 * import { build277RequestForAdditionalInformation, serializeX12 } from "@cosyte/x12";
 * const ix = build277RequestForAdditionalInformation({
 *   envelope: {
 *     senderId: "PAYER", receiverId: "CLINIC",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001", groupControlNumber: "1",
 *     transactionSetControlNumber: "0001",
 *   },
 *   header: { hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08" },
 *   levels: [{
 *     levelCode: "20",
 *     requests: [{
 *       trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
 *       statuses: [{ codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }] }],
 *     }],
 *   }],
 * });
 * serializeX12(ix); // an interchange whose GS-08 and ST-03 read 006020X313
 * ```
 */
export function build277RequestForAdditionalInformation(spec: Build277RfaiSpec): X12Interchange {
  enforceStructure(spec);
  const { envelope } = spec;

  const elementSeparator = envelope.elementSeparator ?? "*";
  const repetitionSeparator = envelope.repetitionSeparator ?? "^";
  const componentSeparator = envelope.componentSeparator ?? ":";
  const segmentTerminator = envelope.segmentTerminator ?? "~";
  const esc = makeCallerEscaper(
    {
      element: elementSeparator,
      repetition: repetitionSeparator,
      component: componentSeparator,
      segment: segmentTerminator,
    },
    AT,
    refuseSpec,
  );

  const seg = (parts: readonly string[]): string => {
    requireCallerSegment(parts, "build277", refuseSpec);
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

  requireControlNumber(
    envelope.interchangeControlNumber,
    "ISA-13 / IEA-02",
    "interchangeControlNumber",
    AT,
    refuseSpec,
  );
  requireControlNumber(
    envelope.groupControlNumber,
    "GS-06 / GE-02",
    "groupControlNumber",
    AT,
    refuseSpec,
  );
  requireControlNumber(
    envelope.transactionSetControlNumber,
    "ST-02 / SE-02",
    "transactionSetControlNumber",
    AT,
    refuseSpec,
  );

  const interchangeControlNumber = padControl(envelope.interchangeControlNumber);
  const isa =
    [
      "ISA",
      "00",
      pad(" ", 10),
      "00",
      pad(" ", 10),
      pad(envelope.senderQualifier ?? "ZZ", 2),
      pad(envelope.senderId, 15),
      pad(envelope.receiverQualifier ?? "ZZ", 2),
      pad(envelope.receiverId, 15),
      pad(envelope.interchangeDate, 6),
      pad(envelope.interchangeTime, 4),
      repetitionSeparator,
      pad(envelope.interchangeControlVersion ?? DEFAULT_INTERCHANGE_CONTROL_VERSION, 5),
      interchangeControlNumber,
      "0",
      envelope.usageIndicator ?? "P",
      componentSeparator,
    ].join(elementSeparator) + segmentTerminator;

  const gs = seg([
    "GS",
    FUNCTIONAL_ID,
    esc(envelope.applicationSenderCode ?? envelope.senderId),
    esc(envelope.applicationReceiverCode ?? envelope.receiverId),
    esc(envelope.groupDate ?? expandYY(envelope.interchangeDate)),
    esc(envelope.groupTime ?? envelope.interchangeTime),
    esc(envelope.groupControlNumber),
    AGENCY_CODE,
    GUIDE,
  ]);
  const st = seg(["ST", "277", esc(envelope.transactionSetControlNumber), GUIDE]);

  const { header } = spec;
  const body: string[] = [
    seg([
      "BHT",
      esc(header.hierarchicalStructureCode),
      esc(header.transactionSetPurposeCode),
      esc(header.referenceId ?? ""),
      esc(header.date ?? ""),
      esc(header.time ?? ""),
      esc(header.transactionTypeCode ?? ""),
    ]),
  ];

  const ctx: EmitContext = { seg, esc, comp };
  const counter = { next: 1 };
  for (const level of spec.levels) emitLevel(level, undefined, body, ctx, counter);

  const se = seg(["SE", String(body.length + 2), esc(envelope.transactionSetControlNumber)]);
  const ge = seg(["GE", "1", esc(envelope.groupControlNumber)]);
  const iea = seg(["IEA", "1", interchangeControlNumber]);
  return parseX12(isa + gs + st + body.join("") + se + ge + iea);
}

// ---------------------------------------------------------------------------
// The refusals, all run before a byte is assembled.
// ---------------------------------------------------------------------------

/**
 * Refuse the absences the base 006020 277 makes mandatory, and a spec that is
 * not shaped like one. Locators are indices this function counts, never a
 * value. @internal
 */
function enforceStructure(spec: Build277RfaiSpec): void {
  if (typeof spec.envelope !== "object" || spec.envelope === null) {
    refuseSpec(`build277RequestForAdditionalInformation:spec.envelope must be an object.`);
  }
  if (typeof spec.header !== "object" || spec.header === null) {
    refuseSpec(`build277RequestForAdditionalInformation:spec.header must be an object carrying the BHT elements.`);
  }
  const levels = requireCallerArray(spec.levels, `build277RequestForAdditionalInformation:spec.levels`, refuseSpec);
  if (levels.length === 0) {
    throw new Rfai277BuildError(
      RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_LEVEL,
      `build277RequestForAdditionalInformation:at least one hierarchical level (HL) is required, and spec.levels is empty.`,
    );
  }
  let requests = 0;
  for (const [i, level] of levels.entries()) requests += enforceLevel(level, `levels[${String(i)}]`);
  if (requests === 0) {
    throw new Rfai277BuildError(
      RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_REQUEST,
      `build277RequestForAdditionalInformation:at least one claim-level request is required, and no level carries one.`,
    );
  }
}

/** Enforce one level and its subordinates; answer how many requests they carry. @internal */
function enforceLevel(level: Build277RfaiLevelSpec, locator: string): number {
  if (typeof level !== "object" || level === null) {
    refuseSpec(`build277RequestForAdditionalInformation:the level at ${locator} must be an object.`);
  }
  requireCallerArray(level.entities, `build277RequestForAdditionalInformation:${locator}.entities`, refuseSpec);
  const requests = requireCallerArray(level.requests, `build277RequestForAdditionalInformation:${locator}.requests`, refuseSpec);
  for (const [r, request] of requests.entries()) {
    enforceRequest(request, `${locator}.requests[${String(r)}]`);
  }
  let count = requests.length;
  const children = requireCallerArray(level.children, `build277RequestForAdditionalInformation:${locator}.children`, refuseSpec);
  for (const [c, child] of children.entries()) {
    count += enforceLevel(child, `${locator}.children[${String(c)}]`);
  }
  return count;
}

/** @internal */
function enforceRequest(request: Build277RfaiRequestSpec, locator: string): void {
  if (typeof request !== "object" || request === null) {
    refuseSpec(`build277RequestForAdditionalInformation:the request at ${locator} must be an object.`);
  }
  if (request.trace === undefined || request.trace === null) {
    throw new Rfai277BuildError(
      RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_TRACE,
      `build277RequestForAdditionalInformation:the claim-level request at ${locator} has no trace; the base 006020 277 opens that loop with a TRN.`,
    );
  }
  const statuses = requireCallerArray(request.statuses, `build277RequestForAdditionalInformation:${locator}.statuses`, refuseSpec);
  for (const [s, status] of statuses.entries()) enforceStatus(status, `${locator}.statuses[${String(s)}]`);
  requireCallerArray(request.references, `build277RequestForAdditionalInformation:${locator}.references`, refuseSpec);
  requireCallerArray(request.dates, `build277RequestForAdditionalInformation:${locator}.dates`, refuseSpec);
  requireCallerArray(request.quantities, `build277RequestForAdditionalInformation:${locator}.quantities`, refuseSpec);
  requireCallerArray(request.amounts, `build277RequestForAdditionalInformation:${locator}.amounts`, refuseSpec);
  const lines = requireCallerArray(request.serviceLines, `build277RequestForAdditionalInformation:${locator}.serviceLines`, refuseSpec);
  for (const [l, line] of lines.entries()) enforceServiceLine(line, `${locator}.serviceLines[${String(l)}]`);
}

/** @internal */
function enforceServiceLine(line: Build277RfaiServiceLineSpec, locator: string): void {
  if (typeof line !== "object" || line === null) {
    refuseSpec(`build277RequestForAdditionalInformation:the service line at ${locator} must be an object.`);
  }
  if (line.service === undefined || line.service === null) {
    throw new Rfai277BuildError(
      RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_SERVICE,
      `build277RequestForAdditionalInformation:the service line at ${locator} has no service; the base 006020 277 opens that loop with an SVC.`,
    );
  }
  const modifiers = requireCallerArray(line.service.modifiers, `build277RequestForAdditionalInformation:${locator}.service.modifiers`, refuseSpec);
  if (modifiers.length > MAX_MODIFIERS) {
    refuseSpec(`build277RequestForAdditionalInformation:the service at ${locator} carries more than four modifiers; SVC-01 holds four.`);
  }
  const statuses = requireCallerArray(line.statuses, `build277RequestForAdditionalInformation:${locator}.statuses`, refuseSpec);
  for (const [s, status] of statuses.entries()) enforceStatus(status, `${locator}.statuses[${String(s)}]`);
  requireCallerArray(line.references, `build277RequestForAdditionalInformation:${locator}.references`, refuseSpec);
  requireCallerArray(line.dates, `build277RequestForAdditionalInformation:${locator}.dates`, refuseSpec);
}

/**
 * Refuse an STC with no composite, one with more than the three it has room
 * for, and any composite whose C043-01 or C043-02 is empty. @internal
 */
function enforceStatus(status: Build277RfaiStatusSpec, locator: string): void {
  if (typeof status !== "object" || status === null) {
    refuseSpec(`build277RequestForAdditionalInformation:the status at ${locator} must be an object.`);
  }
  const codes = requireCallerArray(status.codes, `build277RequestForAdditionalInformation:${locator}.codes`, refuseSpec);
  if (codes.length === 0) {
    throw new Rfai277BuildError(
      RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_STATUS_CODE_EMPTY,
      `build277RequestForAdditionalInformation:the status at ${locator} has no C043 composite, so its STC-01 C043-01 and C043-02 would be empty.`,
    );
  }
  if (codes.length > MAX_STATUS_CODES) {
    refuseSpec(`build277RequestForAdditionalInformation:the status at ${locator} carries more than three composites; STC-01, STC-10 and STC-11 hold three.`);
  }
  for (const [c, code] of codes.entries()) {
    const at = `${locator}.codes[${String(c)}]`;
    if (isEmpty(code.categoryCode) || isEmpty(code.statusCode)) {
      throwEmptyComposite(at);
    }
  }
}

/** An absent or empty required component; a wrong type is left to `esc`. @internal */
function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** @internal */
function throwEmptyComposite(locator: string): never {
  throw new Rfai277BuildError(
    RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_STATUS_CODE_EMPTY,
    `build277RequestForAdditionalInformation:the composite at ${locator} has an empty C043-01 or C043-02, both of which the base 006020 277 makes mandatory.`,
  );
}

// ---------------------------------------------------------------------------
// Emitters.
// ---------------------------------------------------------------------------

/** @internal */
interface EmitContext {
  readonly seg: (parts: readonly string[]) => string;
  readonly esc: (value: string) => string;
  readonly comp: (components: readonly string[]) => string;
}

/** Emit a level, then its names, requests and subordinate levels. @internal */
function emitLevel(
  level: Build277RfaiLevelSpec,
  parentId: string | undefined,
  body: string[],
  ctx: EmitContext,
  counter: { next: number },
): void {
  const id = String(counter.next);
  counter.next += 1;
  body.push(ctx.seg(["HL", id, parentId ?? "", ctx.esc(level.levelCode), ctx.esc(level.childCode ?? "")]));
  for (const entity of level.entities ?? []) body.push(emitEntity(entity, ctx));
  for (const request of level.requests ?? []) emitRequest(request, body, ctx);
  for (const child of level.children ?? []) emitLevel(child, id, body, ctx, counter);
}

/** @internal */
function emitEntity(entity: Build277RfaiEntitySpec, ctx: EmitContext): string {
  return ctx.seg([
    "NM1",
    ctx.esc(entity.entityIdentifierCode),
    ctx.esc(entity.entityTypeQualifier),
    ctx.esc(entity.lastOrOrganizationName ?? ""),
    ctx.esc(entity.firstName ?? ""),
    ctx.esc(entity.middleName ?? ""),
    ctx.esc(entity.namePrefix ?? ""),
    ctx.esc(entity.nameSuffix ?? ""),
    ctx.esc(entity.idQualifier ?? ""),
    ctx.esc(entity.idCode ?? ""),
  ]);
}

/**
 * Emit one claim-level request. Its own STC, REF, DTP, QTY and AMT precede its
 * first SVC, because a REF or DTP after an SVC belongs to that service line.
 * @internal
 */
function emitRequest(request: Build277RfaiRequestSpec, body: string[], ctx: EmitContext): void {
  const { trace } = request;
  body.push(
    ctx.seg([
      "TRN",
      ctx.esc(trace.traceTypeCode),
      ctx.esc(trace.referenceId),
      ctx.esc(trace.originatingCompanyId ?? ""),
      ctx.esc(trace.supplementalReferenceId ?? ""),
    ]),
  );
  for (const status of request.statuses ?? []) body.push(emitStatus(status, ctx));
  for (const ref of request.references ?? []) body.push(emitReference(ref, ctx));
  for (const date of request.dates ?? []) body.push(emitDate(date, ctx));
  for (const q of request.quantities ?? []) {
    body.push(ctx.seg(["QTY", ctx.esc(q.qualifier), escDec(q.quantity, ctx.esc)]));
  }
  for (const a of request.amounts ?? []) {
    body.push(ctx.seg(["AMT", ctx.esc(a.qualifier), escDec(a.amount, ctx.esc)]));
  }
  for (const line of request.serviceLines ?? []) {
    const svc = line.service;
    body.push(
      ctx.seg([
        "SVC",
        ctx.comp([svc.serviceIdQualifier, svc.procedureCode, ...(svc.modifiers ?? [])]),
        svc.lineChargeAmount === undefined ? "" : escDec(svc.lineChargeAmount, ctx.esc),
        svc.linePaymentAmount === undefined ? "" : escDec(svc.linePaymentAmount, ctx.esc),
        ctx.esc(svc.revenueCode ?? ""),
        svc.quantity === undefined ? "" : escDec(svc.quantity, ctx.esc),
        "",
        svc.unitsOfService === undefined ? "" : escDec(svc.unitsOfService, ctx.esc),
      ]),
    );
    for (const status of line.statuses ?? []) body.push(emitStatus(status, ctx));
    for (const ref of line.references ?? []) body.push(emitReference(ref, ctx));
    for (const date of line.dates ?? []) body.push(emitDate(date, ctx));
  }
}

/** Emit one STC, its composites at STC-01, STC-10 and STC-11. @internal */
function emitStatus(status: Build277RfaiStatusSpec, ctx: EmitContext): string {
  const composite = (index: number): string => {
    const code = status.codes[index];
    if (code === undefined) return "";
    return ctx.comp([
      code.categoryCode,
      code.statusCode,
      code.entityCode ?? "",
      code.codeListQualifier ?? "",
    ]);
  };
  return ctx.seg([
    "STC",
    composite(0),
    ctx.esc(status.statusEffectiveDate ?? ""),
    ctx.esc(status.actionCode ?? ""),
    status.totalChargeAmount === undefined ? "" : escDec(status.totalChargeAmount, ctx.esc),
    status.paymentAmount === undefined ? "" : escDec(status.paymentAmount, ctx.esc),
    ctx.esc(status.paymentDate ?? ""),
    ctx.esc(status.paymentMethodCode ?? ""),
    ctx.esc(status.checkIssueDate ?? ""),
    ctx.esc(status.checkNumber ?? ""),
    composite(1),
    composite(2),
    ctx.esc(status.message ?? ""),
  ]);
}

/** @internal */
function emitReference(ref: Build277RfaiReferenceSpec, ctx: EmitContext): string {
  return ctx.seg([
    "REF",
    ctx.esc(ref.qualifier),
    ctx.esc(ref.value),
    ctx.esc(ref.description ?? ""),
  ]);
}

/** @internal */
function emitDate(date: Build277RfaiDateSpec, ctx: EmitContext): string {
  return ctx.seg([
    "DTP",
    ctx.esc(date.qualifier),
    ctx.esc(date.formatQualifier),
    ctx.esc(date.value),
  ]);
}

// ---------------------------------------------------------------------------
// Envelope helpers, as the other domain builders carry them.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad ISA-13 / IEA-02 to nine characters, refusing one longer than that
 * without repeating it. @internal
 */
function padControl(value: string): string {
  if (value.length <= 9) return "0".repeat(9 - value.length) + value;
  throw new Rfai277BuildError(
    RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_INVALID_SPEC,
    `build277RequestForAdditionalInformation:interchangeControlNumber is longer than the nine characters ISA-13 holds.`,
  );
}

/** Expand YYMMDD into CCYYMMDD for GS-04; any other length passes through. @internal */
function expandYY(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  if (Number.isNaN(yy)) return yymmdd;
  return (yy < 50 ? "20" : "19") + yymmdd;
}
