/**
 * The 270's TOLERANCE tests: what this reader accepts without changing the
 * model, and what it says about having accepted it.
 *
 * Two closed classes of deviation and no others:
 *
 * 1. **A declared delimiter other than the conventional one**, for any
 *    character the ISA position can carry. The shared interchange parse reads
 *    all four out of fixed ISA bytes and honours whatever it finds, so this
 *    reader takes them and adds nothing.
 * 2. **Whitespace or line breaks between segments**, including a break after
 *    every segment terminator. The shared parse consumes such a run before the
 *    next segment opens.
 *
 * For each, the decoded model must EQUAL the model decoded from the
 * spec-clean twin, and the tolerance must be reported as a warning carrying a
 * registered code and a position.
 *
 * **Equality here is over the decoded VALUES, which is the only reading that
 * makes the criterion consistent with itself:** the warning stream is a field
 * of the result and the whole point of these tests is that the quirky twin
 * carries an extra warning. So `data()` below strips the stream and compares
 * everything else, field for field, which is exactly the fidelity the model
 * promises: transmitted bytes per element and per component, framing in no
 * value.
 *
 * The delimiter and framing halves are also the reason this file exists rather
 * than a `parser-*` one: NOTHING in the shared parse changed for either. The
 * regression half of that claim is asserted in
 * `test/property/eligibility-270.property.test.ts`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  WARNING_CODES,
  detectDelimiters,
  get270Inquiry,
  parse270Inquiries,
  parseX12,
} from "../src/index.js";
import type { X12Inquiry } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "eligibility");

function fixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
}

/** The decoded values, with the warning stream removed. See the file header. */
function data(inquiry: X12Inquiry | undefined): string {
  if (inquiry === undefined) throw new Error("expected an inquiry model");
  const { warnings: _warnings, ...rest } = inquiry;
  return JSON.stringify(rest);
}

function only(name: string): X12Inquiry {
  const inquiries = parse270Inquiries(fixture(name));
  const first = inquiries[0];
  if (first === undefined) throw new Error(`fixture ${name} decoded no 270`);
  return first;
}

describe("AC5 class (i): a declared non-conventional delimiter", () => {
  it("is honoured by the shared parse, which is where this reader takes it from", () => {
    const delimiters = detectDelimiters(fixture("270-quirk-delimiters.edi"));
    expect(delimiters).toEqual({
      element: "|",
      repetition: "!",
      component: ">",
      segment: "\\",
    });
  });

  it("decodes to a model equal to its spec-clean twin", () => {
    expect(data(only("270-quirk-delimiters.edi"))).toBe(data(only("270-canonical.edi")));
  });

  it("reports the tolerance with a registered code and a position", () => {
    const inquiry = only("270-quirk-delimiters.edi");
    expect(inquiry.warnings.map((w) => w.code)).toEqual([
      WARNING_CODES.X12_270_NON_CONVENTIONAL_DELIMITER,
    ]);
    expect(inquiry.warnings[0]?.position).toEqual({ segmentIndex: 0, interchangeIndex: 0 });
  });

  it("splits the composite on the DECLARED component separator, not on a guess", () => {
    const request = only("270-quirk-delimiters.edi").informationSources[0]?.receivers[0]
      ?.subscribers[0]?.inquiries[0];
    expect(request?.procedure?.qualifier).toBe("HC");
    expect(request?.procedure?.code).toBe("99213");
    expect(request?.procedure?.modifiers).toEqual(["25"]);
    expect(request?.serviceTypeCodes.map((s) => s.code)).toEqual(["30", "35"]);
  });

  it("is raised once per transaction set however many roles deviate", () => {
    const inquiry = only("270-quirk-delimiters.edi");
    const raised = inquiry.warnings.filter(
      (w) => w.code === WARNING_CODES.X12_270_NON_CONVENTIONAL_DELIMITER,
    );
    expect(raised).toHaveLength(1);
  });

  it("stays silent on the conventional set", () => {
    expect(only("270-canonical.edi").warnings).toEqual([]);
  });
});

