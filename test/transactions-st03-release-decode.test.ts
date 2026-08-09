/**
 * `X12-ST03-READ-NOT-RELEASE-AWARE`: the typed readers that publish `ST-03`
 * published the escape rather than the value.
 *
 * ## The census, re-measured at base `49e7ac8`, and the filed line was a FLOOR
 *
 * The backlog filed **three readers** - `get837Claims`, `get277Status` and
 * `get278Request`. Measured on this tree there are **four raw reads of
 * `tx.st.elements[3]` in three files, reached by five public readers**:
 * `get837Claims`; `get277Status` and `get277CADisposition`, which share
 * `walk277`; and `get278Request` and `get278Response`, which share `walk278`.
 * `get277CADisposition` carries a fourth read of its own - an admission gate.
 * The sixth typed reader of the identically-named field, `parse999` on
 * `AK2-03`, has always decoded, and is the in-tree control below.
 *
 * ## The grounding, and what it deliberately is NOT
 *
 * This package disagreeing with itself, exactly as `X12-TA1-RESIDUALS` was
 * grounded: every dot-path read (`elementValue`, `elementOptional`,
 * `componentOptional`, all through `getSegmentValue`) already unescapes, and
 * `parse999` decodes `AK2-03`. Nothing here rests on a TR3 usage clause and
 * nothing asserts one.
 *
 * **No normalisation rule is introduced.** Nothing is trimmed, case-folded or
 * pattern-matched; the `""` and whitespace cells are pinned below exactly as
 * they behaved at base.
 *
 * ## 🛑 WHAT THIS SLICE DELIBERATELY DOES NOT MOVE
 *
 * `ST-03` is also what the 837 variant resolver and both 277CA tests key on.
 * Those three tests still key on the RAW text, and the invariance is pinned
 * below on the document that would move first. Keying on the decoded text is a
 * change to how an already published document decodes - on the 837 it makes
 * the declaration beat the `SVx` fallback, which is the property
 * `X12-VARIANT-ICR-UNGROUNDED` shipped, and on the pinned document it stops a
 * service line decoding. That is a separate slice and it is filed, not taken.
 */

import { describe, expect, it } from "vitest";

