/**
 * `get276StatusInquiry` / `parse276StatusInquiries` - extract the typed
 * {@link X12StatusInquiry} model from an X12 005010X212 276 Health Care Claim
 * Status Request. Lenient on parse: every recoverable deviation surfaces as a
 * warning and nothing here throws.
 *
 * ## Two entry points, and what separates them
 *
 * {@link get276StatusInquiry} takes the delimiters and ONE transaction set,
 * exactly as {@link "./get-277.js".get277Status} does, and answers `undefined`
 * when that transaction set is not a 276. {@link parse276StatusInquiries} takes
 * the raw bytes, as {@link "../eligibility/get-270.js".parse270Inquiries} does,
 * and answers a list holding one model per 276 in the interchange, in
 * transmitted order, which is EMPTY when the interchange carries none. The two
 * answers are deliberately different values: `undefined` says "that is not a
 * 276" and `[]` says "this interchange holds no 276", and a consumer that
 * conflated them could not tell a 277 handed to the wrong reader from an
 * interchange with nothing to read.
 *
 * **An interchange carrying no 276 yields no model and raises no warning about
 * the absence.** A 277 sitting beside it is a different transaction set and is
 * never decoded here: the gate is `ST-01`, read off the transaction set's own
 * header, and nothing about a neighbouring transaction reaches this model.
 *
 * ## How a level finds its parent
 *
 * By its own HL-02 and by nothing else, exactly as the 270 reader does it. The
 * index is built over the whole transaction set, so a pointer resolves whether
 * the level it names came earlier or later, and where two levels were
 * transmitted with the same HL-01 the FIRST in transmitted order wins, which is
 * what makes the decode deterministic. A level attaches only when its declared
 * parent is present AND carries the HL-03 the TR3 gives that level's parent AND
 * the chain from it does not return to a level already on the chain. Otherwise
 * the level is reported (`X12_276_LEVEL_DETACHED`, beside the code for the
 * defect itself) and left off the returned tree with everything transmitted
 * beneath it.
 *
 * **Nothing is re-parented and nothing is re-numbered.** Attaching a level to
 * whichever one happened to be open would be this reader inventing a
 * relationship the sender did not state, on the one structure a 276 exists to
 * state: which provider is asking about which patient's claim. Every declared
 * pointer stays verbatim on `hierarchies` and every segment stays verbatim on
 * the transaction set, so a consumer that wants the detached region can still
 * read it.
 *
 * ## The spine is the 277's, because the pair shares one
 *
 * `20` Information Source, `21` Information Receiver, `19` Service Provider,
 * `22` Subscriber, `23` Dependent, each parented to the one before it. That is
 * the map `./get-277.js` already uses for the response direction, and this
 * reader uses the same one rather than a second copy of a different shape.
 *
 * ## A row this reader could not build is reported, not dropped in silence
 *
 * A DTP, a REF and an AMT are each a RECORD and not a slot. A DTP short of its
 * qualifier (DTP-01) or its value (DTP-03) builds no date row and raises
 * `X12_276_DATE_ROW_DROPPED`; a REF short of its qualifier (REF-01) or its
 * identifier (REF-02) builds no reference row and raises
 * `X12_276_REFERENCE_ROW_DROPPED`; an AMT whose amount does not decode builds
 * no amount row and raises the package's existing `X12_AMOUNT_ROW_DROPPED`,
 * which is the code that already names exactly that loss for every AMT this
 * library reads. Each reports the row it could not build and nothing wider: a
 * segment that decoded and then found no claim or service line open to sit on
 * is a different loss, it stays silent, and it is recorded in
 * `KNOWN-LIMITATIONS.md`.
 *
 * Spec source: WPC TR3 `005010X212` - Health Care Claim Status Request and
 * Response (276/277).
 */

import { parseX12 } from "../../parser/index.js";
import {
  componentOptional,
  elementDecimal,
  elementOptional,
  elementValue,
  type X12DecimalWarningSink,
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
  amountRowDropped,
  statusInquiryDateRowDropped,
  statusInquiryDuplicateHierarchyId,
  statusInquiryHierarchyCycle,
  statusInquiryLevelDetached,
  statusInquiryReferenceRowDropped,
  type X12ParseWarning,
} from "../../parser/warnings.js";
import { HL_LEVEL_CODES, decodeHl, validateHl, type X12Hl } from "../shared/hl.js";

