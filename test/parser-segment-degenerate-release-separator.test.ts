/**
 * `X12-BODY-DEGENERATE-RELEASE-SEPARATOR`: a BODY segment whose element
 * separator IS the release character now splits literally, as the envelope
 * splitter and the segment-terminator scanner already did.
 *
 * ## What was measured at base
 *
 * `detectDelimiters` reads the element separator positionally out of ISA byte 4
 * and rejects only control characters, whitespace and a non-distinct set, so a
 * sender may declare `?` there - and `buildInterchange` accepts
 * `elementSeparator: "?"` from a caller. `src/parser/envelope.ts` handles that
 * degenerate set twice, once in `findUnescapedTerminator` and once in
 * `splitElements`; `src/parser/segment.ts`'s `decodeSegment` did not. It called
 * `splitWithRelease`, where every `?` consumes the byte after it, so on such an
 * interchange NO split ever happened and the whole segment came back as a
 * single element:
 *
 * ```text
 * ST?837?0001?005010X222A1                 -> id "(non-spec)", 1 element
 * NM1?85?2?ACME CLINIC?????XX?1234567893   -> id "(non-spec)", 1 element
 * SE?3?0001                                -> id "(non-spec)", 1 element
 * warnings: []
 * ```
 *
 * The ENVELOPE framed correctly the whole time - one group, one transaction,
 * every count and control number reconciling - so `parseX12` reported a clean
 * interchange whose entire transaction body was unreadable to any reader that
 * dispatches on `seg.id`. Nothing was raised on any channel.
 *
 * ## 🛑 This changes how an already-published document decodes, deliberately
 *
 * Exactly like `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`, and on the same
 * tiebreak: CONSISTENCY with the guard this package already carried in two
 * places, NOT a spec clause. 005010 does not transmit a release character at
 * all, so nothing in it says what a `?` means when a sender has declared `?` as
 * structure. What is different from that slice is the direction: there is no
 * symmetric reading to lose here. A one-element segment with an id of
 * `(non-spec)` is not an alternative reading of `NM1?85?2?ACME`, and no reader
 * in this package could act on it.
 *
 * ## The bound, and it is per ROLE
 *
 * Only the ELEMENT SEPARATOR role is guarded. A `?` REPETITION or COMPONENT
 * separator still does not split, and that is deliberate and measured, not an
 * oversight: `escapeRelease` writes `??` for a literal `?` whatever role `?`
 * was declared in, so `buildInterchange({ componentSeparator: "?" })` emits
 * `CLM*PATIENT??ACCT*150.00` today and reads `"PATIENT?ACCT"` back out of it.
 * A literal split of those two roles would re-frame that as two empty
 * components - trading a separator that never splits for a value this library
 * itself emitted and could no longer read back. Both halves are pinned below.
 *
 * ## 🩺 And that same emit property reaches the ELEMENT role, which this slice
 * does NOT close
 *
 * A first draft of this file stopped at the paragraph above and drew the
 * consequence for two roles when the property it rests on holds for three; a
 * second named `?` as the trigger. The gate refuted both, the second by
 * producing one more trigger byte. **State it once, in the form one more byte
 * cannot falsify:** the builder protects a value by PREFIXING `?` to the byte
 * that needs protecting, so when `?` IS the element separator that prefix is
 * itself a separator, and NO value containing any active delimiter or a literal
 * `?` survives the round trip. Composites included, silently, with no
 * value-level workaround: do not declare `?` as the element separator on the
 * emit side. At base every one of these read as a single `(non-spec)` element
 * and every dot-path answered `undefined`, so a detectable absence became a
 * confident wrong value. It is pinned below as a disclosure rather than
 * guarded: closing it means deciding `escapeRelease` for a degenerate set,
 * which is the same emit-side decision the other two roles need, and all THREE
 * belong to that slice rather than this one.
 *
 * The segment-terminator scanner is likewise role-blind in the other
 * direction, and that residual is PRE-EXISTING and pinned below rather than
 * closed here.
 */

import { describe, expect, it } from "vitest";

import {
  NON_SPEC_SEGMENT_ID,
  buildInterchange,
  decodeSegment,
  getSegmentValue,
  parseX12,
  serializeX12,
  type Delimiters,
  type X12ParseWarning,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

/** The degenerate set: the element separator IS the release character. */
const DEGENERATE: Delimiters = { element: "?", repetition: "^", component: ":", segment: "~" };
/** The conventional set, for the honest controls. */
const NORMAL: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };

const DEGENERATE_ISA = buildIsa({ element: "?" });

