/**
 * `build275` - a pure-function builder for a 275 Additional Information to
 * Support a Health Care Claim or Encounter (`006020X314`). NEVER sends, NEVER
 * opens a socket, NEVER touches the filesystem.
 *
 * **What it writes.** GS-01 `PI`, `006020X314` in GS-08 and ST-03, the heading's
 * BGN and NM1 names where given, and each LX line, numbered from 1, with its
 * TRN, STC and REF and then one BDS per attachment. For each attachment BDS-01
 * is the filter code as given, BDS-03 is exactly the caller's octets, with no
 * release escaping even where they hold every delimiter and `?`, and BDS-02 is
 * the decimal count of the octets written in BDS-03. The two cannot disagree:
 * BDS-02 is computed from the octets and never supplied. Nothing is encoded; the
 * filter the code names is one the caller already applied.
 *
 * **What it refuses**, each with a typed, code-tagged
 * {@link "./build-errors.js".Attachment275BuildError} and no interchange: no
 * attachment at all, an attachment with empty data, a filter code that is not
 * exactly three characters, and attachment data holding a character above
 * U+00FF, which is not one octet and so would make BDS-02 untrue. A spec that
 * is not shaped like one is refused too. No refusal message carries an octet of
 * an attachment or any other value from the document.
 *
 * **Write the result as octets.** `serializeX12` of the returned interchange is
 * a string with one character per octet; hand it on as latin1 (for example
 * `Buffer.from(text, "latin1")`), because encoding a character above U+007F as
 * UTF-8 turns one octet into two and BDS-02 stops being true of what is sent.
 *
 * The result is round-tripped through {@link parseX12}, so what is returned is
 * exactly what `get275Attachments` reads back.
 */

import { requireCallerArray } from "../../builder/caller-array.js";
import { requireControlNumber } from "../../builder/caller-control-number.js";
import { requireCallerSegment } from "../../builder/caller-segment.js";
import { makeCallerEscaper } from "../../builder/caller-string.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";
import type {
  Build275AttachmentSpec,
  Build275EntitySpec,
  Build275LineSpec,
  Build275Spec,
} from "./build-275-types.js";
import { ATTACHMENT_275_BUILD_ERROR_CODES, Attachment275BuildError } from "./build-errors.js";

/** The name every refusal leads with. @internal */
const AT = "build275";

/** GS-01 for the 275: `PI`, per the carried base standard. @internal */
const FUNCTIONAL_ID = "PI";

/** GS-08 and ST-03. @internal */
const GUIDE = "006020X314";

/** GS-07, `X` for ASC X12. @internal */
const AGENCY_CODE = "X";

/** ISA-12 when the caller gives none: the package's existing default. @internal */
const DEFAULT_INTERCHANGE_CONTROL_VERSION = "00501";

/** BDS-01 is an identifier of exactly three characters. @internal */
const FILTER_CODE_LENGTH = 3;

/** STC-01, STC-10 and STC-11 hold at most three composites. @internal */
const MAX_STATUS_CODES = 3;

/** The highest UTF-16 code unit that is the latin1 image of one octet. @internal */
const MAX_OCTET = 0xff;

/**
 * Refuse a spec that is not shaped like one. The shared caller guards call back
 * into this with a message that names the builder and the type, never a value.
 * @internal
 */
function refuseSpec(message: string): never {
  throw new Attachment275BuildError(ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_INVALID_SPEC, message);
}

/**
 * Build a 275 declaring `006020X314`.
 *
 * @example
 * ```ts
 * import { build275, serializeX12 } from "@cosyte/x12";
 * const ix = build275({
 *   envelope: {
 *     senderId: "CLINIC", receiverId: "PAYER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001", groupControlNumber: "1",
 *     transactionSetControlNumber: "0001",
 *   },
 *   lines: [{ attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }] }],
 * });
 * const octets = Buffer.from(serializeX12(ix), "latin1"); // BDS*B64*12*U1lOVEhFVElD
 * ```
 */