import type {
  X12StatusInquiry,
  X12StatusInquiryAmount,
  X12StatusInquiryClaim,
  X12StatusInquiryDate,
  X12StatusInquiryDependent,
  X12StatusInquiryHeader,
  X12StatusInquiryName,
  X12StatusInquiryProcedure,
  X12StatusInquiryProvider,
  X12StatusInquiryReceiver,
  X12StatusInquiryReference,
  X12StatusInquiryServiceLine,
  X12StatusInquirySource,
  X12StatusInquirySubscriber,
  X12StatusInquiryTrace,
} from "./status-inquiry-types.js";

/** ST-01 of the transaction set this reader claims. @internal */
const STATUS_INQUIRY_276 = "276";

/**
 * Per-level expected parent level for the 276 HL tree, identical in shape to
 * the 277's because the request and the response share one hierarchy:
 * information source (`20`) has no parent, receiver (`21`) parents to source,
 * service provider (`19`) to receiver, subscriber (`22`) to provider, dependent
 * (`23`) to subscriber. @internal
 */
const EXPECTED_PARENT_LEVEL: Readonly<Record<string, string | undefined>> = Object.freeze({
  [HL_LEVEL_CODES.INFORMATION_SOURCE]: undefined,
  [HL_LEVEL_CODES.INFORMATION_RECEIVER]: HL_LEVEL_CODES.INFORMATION_SOURCE,
  [HL_LEVEL_CODES.PROVIDER_OF_SERVICE]: HL_LEVEL_CODES.INFORMATION_RECEIVER,
  [HL_LEVEL_CODES.SUBSCRIBER]: HL_LEVEL_CODES.PROVIDER_OF_SERVICE,
  [HL_LEVEL_CODES.DEPENDENT]: HL_LEVEL_CODES.SUBSCRIBER,
});

/**
 * Extract the typed {@link X12StatusInquiry} from one 276 transaction set. Pure
 * function: no I/O, no global state, never throws. Returns `undefined` only
 * when the transaction set's ST-01 is not `"276"` (a mis-routed call) - the
 * same refusal shape `get277Status`, `get270Inquiry` and every other
 * per-transaction reader in this package uses. Every other deviation is
 * recoverable and surfaces on `result.warnings`.
 *
 * @example
 * ```ts
 * import { parseX12, get276StatusInquiry } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const group of ix.groups) {
 *   for (const tx of group.transactions) {
 *     if (tx.st.elements[1] !== "276") continue;
 *     const inquiry = get276StatusInquiry(ix.delimiters, tx);
 *     const sub =
 *       inquiry?.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0];
 *     sub?.claims[0]?.trace?.referenceId;      // the trace a 277 echoes back
 *     sub?.claims[0]?.references[0]?.value;    // "PCN0001"
 *   }
 * }
 * ```
 */