/** Assemble a degenerate-set interchange around one body segment. */
function degenerateIx(body: string, se = "SE?3?0001"): string {
  return (
    `${DEGENERATE_ISA}GS?HC?S?R?20260601?1200?1?X?005010X222A1~` +
    `ST?837?0001?005010X222A1~${body}~${se}~GE?1?1~IEA?1?000000001~`
  );
}

/** Decode one segment, returning the segment and the WHOLE warning channel. */
function decode(
  raw: string,
  delimiters: Delimiters,
): { readonly segment: ReturnType<typeof decodeSegment>; readonly codes: readonly string[] } {
  const codes: string[] = [];
  const segment = decodeSegment(raw, delimiters, (w: X12ParseWarning) => codes.push(w.code), {
    segmentIndex: 1,
  });
  return { segment, codes };
}

describe("X12-BODY-DEGENERATE-RELEASE-SEPARATOR: a body segment frames its elements", () => {
  it("🩺 an inbound degenerate interchange decodes its body instead of one `(non-spec)` blob", () => {
    const raw = degenerateIx("NM1?85?2?ACME CLINIC?????XX?1234567893");
    const parsed = parseX12(raw);
    const segments = parsed.groups[0]?.transactions[0]?.segments;

    // At base all three read `id: "(non-spec)"` with a single element holding
    // the whole segment. The ST and the SE go through `decodeSegment` too.
    expect(segments?.map((s) => s.id)).toEqual(["ST", "NM1", "SE"]);
    expect(segments?.[1]?.elements).toEqual([
      "NM1",
      "85",
      "2",
      "ACME CLINIC",
      "",
      "",
      "",
      "",
      "XX",
      "1234567893",
    ]);
    // Nothing was ever raised for the collapse, at base or here: the whole
    // channel is empty on both sides and that is the point of the finding.
    expect(parsed.warnings).toEqual([]);
    // Elements stay RAW and `elements.join(sep)` still reproduces the segment,
    // so the byte-exact round trip the serializer relies on is unaffected.
    expect(segments?.[1]?.elements.join("?")).toBe(segments?.[1]?.raw);
    expect(serializeX12(parsed)).toBe(raw);
  });

  it("🩺 the id is the sender's real segment id, so a reader dispatching on `seg.id` can see it", () => {
    const { segment, codes } = decode("CLM?PATIENTACCT?150.00", DEGENERATE);
    expect(segment.id).toBe("CLM");
    expect(segment.id).not.toBe(NON_SPEC_SEGMENT_ID);
    expect(segment.elements).toEqual(["CLM", "PATIENTACCT", "150.00"]);
    expect(codes).toEqual([]);
  });

  it("a dot-path read resolves against the degenerate set", () => {
    const { segment } = decode("HI?ABK:J45.50", DEGENERATE);
    expect(getSegmentValue(segment, "01", DEGENERATE)).toBe("ABK:J45.50");
    expect(getSegmentValue(segment, "01-1", DEGENERATE)).toBe("ABK");
    expect(getSegmentValue(segment, "01-2", DEGENERATE)).toBe("J45.50");
  });

  it('🩺 `buildInterchange` reports the segments it wrote on `elementSeparator: "?"`, for a value with no `?` in it', () => {
    // The builder returns `parseX12` of the bytes it just wrote. At base those
    // bytes came back as one element per segment, so a caller reading the
    // returned model saw none of the segments it had passed.
    //
    // 🛑 READ THE QUALIFIER. This is NOT "the builder stops disagreeing with
    // itself" - a first draft of this test said exactly that and the gate
    // refuted it with the value one character away from the one below. The
    // element role's EMIT half is unfixed and the next test pins it.
    const built = buildInterchange({
      senderId: "SENDER",
      receiverId: "RECEIVER",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      elementSeparator: "?",
      groups: [
        {
          functionalIdCode: "HC",
          groupControlNumber: "1",
          versionRelease: "005010X222A2",
          transactions: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "0001",
              segments: [["CLM", "PATIENTACCT", "150.00"]],
            },
          ],
        },
      ],
    });
    const clm = built.groups[0]?.transactions[0]?.segments[1];
    expect(clm?.id).toBe("CLM");
    expect(clm?.elements).toEqual(["CLM", "PATIENTACCT", "150.00"]);
    expect(built.warnings).toEqual([]);
  });

  // 🩺 INTRODUCED and NOT closed: with `?` as the ELEMENT separator, NO value
  // carrying an active delimiter or the release character survives a
  // `buildInterchange` round trip. The property, not a trigger list: the
  // builder protects a value by PREFIXING `?` to the byte that needs
  // protecting, and when `?` IS the element separator that prefix is itself a
  // separator, so the protection becomes a split. Two drafts of this control
  // named one trigger each (`?`, then `?` again) and the gate falsified both by
  // producing one more, which is why what follows is a table of INSTANCES and
  // never a census: adding a row cannot falsify the sentence above.
  //
  // 🩺 THE DIRECTION IS WHAT MATTERS AND IT GOT WORSE: at base every one of
  // these read as a single `(non-spec)` element and every dot-path answered
  // `undefined` - a detectable absence. Here they give a confident wrong value
  // with an empty warning array, and not always a truncation - the `HI` row
  // strands a diagnosis code in a phantom `HI-02` that `01-2` cannot reach.
  //
  // It is left as a DISCLOSURE and not guarded, deliberately. Closing it means
  // deciding `escapeRelease` for a degenerate set, which is the same emit-side
  // decision the repetition and component roles need, and doing it inside a
  // read-side slice is how a fix outgrows the thing it fixes. There is no
  // value-level workaround: do not declare `?` as the element separator.
  const emitInstances: readonly (readonly [
    string,
    readonly string[],
    string,
    readonly string[],
  ])[] = [
    [
      "a literal release character",
      ["CLM", "PATIENT?ACCT", "150.00"],
      "CLM?PATIENT??ACCT?150.00",
      ["CLM", "PATIENT", "", "ACCT", "150.00"],
    ],
    [
      "a component separator inside a composite",
      ["HI", "ABK:J45.50"],
      "HI?ABK?:J45.50",
      ["HI", "ABK", ":J45.50"],
    ],
    [
      "a repetition separator",
      ["CLM", "ACME^CLINIC", "150.00"],
      "CLM?ACME?^CLINIC?150.00",
      ["CLM", "ACME", "^CLINIC", "150.00"],
    ],
    ["a segment terminator", ["REF", "EA", "A~B"], "REF?EA?A?~B", ["REF", "EA", "A", "~B"]],
  ];

  it.each(emitInstances)(
    '🩺 INTRODUCED and NOT closed: %s in a value does not round-trip on `elementSeparator: "?"`',
    (_name, segment, raw, elements) => {
      const built = buildInterchange({
        senderId: "SENDER",
        receiverId: "RECEIVER",
        interchangeDate: "260601",
        interchangeTime: "1200",
        interchangeControlNumber: "000000001",
        elementSeparator: "?",
        groups: [
          {
            functionalIdCode: "HC",
            groupControlNumber: "1",
            versionRelease: "005010X222A2",
            transactions: [
              {
                transactionSetIdCode: "837",
                transactionSetControlNumber: "0001",
                segments: [segment],
              },
            ],
          },
        ],
      });
      const seg = built.groups[0]?.transactions[0]?.segments[1];
      if (seg === undefined) throw new Error("the built interchange carries no body segment");
      expect(seg.raw).toBe(raw);
      expect(seg.elements).toEqual(elements);
      // The property every row shares, asserted without naming a slot, because
      // WHICH element carries the offending byte varies by row and a
      // slot-specific assertion is the instrument-pointing mistake twice over:
      // the segment does not read back the segment the caller supplied, and
      // nothing is raised about it.
      expect([...seg.elements]).not.toEqual([...segment]);
      expect(built.warnings).toEqual([]);
    },
  );

  it("🩺 and the loss is not always a truncation - a composite is stranded where no dot-path reaches it", () => {
    const built = buildInterchange({
      senderId: "SENDER",
      receiverId: "RECEIVER",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      elementSeparator: "?",
      groups: [
        {
          functionalIdCode: "HC",
          groupControlNumber: "1",
          versionRelease: "005010X222A2",
          transactions: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "0001",
              segments: [["HI", "ABK:J45.50"]],
            },
          ],
        },
      ],
    });
    const hi = built.groups[0]?.transactions[0]?.segments[1];
    if (hi === undefined) throw new Error("the built interchange carries no HI");
    expect(getSegmentValue(hi, "01-1", built.delimiters)).toBe("ABK");
    // The diagnosis code is in a phantom HI-02 the composite read cannot see.
    expect(getSegmentValue(hi, "01-2", built.delimiters)).toBeUndefined();
    expect(getSegmentValue(hi, "02", built.delimiters)).toBe(":J45.50");
    expect(built.warnings).toEqual([]);
  });

  it("🩺 a trailing separator is an EMPTY LAST ELEMENT, not a dangling release character", () => {
    // The dangling-release check keys on a trailing `?`, so without the same
    // guard it fired `X12_DANGLING_RELEASE_CHAR` on every degenerate segment
    // that ends in an empty element - a well-formed shape.
    const { segment, codes } = decode("PER?IC?NAME?TE?5551234?", DEGENERATE);
    expect(segment.elements).toEqual(["PER", "IC", "NAME", "TE", "5551234", ""]);
    expect(codes).toEqual([]);
  });
});