import {
  get277CADisposition,
  get277Status,
  get278Request,
  get278Response,
  get837Claims,
  parse999,
  parseX12,
  type Delimiters,
  type X12TransactionSet,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

const DEFAULT_DELIMITERS = {
  element: "*",
  repetition: "^",
  component: ":",
  segment: "~",
} as const;

/**
 * Assemble a one-transaction interchange whose `ST-03` is exactly `st03`
 * (omitted when `undefined`). Bodies are synthetic and carry no PHI.
 */
function interchange(
  transactionSetId: string,
  st03: string | undefined,
  body: readonly string[],
  delimiters: Delimiters = DEFAULT_DELIMITERS,
): string {
  const e = delimiters.element;
  const s = delimiters.segment;
  const isa = buildIsa({
    element: delimiters.element,
    repetition: delimiters.repetition,
    component: delimiters.component,
    segment: delimiters.segment,
  });
  const gs = ["GS", "HC", "S", "R", "20250101", "1200", "1", "X", "005010X222A1"].join(e);
  const stParts = ["ST", transactionSetId, "0001"];
  if (st03 !== undefined) stParts.push(st03);
  const se = ["SE", String(body.length + 2), "0001"].join(e);
  return (
    isa +
    gs +
    s +
    stParts.join(e) +
    s +
    body.map((seg) => seg + s).join("") +
    se +
    s +
    ["GE", "1", "1"].join(e) +
    s +
    ["IEA", "1", "000000001"].join(e) +
    s
  );
}

function firstTransaction(raw: string): { delimiters: Delimiters; tx: X12TransactionSet } {
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("fixture did not frame a transaction");
  return { delimiters: ix.delimiters, tx };
}

/** Synthetic 837P body: one claim, one professional service line. */
const BODY_837P = [
  "BHT*0019*00*REF1*20250101*1200*CH",
  "HL*1**20*1",
  "CLM*ACCT1*150.00***11:B:1*Y*A*Y*Y",
  "LX*1",
  "SV1*HC:99213*150.00*UN*1",
];

/** Synthetic 837 body whose only service segment is INSTITUTIONAL (`SV2`). */
const BODY_837_SV2 = [
  "BHT*0019*00*REF1*20250101*1200*CH",
  "HL*1**20*1",
  "CLM*ACCT1*150.00***11:B:1*Y*A*Y*Y",
  "LX*1",
  "SV2*0300*HC:99213*150.00*UN*1",
];

const BODY_277 = ["BHT*0010*08*REF1*20250101*1200*DG", "HL*1**20*1"];
const BODY_278 = ["BHT*0007*13*REF1*20250101*1200*18", "HL*1**20*1"];

/**
 * The cells that were run, and nothing else. Each row is the `ST-03` element
 * text a sender framed, paired with the value it stated. No row is a claim
 * about which shape is special.
 */
const DECODE_CELLS: readonly (readonly [framed: string, stated: string])[] = [
  ["A??B", "A?B"],
  ["A?*B", "A*B"],
  ["A?:B", "A:B"],
  ["A?~B", "A~B"],
  ["A?^B", "A^B"],
];

describe("ST-03 is published post-?-unescape by every typed reader that publishes it", () => {
  for (const [framed, stated] of DECODE_CELLS) {
    it(`get837Claims publishes ${JSON.stringify(stated)} where the ST-03 element is ${JSON.stringify(framed)}`, () => {
      const { delimiters, tx } = firstTransaction(interchange("837", framed, BODY_837P));
      expect(tx.st.elements[3]).toBe(framed);
      expect(get837Claims(delimiters, tx)?.implementationConventionReference).toBe(stated);
    });

    it(`get277Status publishes ${JSON.stringify(stated)} where the ST-03 element is ${JSON.stringify(framed)}`, () => {
      const { delimiters, tx } = firstTransaction(interchange("277", framed, BODY_277));
      expect(tx.st.elements[3]).toBe(framed);
      expect(get277Status(delimiters, tx)?.implementationConventionReference).toBe(stated);
    });

    it(`get278Request and get278Response publish ${JSON.stringify(stated)} where the ST-03 element is ${JSON.stringify(framed)}`, () => {
      const { delimiters, tx } = firstTransaction(interchange("278", framed, BODY_278));
      expect(tx.st.elements[3]).toBe(framed);
      expect(get278Request(delimiters, tx)?.implementationConventionReference).toBe(stated);
      expect(get278Response(delimiters, tx)?.implementationConventionReference).toBe(stated);
    });
  }

  it("get277CADisposition publishes the decoded reference on a transaction it admits", () => {
    // Admitted because the framed text IS `005010X214`; the decode is the
    // identity on it, which is the property the invariance block relies on.
    const { delimiters, tx } = firstTransaction(interchange("277", "005010X214", BODY_277));
    const ca = get277CADisposition(delimiters, tx);
    expect(ca?.implementationConventionReference).toBe("005010X214");
    expect(ca?.transactionType).toBe("claim-acknowledgment");
  });

  it("parse999 already decoded AK2-03, and is the in-tree control", () => {
    const raw =
      buildIsa() +
      ["GS", "FA", "S", "R", "20250101", "1200", "1", "X", "005010X231A1"].join("*") +
      "~ST*999*0001~AK1*HC*1*005010X222A1~AK2*837*0001*A?*B~IK5*A~AK9*A*1*1*1~" +
      "SE*6*0001~GE*1*1~IEA*1*000000001~";
    expect(parse999(raw)?.transactionResponses[0]?.ak2.implementationConventionReference).toBe(
      "A*B",
    );
  });
});

describe("what the decode leaves alone", () => {
  it("preserves a release character whose target is not a delimiter (Postel's Law)", () => {
    const { delimiters, tx } = firstTransaction(interchange("837", "A?XB", BODY_837P));
    expect(get837Claims(delimiters, tx)?.implementationConventionReference).toBe("A?XB");
  });

  it("introduces no normalisation: a whitespace-only ST-03 is published untrimmed", () => {
    const { delimiters, tx } = firstTransaction(interchange("837", "   ", BODY_837P));
    expect(get837Claims(delimiters, tx)?.implementationConventionReference).toBe("   ");
  });

  it("keeps each reader's own empty / absent mapping unchanged", () => {
    const empty837 = firstTransaction(interchange("837", "", BODY_837P));
    expect(get837Claims(empty837.delimiters, empty837.tx)?.implementationConventionReference).toBe(
      "",
    );
    const empty277 = firstTransaction(interchange("277", "", BODY_277));
    expect(get277Status(empty277.delimiters, empty277.tx)?.implementationConventionReference).toBe(
      "",
    );
    // `walk278` collapses `""` to `undefined` and always did. Decoding cannot
    // reach that branch differently: every step of `unescapeRelease` appends at
    // least one character, so a non-empty element never decodes to `""`.
    const empty278 = firstTransaction(interchange("278", "", BODY_278));
    expect(
      get278Request(empty278.delimiters, empty278.tx)?.implementationConventionReference,
    ).toBeUndefined();

    const absent837 = firstTransaction(interchange("837", undefined, BODY_837P));
    expect(absent837.tx.st.elements[3]).toBeUndefined();
    expect(
      get837Claims(absent837.delimiters, absent837.tx)?.implementationConventionReference,
    ).toBeUndefined();
  });
});

describe("🛑 no keyed decision moves: the three ST-03 tests still key on the raw text", () => {
  /**
   * The discriminating document. `componentSeparator` is `X`, which is
   * admissible (`X12-EMIT-DELIMITER-SHAPE-UNCHECKED` left a letter delimiter
   * admissible) and which is also a character of every guide identifier the
   * variant table is keyed on. Its `ST-03` frames as `005010?X222A1` and
   * decodes to `005010X222A1`, the PROFESSIONAL guide; its only service
   * segment is `SV2`, so the `SVx` fallback resolves INSTITUTIONAL. Base and
   * head both answer `"I"`. Were the lookup keyed on the decoded text it would
   * answer `"P"`, and the `SV2` line would stop decoding.
   */
  const componentIsX: Delimiters = { ...DEFAULT_DELIMITERS, component: "X" };

  it("the 837 variant is still resolved by the SVx fallback, not by the decoded declaration", () => {
    const { delimiters, tx } = firstTransaction(
      interchange("837", "005010?X222A1", BODY_837_SV2, componentIsX),
    );
    const submission = get837Claims(delimiters, tx);
    expect(tx.st.elements[3]).toBe("005010?X222A1");
    // The published reference is the decoded value...
    expect(submission?.implementationConventionReference).toBe("005010X222A1");
    // ...and the resolution is unmoved. The whole warnings channel is pinned,
    // never the absence of one code: this repo has been caught by a green
    // assertion that named a value plus the absence of a DIFFERENT code.
    expect(submission?.variant).toBe("I");
    expect(submission?.warnings.map((w) => w.code)).toEqual(["X12_MISSING_REQUIRED_LOOP"]);
  });

  it("the honest control: the same document declaring the guide UNESCAPED does move, and that is the deferred slice", () => {
    // Identical but for the delimiter set, so `ST-03` needs no escape and the
    // raw text already IS the professional guide. The declaration wins, the
    // `SV2` line stops decoding, and the channel says so. This is what keying
    // on the decoded text would do to the document above.
    const { delimiters, tx } = firstTransaction(interchange("837", "005010X222A1", BODY_837_SV2));
    const submission = get837Claims(delimiters, tx);
    expect(submission?.variant).toBe("P");
    expect(submission?.warnings.map((w) => w.code)).toEqual([
      "X12_MISSING_REQUIRED_LOOP",
      "X12_837_SERVICE_LINE_NOT_DECODED",
    ]);
  });

  it("the 277CA admission gate and transactionType are still decided by the raw text", () => {
    const componentIs4: Delimiters = { ...DEFAULT_DELIMITERS, component: "4" };
    const { delimiters, tx } = firstTransaction(
      interchange("277", "005010X21?4", BODY_277, componentIs4),
    );
    expect(tx.st.elements[3]).toBe("005010X21?4");
    const status = get277Status(delimiters, tx);
    // The published reference is the decoded value...
    expect(status?.implementationConventionReference).toBe("005010X214");
    // ...and neither the discriminator nor the admission gate moved.
    expect(status?.transactionType).toBe("claim-status");
    expect(get277CADisposition(delimiters, tx)).toBeUndefined();
  });
});