export function get276StatusInquiry(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12StatusInquiry | undefined {
  if (tx.st.elements[1] !== STATUS_INQUIRY_276) return undefined;
  return decodeStatusInquiry(delimiters, tx);
}

/**
 * Decode every 276 in a raw interchange, in transmitted order. Returns one
 * {@link X12StatusInquiry} per 276 transaction set, each with its own model and
 * its own warnings, and an EMPTY list when the interchange carries no 276 at
 * all. Two 276s are never merged into one model and the first is never returned
 * in place of the rest.
 *
 * **No warning is raised about an interchange that carries no 276.** An
 * interchange full of 277s is not a defective 276 and this reader says nothing
 * about it: the empty list IS the answer.
 *
 * A structural fatal from the shared parse (an input truncated before its ISA
 * is readable, say) is raised by that parse and passes through here unchanged:
 * it is deliberately NOT caught, downgraded or re-raised, because the frame not
 * parsing is a different fact from a 276 body being incomplete, and the lenient
 * guarantee of this reader begins where the frame ended.
 *
 * @example
 * ```ts
 * import { parse276StatusInquiries } from "@cosyte/x12";
 * const inquiries = parse276StatusInquiries(rawBytes);
 * inquiries.length;                       // 0 when the interchange holds no 276
 * inquiries[0]?.informationSources.length;
 * ```
 */
export function parse276StatusInquiries(
  raw: string | Buffer,
  options: X12ParseOptions = {},
): readonly X12StatusInquiry[] {
  const text = typeof raw === "string" ? raw : raw.toString("utf8");
  return collectInquiries(parseX12(text, options));
}

/** @internal */
function collectInquiries(interchange: X12Interchange): readonly X12StatusInquiry[] {
  const out: X12StatusInquiry[] = [];
  for (const group of interchange.groups) {
    for (const tx of group.transactions) {
      if (tx.st.elements[1] !== STATUS_INQUIRY_276) continue;
      out.push(decodeStatusInquiry(interchange.delimiters, tx));
    }
  }
  return Object.freeze(out);
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
  readonly claims: ClaimAccumulator[];
  readonly children: LevelAccumulator[];
}

/** One TRN-opened Loop 2200 and everything transmitted under it. @internal */
interface ClaimAccumulator {
  readonly trace: X12StatusInquiryTrace | undefined;
  readonly references: X12StatusInquiryReference[];
  readonly amounts: X12StatusInquiryAmount[];
  readonly dates: X12StatusInquiryDate[];
  readonly serviceLines: ServiceLineAccumulator[];
}

/** One SVC-opened Loop 2210 and everything transmitted under it. @internal */
interface ServiceLineAccumulator {
  readonly procedure: X12StatusInquiryProcedure | undefined;
  readonly lineChargeAmount: X12StatusInquiryServiceLine["lineChargeAmount"];
  readonly revenueCode: string | undefined;
  readonly unitsOfService: X12StatusInquiryServiceLine["unitsOfService"];
  readonly references: X12StatusInquiryReference[];
  readonly dates: X12StatusInquiryDate[];
}

/** Decode one 276 transaction set. @internal */
function decodeStatusInquiry(delimiters: Delimiters, tx: X12TransactionSet): X12StatusInquiry {
  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);
  const levels: LevelAccumulator[] = [];
  let header: X12StatusInquiryHeader | undefined;
  let current: LevelAccumulator | undefined;
  let currentClaim: ClaimAccumulator | undefined;
  let currentLine: ServiceLineAccumulator | undefined;

  for (let i = 0; i < body.length; i += 1) {
    const seg = body[i];
    if (seg === undefined) continue;
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    const sink: X12DecimalWarningSink = { warnings, position };
    switch (seg.id) {
      case "BHT": {
        header ??= decodeBht(seg, delimiters);
        break;
      }
      case "HL": {
        currentClaim = undefined;
        currentLine = undefined;
        current = openLevel(decodeHl(seg, delimiters), position);
        levels.push(current);
        break;
      }
      case "NM1": {
        if (current !== undefined && current.name === undefined) {
          current.name = decodeName(seg, delimiters);
        }
        break;
      }
      case "DMG": {
        applyDemographics(current?.name, seg, delimiters);
        break;
      }
      case "TRN": {
        // A claim submitter trace number opens a new Loop 2200. Only a TRN
        // opens one, which is what makes the claims list of a level exactly
        // the traces that level transmitted.
        currentLine = undefined;
        currentClaim = openClaim(decodeTrn(seg, delimiters));
        current?.claims.push(currentClaim);
        break;
      }
      case "SVC": {
        if (currentClaim === undefined) break;
        currentLine = openServiceLine(seg, delimiters, sink);
        currentClaim.serviceLines.push(currentLine);
        break;
      }
      case "REF": {
        const ref = decodeRef(seg, delimiters);
        if (ref === undefined) {
          // A REF is a RECORD and not a slot: short of its qualifier or its
          // identifier there is no row to build, and the description that
          // would sit beside them goes with it. Reported rather than dropped
          // in silence, because an empty `references` list otherwise reads the
          // same whether the sender stated no identifier or stated one this
          // reader could build no row from.
          warnings.push(statusInquiryReferenceRowDropped(position));
          break;
        }
        if (currentLine !== undefined) currentLine.references.push(ref);
        else if (currentClaim !== undefined) currentClaim.references.push(ref);
        break;
      }
      case "AMT": {
        const amount = decodeAmt(seg, delimiters, sink);
        if (amount === undefined) {
          warnings.push(amountRowDropped(position));
          break;
        }
        if (currentClaim !== undefined) currentClaim.amounts.push(amount);
        break;
      }
      case "DTP": {
        const date = decodeDtp(seg, delimiters);
        if (date === undefined) {
          warnings.push(statusInquiryDateRowDropped(position));
          break;
        }
        if (currentLine !== undefined) currentLine.dates.push(date);
        else if (currentClaim !== undefined) currentClaim.dates.push(date);
        break;
      }
      default: {
        // PER / PRV / N3 / N4 and any other optional segment is preserved
        // verbatim on `tx.segments`; the typed surface does not enumerate every
        // segment of the TR3 (additive later).
        break;
      }
    }
  }

  const roots = attachLevels(levels, warnings);

  return Object.freeze({
    header,
    informationSources: Object.freeze(roots.map(freezeSource)),
    hierarchies: Object.freeze(levels.map((l) => l.hl)),
    warnings: Object.freeze(warnings.slice()),
  });
}

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
      warnings.push(statusInquiryDuplicateHierarchyId(level.position));
      continue;
    }
    index.set(level.hl.hlId, level);
  }

  const hlIndex = new Map<string, X12Hl>();
  for (const [id, level] of index) hlIndex.set(id, level.hl);

  const roots: LevelAccumulator[] = [];
  const acyclic = new Set<string>();
  const cyclic = new Set<string>();
  for (const level of levels) {
    validateHl(level.hl, hlIndex, EXPECTED_PARENT_LEVEL, level.position, warnings);

    if (level.hl.levelCode === HL_LEVEL_CODES.INFORMATION_SOURCE) {
      // The top of the hierarchy. A source declaring a parent is reported by
      // `validateHl` above; it is still the root of what hangs beneath it, so
      // nothing is dropped for it.
      roots.push(level);
      continue;
    }

    if (chainReturnsToItself(level, index, levels.length, acyclic, cyclic)) {
      warnings.push(statusInquiryHierarchyCycle(level.position));
      warnings.push(statusInquiryLevelDetached(level.position));
      continue;
    }

    const parentId = level.hl.parentHlId;
    const parent = parentId === undefined ? undefined : index.get(parentId);
    const expected = Object.prototype.hasOwnProperty.call(EXPECTED_PARENT_LEVEL, level.hl.levelCode)
      ? EXPECTED_PARENT_LEVEL[level.hl.levelCode]
      : undefined;
    if (parent === undefined || expected === undefined || parent.hl.levelCode !== expected) {
      warnings.push(statusInquiryLevelDetached(level.position));
      continue;
    }
    parent.children.push(level);
  }
  return roots;
}

