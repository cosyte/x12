/**
 * `buildInterchange` — the general-purpose, segment-level interchange builder
 * for `@cosyte/x12`. Given an {@link InterchangeSpec} (ISA identity + groups +
 * per-transaction body segments) it assembles a complete, spec-clean X12 byte
 * stream — owning every envelope mechanic the caller should never hand-roll:
 * the ISA fixed-width layout, the GS/GE/SE/IEA control segments, and the
 * SE-01 / GE-01 / IEA-01 counts. The result is round-tripped back through
 * {@link parseX12} so the returned {@link X12Interchange} is bit-identical to
 * the parsed form every other helper consumes — and so the build path inherits
 * delimiter detection and envelope walking for free (any internal builder bug
 * surfaces as Tier-2 warnings on the returned interchange's `warnings` array).
 *
 * NEVER auto-sends, NEVER opens a socket, NEVER touches the filesystem.
 * Structurally impossible specs (an over-long ISA-13, a segment with no id)
 * are REFUSED via {@link "./errors.js".X12BuildError}; this mirrors the
 * `build999` boundary but without any disposition-specific safety guard —
 * those belong to the domain builders layered on top.
 */

import { X12_BUILD_ERROR_CODES, X12BuildError } from "./errors.js";
import type { FunctionalGroupSpec, InterchangeSpec, TransactionSetSpec } from "./types.js";
import { parseX12 } from "../parser/index.js";
import { escapeRelease } from "../parser/release.js";
import type { X12Interchange } from "../parser/types.js";

/**
 * Assemble a complete {@link X12Interchange} from a segment-level
 * {@link InterchangeSpec}. See the module header for the envelope mechanics
 * the builder owns.
 *
 * @example
 * ```ts
 * import { buildInterchange } from "@cosyte/x12";
 * const ix = buildInterchange({
 *   senderId: "SENDER", receiverId: "RECEIVER",
 *   interchangeDate: "250101", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groups: [
 *     {
 *       functionalIdCode: "HC", groupControlNumber: "1", versionRelease: "005010X222A2",
 *       transactions: [
 *         {
 *           transactionSetIdCode: "837", transactionSetControlNumber: "0001",
 *           implementationConventionReference: "005010X222A2",
 *           segments: [["BHT", "0019", "00", "REF", "20250101", "1200", "CH"]],
 *         },
 *       ],
 *     },
 *   ],
 * });
 * ```
 */
export function buildInterchange(spec: InterchangeSpec): X12Interchange {
  const elementSeparator = spec.elementSeparator ?? "*";
  const repetitionSeparator = spec.repetitionSeparator ?? "^";
  const componentSeparator = spec.componentSeparator ?? ":";
  const segmentTerminator = spec.segmentTerminator ?? "~";
  const delimiters = {
    element: elementSeparator,
    repetition: repetitionSeparator,
    component: componentSeparator,
    segment: segmentTerminator,
  };
  const esc = (value: string): string => escapeRelease(value, delimiters);

  const senderQualifier = spec.senderQualifier ?? "ZZ";
  const receiverQualifier = spec.receiverQualifier ?? "ZZ";
  const usageIndicator = spec.usageIndicator ?? "P";
  const version = spec.version ?? "00501";
  const interchangeControlNumber = padControl(spec.interchangeControlNumber, 9);

  // ISA is fixed-width per ASC X12 .5 — pad each element, never escape (the
  // separators are the ISA's own structural bytes, declared in-band).
  const isa =
    [
      "ISA",
      "00", // ISA-01
      pad(" ", 10), // ISA-02
      "00", // ISA-03
      pad(" ", 10), // ISA-04
      pad(senderQualifier, 2), // ISA-05
      pad(spec.senderId, 15), // ISA-06
      pad(receiverQualifier, 2), // ISA-07
      pad(spec.receiverId, 15), // ISA-08
      pad(spec.interchangeDate, 6), // ISA-09 — YYMMDD
      pad(spec.interchangeTime, 4), // ISA-10 — HHMM
      repetitionSeparator, // ISA-11
      pad(version, 5), // ISA-12
      interchangeControlNumber, // ISA-13
      "0", // ISA-14 — ack requested (0 = no inbound TA1)
      usageIndicator, // ISA-15
      componentSeparator, // ISA-16
    ].join(elementSeparator) + segmentTerminator;

  let body = "";
  for (const group of spec.groups) {
    body += buildGroup(group, spec, esc, elementSeparator, segmentTerminator);
  }

  const iea = joinSeg(
    ["IEA", String(spec.groups.length), interchangeControlNumber],
    elementSeparator,
    segmentTerminator,
  );

  const raw = isa + body + iea;
  return parseX12(raw);
}

