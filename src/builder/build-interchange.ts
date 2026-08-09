/**
 * `buildInterchange` - the general-purpose, segment-level interchange builder
 * for `@cosyte/x12`. Given an {@link InterchangeSpec} (ISA identity + groups +
 * per-transaction body segments) it assembles a complete, spec-clean X12 byte
 * stream - owning every envelope mechanic the caller should never hand-roll:
 * the ISA fixed-width layout, the GS/GE/SE/IEA control segments, and the
 * SE-01 / GE-01 / IEA-01 counts. The result is round-tripped back through
 * {@link parseX12} so the returned {@link X12Interchange} is bit-identical to
 * the parsed form every other helper consumes - and so the build path inherits
 * delimiter detection and envelope walking for free (any internal builder bug
 * surfaces as Tier-2 warnings on the returned interchange's `warnings` array).
 *
 * NEVER auto-sends, NEVER opens a socket, NEVER touches the filesystem.
 * Structurally impossible specs (an over-long ISA-13, a segment with no id)
 * are REFUSED via {@link "./errors.js".X12BuildError}; this mirrors the
 * `build999` boundary but without any disposition-specific safety guard -
 * those belong to the domain builders layered on top.
 */

import { X12_BUILD_ERROR_CODES, X12BuildError } from "./errors.js";
import type { FunctionalGroupSpec, InterchangeSpec, TransactionSetSpec } from "./types.js";
import { parseX12 } from "../parser/index.js";
import type { X12Interchange } from "../parser/types.js";
import { requireCallerSegment } from "./caller-segment.js";
import { renderCallerValue } from "./caller-value.js";
import { makeCallerEscaper } from "./caller-string.js";
import { requireControlNumber } from "./caller-control-number.js";

/**
 * Refuse with this module's typed error, for {@link makeCallerEscaper}. A
 * non-string element value is a structurally impossible spec, so it reuses
 * `X12_BUILD_INVALID_SPEC` rather than minting a code. @internal
 */