/**
 * Whether the chain of declared parent pointers from `level` returns to a level
 * already on that chain.
 *
 * The walk stops at the FIRST level it revisits, so it visits no level twice on
 * one chain, and it takes at most one step per hierarchy segment in the
 * transaction set, so it terminates on any input whatever the pointers say. A
 * chain that runs out of steps has revisited a level by the pigeonhole
 * principle and is reported as a cycle.
 *
 * **BOTH answers are memoised, and the second one is what bounds the cost of a
 * hostile document**, for the reason the 270 reader records: remembering only
 * the acyclic answer leaves an all-cycle document paying a full walk per level,
 * which is quadratic in the number of HL segments on a PHI-bearing path. The
 * ANSWER is identical either way; this changes what the walk costs and never
 * what it decides.
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
  cyclic: Set<string>,
): boolean {
  const seen = new Set<string>([level.hl.hlId]);
  let current = level;
  let onCycle = false;
  for (let step = 0; step < hierarchyCount; step += 1) {
    const parentId = current.hl.parentHlId;
    if (parentId === undefined) break;
    if (acyclic.has(parentId)) break;
    if (cyclic.has(parentId)) {
      onCycle = true;
      break;
    }
    const parent = index.get(parentId);
    if (parent === undefined) break;
    if (seen.has(parent.hl.hlId)) {
      onCycle = true;
      break;
    }
    seen.add(parent.hl.hlId);
    current = parent;
  }
  for (const id of seen) (onCycle ? cyclic : acyclic).add(id);
  return onCycle;
}

// ---------------------------------------------------------------------------
// Openers and decoders.
// ---------------------------------------------------------------------------

/** @internal */
function openLevel(hl: X12Hl, position: X12Position): LevelAccumulator {
  return { hl, position, name: undefined, claims: [], children: [] };
}