describe("AC5 class (ii): whitespace between segments", () => {
  it("decodes to a model equal to its spec-clean twin", () => {
    expect(data(only("270-quirk-linebreaks.edi"))).toBe(data(only("270-canonical.edi")));
  });

  it("reports the tolerance with a registered code and a position", () => {
    const inquiry = only("270-quirk-linebreaks.edi");
    expect(inquiry.warnings.map((w) => w.code)).toEqual([
      WARNING_CODES.X12_270_INTER_SEGMENT_WHITESPACE,
    ]);
    expect(inquiry.warnings[0]?.position).toEqual({ segmentIndex: 0, interchangeIndex: 0 });
  });

  it("is raised once per transaction set however many runs the document carries", () => {
    // The fixture carries a line break after EVERY segment terminator.
    const raw = fixture("270-quirk-linebreaks.edi");
    expect(raw.split("\n").length).toBeGreaterThan(10);
    const raised = only("270-quirk-linebreaks.edi").warnings.filter(
      (w) => w.code === WARNING_CODES.X12_270_INTER_SEGMENT_WHITESPACE,
    );
    expect(raised).toHaveLength(1);
  });

  it("tolerates a run of CR and LF in any order, and still decodes equal", () => {
    const pretty = fixture("270-canonical.edi").replaceAll("~", "~\r\n");
    const inquiries = parse270Inquiries(pretty);
    expect(data(inquiries[0])).toBe(data(only("270-canonical.edi")));
    expect(inquiries[0]?.warnings.map((w) => w.code)).toEqual([
      WARNING_CODES.X12_270_INTER_SEGMENT_WHITESPACE,
    ]);
  });

  it("stays silent on a document with no run between segments", () => {
    expect(only("270-canonical.edi").warnings).toEqual([]);
  });

  it("is a property of the bytes, so the model-only entry point does not report it", () => {
    // `get270Inquiry` is handed the model, and the run was consumed by the
    // shared parse before the model existed. Stated as a test so the split is
    // a decision on the record rather than a gap.
    const ix = parseX12(fixture("270-quirk-linebreaks.edi"));
    const tx = ix.groups[0]?.transactions[0];
    const inquiry = tx === undefined ? undefined : get270Inquiry(ix.delimiters, tx);
    expect(inquiry?.warnings).toEqual([]);
    expect(data(inquiry)).toBe(data(only("270-canonical.edi")));
  });
});

describe("AC5a: the shared parse is what frames a 270, and this work did not touch it", () => {
  it("takes the delimiter set from the interchange parse rather than assuming one", () => {
    const raw = fixture("270-quirk-delimiters.edi");
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    // The reader is handed `ix.delimiters` and nothing else about framing.
    const inquiry = tx === undefined ? undefined : get270Inquiry(ix.delimiters, tx);
    expect(inquiry).not.toBeUndefined();
    expect(ix.delimiters.component).toBe(">");
  });

  it("adds no envelope warning to a document of any other transaction set", () => {
    // The two 270 tolerance codes are raised on the 270 path only, so an
    // interchange carrying no 270 sees neither, however it is delimited or
    // framed. `271-canonical.edi` is line-broken after every terminator.
    const ix = parseX12(fixture("271-canonical.edi"));
    expect(ix.warnings).toEqual([]);
    expect(parse270Inquiries(fixture("271-canonical.edi"))).toEqual([]);
  });
});

describe("the two classes are closed", () => {
  it("a deviation outside them is not silently folded into either code", () => {
    // A count mismatch is a real deviation and is NOT one of the two classes.
    // It stays on the envelope channel under its own pre-existing code, and
    // neither 270 tolerance code appears.
    const raw = fixture("270-canonical.edi").replace("~IEA*1*", "~IEA*7*");
    const ix = parseX12(raw);
    expect(ix.warnings.map((w) => w.code)).toContain(WARNING_CODES.X12_GROUP_COUNT_MISMATCH);
    const inquiry = parse270Inquiries(raw)[0];
    expect(inquiry?.warnings).toEqual([]);
  });
});
