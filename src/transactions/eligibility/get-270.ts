/**
 * `get270Inquiry` / `parse270Inquiries` - extract the typed
 * {@link X12Inquiry} model from an X12 005010X279A1 270 Health Care
 * Eligibility Benefit Inquiry. Lenient on parse: every recoverable deviation
 * surfaces as a warning and nothing here throws.
 *
 * ## Two entry points, and what separates them
 *
 * {@link get270Inquiry} takes the delimiters and ONE transaction set, exactly
 * as {@link "./get-271.js".get271Eligibility} does, and answers `undefined`
 * when that transaction set is not a 270. {@link parse270Inquiries} takes the
 * raw bytes, as {@link "../ack/parse-999.js".parse999} does, and answers a
 * list holding one model per 270 in the interchange, in transmitted order,
 * which is EMPTY when the interchange carries none. The two answers are
 * deliberately different values: `undefined` says "that is not a 270" and `[]`
 * says "this interchange holds no 270", and a consumer that conflated them
 * could not tell a 271 handed to the wrong reader from an interchange with
 * nothing to read.
 *
 * ## What this reader takes from the shared parse, and what it never changes
 *
 * The delimiters and the segment framing are the shared interchange parse's,
 * taken as given. This module adds no delimiter tolerance, narrows none, and
 * emits no warning from shared code: the two tolerances it REPORTS
 * (`X12_270_NON_CONVENTIONAL_DELIMITER`, `X12_270_INTER_SEGMENT_WHITESPACE`)
 * are raised here, on the 270 path, precisely so that no fixture of any other
 * transaction set gains a warning it did not have. Both are raised once per
 * 270 transaction set and anchored at the ISA, because each is a property of
 * the document rather than of one segment.
 *
 * A run of whitespace between segments is consumed by the shared parse and
 * recorded nowhere on the model, so only {@link parse270Inquiries}, which
 * holds the bytes, can report it. {@link get270Inquiry} reports the delimiter
 * half, which it can see on the delimiter set it is handed.
 *
 * ## How a level finds its parent
 *
 * By its own HL-02 and by nothing else. The index is built over the whole
 * transaction set, so a pointer resolves whether the level it names came
 * earlier or later, and where two levels were transmitted with the same HL-01
 * the FIRST in transmitted order wins, which is what makes the decode
 * deterministic. A level attaches only when its declared parent is present AND
 * carries the HL-03 the TR3 gives that level's parent AND the chain from it
 * does not return to a level already on the chain. Otherwise the level is
 * reported (`X12_270_LEVEL_DETACHED`, beside the code for the defect itself)
 * and left off the returned tree with everything transmitted beneath it.
 *
 * **Nothing is re-parented and nothing is re-numbered.** Attaching a level to
 * whichever one happened to be open would be this reader inventing a
 * relationship the sender did not state, on the one structure a 270 exists to
 * state. Every declared pointer stays verbatim on `hierarchies` and every
 * segment stays verbatim on the transaction set, so a consumer that wants the
 * detached region can still read it.
 *
 * Spec source: WPC TR3 `005010X279A1` - Health Care Eligibility Benefit
 * Inquiry and Response (270/271).
 */

import { lookupServiceType } from "../../code-lists/service-type.js";
import { ISA_MIN_LENGTH } from "../../parser/delimiters.js";
import { parseX12 } from "../../parser/index.js";
import { RELEASE_CHAR, splitWithRelease } from "../../parser/release.js";
import {
  componentOptional,
  elementOptional,
  elementValue,
  getAllSegmentValues,
  type X12Segment,
} from "../../parser/segment.js";
import type {
  Delimiters,
  X12Interchange,
  X12ParseOptions,
  X12Position,
  X12TransactionSet,
} from "../../parser/types.js";
import {
  REQUIRED_LOOPS,
  duplicateHierarchyId,
  hierarchyCycle,
  interSegmentWhitespace,
  levelDetached,
  missingRequiredLoop,
  nonConventionalDelimiter,
  type X12ParseWarning,
} from "../../parser/warnings.js";
import { HL_LEVEL_CODES, decodeHl, validateHl, type X12Hl } from "../shared/hl.js";