/** @internal */
function openClaim(trace: X12StatusInquiryTrace): ClaimAccumulator {
  return { trace, references: [], amounts: [], dates: [], serviceLines: [] };
}

/** @internal */
function openServiceLine(
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): ServiceLineAccumulator {
  return {
    procedure: decodeProcedure(seg, delimiters),
    lineChargeAmount: elementDecimal(seg, 2, delimiters, sink),
    revenueCode: elementOptional(seg, 4, delimiters),
    unitsOfService: elementDecimal(seg, 7, delimiters, sink),
    references: [],
    dates: [],
  };
}

/** @internal */
function decodeBht(seg: X12Segment, delimiters: Delimiters): X12StatusInquiryHeader {
  return Object.freeze({
    hierarchicalStructureCode: elementValue(seg, 1, delimiters),
    purposeCode: elementValue(seg, 2, delimiters),
    referenceId: elementOptional(seg, 3, delimiters),
    date: elementOptional(seg, 4, delimiters),
    time: elementOptional(seg, 5, delimiters),
  });
}

/** @internal */
function decodeTrn(seg: X12Segment, delimiters: Delimiters): X12StatusInquiryTrace {
  return Object.freeze({
    traceTypeCode: elementValue(seg, 1, delimiters),
    referenceId: elementValue(seg, 2, delimiters),
    originatingCompanyId: elementOptional(seg, 3, delimiters),
    supplementalReferenceId: elementOptional(seg, 4, delimiters),
  });
}

/**
 * REF-01 plus REF-02, or nothing. A qualifier with no identifier looks up
 * nothing and an identifier with no qualifier says nothing about WHAT was
 * identified, so neither half stands alone. @internal
 */
function decodeRef(seg: X12Segment, delimiters: Delimiters): X12StatusInquiryReference | undefined {
  const qualifier = elementOptional(seg, 1, delimiters);
  const value = elementOptional(seg, 2, delimiters);
  if (qualifier === undefined || value === undefined) return undefined;
  return Object.freeze({
    qualifier,
    value,
    description: elementOptional(seg, 3, delimiters),
  });
}

/**
 * AMT-01 plus a decodable AMT-02, or nothing. An amount row is built around a
 * value this library read, never around a zero it substituted. @internal
 */
function decodeAmt(
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): X12StatusInquiryAmount | undefined {
  const qualifier = elementOptional(seg, 1, delimiters);
  const amount = elementDecimal(seg, 2, delimiters, sink);
  if (qualifier === undefined || amount === undefined) return undefined;
  return Object.freeze({ qualifier, amount });
}

