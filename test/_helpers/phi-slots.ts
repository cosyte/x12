/**
 * The PHI gate for `@cosyte/x12`'s diagnostic surfaces, driven by the shared
 * `assertNoDiagnosticPhiLeak` runner from `@cosyte/test-utils`.
 *
 * **The slot table is the deliverable.** {@link PHI_SLOTS} names sender-
 * controlled positions that can carry four or more bytes, chosen structurally
 * rather than by which ones look like PHI. It is **not** every such position:
 * it covers the whole envelope and every element that reaches a diagnostic
 * branch, plus a sample of the co-located body elements, and it leaves out
 * repeated or purely-numeric body elements that reach no branch of their own
 * (`PLB-*`, `MIA-*`, `AMT-02`, `QTY-02`, `LX-01`, `SVC-04..07`, CAS triples
 * 2..6, `BPR-03..21`, `N1-03/04`, `PER-*`, most of `CLP`, `TRN-03/04`,
 * `REF-03`, `DTM-01`). Those are covered by construction instead, by the
 * registry-membership assertion in
 * `test/phi-diagnostic-surface.test.ts`, which holds for every message the
 * library emits from any input rather than only for a declared slot. The
 * audited leak in this
 * library was in the six envelope **control numbers** and the three
 * **declared counts**: slots nobody thinks of as PHI-bearing, whose values a
 * trading partner nevertheless fills with whatever their billing system
 * emits. The suite that shipped before this one planted `JOHNDOEMRN98765`
 * in one segment id and handed a clean value to every slot that actually
 * reached a message.
 *
 * ## How to read `expectCode`, which is the honest part
 *
 * The runner asserts the named code actually appeared, so a slot cannot go
 * green over a branch it never reached. Two kinds of slot appear below and
 * they prove different things:
 *
 * - **own** - the planted value is an input to the branch that raises the
 *   named code. A leak would be an interpolation of *this* value. Every
 *   envelope control number, count, code-list slot and balance amount is
 *   this kind.
 * - **co-located** - the planted value drives no diagnostic of its own (a
 *   member id, an NPI, a claim id, a date, an NTE description). The document
 *   carries a *separate* deviation in the same segment, claim or transaction
 *   so that a diagnostic is produced **while the marker is in the parser's
 *   hands and on the model**. The named code proves a diagnostic was built
 *   at that location; it does not prove the marker fed it. That is weaker
 *   than an own-slot, and it is written down here rather than hidden behind
 *   `expectCode: null`, which proves nothing at all.
 *
 * **A third case, and the one a reviewer should distrust most.** The six
 * monetary slots (`CLP-03`, `CLP-04`, `SVC-02`, `SVC-03`, `CAS-03`, `BPR-02`)
 * are marked own, and they do reach the balance branch: an unparseable amount
 * collapses to zero and the invariant then fails. But `X12Decimal` normalizes
 * the marker away **before** the message is built, so those six were GREEN at
 * the base commit while that very message was rendering three amounts
 * verbatim. They cannot detect the leak they name, and none of them is among
 * the 13 base reds. What actually covers an unbounded amount is the numeric
 * measurement in `test/phi-diagnostic-surface.test.ts` ("bounds the 835
 * balance-mismatch message against a 100,000-digit amount"), because the
 * runner matches text and a leak carried only as a number is outside its
 * scope. The slots are kept because they prove the branch stays value-free
 * going forward; they are not evidence that it ever was.
 *
 * ## What cannot be a slot, and why
 *
 * The shared marker unit is 8 bytes and the sweep matches any 4-byte run of
 * it, so an X12 element narrower than 4 characters cannot carry a probe:
 * ISA-01/03/05/07 (2), ISA-11/14/15/16 (1), the four delimiters (1 each),
 * TA1-04 (1) and TA1-05 (3). Those are covered by dedicated assertions in
 * `test/phi-diagnostic-surface.test.ts` instead, which check the diagnostic
 * text directly rather than by marker.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { DiagnosticSlot } from "@cosyte/test-utils";

import {
  WARNING_CODES,
  get271Eligibility,
  get277CADisposition,
  get277Status,
  get278Request,
  get278Response,
  get820Payments,
  get834Header,
  get835,
  get837Claims,
  parse999,
  parseTA1,
  parseX12,
  serializeX12,
  type X12Interchange,
  type X12ParseWarning,
  type X12Segment,
} from "../../src/index.js";

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "golden");

/** Load a committed golden fixture as the spec-clean template for a slot. */
function golden(name: string): string {
  return readFileSync(join(FIXTURE_DIR, `${name}.edi`), "utf8").trimEnd();
}