import type {
  X12Inquiry,
  X12InquiryAddress,
  X12InquiryDate,
  X12InquiryDependent,
  X12InquiryHeader,
  X12InquiryName,
  X12InquiryProcedure,
  X12InquiryReceiver,
  X12InquiryReference,
  X12InquiryRequest,
  X12InquiryServiceType,
  X12InquirySource,
  X12InquirySubscriber,
  X12InquiryTrace,
} from "./inquiry-types.js";

/** ST-01 of the transaction set this reader claims. @internal */
const INQUIRY_270 = "270";

/**
 * Per-level expected parent level for the 270 HL tree, identical in shape to
 * the 271's because the request and the response share one hierarchy:
 * information source (`20`) has no parent, receiver (`21`) parents to source,
 * subscriber (`22`) to receiver, dependent (`23`) to subscriber. @internal
 */
const EXPECTED_PARENT_LEVEL: Readonly<Record<string, string | undefined>> = Object.freeze({
  [HL_LEVEL_CODES.INFORMATION_SOURCE]: undefined,
  [HL_LEVEL_CODES.INFORMATION_RECEIVER]: HL_LEVEL_CODES.INFORMATION_SOURCE,
  [HL_LEVEL_CODES.SUBSCRIBER]: HL_LEVEL_CODES.INFORMATION_RECEIVER,
  [HL_LEVEL_CODES.DEPENDENT]: HL_LEVEL_CODES.SUBSCRIBER,
});

/**
 * The conventional delimiter set, as this package's own builders emit it.
 * A document declaring anything else is honoured exactly as declared; the
 * difference is only what `X12_270_NON_CONVENTIONAL_DELIMITER` reports.
 * @internal
 */
const CONVENTIONAL_DELIMITERS: Delimiters = Object.freeze({
  element: "*",
  repetition: "^",
  component: ":",
  segment: "~",
});

/**
 * Extract the typed {@link X12Inquiry} from one 270 transaction set. Pure
 * function: no I/O, no global state, never throws. Returns `undefined` only
 * when the transaction set's ST-01 is not `"270"` (a mis-routed call) - the
 * same refusal shape `get271Eligibility`, `get835`, `get820Payments` and
 * every other per-transaction reader in this package uses. Every other
 * deviation is recoverable and surfaces on `result.warnings`.
 *
 * @example
 * ```ts
 * import { parseX12, get270Inquiry } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const group of ix.groups) {
 *   for (const tx of group.transactions) {
 *     if (tx.st.elements[1] !== "270") continue;
 *     const inquiry = get270Inquiry(ix.delimiters, tx);
 *     const sub = inquiry?.informationSources[0]?.receivers[0]?.subscribers[0];
 *     sub?.traces[0]?.referenceId;                   // trace to reassociate on
 *     sub?.inquiries[0]?.serviceTypeCodes[0]?.code;  // "30"
 *   }
 * }
 * ```
 */