function refuseSpec(message: string): never {
  throw new X12BuildError(X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC, message);
}

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
  const esc = makeCallerEscaper(delimiters, "buildInterchange", refuseSpec);

  const senderQualifier = spec.senderQualifier ?? "ZZ";
  const receiverQualifier = spec.receiverQualifier ?? "ZZ";
  const usageIndicator = spec.usageIndicator ?? "P";
  const version = spec.version ?? "00501";
  // The guard runs BEFORE `padControl`, because `padControl` is the mechanism:
  // it answers `"000000000"` for `""` and the interchange then reconciles
  // ISA-13 against IEA-02 on a control number nobody supplied. See
  // `caller-control-number.ts` for the measurement and for why this refuses
  // rather than warning. The group and transaction pairs are guarded at their
  // own sites below, because this builder takes many of each.
  requireControlNumber(
    spec.interchangeControlNumber,
    "ISA-13 / IEA-02",
    "interchangeControlNumber",
    "buildInterchange",
    refuseSpec,
  );
  const interchangeControlNumber = padControl(spec.interchangeControlNumber, 9);

  // ISA is fixed-width per ASC X12 .5 - pad each element, never escape (the
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
      pad(spec.interchangeDate, 6), // ISA-09 - YYMMDD
      pad(spec.interchangeTime, 4), // ISA-10 - HHMM
      repetitionSeparator, // ISA-11
      pad(version, 5), // ISA-12
      interchangeControlNumber, // ISA-13
      "0", // ISA-14 - ack requested (0 = no inbound TA1)
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
  // GS-06 does not fabricate the way ISA-13 does - it reaches the wire through
  // `esc`, and `escapeRelease` early-returns on `""` - so an empty one emitted a
  // required element as EMPTY, and GE-02 emitted the same empty value, so the
  // pair still reconciled and nothing warned. Same class, refused the same way.
  requireControlNumber(
    group.groupControlNumber,
    "GS-06 / GE-02",
    "groupControlNumber",
    "buildInterchange",
    refuseSpec,
  );

  const applicationSenderCode = group.applicationSenderCode ?? spec.senderId;
  const applicationReceiverCode = group.applicationReceiverCode ?? spec.receiverId;
  const groupDate = group.groupDate ?? expandYY(spec.interchangeDate);
  const groupTime = group.groupTime ?? spec.interchangeTime;
  const responsibleAgencyCode = group.responsibleAgencyCode ?? "X";

  // GS-04, GS-05 and GS-07 used to be emitted RAW while the segment's other
  // caller-supplied elements went through `esc`, so a caller value carrying an
  // active delimiter took a slot of its own and shifted every element after it
  // down one. `buildInterchange` returns `parseX12` of the bytes it just wrote,
  // so the function disagreed with itself: a `responsibleAgencyCode` of `"X*Y"`
  // came back with GS-08 reading `"Y"` instead of the guide reference the caller
  // stated, on an interchange whose `warnings` array was empty.
  //
  // The in-package precedent is NOT uniform and the exact shape matters, because
  // a draft compressed it into "all seven domain builders already released these
  // same three slots" and a refuter measured that false. What is true: the
  // domain builders release GS-04 / GS-05 through their own `esc`, and `GS-07`
  // is a caller value in `build999` alone (released there); the others stamp a
  // module constant into GS-07 and never route it anywhere. So the precedent
  // covers two of these three slots broadly and the third in one builder.
  //
  // The values are escaped AFTER `expandYY` has run, never before: that helper
  // decides on `length === 6`, and a released value is longer than the one the
  // caller supplied.
  //
  // The type check is run over the UNESCAPED parts, before the escape rather
  // than at the join, so the guard that names the slot is still the guard that
  // fires. `esc` is unary and its refusal can only name the BUILDER, so routing
  // these three through it without this line would have traded a shifted
  // element for a worse diagnostic - `"GS"-04 must be a string` degrading to
  // `every element value must be a string`. `joinSeg`'s own call is the
  // structural backstop and stays where it is.
  const gsParts: readonly string[] = [
    "GS",
    group.functionalIdCode,
    applicationSenderCode,
    applicationReceiverCode,
    groupDate,
    groupTime,
    group.groupControlNumber,
    responsibleAgencyCode,
    group.versionRelease,
  ];
  requireCallerSegment(gsParts, "buildInterchange", refuseSpec);

  // 🩺 INDEX 0 IS THE LIBRARY'S OWN SEGMENT ID AND IS NEVER ESCAPED. A draft
  // mapped `esc` over the whole array and a refuter measured what that cost:
  // `esc` releases against the delimiter set the CALLER declared, and
  // `InterchangeSpec` exposes all four, screened only for whitespace, control
  // characters, emptiness and distinctness. A `componentSeparator` of `"S"` -
  // admissible today - turned the literal `"GS"` into `G?S`, so the group header
  // stopped being a `GS` at all: `groups.length` went 1 -> 0, five segments fell
  // out as orphans, and `X12_UNEXPECTED_SEGMENT` and `X12_GROUP_COUNT_MISMATCH`
  // started firing on a spec that built clean at `0.0.15`. A LITERAL segment id
  // this library writes is a structural byte and is never escaped, which is the
  // rule the ISA line above already states and the rule `GE` / `ST` / `SE` /
  // `IEA` follow by never routing their literal ids through `esc` either.
  //
  // Read "literal" strictly. A draft wrote the wider form - "a segment id is a
  // structural byte this library owns, not caller content" - and a refuter
  // measured it false 60 lines down: `SegmentSpec` is `[segmentId, ...elements]`
  // supplied wholesale, so `buildTransaction`'s `segment.map(esc)` DOES release
  // a caller-supplied id, and `caller-segment.ts` says so explicitly. That
  // disagreement with `SegmentSpec`'s own JSDoc predates this slice and is
  // unchanged by it.
  const gs = joinSeg(
    gsParts.map((value, index) => (index === 0 ? value : esc(value))),
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
  // ST-02 / SE-02 take the same shape as GS-06 / GE-02: emitted through `esc`,
  // so an empty one used to reach the wire as an empty required element on both
  // ends of the pair, reconciling against itself.
  requireControlNumber(
    tx.transactionSetControlNumber,
    "ST-02 / SE-02",
    "transactionSetControlNumber",
    "buildInterchange",
    refuseSpec,
  );

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
        // Rendered from the RAW id, not the `?`-escaped one. `esc` can double
        // the length, so escaping first made the reported "(N characters)" the
        // escaped length rather than the caller's: a 100-character all-`?` id
        // reported 200. The escape exists for the wire, and this is a message.
        `buildInterchange: a segment spec in transaction ${renderCallerValue(tx.transactionSetIdCode)} has no segment id.`,
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
// String helpers - mirror the `build999` emit primitives.
// ---------------------------------------------------------------------------

/** @internal */
function joinSeg(
  parts: readonly string[],
  elementSeparator: string,
  segmentTerminator: string,
): string {
  // Load-bearing, not redundant, and the reason is the `seg` / `joinSeg`
  // qualifier `caller-segment.ts` insists on rather than any property of this
  // module's own call sites. A draft of this comment claimed the check was
  // redundant "because this builder already maps `esc` over the whole segment
  // array", and a refuter measured that false against the GS: `buildGroup`
  // emitted GS-04, GS-05 and GS-07 RAW, so a numeric `groupDate` reached the
  // join unchecked. Those three are released now and `buildGroup` type-checks
  // the GS itself, one step earlier, to keep the slot-named refusal - so this
  // call is the structural backstop and no longer the first guard on that
  // route. Keep it: a segment that is not joined is not emitted, and that is a
  // property of the join and not of any list of call sites.
  requireCallerSegment(parts, "buildInterchange", refuseSpec);
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
 * Throws {@link X12BuildError} if the value already exceeds the width - a
 * silently-truncated control number would break ISA-13↔IEA-02 reconciliation.
 *
 * @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new X12BuildError(
    X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC,
    `buildInterchange: control number ${renderCallerValue(value)} exceeds the ${String(width)}-char spec limit.`,
  );
}

/**
 * Expand a 6-digit YYMMDD into CCYYMMDD for GS-04. Years `00`–`49` are 21st
 * century, `50`–`99` are 20th - the conventional X12 century window. A value
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