/**
 * Replace exactly one occurrence of `from`. Throws when the needle is absent
 * or ambiguous, so a fixture edit that silently stops planting the marker
 * fails loudly instead of leaving a slot green over nothing. This is the
 * single most common way a PHI slot table goes quiet.
 */
function swap(source: string, from: string, to: string): string {
  const first = source.indexOf(from);
  if (first === -1) throw new Error(`phi-slots: needle not found in fixture: ${from}`);
  if (source.indexOf(from, first + from.length) !== -1) {
    throw new Error(`phi-slots: needle is ambiguous (appears more than once): ${from}`);
  }
  return source.slice(0, first) + to + source.slice(first + from.length);
}

/**
 * Overwrite a fixed-width ISA element in place. The ISA is byte-positional
 * (ASC X12.5 fixes the ISA layout), so a marker written into it must be padded or truncated to
 * the element's exact width or the layout breaks and the parser raises
 * `X12_INVALID_DELIMITERS` before reaching any branch under test. An 8-byte
 * marker in the 9-byte ISA-13 still contains a full marker unit, so the
 * probe survives the fit.
 */
function isaElement(raw: string, start: number, width: number, value: string): string {
  const fitted = value.length >= width ? value.slice(0, width) : value.padEnd(width, " ");
  return raw.slice(0, start) + fitted + raw.slice(start + width);
}

/** Zero-indexed ISA byte offsets and widths, per the fixed ISA layout. */
const ISA = {
  senderId: [35, 15],
  receiverId: [54, 15],
  date: [70, 6],
  time: [77, 4],
  version: [84, 5],
  controlNumber: [90, 9],
} as const;

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const G_835 = golden("835");
const G_837P = golden("837p");
const G_277 = golden("277");
const G_277CA = golden("277ca");
const G_271 = golden("271");
const G_278_REQ = golden("278-request");
const G_820 = golden("820");
const G_999 = golden("999");
const G_TA1 = golden("ta1");

/**
 * The golden 835 with its claim deliberately out of balance (`CLP-03` is one
 * dollar over what `CLP-04 + Σ CAS` accounts for). Used as the co-located
 * deviation for every 835 body slot: the balance warning is raised from the
 * same claim loop the marker sits in.
 */
const IMBALANCED_835 = swap(G_835, "CLP*PT-ACCT-001*1*500.00", "CLP*PT-ACCT-001*1*501.00");

/**
 * The golden 837P with an unknown HI qualifier. Used as the co-located
 * deviation for 837 body slots: the warning is raised from the same claim.
 */
const UNKNOWN_HI_837P = swap(G_837P, "HI*ABK:J20.9", "HI*ZQZ:J20.9");

/**
 * The golden 277 with an unknown claim status category. Used as the
 * co-located deviation for 277 body slots.
 */
const UNKNOWN_STC_277 = swap(G_277, "STC*A2:20:PR", "STC*Z9:20:PR");

/**
 * The golden 271 / 278 / 820 / 999 / TA1 carrying a deliberate IEA-01 group
 * count mismatch. These transaction sets raise no body-level diagnostic of
 * their own on a spec-clean document, so the co-located deviation has to be
 * an envelope one. It still fires while the marker is on the model, which is
 * what the model sweep needs.
 */
function withGroupCountMismatch(raw: string): string {
  return swap(raw, "~IEA*1*", "~IEA*7*");
}

// ---------------------------------------------------------------------------
// The composed parse
// ---------------------------------------------------------------------------

/**
 * Everything one parse of an X12 interchange produces that a consumer could
 * log: the envelope warnings, the serializer's reconciliation warnings, and
 * the warnings of every typed transaction helper that claims the transaction
 * set. `getDiagnostics` must return **every** diagnostic collection the model
 * exposes, and in this library they are spread across `ix.warnings`, an
 * `onWarning` callback on `serializeX12`, and a `.warnings` array on each
 * per-transaction result.
 */
export interface PhiParsed {
  readonly interchange: X12Interchange;
  readonly diagnostics: readonly X12ParseWarning[];
  readonly segments: readonly X12Segment[];
}