export function get270Inquiry(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12Inquiry | undefined {
  if (tx.st.elements[1] !== INQUIRY_270) return undefined;
  return decodeInquiry(delimiters, tx, []);
}

/**
 * Decode every 270 in a raw interchange, in transmitted order. Returns one
 * {@link X12Inquiry} per 270 transaction set, each with its own model and its
 * own warnings, and an EMPTY list when the interchange carries no 270 at all.
 * Two 270s are never merged into one model and the first is never returned in
 * place of the rest.
 *
 * This is also the entry point that reports inter-segment whitespace
 * (`X12_270_INTER_SEGMENT_WHITESPACE`): the shared parse consumes such a run
 * before the next segment opens, so it is visible in the bytes and nowhere on
 * the model, and {@link get270Inquiry} is handed the model.
 *
 * A structural fatal from the shared parse (an input truncated before its ISA
 * is readable, say) is raised by that parse and passes through here
 * unchanged: it is deliberately NOT caught, downgraded or re-raised, because
 * the frame not parsing is a different fact from a 270 body being incomplete,
 * and the lenient guarantee of this reader begins where the frame ended.
 *
 * @example
 * ```ts
 * import { parse270Inquiries } from "@cosyte/x12";
 * const inquiries = parse270Inquiries(rawBytes);
 * inquiries.length;                       // 0 when the interchange holds no 270
 * inquiries[0]?.informationSources.length;
 * ```
 */
export function parse270Inquiries(
  raw: string | Buffer,
  options: X12ParseOptions = {},
): readonly X12Inquiry[] {
  const text = typeof raw === "string" ? raw : raw.toString("utf8");
  const interchange = parseX12(text, options);
  return collectInquiries(interchange, text);
}

/**
 * Walk a parsed interchange for its 270s, seeding each with the framing
 * deviation the raw bytes carry. Split out so the raw scan happens once per
 * interchange rather than once per transaction set. @internal
 */
function collectInquiries(interchange: X12Interchange, text: string): readonly X12Inquiry[] {
  const framing: X12ParseWarning[] = hasInterSegmentWhitespace(text, interchange.delimiters)
    ? [interSegmentWhitespace(ISA_POSITION)]
    : [];
  const out: X12Inquiry[] = [];
  for (const group of interchange.groups) {
    for (const tx of group.transactions) {
      if (tx.st.elements[1] !== INQUIRY_270) continue;
      out.push(decodeInquiry(interchange.delimiters, tx, framing));
    }
  }
  return Object.freeze(out);
}

/** The ISA, where a delimiter set is declared and framing is decided. @internal */
const ISA_POSITION: X12Position = Object.freeze({ segmentIndex: 0, interchangeIndex: 0 });

/**
 * Whether any segment in the document opens after a run of CR / LF bytes.
 *
 * READ-ONLY, and it changes no framing: the split is the same release-aware
 * one the envelope walker performs, over the same terminator that walker was
 * handed, and its result is used for nothing but this predicate. The bytes
 * before the first terminator after the ISA are the first candidate; the
 * bytes after the LAST terminator are not a candidate at all, because no
 * segment follows them.
 *
 * @internal
 */
function hasInterSegmentWhitespace(text: string, delimiters: Delimiters): boolean {
  const term = delimiters.segment;
  const body = text.slice(ISA_MIN_LENGTH);
  const pieces =
    term.length === 1 && term !== RELEASE_CHAR ? splitWithRelease(body, term) : body.split(term);
  for (let i = 0; i < pieces.length - 1; i += 1) {
    const code = (pieces[i] ?? "").charCodeAt(0);
    if (code === 0x0d || code === 0x0a) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// The walk.
// ---------------------------------------------------------------------------

/**
 * One HL and everything transmitted under it before the next HL, before any
 * attachment decision is taken. @internal
 */
interface LevelAccumulator {
  readonly hl: X12Hl;
  readonly position: X12Position;
  name: NameAccumulator | undefined;
  readonly traces: X12InquiryTrace[];
  readonly references: X12InquiryReference[];
  readonly dates: X12InquiryDate[];
  readonly inquiries: InquiryAccumulator[];
  readonly children: LevelAccumulator[];
}

/** One EQ and the REF / DTP transmitted under it. @internal */
interface InquiryAccumulator {
  readonly serviceTypeCodes: X12InquiryServiceType[];
  readonly procedure: X12InquiryProcedure | undefined;
  readonly coverageLevelCode: string | undefined;
  readonly insuranceTypeCode: string | undefined;
  readonly diagnosisCodePointers: string[];
  readonly references: X12InquiryReference[];
  readonly dates: X12InquiryDate[];
}

/**
 * Decode one 270 transaction set, with `seeded` prepended to its warning
 * stream (the document-level framing deviation, where there is one).
 * @internal
 */
function decodeInquiry(
  delimiters: Delimiters,
  tx: X12TransactionSet,
  seeded: readonly X12ParseWarning[],
): X12Inquiry {
  const warnings: X12ParseWarning[] = [...seeded];
  if (!sameDelimiters(delimiters, CONVENTIONAL_DELIMITERS)) {
    warnings.push(nonConventionalDelimiter(ISA_POSITION));
  }

  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);
  const levels: LevelAccumulator[] = [];
  let header: X12InquiryHeader | undefined;
  let current: LevelAccumulator | undefined;
  let currentInquiry: InquiryAccumulator | undefined;

  for (let i = 0; i < body.length; i += 1) {
    const seg = body[i];
    if (seg === undefined) continue;
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    switch (seg.id) {
      case "BHT": {
        header ??= decodeBht(seg, delimiters);
        break;
      }
      case "HL": {
        currentInquiry = undefined;
        current = openLevel(decodeHl(seg, delimiters), position);
        levels.push(current);
        break;
      }
      case "TRN": {
        current?.traces.push(decodeTrn(seg, delimiters));
        break;
      }
      case "NM1": {
        if (current !== undefined && current.name === undefined) {
          current.name = decodeName(seg, delimiters);
        }
        break;
      }
      case "N3": {
        appendAddressLines(current?.name, seg, delimiters);
        break;
      }
      case "N4": {
        applyCityState(current?.name, seg, delimiters);
        break;
      }
      case "DMG": {
        applyDemographics(current?.name, seg, delimiters);
        break;
      }
      case "EQ": {
        currentInquiry = openInquiry(seg, delimiters);
        current?.inquiries.push(currentInquiry);
        break;
      }
      case "REF": {
        const ref = decodeRef(seg, delimiters);
        if (currentInquiry !== undefined) currentInquiry.references.push(ref);
        else current?.references.push(ref);
        break;
      }
      case "DTP": {
        const date = decodeDtp(seg, delimiters);
        if (date === undefined) break;
        if (currentInquiry !== undefined) currentInquiry.dates.push(date);
        else current?.dates.push(date);
        break;
      }
      default: {
        // AAA / INS / III / PRV / PER / HSD and any other optional segment is
        // preserved verbatim on `tx.segments`; the typed surface does not
        // enumerate every segment of the TR3 (additive later).
        break;
      }
    }
  }

  reportMissingRegions(levels, warnings);
  const roots = attachLevels(levels, warnings);

  return Object.freeze({
    header,
    informationSources: Object.freeze(roots.map(freezeSource)),
    hierarchies: Object.freeze(levels.map((l) => l.hl)),
    warnings: Object.freeze(warnings.slice()),
  });
}

/** @internal */
function sameDelimiters(a: Delimiters, b: Delimiters): boolean {
  return (
    a.element === b.element &&
    a.repetition === b.repetition &&
    a.component === b.component &&
    a.segment === b.segment
  );
}

// ---------------------------------------------------------------------------
// Structural completeness.
// ---------------------------------------------------------------------------

/**
 * Report every region the document left out, as a warning naming the region
 * and where it should have been. Nothing is fabricated to stand in and the
 * report is independent of attachment: a level short of its name loop is short
 * of it whether or not its parent pointer resolved. @internal
 */
function reportMissingRegions(
  levels: readonly LevelAccumulator[],
  warnings: X12ParseWarning[],
): void {
  if (levels.length === 0) {
    warnings.push(missingRequiredLoop(ST_POSITION, REQUIRED_LOOPS.INQUIRY_HIERARCHY_2000A));
    return;
  }
  for (const level of levels) {
    if (level.name === undefined) {
      warnings.push(missingRequiredLoop(level.position, REQUIRED_LOOPS.INQUIRY_NAME_2100));
    }
    const asksForBenefits =
      level.hl.levelCode === HL_LEVEL_CODES.SUBSCRIBER ||
      level.hl.levelCode === HL_LEVEL_CODES.DEPENDENT;
    if (asksForBenefits && level.inquiries.length === 0) {
      warnings.push(missingRequiredLoop(level.position, REQUIRED_LOOPS.INQUIRY_ELIGIBILITY_2110));
    }
  }
}

/** The ST, which is the segment a whole-transaction loss is anchored to. @internal */
const ST_POSITION: X12Position = Object.freeze({ segmentIndex: 0, transactionIndex: 0 });

// ---------------------------------------------------------------------------
// Attachment.
// ---------------------------------------------------------------------------

/**
 * Resolve every level's declared parent and return the information-source
 * roots. Builds the id index FIRST-occurrence-wins over the whole transaction
 * set, validates each pointer through the shared `validateHl`, and reports
 * every level it could not attach. @internal
 */
function attachLevels(
  levels: readonly LevelAccumulator[],
  warnings: X12ParseWarning[],
): readonly LevelAccumulator[] {
  const index = new Map<string, LevelAccumulator>();
  for (const level of levels) {
    if (index.has(level.hl.hlId)) {
      warnings.push(duplicateHierarchyId(level.position));
      continue;
    }
    index.set(level.hl.hlId, level);
  }

  const hlIndex = new Map<string, X12Hl>();
  for (const [id, level] of index) hlIndex.set(id, level.hl);

  const roots: LevelAccumulator[] = [];
  const acyclic = new Set<string>();
  for (const level of levels) {
    validateHl(level.hl, hlIndex, EXPECTED_PARENT_LEVEL, level.position, warnings);

    if (level.hl.levelCode === HL_LEVEL_CODES.INFORMATION_SOURCE) {
      // The top of the hierarchy. A source declaring a parent is reported by
      // `validateHl` above; it is still the root of what hangs beneath it, so
      // nothing is dropped for it.
      roots.push(level);
      continue;
    }

    if (chainReturnsToItself(level, index, levels.length, acyclic)) {
      warnings.push(hierarchyCycle(level.position));
      warnings.push(levelDetached(level.position));
      continue;
    }

    const parentId = level.hl.parentHlId;
    const parent = parentId === undefined ? undefined : index.get(parentId);
    const expected = Object.prototype.hasOwnProperty.call(EXPECTED_PARENT_LEVEL, level.hl.levelCode)
      ? EXPECTED_PARENT_LEVEL[level.hl.levelCode]
      : undefined;
    if (parent === undefined || expected === undefined || parent.hl.levelCode !== expected) {
      warnings.push(levelDetached(level.position));
      continue;
    }
    parent.children.push(level);
  }
  return roots;
}

/**
 * Whether the chain of declared parent pointers from `level` returns to a
 * level already on that chain.
 *
 * The walk stops at the FIRST level it revisits, so it visits no level twice
 * on one chain, and it takes at most one step per hierarchy segment in the
 * transaction set, so it terminates on any input whatever the pointers say.
 * A chain that runs out of steps has revisited a level by the pigeonhole
 * principle and is reported as a cycle. Levels proved to reach a root are
 * remembered in `acyclic`, so the common well-formed document costs one step
 * per level in total.
 *
 * A pointer naming a level that is NOT present ends the chain and is not a
 * cycle: that is a dangling pointer, which `validateHl` reports on its own
 * code. @internal
 */
function chainReturnsToItself(
  level: LevelAccumulator,
  index: ReadonlyMap<string, LevelAccumulator>,
  hierarchyCount: number,
  acyclic: Set<string>,
): boolean {
  const seen = new Set<string>([level.hl.hlId]);
  let current = level;
  for (let step = 0; step < hierarchyCount; step += 1) {
    const parentId = current.hl.parentHlId;
    if (parentId === undefined) break;
    if (acyclic.has(parentId)) break;
    const parent = index.get(parentId);
    if (parent === undefined) break;
    if (seen.has(parent.hl.hlId)) return true;
    seen.add(parent.hl.hlId);
    current = parent;
  }
  for (const id of seen) acyclic.add(id);
  return false;
}

// ---------------------------------------------------------------------------
// Openers and decoders.
// ---------------------------------------------------------------------------

/** @internal */
function openLevel(hl: X12Hl, position: X12Position): LevelAccumulator {
  return {
    hl,
    position,
    name: undefined,
    traces: [],
    references: [],
    dates: [],
    inquiries: [],
    children: [],
  };
}

/** @internal */
function decodeBht(seg: X12Segment, delimiters: Delimiters): X12InquiryHeader {
  return Object.freeze({
    hierarchicalStructureCode: elementValue(seg, 1, delimiters),
    purposeCode: elementValue(seg, 2, delimiters),
    referenceId: elementOptional(seg, 3, delimiters),
    date: elementOptional(seg, 4, delimiters),
    time: elementOptional(seg, 5, delimiters),
  });
}

/** @internal */
function decodeTrn(seg: X12Segment, delimiters: Delimiters): X12InquiryTrace {
  return Object.freeze({
    traceTypeCode: elementValue(seg, 1, delimiters),
    referenceId: elementValue(seg, 2, delimiters),
    originatingCompanyId: elementOptional(seg, 3, delimiters),
    supplementalReferenceId: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeRef(seg: X12Segment, delimiters: Delimiters): X12InquiryReference {
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    value: elementValue(seg, 2, delimiters),
    description: elementOptional(seg, 3, delimiters),
  });
}

/** @internal */
function decodeDtp(seg: X12Segment, delimiters: Delimiters): X12InquiryDate | undefined {
  const qualifier = elementOptional(seg, 1, delimiters);
  const value = elementOptional(seg, 3, delimiters);
  if (qualifier === undefined || value === undefined) return undefined;
  return Object.freeze({
    qualifier,
    formatQualifier: elementValue(seg, 2, delimiters),
    value,
  });
}

/**
 * A mutable name accumulator: the NM1 is frozen field-for-field, and the
 * address / demographics arrive on later segments. @internal
 */
interface NameAccumulator {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly lastNameOrOrganizationName: string | undefined;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
  readonly addressLines: string[];
  city: string | undefined;
  state: string | undefined;
  postalCode: string | undefined;
  countryCode: string | undefined;
  dateOfBirth: string | undefined;
  genderCode: string | undefined;
}

/** @internal */
function decodeName(seg: X12Segment, delimiters: Delimiters): NameAccumulator {
  return {
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    entityTypeQualifier: elementValue(seg, 2, delimiters),
    lastNameOrOrganizationName: elementOptional(seg, 3, delimiters),
    firstName: elementOptional(seg, 4, delimiters),
    middleName: elementOptional(seg, 5, delimiters),
    suffix: elementOptional(seg, 7, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
    addressLines: [],
    city: undefined,
    state: undefined,
    postalCode: undefined,
    countryCode: undefined,
    dateOfBirth: undefined,
    genderCode: undefined,
  };
}

/** @internal */
function appendAddressLines(
  acc: NameAccumulator | undefined,
  seg: X12Segment,
  delimiters: Delimiters,
): void {
  if (acc === undefined) return;
  for (let n = 1; n <= 2; n += 1) {
    const line = elementOptional(seg, n, delimiters);
    if (line !== undefined) acc.addressLines.push(line);
  }
}

/** @internal */
function applyCityState(
  acc: NameAccumulator | undefined,
  seg: X12Segment,
  delimiters: Delimiters,
): void {
  if (acc === undefined) return;
  acc.city = elementOptional(seg, 1, delimiters);
  acc.state = elementOptional(seg, 2, delimiters);
  acc.postalCode = elementOptional(seg, 3, delimiters);
  acc.countryCode = elementOptional(seg, 4, delimiters);
}

/** @internal */
function applyDemographics(
  acc: NameAccumulator | undefined,
  seg: X12Segment,
  delimiters: Delimiters,
): void {
  if (acc === undefined) return;
  acc.dateOfBirth = elementOptional(seg, 2, delimiters);
  acc.genderCode = elementOptional(seg, 3, delimiters);
}

/** @internal */
function freezeName(acc: NameAccumulator | undefined): X12InquiryName | undefined {
  if (acc === undefined) return undefined;
  const address: X12InquiryAddress | undefined =
    acc.addressLines.length > 0 ||
    acc.city !== undefined ||
    acc.state !== undefined ||
    acc.postalCode !== undefined ||
    acc.countryCode !== undefined
      ? Object.freeze({
          lines: Object.freeze(acc.addressLines.slice()),
          city: acc.city,
          state: acc.state,
          postalCode: acc.postalCode,
          countryCode: acc.countryCode,
        })
      : undefined;
  return Object.freeze({
    entityIdentifierCode: acc.entityIdentifierCode,
    entityTypeQualifier: acc.entityTypeQualifier,
    lastNameOrOrganizationName: acc.lastNameOrOrganizationName,
    firstName: acc.firstName,
    middleName: acc.middleName,
    suffix: acc.suffix,
    idQualifier: acc.idQualifier,
    idCode: acc.idCode,
    address,
    dateOfBirth: acc.dateOfBirth,
    genderCode: acc.genderCode,
  });
}

/** @internal */
function openInquiry(seg: X12Segment, delimiters: Delimiters): InquiryAccumulator {
  const serviceTypeCodes: X12InquiryServiceType[] = [];
  for (const code of getAllSegmentValues(seg, "01", delimiters)) {
    if (code === "") continue;
    serviceTypeCodes.push(
      Object.freeze({ code, description: lookupServiceType(code)?.description }),
    );
  }
  const diagnosisCodePointers: string[] = [];
  for (let p = 1; p <= 4; p += 1) {
    const pointer = componentOptional(seg, 5, p, delimiters);
    if (pointer !== undefined) diagnosisCodePointers.push(pointer);
  }
  return {
    serviceTypeCodes,
    procedure: decodeProcedure(seg, delimiters),
    coverageLevelCode: elementOptional(seg, 3, delimiters),
    insuranceTypeCode: elementOptional(seg, 4, delimiters),
    diagnosisCodePointers,
    references: [],
    dates: [],
  };
}

/**
 * EQ-02, as its separated components. Absent when the element carries no
 * qualifier: a composite with no first component states no procedure, and
 * inventing one would be this reader asserting a request the sender did not
 * make. @internal
 */
function decodeProcedure(seg: X12Segment, delimiters: Delimiters): X12InquiryProcedure | undefined {
  const qualifier = componentOptional(seg, 2, 1, delimiters);
  if (qualifier === undefined) return undefined;
  const modifiers: string[] = [];
  for (let p = 3; p <= 6; p += 1) {
    const modifier = componentOptional(seg, 2, p, delimiters);
    if (modifier !== undefined) modifiers.push(modifier);
  }
  return Object.freeze({
    qualifier,
    code: componentOptional(seg, 2, 2, delimiters),
    modifiers: Object.freeze(modifiers),
    description: componentOptional(seg, 2, 7, delimiters),
  });
}

// ---------------------------------------------------------------------------
// Freezing accumulators into the readonly public shape.
// ---------------------------------------------------------------------------

/** @internal */
function freezeInquiry(acc: InquiryAccumulator): X12InquiryRequest {
  return Object.freeze({
    serviceTypeCodes: Object.freeze(acc.serviceTypeCodes.slice()),
    procedure: acc.procedure,
    coverageLevelCode: acc.coverageLevelCode,
    insuranceTypeCode: acc.insuranceTypeCode,
    diagnosisCodePointers: Object.freeze(acc.diagnosisCodePointers.slice()),
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
  });
}

/** @internal */
function freezeSource(level: LevelAccumulator): X12InquirySource {
  return Object.freeze({
    hierarchy: level.hl,
    name: freezeName(level.name),
    references: Object.freeze(level.references.slice()),
    receivers: Object.freeze(
      level.children
        .filter((c) => c.hl.levelCode === HL_LEVEL_CODES.INFORMATION_RECEIVER)
        .map(freezeReceiver),
    ),
  });
}

/** @internal */
function freezeReceiver(level: LevelAccumulator): X12InquiryReceiver {
  return Object.freeze({
    hierarchy: level.hl,
    name: freezeName(level.name),
    references: Object.freeze(level.references.slice()),
    subscribers: Object.freeze(
      level.children
        .filter((c) => c.hl.levelCode === HL_LEVEL_CODES.SUBSCRIBER)
        .map(freezeSubscriber),
    ),
  });
}

/** @internal */
function freezeSubscriber(level: LevelAccumulator): X12InquirySubscriber {
  return Object.freeze({
    hierarchy: level.hl,
    traces: Object.freeze(level.traces.slice()),
    name: freezeName(level.name),
    references: Object.freeze(level.references.slice()),
    dates: Object.freeze(level.dates.slice()),
    inquiries: Object.freeze(level.inquiries.map(freezeInquiry)),
    dependents: Object.freeze(
      level.children
        .filter((c) => c.hl.levelCode === HL_LEVEL_CODES.DEPENDENT)
        .map(freezeDependent),
    ),
  });
}

/** @internal */
function freezeDependent(level: LevelAccumulator): X12InquiryDependent {
  return Object.freeze({
    hierarchy: level.hl,
    traces: Object.freeze(level.traces.slice()),
    name: freezeName(level.name),
    references: Object.freeze(level.references.slice()),
    dates: Object.freeze(level.dates.slice()),
    inquiries: Object.freeze(level.inquiries.map(freezeInquiry)),
  });
}