/** @internal */
function buildGroup(
  group: FunctionalGroupSpec,
  spec: InterchangeSpec,
  esc: (value: string) => string,
  elementSeparator: string,
  segmentTerminator: string,
): string {
  const applicationSenderCode = group.applicationSenderCode ?? spec.senderId;
  const applicationReceiverCode = group.applicationReceiverCode ?? spec.receiverId;
  const groupDate = group.groupDate ?? expandYY(spec.interchangeDate);
  const groupTime = group.groupTime ?? spec.interchangeTime;
  const responsibleAgencyCode = group.responsibleAgencyCode ?? "X";

  const gs = joinSeg(
    [
      "GS",
      esc(group.functionalIdCode),
      esc(applicationSenderCode),
      esc(applicationReceiverCode),
      groupDate,
      groupTime,
      esc(group.groupControlNumber),
      responsibleAgencyCode,
      esc(group.versionRelease),
    ],
    elementSeparator,
    segmentTerminator,
  );

  let transactions = "";
  for (const tx of group.transactions) {
    transactions += buildTransaction(tx, esc, elementSeparator, segmentTerminator);
  }

  const ge = joinSeg(
    ["GE", String(group.transactions.length), esc(group.groupControlNumber)],
    elementSeparator,
    segmentTerminator,
  );

  return gs + transactions + ge;
}

/** @internal */
function buildTransaction(
  tx: TransactionSetSpec,
  esc: (value: string) => string,
  elementSeparator: string,
  segmentTerminator: string,
): string {
  const stParts = ["ST", esc(tx.transactionSetIdCode), esc(tx.transactionSetControlNumber)];
  if (tx.implementationConventionReference !== undefined) {
    stParts.push(esc(tx.implementationConventionReference));
  }
  const st = joinSeg(stParts, elementSeparator, segmentTerminator);

  let bodySegments = "";
  for (const segment of tx.segments) {
    if (segment.length === 0 || (segment[0] ?? "") === "") {
      throw new X12BuildError(
        X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC,
        `buildInterchange: a segment spec in transaction "${esc(tx.transactionSetIdCode)}" has no segment id.`,
      );
    }
    bodySegments += joinSeg(segment.map(esc), elementSeparator, segmentTerminator);
  }

  // SE-01 counts every segment in the set, ST and SE inclusive.
  const seCount = tx.segments.length + 2;
  const se = joinSeg(
    ["SE", String(seCount), esc(tx.transactionSetControlNumber)],
    elementSeparator,
    segmentTerminator,
  );

  return st + bodySegments + se;
}

// ---------------------------------------------------------------------------
// String helpers — mirror the `build999` emit primitives.
// ---------------------------------------------------------------------------

/** @internal */
function joinSeg(
  parts: readonly string[],
  elementSeparator: string,
  segmentTerminator: string,
): string {
  return parts.join(elementSeparator) + segmentTerminator;
}

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always 9).
 * Throws {@link X12BuildError} if the value already exceeds the width — a
 * silently-truncated control number would break ISA-13↔IEA-02 reconciliation.
 *
 * @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new X12BuildError(
    X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC,
    `buildInterchange: control number "${value}" exceeds the ${String(width)}-char spec limit.`,
  );
}

/**
 * Expand a 6-digit YYMMDD into CCYYMMDD for GS-04. Years `00`–`49` are 21st
 * century, `50`–`99` are 20th — the conventional X12 century window. A value
 * already in CCYYMMDD form passes through unchanged.
 *
 * @internal
 */
function expandYY(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  if (Number.isNaN(yy)) return yymmdd;
  const century = yy < 50 ? "20" : "19";
  return century + yymmdd;
}