function runHelpers(
  ix: X12Interchange,
  raw: string,
  diagnostics: X12ParseWarning[],
  segments: X12Segment[],
): void {
  for (const group of ix.groups) {
    for (const tx of group.transactions) {
      segments.push(...tx.segments);
      const id = tx.st.elements[1] ?? "";
      const push = (ws: readonly X12ParseWarning[] | undefined): void => {
        if (ws !== undefined) diagnostics.push(...ws);
      };
      switch (id) {
        case "835":
          push(get835(ix.delimiters, tx)?.warnings);
          break;
        case "837":
          push(get837Claims(ix.delimiters, tx)?.warnings);
          break;
        case "271":
          push(get271Eligibility(ix.delimiters, tx)?.warnings);
          break;
        case "277":
          push(get277Status(ix.delimiters, tx)?.warnings);
          push(get277CADisposition(ix.delimiters, tx)?.warnings);
          break;
        case "278":
          push(get278Request(ix.delimiters, tx)?.warnings);
          push(get278Response(ix.delimiters, tx)?.warnings);
          break;
        case "820":
          push(get820Payments(ix.delimiters, tx)?.warnings);
          break;
        case "834":
          push(get834Header(ix.delimiters, tx)?.warnings);
          break;
        case "999":
          push(parse999(raw)?.warnings);
          break;
        default:
          break;
      }
    }
  }
  // `parseTA1` is interchange-level, not transaction-level, and the TA1
  // golden is a zero-group interchange, so calling it inside the loops above
  // never ran it at all. It produces no warnings of its own and its model
  // fields are classified as data rather than as structural identifiers (see
  // `phiModelIdentifiers`), so nothing it returns feeds either selector. It
  // is called here for the one thing it does prove: that constructing the
  // TA1 model over a hostile interchange does not itself throw or build a
  // diagnostic.
  parseTA1(ix);
}

function compose(ix: X12Interchange, raw: string): PhiParsed {
  const diagnostics: X12ParseWarning[] = [...ix.warnings];
  const segments: X12Segment[] = [];
  serializeX12(ix, {
    specClean: true,
    onWarning: (w) => {
      diagnostics.push(w);
    },
  });
  runHelpers(ix, raw, diagnostics, segments);
  return { interchange: ix, diagnostics, segments };
}

/** Lenient parse plus every typed helper that claims a transaction set. */
export function phiParse(raw: string): PhiParsed {
  return compose(parseX12(raw), raw);
}

/**
 * Strict parse plus the same helper walk. Strict mode escalates the first
 * Tier-2 warning into a thrown `X12ParseError`, which puts the warning's text
 * into `err.stack` and from there into whatever an error reporter ships to a
 * third party, so a leak can exist in strict mode only.
 */
export function phiParseStrict(raw: string): PhiParsed {
  return compose(parseX12(raw, { strict: true }), raw);
}

// ---------------------------------------------------------------------------
// The model-identifier enumeration
// ---------------------------------------------------------------------------