export function build275(spec: Build275Spec): X12Interchange {
  const octetsByLine = enforceStructure(spec);
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
    requireCallerSegment(parts, "build275", refuseSpec);
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
  const st = seg(["ST", "275", esc(envelope.transactionSetControlNumber), GUIDE]);

  const body: string[] = [];
  const { beginning } = spec;
  if (beginning !== undefined) {
    body.push(
      seg([
        "BGN",
        esc(beginning.transactionSetPurposeCode),
        esc(beginning.referenceId ?? ""),
        esc(beginning.date ?? ""),
        esc(beginning.time ?? ""),
        esc(beginning.timeCode ?? ""),
        esc(beginning.secondReferenceId ?? ""),
        esc(beginning.transactionTypeCode ?? ""),
        esc(beginning.actionCode ?? ""),
        esc(beginning.securityLevelCode ?? ""),
      ]),
    );
  }
  for (const entity of spec.entities ?? []) body.push(emitEntity(entity, seg, esc));
  for (const [l, line] of spec.lines.entries()) {
    emitLine(line, String(l + 1), octetsByLine[l] ?? [], body, seg, esc, comp);
  }

  const se = seg(["SE", String(body.length + 2), esc(envelope.transactionSetControlNumber)]);
  const ge = seg(["GE", "1", esc(envelope.groupControlNumber)]);
  const iea = seg(["IEA", "1", interchangeControlNumber]);
  return parseX12(isa + gs + st + body.join("") + se + ge + iea);
}

// ---------------------------------------------------------------------------
// The refusals, all run before a byte is assembled.
// ---------------------------------------------------------------------------

/**
 * Refuse what cannot be emitted with a true BDS-02, and a spec that is not
 * shaped like one, and answer each line's attachment octets, one character per
 * octet. Locators are indices this function counts, never a value. @internal
 */
function enforceStructure(spec: Build275Spec): readonly (readonly string[])[] {
  if (typeof spec.envelope !== "object" || spec.envelope === null) {
    refuseSpec("build275: spec.envelope must be an object.");
  }
  if (spec.beginning !== undefined && (typeof spec.beginning !== "object" || spec.beginning === null)) {
    refuseSpec("build275: spec.beginning must be an object where given.");
  }
  requireCallerArray(spec.entities, "build275: spec.entities", refuseSpec);
  const lines = requireCallerArray(spec.lines, "build275: spec.lines", refuseSpec);
  const octetsByLine: (readonly string[])[] = [];
  let count = 0;
  for (const [l, line] of lines.entries()) {
    const locator = `lines[${String(l)}]`;
    octetsByLine.push(enforceLine(line, locator));
    count += octetsByLine[l]?.length ?? 0;
  }
  if (count === 0) {
    throw new Attachment275BuildError(
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_NO_ATTACHMENT,
      "build275: at least one attachment is required, and no line carries one.",
    );
  }
  return octetsByLine;
}

/** Enforce one line; answer its attachments' octets. @internal */
function enforceLine(line: Build275LineSpec, locator: string): readonly string[] {
  if (typeof line !== "object" || line === null) {
    refuseSpec(`build275: the line at ${locator} must be an object.`);
  }
  if (line.status !== undefined) {
    if (typeof line.status !== "object" || line.status === null) {
      refuseSpec(`build275: the status at ${locator} must be an object where given.`);
    }
    const codes = requireCallerArray(line.status.codes, `build275: ${locator}.status.codes`, refuseSpec);
    if (codes.length > MAX_STATUS_CODES) {
      refuseSpec(`build275: the status at ${locator} carries more than three composites; STC-01, STC-10 and STC-11 hold three.`);
    }
  }
  requireCallerArray(line.references, `build275: ${locator}.references`, refuseSpec);
  const attachments = requireCallerArray(line.attachments, `build275: ${locator}.attachments`, refuseSpec);
  return attachments.map((attachment, a) =>
    enforceAttachment(attachment, `${locator}.attachments[${String(a)}]`),
  );
}

/**
 * Refuse a filter code that is not exactly three characters, and data that is
 * empty or not one octet per character; answer the data as octets. @internal
 */