describe("X12-BODY-DEGENERATE-RELEASE-SEPARATOR: the honest controls", () => {
  it("the conventional delimiter set is untouched - a released separator still frames as one element", () => {
    const { segment, codes } = decode("REF*EA*RCV?*NEXT", NORMAL);
    expect(segment.elements).toEqual(["REF", "EA", "RCV?*NEXT"]);
    expect(codes).toEqual([]);
  });

  it("`X12_DANGLING_RELEASE_CHAR` still fires for the conventional set", () => {
    const { segment, codes } = decode("REF*EA*RCV?", NORMAL);
    expect(segment.elements).toEqual(["REF", "EA", "RCV?"]);
    expect(codes).toEqual(["X12_DANGLING_RELEASE_CHAR"]);
    // An EVEN trailing run is a `??` escape and is still silent.
    expect(decode("REF*EA*RCV??", NORMAL).codes).toEqual([]);
  });

  it("🛑 a `?` REPETITION separator still does not split, and the emit side is why", () => {
    // `escapeRelease` writes `??` for a literal `?` whatever role `?` holds, so
    // this pair round-trips today. A literal split here would break it.
    const d: Delimiters = { element: "*", repetition: "?", component: ":", segment: "~" };
    const { segment } = decode("CLM*PATIENT??ACCT*150.00", d);
    expect(segment.elements).toEqual(["CLM", "PATIENT??ACCT", "150.00"]);
    expect(getSegmentValue(segment, "01", d)).toBe("PATIENT?ACCT");
  });

  it("🛑 a `?` COMPONENT separator still does not split, and `buildInterchange` proves the cost", () => {
    const built = buildInterchange({
      senderId: "SENDER",
      receiverId: "RECEIVER",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      componentSeparator: "?",
      groups: [
        {
          functionalIdCode: "HC",
          groupControlNumber: "1",
          versionRelease: "005010X222A2",
          transactions: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "0001",
              segments: [["CLM", "PATIENT?ACCT", "150.00"]],
            },
          ],
        },
      ],
    });
    const clm = built.groups[0]?.transactions[0]?.segments[1];
    if (clm === undefined) throw new Error("the built interchange carries no CLM");
    expect(clm.raw).toBe("CLM*PATIENT??ACCT*150.00");
    expect(getSegmentValue(clm, "01", built.delimiters)).toBe("PATIENT?ACCT");
    expect(built.warnings).toEqual([]);
  });

  it("🩺 PRE-EXISTING and NOT closed here: `?~` still swallows the terminator on a degenerate set", () => {
    // `findUnescapedTerminator` guards its OWN role only, so with `?` as the
    // element separator a segment ending in an empty last element puts a `?`
    // immediately before the terminator and the scanner reads that as an
    // escape. The two segments merge. This slice does not touch framing.
    //
    // 🩺 But the READ of the merged blob DID move, and "framing is untouched"
    // must not be read as "nothing about this residual moved" - a first draft
    // pinned only `raw` and the id list and the gate called that understated.
    // At base the merge produced one `(non-spec)` element no walker looked at.
    // Here it frames, so `~SE` and the SE's own control number land in `PER`'s
    // communication-number slots. `X12_MISSING_SE` still fires, so it is not
    // silent, but a reader taking `PER-06` gets the next segment's id.
    const parsed = parseX12(degenerateIx("PER?IC?NAME?TE?5551234?EX?"));
    const segments = parsed.groups[0]?.transactions[0]?.segments;
    expect(segments?.map((s) => s.id)).toEqual(["ST", "PER"]);
    expect(segments?.[1]?.raw).toBe("PER?IC?NAME?TE?5551234?EX?~SE?3?0001");
    expect(segments?.[1]?.elements).toEqual([
      "PER",
      "IC",
      "NAME",
      "TE",
      "5551234",
      "EX",
      "~SE",
      "3",
      "0001",
    ]);
    expect(parsed.warnings.map((w) => w.code)).toEqual(["X12_MISSING_SE"]);
  });

  it("🛑 no case moves onto a NEW warning code, in either direction", () => {
    // The rule the widening slices in this lineage were built on: a case that
    // moves onto a new code blinds every consumer predicate written against the
    // old one. This slice mints no code. It does SUBTRACT one, in one place -
    // the spurious `X12_DANGLING_RELEASE_CHAR` above - and adds none anywhere.
    // An INTERIOR empty element and a doubled separator both frame here and
    // both were inside the one-element blob at base.
    const parsed = parseX12(degenerateIx("NTE?ADD?A??B"));
    const segments = parsed.groups[0]?.transactions[0]?.segments;
    expect(segments?.[1]?.elements).toEqual(["NTE", "ADD", "A", "", "B"]);
    expect(parsed.warnings).toEqual([]);
  });
});