/**
 * Every **structural identifier** on the parsed model: the strings a
 * downstream package would interpolate to say *where* something is, as
 * opposed to the data the model exists to carry.
 *
 * This list was built by walking every exported model type under
 * `src/parser/types.ts`, `src/parser/segment.ts` and
 * `src/transactions/*&#47;types.ts` and accounting for **every** string-valued
 * field, not by recalling which ones looked risky. The rule applied, and the
 * results, so that the classification can be argued with rather than trusted.
 * **The completeness of this walk is a discipline, not a property**: nothing
 * fails when a model gains a field, so re-run the walk whenever one does.
 *
 * **Structural identifiers (returned here, and bounded in `src/`):**
 * - `X12Segment.id` on every decoded body segment. This is x12's
 *   `segment.type`: derived, purely a locator, and the exact field whose
 *   unbounded twin in `@cosyte/hl7` still leaks through `@cosyte/deid`'s
 *   manifest after `hl7` fixed its messages. `decodeSegment` bounds it to the
 *   two-or-three-character uppercase segment-id shape, which is the same
 *   regex `defineLoopSpec` already enforces on an authored loop's segment
 *   ids rather than a citation to a clause of the standard.
 * - `Delimiters.element` / `.repetition` / `.component` / `.segment`. One
 *   byte each and structurally bounded by `detectDelimiters`, which refuses
 *   whitespace, control characters and duplicates. Included because they are
 *   derived locators, not because they could carry a marker.
 *
 * **Data the model exists to carry (deliberately NOT returned):**
 * `isa/gs/ge/iea/ta1.raw` and `.elements`, `tx.rawSegments`, `seg.raw`,
 * `seg.elements`, `trailingBytes` - the verbatim document, whose whole
 * purpose is to be verbatim; every field on `X12AckTA1`
 * (`interchangeControlNumber`, `interchangeDate`, `interchangeTime`,
 * `ackCode`, `noteCode`, `noteCodeRaw`, `raw`), which is the ack's report of
 * the inbound envelope and is the content a TA1 exists to deliver; every
 * party name, address line, contact, member
 * id, NPI, claim id, patient control number, trace, group number, date,
 * amount and free-form description on the 835 / 837 / 271 / 277 / 278 / 820
 * / 834 models; and every X12 code-list value (`reasonCode`, `qualifier`,
 * `entityIdentifierCode`, `levelOfServiceCode`, `maintenanceTypeCode`,
 * `actionCode`, …), which is preserved verbatim on purpose so that an
 * unrecognized safety-critical code is never silently coerced.
 *
 * **The locator-flavoured fields that are deliberately left verbatim**,
 * called out because they are the ones a reviewer should push on. Four
 * bullets, more than four fields:
 * - `X12HierarchicalLevel.hlId` / `.parentHlId` / `.levelCode` and the shared
 *   `X12Hl`. These *are* locators, and they are still verbatim, because
 *   collapsing two distinct non-conformant HL ids to one sentinel would make
 *   them compare equal and silently merge two subscribers' claims into one
 *   hierarchy. HL parent-pointer integrity is the 837's safety primitive and
 *   a wrong hierarchy is a worse outcome than a wide locator. Recorded in
 *   `KNOWN-LIMITATIONS.md` so a downstream knows not to interpolate them.
 * - `X12Ack999Ik3.segmentIdCode` / `.loopIdentifier`,
 *   `X12Ack999Ik4.dataElementReferenceNumber`, and the same class one level
 *   up: `X12Ack999Ak1.functionalIdCode` and
 *   `X12Ack999Ak2.transactionSetIdCode`. These are the trading partner's
 *   report of where *they* found a problem; bounding them would discard the
 *   forensic content the 999 exists to deliver.
 * - `X12HierarchicalLevel.hasChild` (HL-04), the fourth field on the type
 *   whose other three are argued above. Same reasoning: the HL spine is
 *   preserved byte-verbatim end to end rather than partly bounded.
 * - `X12Ack999Ik4.copyOfBadDataElement`. Literally a copy of the offending
 *   bytes, documented since Phase 3 as a caller-supplied surface that
 *   senders SHOULD omit when the bytes are PHI. It is data, not a locator,
 *   and the library never auto-populates it.
 */
export function phiModelIdentifiers(parsed: PhiParsed): readonly string[] {
  const { delimiters } = parsed.interchange;
  return [
    ...parsed.segments.map((s) => s.id),
    delimiters.element,
    delimiters.repetition,
    delimiters.component,
    delimiters.segment,
  ];
}

/** The three selectors plus both parse modes, shared by every runner call. */
export const PHI_RUNNER = {
  parse: phiParse,
  parseStrict: phiParseStrict,
  getDiagnostics: (p: PhiParsed): readonly unknown[] => p.diagnostics,
  getModelIdentifiers: phiModelIdentifiers,
} as const;

// ---------------------------------------------------------------------------
// The slot table
// ---------------------------------------------------------------------------