function enforceAttachment(attachment: Build275AttachmentSpec, locator: string): string {
  if (typeof attachment !== "object" || attachment === null) {
    refuseSpec(`build275: the attachment at ${locator} must be an object.`);
  }
  const { filterCode, data } = attachment;
  if (typeof filterCode !== "string") {
    refuseSpec(`build275: the filter code of the attachment at ${locator} must be a string.`);
  }
  if (filterCode.length !== FILTER_CODE_LENGTH) {
    throw new Attachment275BuildError(
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_FILTER_CODE_INVALID,
      `build275: the filter code of the attachment at ${locator} is not exactly three characters; BDS-01 is a three-character identifier.`,
    );
  }
  const octets = asOctets(data, locator);
  if (octets.length === 0) {
    throw new Attachment275BuildError(
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_EMPTY_DATA,
      `build275: the attachment at ${locator} carries no data; BDS-03 holds at least one octet.`,
    );
  }
  for (const character of octets) {
    if (character.charCodeAt(0) > MAX_OCTET) throwNotOctets(locator);
  }
  return octets;
}

/** @internal */
function throwNotOctets(locator: string): never {
  throw new Attachment275BuildError(
    ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_DATA_NOT_OCTETS,
    `build275: the data of the attachment at ${locator} holds a character above U+00FF, which is not one octet, so no true BDS-02 could be written. Pass the octets as a Uint8Array, or as a string of one character per octet.`,
  );
}

/**
 * The data as a string of one character per octet: a string as given, a
 * `Uint8Array` one character per byte. Anything else is refused. @internal
 */
function asOctets(data: string | Uint8Array, locator: string): string {
  if (typeof data === "string") return data;
  if (data instanceof Uint8Array) {
    let out = "";
    for (const byte of data) out += String.fromCharCode(byte);
    return out;
  }
  return refuseSpec(`build275: the data of the attachment at ${locator} must be a string or a Uint8Array.`);
}

// ---------------------------------------------------------------------------
// Emitters.
// ---------------------------------------------------------------------------

/** @internal */
function emitEntity(
  entity: Build275EntitySpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg([
    "NM1",
    esc(entity.entityIdentifierCode),
    esc(entity.entityTypeQualifier),
    esc(entity.lastOrOrganizationName ?? ""),
    esc(entity.firstName ?? ""),
    esc(entity.middleName ?? ""),
    esc(entity.namePrefix ?? ""),
    esc(entity.nameSuffix ?? ""),
    esc(entity.idQualifier ?? ""),
    esc(entity.idCode ?? ""),
  ]);
}

/**
 * Emit one line: LX, its TRN, STC and REF, then one BDS per attachment, whose
 * BDS-03 is the octets unescaped and whose BDS-02 is their count. @internal
 */
function emitLine(
  line: Build275LineSpec,
  lineNumber: string,
  octets: readonly string[],
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
  comp: (components: readonly string[]) => string,
): void {
  body.push(seg(["LX", lineNumber]));
  const { trace, status } = line;
  if (trace !== undefined) {
    body.push(
      seg([
        "TRN",
        esc(trace.traceTypeCode),
        esc(trace.referenceId),
        esc(trace.originatingCompanyId ?? ""),
        esc(trace.supplementalReferenceId ?? ""),
      ]),
    );
  }
  if (status !== undefined) {
    const composite = (index: number): string => {
      const code = status.codes[index];
      if (code === undefined) return "";
      return comp([code.categoryCode, code.statusCode, code.entityCode ?? "", code.codeListQualifier ?? ""]);
    };
    body.push(
      seg([
        "STC",
        composite(0),
        esc(status.statusEffectiveDate ?? ""),
        esc(status.actionCode ?? ""),
        "",
        "",
        "",
        "",
        "",
        "",
        composite(1),
        composite(2),
        esc(status.message ?? ""),
      ]),
    );
  }
  for (const ref of line.references ?? []) {
    body.push(seg(["REF", esc(ref.qualifier), esc(ref.value), esc(ref.description ?? "")]));
  }
  for (const [a, attachment] of (line.attachments ?? []).entries()) {
    const data = octets[a] ?? "";
    body.push(seg(["BDS", esc(attachment.filterCode), String(data.length), data]));
  }
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
  throw new Attachment275BuildError(
    ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_INVALID_SPEC,
    "build275: interchangeControlNumber is longer than the nine characters ISA-13 holds.",
  );
}

/** Expand YYMMDD into CCYYMMDD for GS-04; any other length passes through. @internal */
function expandYY(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  if (Number.isNaN(yy)) return yymmdd;
  return (yy < 50 ? "20" : "19") + yymmdd;
}