/** @internal */
function decodeDtp(seg: X12Segment, delimiters: Delimiters): X12StatusInquiryDate | undefined {
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
 * SVC-01, as its separated components. Absent when the element carries no
 * qualifier: a composite with no first component states no procedure, and
 * inventing one would be this reader asserting a line the sender did not
 * identify. @internal
 */
function decodeProcedure(
  seg: X12Segment,
  delimiters: Delimiters,
): X12StatusInquiryProcedure | undefined {
  const qualifier = componentOptional(seg, 1, 1, delimiters);
  if (qualifier === undefined) return undefined;
  const modifiers: string[] = [];
  for (let p = 3; p <= 6; p += 1) {
    const modifier = componentOptional(seg, 1, p, delimiters);
    if (modifier !== undefined) modifiers.push(modifier);
  }
  return Object.freeze({
    qualifier,
    code: componentOptional(seg, 1, 2, delimiters),
    modifiers: Object.freeze(modifiers),
    description: componentOptional(seg, 1, 7, delimiters),
  });
}

/**
 * A mutable name accumulator: the NM1 is frozen field-for-field, and the
 * demographics arrive on a later segment. @internal
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
    dateOfBirth: undefined,
    genderCode: undefined,
  };
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

// ---------------------------------------------------------------------------
// Freezing accumulators into the readonly public shape.
// ---------------------------------------------------------------------------

/** @internal */
function freezeName(acc: NameAccumulator | undefined): X12StatusInquiryName | undefined {
  if (acc === undefined) return undefined;
  return Object.freeze({
    entityIdentifierCode: acc.entityIdentifierCode,
    entityTypeQualifier: acc.entityTypeQualifier,
    lastNameOrOrganizationName: acc.lastNameOrOrganizationName,
    firstName: acc.firstName,
    middleName: acc.middleName,
    suffix: acc.suffix,
    idQualifier: acc.idQualifier,
    idCode: acc.idCode,
    dateOfBirth: acc.dateOfBirth,
    genderCode: acc.genderCode,
  });
}

/** @internal */
function freezeServiceLine(acc: ServiceLineAccumulator): X12StatusInquiryServiceLine {
  return Object.freeze({
    procedure: acc.procedure,
    lineChargeAmount: acc.lineChargeAmount,
    revenueCode: acc.revenueCode,
    unitsOfService: acc.unitsOfService,
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
  });
}

/** @internal */
function freezeClaim(acc: ClaimAccumulator): X12StatusInquiryClaim {
  return Object.freeze({
    trace: acc.trace,
    references: Object.freeze(acc.references.slice()),
    amounts: Object.freeze(acc.amounts.slice()),
    dates: Object.freeze(acc.dates.slice()),
    serviceLines: Object.freeze(acc.serviceLines.map(freezeServiceLine)),
  });
}

/** @internal */
function childrenOf(level: LevelAccumulator, levelCode: string): readonly LevelAccumulator[] {
  return level.children.filter((c) => c.hl.levelCode === levelCode);
}

/** @internal */
function freezeSource(level: LevelAccumulator): X12StatusInquirySource {
  return Object.freeze({
    hierarchy: level.hl,
    name: freezeName(level.name),
    receivers: Object.freeze(
      childrenOf(level, HL_LEVEL_CODES.INFORMATION_RECEIVER).map(freezeReceiver),
    ),
  });
}

/** @internal */
function freezeReceiver(level: LevelAccumulator): X12StatusInquiryReceiver {
  return Object.freeze({
    hierarchy: level.hl,
    name: freezeName(level.name),
    providers: Object.freeze(
      childrenOf(level, HL_LEVEL_CODES.PROVIDER_OF_SERVICE).map(freezeProvider),
    ),
  });
}

/** @internal */
function freezeProvider(level: LevelAccumulator): X12StatusInquiryProvider {
  return Object.freeze({
    hierarchy: level.hl,
    name: freezeName(level.name),
    subscribers: Object.freeze(childrenOf(level, HL_LEVEL_CODES.SUBSCRIBER).map(freezeSubscriber)),
  });
}

/** @internal */
function freezeSubscriber(level: LevelAccumulator): X12StatusInquirySubscriber {
  return Object.freeze({
    hierarchy: level.hl,
    name: freezeName(level.name),
    claims: Object.freeze(level.claims.map(freezeClaim)),
    dependents: Object.freeze(childrenOf(level, HL_LEVEL_CODES.DEPENDENT).map(freezeDependent)),
  });
}

/** @internal */
function freezeDependent(level: LevelAccumulator): X12StatusInquiryDependent {
  return Object.freeze({
    hierarchy: level.hl,
    name: freezeName(level.name),
    claims: Object.freeze(level.claims.map(freezeClaim)),
  });
}