export const PHI_SLOTS: readonly DiagnosticSlot<string>[] = [
  // ---- envelope control numbers: all six slots, both sides of each pair ----
  // own. These are the audited leak. Before the fix the message echoed BOTH
  // sides verbatim, and five of the six are variable-width.
  {
    name: "ISA-13 interchange control number (header side)",
    plant: (m) => isaElement(G_835, ISA.controlNumber[0], ISA.controlNumber[1], m),
    expectCode: WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
  },
  {
    name: "IEA-02 interchange control number (trailer side, variable width)",
    plant: (m) => swap(G_835, "IEA*1*000000001", `IEA*1*${m}`),
    expectCode: WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
  },
  {
    name: "GS-06 group control number (header side)",
    plant: (m) =>
      swap(G_835, "*20260601*1200*1*X*005010X221A1", `*20260601*1200*${m}*X*005010X221A1`),
    expectCode: WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
  },
  {
    name: "GE-02 group control number (trailer side)",
    plant: (m) => swap(G_835, "~GE*1*1~", `~GE*1*${m}~`),
    expectCode: WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
  },
  {
    name: "ST-02 transaction set control number (header side)",
    plant: (m) => swap(G_835, "~ST*835*0001~", `~ST*835*${m}~`),
    expectCode: WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
  },
  {
    name: "SE-02 transaction set control number (trailer side)",
    plant: (m) => swap(G_835, "~SE*23*0001~", `~SE*23*${m}~`),
    expectCode: WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
  },

  // ---- envelope declared counts ------------------------------------------
  // own. A "count" is an arbitrary sender string until the parser compares it.
  {
    name: "IEA-01 declared group count",
    plant: (m) => swap(G_835, "IEA*1*000000001", `IEA*${m}*000000001`),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "GE-01 declared transaction count",
    plant: (m) => swap(G_835, "~GE*1*1~", `~GE*${m}*1~`),
    expectCode: WARNING_CODES.X12_TRANSACTION_COUNT_MISMATCH,
  },
  {
    name: "SE-01 declared segment count (serializer reconciliation)",
    plant: (m) => swap(G_835, "~SE*23*0001~", `~SE*${m}*0001~`),
    expectCode: WARNING_CODES.X12_SEGMENT_COUNT_MISMATCH,
  },

  // ---- remaining ISA elements wide enough to carry a probe ----------------
  {
    name: "ISA-12 version",
    // own: ISA-12 is what X12_PRE_005010 tests. Fixed-width 5, so the probe
    // is truncated to five bytes and still exceeds the 4-byte match floor.
    plant: (m) => isaElement(G_835, ISA.version[0], ISA.version[1], m),
    expectCode: WARNING_CODES.X12_PRE_005010,
  },
  {
    name: "ISA-06 interchange sender id",
    // co-located. A trading-partner id drives no diagnostic. It sits inside
    // the first 64 bytes of the interchange, which is what the Tier-3 fatal
    // snippet would copy, so this slot is also the check that a strict-mode
    // escalation carries no snippet.
    plant: (m) => withGroupCountMismatch(isaElement(G_835, ISA.senderId[0], ISA.senderId[1], m)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "ISA-08 interchange receiver id",
    plant: (m) =>
      withGroupCountMismatch(isaElement(G_835, ISA.receiverId[0], ISA.receiverId[1], m)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "ISA-09 interchange date",
    plant: (m) => withGroupCountMismatch(isaElement(G_835, ISA.date[0], ISA.date[1], m)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "ISA-10 interchange time",
    plant: (m) => withGroupCountMismatch(isaElement(G_835, ISA.time[0], ISA.time[1], m)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },

  // ---- GS / ST header elements -------------------------------------------
  {
    name: "GS-01 functional identifier code",
    plant: (m) => withGroupCountMismatch(swap(G_835, "~GS*HP*", `~GS*${m}*`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "GS-02 application sender code",
    plant: (m) => withGroupCountMismatch(swap(G_835, "~GS*HP*MEDICARE*", `~GS*HP*${m}*`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "GS-03 application receiver code",
    plant: (m) =>
      withGroupCountMismatch(
        swap(G_835, "*MEDICARE*SUBMITTER*20260601", `*MEDICARE*${m}*20260601`),
      ),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "GS-04 group date",
    plant: (m) =>
      withGroupCountMismatch(
        swap(G_835, "*SUBMITTER*20260601*1200*1*X*", `*SUBMITTER*${m}*1200*1*X*`),
      ),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "GS-08 version / release / industry identifier",
    plant: (m) => withGroupCountMismatch(swap(G_835, "*X*005010X221A1~", `*X*${m}~`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "ST-01 transaction set identifier code",
    plant: (m) => withGroupCountMismatch(swap(G_835, "~ST*835*0001~", `~ST*${m}*0001~`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "ST-03 implementation convention reference (837 variant resolution)",
    // own: this is the element X12_837_UNKNOWN_VARIANT reports on. The SV1
    // service line has to go too, or the walker falls back to it.
    plant: (m) =>
      swap(
        swap(G_837P, "~ST*837*0001*005010X222A2~", `~ST*837*0001*${m}~`),
        "~SV1*HC:99213:25*150*UN*1***1~",
        "~",
      ),
    expectCode: WARNING_CODES.X12_837_UNKNOWN_VARIANT,
  },

  // ---- segment-level structure -------------------------------------------
  {
    name: "segment id of a body segment outside any transaction set",
    // own: X12_UNEXPECTED_SEGMENT is raised on exactly this segment.
    plant: (m) => swap(G_835, "~GE*1*1~", `~${m}*STRAY*BYTES~GE*1*1~`),
    expectCode: WARNING_CODES.X12_UNEXPECTED_SEGMENT,
  },
  {
    name: "segment id of a body segment inside a transaction set (X12Segment.id)",
    // co-located, and the model-identifier probe. The marker becomes the
    // derived `seg.id` a downstream package would interpolate to build a
    // locus, which is the layering failure `hl7` and `deid` demonstrated.
    plant: (m) => swap(IMBALANCED_835, "~REF*TJ*123456789~", `~${m}*STRAY~REF*TJ*123456789~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "element ending in a dangling release character",
    // own: the release scanner reports on the element the marker is in. The
    // segment has to be the last thing in the input: a `?` immediately before
    // a segment terminator ESCAPES that terminator, so the only way to reach
    // an unpaired trailing release character is at end of input.
    plant: (m) => swap(G_835, "~SE*23*0001~GE*1*1~IEA*1*000000001~", `~REF*TJ*${m}?`),
    expectCode: WARNING_CODES.X12_DANGLING_RELEASE_CHAR,
  },
  {
    name: "bytes trailing the IEA terminator",
    // own: X12_TRAILING_GARBAGE is raised about exactly these bytes, and they
    // are also preserved on `trailingBytes`.
    plant: (m) => `${G_835}${m}*TRAILING~`,
    expectCode: WARNING_CODES.X12_TRAILING_GARBAGE,
  },

  // ---- 835 remittance body ------------------------------------------------
  {
    name: "CAS-02 claim adjustment reason code (CARC)",
    plant: (m) => swap(G_835, "~CAS*PR*1*50.00~", `~CAS*PR*${m}*50.00~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_CARC,
  },
  {
    name: "LQ-02 remittance advice remark code (RARC)",
    plant: (m) => swap(G_835, "~CAS*PR*1*50.00~", `~CAS*PR*1*50.00~LQ*HE*${m}~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_RARC,
  },
  {
    name: "CLP-03 total claim charge amount",
    // own: an unparseable amount collapses to zero and the claim invariant
    // then fails, which is the branch that used to render the amounts.
    plant: (m) => swap(G_835, "CLP*PT-ACCT-001*1*500.00", `CLP*PT-ACCT-001*1*${m}`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "CLP-04 claim payment amount",
    plant: (m) => swap(G_835, "*1*500.00*450.00*50.00*MC*", `*1*500.00*${m}*50.00*MC*`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "SVC-02 service line charge amount",
    plant: (m) => swap(G_835, "~SVC*HC:99213*500.00*450.00**1~", `~SVC*HC:99213*${m}*450.00**1~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "SVC-03 service line paid amount",
    plant: (m) => swap(G_835, "~SVC*HC:99213*500.00*450.00**1~", `~SVC*HC:99213*500.00*${m}**1~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "CAS-03 adjustment amount",
    plant: (m) => swap(G_835, "~CAS*PR*1*50.00~", `~CAS*PR*1*${m}~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "BPR-02 total actual payment amount",
    plant: (m) => swap(G_835, "~BPR*I*450.00*C*ACH*", `~BPR*I*${m}*C*ACH*`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "SVC-01 composite procedure code",
    plant: (m) => swap(IMBALANCED_835, "~SVC*HC:99213*", `~SVC*HC:${m}*`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "CLP-01 patient control number (the provider's account number)",
    plant: (m) => swap(IMBALANCED_835, "CLP*PT-ACCT-001*", `CLP*${m}*`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "CLP-07 payer claim control number",
    plant: (m) => swap(IMBALANCED_835, "*MC*PAYER-CLAIM-001*11*1~", `*MC*${m}*11*1~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "NM1-09 subscriber member identification number",
    plant: (m) => swap(IMBALANCED_835, "***MI*MEMBER001~", `***MI*${m}~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "NM1-03 / NM1-04 patient last and first name",
    plant: (m) =>
      swap(IMBALANCED_835, "~NM1*QC*1*PATIENT*TEST*A***MI*", `~NM1*QC*1*${m}*${m}*A***MI*`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "NM1-09 rendering provider NPI (XX qualifier)",
    plant: (m) => swap(IMBALANCED_835, "*****XX*1234567890~", `*****XX*${m}~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "NM1-01 entity identifier code",
    plant: (m) => swap(IMBALANCED_835, "~NM1*QC*1*PATIENT*", `~NM1*${m}*1*PATIENT*`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "REF-02 reference identification",
    plant: (m) => swap(IMBALANCED_835, "~REF*TJ*123456789~", `~REF*TJ*${m}~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "REF-01 reference identification qualifier",
    plant: (m) => swap(IMBALANCED_835, "~REF*TJ*123456789~", `~REF*${m}*123456789~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "TRN-02 reassociation trace number",
    plant: (m) => swap(IMBALANCED_835, "~TRN*1*0012345*", `~TRN*1*${m}*`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "DTM-02 date",
    plant: (m) => swap(IMBALANCED_835, "~DTM*405*20260601~", `~DTM*405*${m}~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "N1-02 payer name",
    plant: (m) => swap(IMBALANCED_835, "~N1*PR*MEDICARE PART A~", `~N1*PR*${m}~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "N3-01 / N4-01 address line and city",
    plant: (m) => swap(IMBALANCED_835, "~N3*123 PAYER WAY~N4*BALTIMORE*", `~N3*${m}~N4*${m}*`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },
  {
    name: "PER-04 contact communication number",
    plant: (m) => swap(IMBALANCED_835, "*TE*5551234567~", `*TE*${m}~`),
    expectCode: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
  },

  // ---- 837 claim body -----------------------------------------------------
  {
    name: "HI-01-1 health care code composite qualifier",
    // own: X12_UNKNOWN_HI_QUALIFIER reports on this component.
    plant: (m) => swap(G_837P, "~HI*ABK:J20.9~", `~HI*${m}:J20.9~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "HI-01-2 diagnosis code",
    plant: (m) => swap(G_837P, "~HI*ABK:J20.9~", `~HI*ZQZ:${m}~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "HL-01 hierarchical id number",
    // own: X12_HL_PARENT_MISMATCH is raised because HL-02 on the next level
    // no longer resolves to this HL-01.
    plant: (m) => swap(G_837P, "~HL*1**20*1~", `~HL*${m}**20*1~`),
    expectCode: WARNING_CODES.X12_HL_PARENT_MISMATCH,
  },
  {
    name: "HL-02 hierarchical parent id number",
    plant: (m) => swap(G_837P, "~HL*2*1*22*0~", `~HL*2*${m}*22*0~`),
    expectCode: WARNING_CODES.X12_HL_PARENT_MISMATCH,
  },
  {
    name: "HL-03 hierarchical level code (parent side)",
    // own: the subscriber HL requires a "20" parent, so a marker in the
    // parent's level code is what X12_HL_PARENT_LEVEL_INVALID reports.
    plant: (m) => swap(G_837P, "~HL*1**20*1~", `~HL*1**${m}*1~`),
    expectCode: WARNING_CODES.X12_HL_PARENT_LEVEL_INVALID,
  },
  {
    name: "CLM-01 patient account number, with no enclosing hierarchy",
    // own: X12_MISSING_REQUIRED_LOOP is raised from this CLM.
    plant: (m) =>
      swap(
        swap(G_837P, "~HL*1**20*1~", "~"),
        "~CLM*PT-ACCT-001*150***11:B:1*Y*A*Y*Y~",
        `~CLM*${m}*150***11:B:1*Y*A*Y*Y~`,
      ),
    expectCode: WARNING_CODES.X12_MISSING_REQUIRED_LOOP,
  },
  {
    name: "CLM-01 patient account number (well-formed hierarchy)",
    plant: (m) => swap(UNKNOWN_HI_837P, "~CLM*PT-ACCT-001*", `~CLM*${m}*`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "NM1-09 subscriber member id on an 837",
    plant: (m) => swap(UNKNOWN_HI_837P, "***MI*MEMBER001~", `***MI*${m}~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "NM1-09 billing provider NPI on an 837",
    plant: (m) => swap(UNKNOWN_HI_837P, "*****XX*1234567890~", `*****XX*${m}~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "SBR-03 group or policy number",
    plant: (m) => swap(UNKNOWN_HI_837P, "~SBR*P*18*GROUP123******MB~", `~SBR*P*18*${m}******MB~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "DMG-02 date of birth",
    plant: (m) => swap(UNKNOWN_HI_837P, "~DMG*D8*19800101*M~", `~DMG*D8*${m}*M~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "DTP-03 date",
    plant: (m) => swap(UNKNOWN_HI_837P, "~DTP*431*D8*20260520~", `~DTP*431*D8*${m}~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "NTE-02 claim note free-form description",
    plant: (m) =>
      swap(UNKNOWN_HI_837P, "~DTP*431*D8*20260520~", `~NTE*ADD*${m}~DTP*431*D8*20260520~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "SV1-01 composite procedure code and modifiers",
    plant: (m) => swap(UNKNOWN_HI_837P, "~SV1*HC:99213:25*", `~SV1*HC:${m}:${m}*`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "SV1-02 line charge amount",
    plant: (m) => swap(UNKNOWN_HI_837P, "~SV1*HC:99213:25*150*UN*", `~SV1*HC:99213:25*${m}*UN*`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "REF-02 line control number on an 837",
    plant: (m) => swap(UNKNOWN_HI_837P, "~REF*6R*LINE-CTRL-001~", `~REF*6R*${m}~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },
  {
    name: "BHT-03 originator application transaction identifier",
    plant: (m) => swap(UNKNOWN_HI_837P, "~BHT*0019*00*0123*", `~BHT*0019*00*${m}*`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },

  // ---- 277 / 277CA claim status ------------------------------------------
  {
    name: "STC-01-1 claim status category code",
    plant: (m) => swap(G_277, "~STC*A2:20:PR*", `~STC*${m}:20:PR*`),
    expectCode: WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS_CATEGORY,
  },
  {
    name: "STC-01-2 claim status code",
    plant: (m) => swap(G_277, "~STC*A2:20:PR*", `~STC*A2:${m}:PR*`),
    expectCode: WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS,
  },
  {
    name: "TRN-02 echoed 276 trace on a 277",
    plant: (m) => swap(UNKNOWN_STC_277, "~TRN*2*ECHO-276-TRACE-001~", `~TRN*2*${m}~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS_CATEGORY,
  },
  {
    name: "REF-02 payer claim control number on a 277",
    plant: (m) => swap(UNKNOWN_STC_277, "~REF*1K*PCN0001~", `~REF*1K*${m}~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS_CATEGORY,
  },
  {
    name: "NM1-09 member id on a 277",
    plant: (m) => swap(UNKNOWN_STC_277, "***MI*MBR0001~", `***MI*${m}~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS_CATEGORY,
  },
  {
    name: "STC-01-1 claim status category code on a 277CA",
    plant: (m) => swap(G_277CA, "~STC*A1:19:PR*", `~STC*${m}:19:PR*`),
    expectCode: WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS_CATEGORY,
  },

  // ---- 271 eligibility ----------------------------------------------------
  {
    name: "EB-05 plan coverage description on a 271",
    plant: (m) =>
      withGroupCountMismatch(swap(G_271, "~EB*1*IND*30^35**GOLD PPO~", `~EB*1*IND*30^35**${m}~`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "TRN-02 echoed 270 trace on a 271",
    plant: (m) => withGroupCountMismatch(swap(G_271, "~TRN*2*ECHO-270-TRACE-001*", `~TRN*2*${m}*`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "NM1-09 member id on a 271",
    plant: (m) => withGroupCountMismatch(swap(G_271, "***MI*MBR0001~", `***MI*${m}~`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },

  // ---- 278 services review ------------------------------------------------
  {
    name: "HI-01-1 diagnosis qualifier on a 278 request",
    plant: (m) => swap(G_278_REQ, "~HI*ABK:E1165~", `~HI*${m}:E1165~`),
    expectCode: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  },

  // ---- 820 premium payment ------------------------------------------------
  {
    name: "RMR-02 remittance reference identification on an 820",
    plant: (m) => withGroupCountMismatch(swap(G_820, "~RMR*AZ*POL-0001*PI*", `~RMR*AZ*${m}*PI*`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },

  // ---- 999 implementation acknowledgment ----------------------------------
  {
    name: "AK1-02 acknowledged group control number on a 999",
    plant: (m) => withGroupCountMismatch(swap(G_999, "~AK1*HC*1*", `~AK1*HC*${m}*`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "AK2-02 acknowledged transaction set control number on a 999",
    plant: (m) => withGroupCountMismatch(swap(G_999, "~AK2*837*0001*", `~AK2*837*${m}*`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "IK3-01 reported segment id on a 999",
    plant: (m) => withGroupCountMismatch(swap(G_999, "~IK5*A~", `~IK3*${m}*7*2000B*8~IK5*A~`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "IK4-04 copy of the bad data element on a 999",
    plant: (m) =>
      withGroupCountMismatch(swap(G_999, "~IK5*A~", `~IK3*NM1*7*2000B*8~IK4*3**7*${m}~IK5*A~`)),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },

  // ---- TA1 interchange acknowledgment -------------------------------------
  {
    name: "TA1-01 echoed interchange control number",
    plant: (m) => swap(G_TA1, "~TA1*000000019*", `~TA1*${m}*`).replace("~IEA*0*", "~IEA*9*"),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
  {
    name: "TA1-02 echoed interchange date",
    plant: (m) =>
      swap(G_TA1, "*250101*1200*A*000~", `*${m}*1200*A*000~`).replace("~IEA*0*", "~IEA*9*"),
    expectCode: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
  },
];
