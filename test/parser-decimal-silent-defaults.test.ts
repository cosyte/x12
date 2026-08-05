/**
 * `X12-QUANTITY-SILENT-DEFAULTS` - a decimal element that is PRESENT and does
 * not decode must never reach a consumer as a confident number.
 *
 * The defect this file closes: `elementDecimalOrZero` turned an unparseable
 * decimal into `X12Decimal.ZERO` with no diagnostic on any channel, so a paid
 * amount of `1,234.56` (a thousands separator, which X12 forbids in an R-type
 * element) read back as `0` and looked exactly like a payer that paid nothing.
 * The milder half is the same root cause one type away: `elementDecimal`
 * answered `undefined` for both "the sender omitted it" and "the sender sent
 * bytes this library could not read", also with no diagnostic.
 *
 * Three things are asserted here, and they are deliberately different in kind:
 *
 * 1. **The primitive.** `readElementDecimal` separates the three spec-distinct
 *    outcomes, and the two warning-emitting wrappers fire on exactly one of
 *    them. An ABSENT element still returns `X12Decimal.ZERO` from
 *    `elementDecimalOrZero` and still does NOT warn: "missing means zero" is
 *    the documented convention of those slots and is unchanged by this slice.
 * 2. **The readers.** Every one of the six transaction readers that decodes a
 *    decimal is driven from literal EDI, not from a round trip. A round trip
 *    cannot exhibit this defect at all, because a builder cannot emit an
 *    unparseable decimal (`X12-DECIMAL-BYPASSES-THE-GUARD` made it refuse), so
 *    only bytes can produce the input that matters.
 * 3. **The chokepoint.** A source scan requires every decimal read under
 *    `src/transactions/` to pass a sink, because the silence comes back the
 *    moment a new call site omits one and nothing else would notice. It is a
 *    syntactic tripwire for the shape this library uses, not a proof.
 *
 * PHI: the offending bytes are consumer-controlled and never reach the
 * message. That is asserted directly rather than assumed, with a value shaped
 * like an account number.
 *
 * Synthetic-only throughout: every fixture edit substitutes one numeric token.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  X12Decimal,
  decodeSegment,
  elementDecimal,
  elementDecimalOrZero,
  get271Eligibility,
  get277Status,
  get820Payments,
  get834Enrollments,
  get835,
  get837Claims,
  parseX12,
  readElementDecimal,
  unparseableDecimal,
} from "../src/index.js";
import type {
  Delimiters,
  X12DecimalWarningSink,
  X12ParseWarning,
  X12Segment,
  X12TransactionSet,
} from "../src/index.js";

const DELIMS: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };
const FIXTURE_ROOT = join(__dirname, "fixtures");

function seg(raw: string): X12Segment {
  return decodeSegment(raw, DELIMS, () => {}, { segmentIndex: 1 });
}

function newSink(): { sink: X12DecimalWarningSink; warnings: X12ParseWarning[] } {
  const warnings: X12ParseWarning[] = [];
  return { sink: { warnings, position: { segmentIndex: 7, transactionIndex: 0 } }, warnings };
}

/**
 * Values that are NOT an X12 R-type decimal but are the shapes real senders
 * actually put in a monetary or quantity element. Every one of them decoded to
 * a confident `0` (or a silent `undefined`) before this slice.
 */
const UNPARSEABLE = [
  "1,234.56", // thousands separator - X12 forbids it in an R-type element
  "$450.00", // currency symbol
  "450.00USD", // trailing currency code
  "1.2.3", // two decimal points
  "450-", // trailing sign (a fixed-format habit, not X12)
  "N/A", // a word where a number belongs
  "1e3", // exponent notation
  " 450.00", // leading space
] as const;

// ---------------------------------------------------------------------------
// 1. The primitive.
// ---------------------------------------------------------------------------

describe("readElementDecimal - three spec-distinct outcomes, not two", () => {
  it("reports `decoded` with the value for a well-formed R-type decimal", () => {
    const read = readElementDecimal(seg("BPR*I*450.00"), 2, DELIMS);
    expect(read.status).toBe("decoded");
    expect(read.value?.toString()).toBe("450.00");
  });

  it("reports `absent` for a missing element and for an empty one", () => {
    expect(readElementDecimal(seg("BPR*I*450.00"), 9, DELIMS).status).toBe("absent");
    expect(readElementDecimal(seg("BPR*I**C"), 2, DELIMS).status).toBe("absent");
  });

  it.each(UNPARSEABLE)("reports `unparseable` (not `absent`) for %j", (value) => {
    const read = readElementDecimal(seg(`BPR*I*${value}*C`), 2, DELIMS);
    expect(read.status).toBe("unparseable");
    expect(read.value).toBeUndefined();
  });

  it("never throws and never warns - it is the pure half of the pair", () => {
    expect(() => readElementDecimal(seg("BPR*I*N/A"), 2, DELIMS)).not.toThrow();
  });
});

describe("elementDecimalOrZero - a stand-in 0 is no longer silent", () => {
  it.each(UNPARSEABLE)("warns X12_UNPARSEABLE_DECIMAL on %j and still returns 0", (value) => {
    const { sink, warnings } = newSink();
    const out = elementDecimalOrZero(seg(`BPR*I*${value}*C`), 2, DELIMS, sink);

    // The 0 is unchanged - the slot is typed X12Decimal and cannot express
    // "did not decode". What changed is that it is now announced.
    expect(out.toString()).toBe("0");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe(WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
  });

  it("anchors the warning at the FAILING element, not just the segment", () => {
    const { sink, warnings } = newSink();
    elementDecimalOrZero(seg("CLP*PT-1*1*1,000.00*450.00"), 3, DELIMS, sink);
    expect(warnings[0]?.position).toEqual({
      segmentIndex: 7,
      transactionIndex: 0,
      elementIndex: 3,
    });
  });

  it("does NOT warn when the element is absent - `missing means zero` is unchanged", () => {
    const { sink, warnings } = newSink();
    expect(elementDecimalOrZero(seg("BPR*I"), 2, DELIMS, sink).toString()).toBe("0");
    expect(elementDecimalOrZero(seg("BPR*I**C"), 2, DELIMS, sink).toString()).toBe("0");
    expect(warnings).toEqual([]);
  });

  it("does NOT warn on a value that decodes, including a genuine zero", () => {
    const { sink, warnings } = newSink();
    expect(elementDecimalOrZero(seg("BPR*I*0.00*C"), 2, DELIMS, sink).toString()).toBe("0.00");
    expect(warnings).toEqual([]);
  });

  it("is silent with no sink, which is why every reader in this library passes one", () => {
    expect(elementDecimalOrZero(seg("BPR*I*1,234.56*C"), 2, DELIMS).toString()).toBe("0");
  });
});

describe("elementDecimal - `undefined` no longer conflates absent with not decoded", () => {
  it.each(UNPARSEABLE)("warns on %j while still answering undefined", (value) => {
    const { sink, warnings } = newSink();
    expect(elementDecimal(seg(`SVC*HC:99213*500*450**${value}`), 5, DELIMS, sink)).toBeUndefined();
    expect(warnings.map((w) => w.code)).toEqual([WARNING_CODES.X12_UNPARSEABLE_DECIMAL]);
  });

  it("does NOT warn for an absent element - that undefined really does mean absent", () => {
    const { sink, warnings } = newSink();
    expect(elementDecimal(seg("SVC*HC:99213*500*450"), 5, DELIMS, sink)).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  it("is silent with no sink", () => {
    expect(elementDecimal(seg("SVC*HC:99213*500*450**N/A"), 5, DELIMS)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. PHI: the bytes that failed are consumer-controlled and never echoed.
// ---------------------------------------------------------------------------

describe("X12_UNPARSEABLE_DECIMAL is registry-built, like every other warning", () => {
  it("its message is a member of ALL_WARNING_MESSAGES", () => {
    expect(ALL_WARNING_MESSAGES.has(unparseableDecimal({ segmentIndex: 1 }).message)).toBe(true);
  });

  it("never echoes the offending bytes, which a sender controls entirely", () => {
    // Shaped like an account number a mis-mapped field could drop into a
    // monetary element. The bytes stay on the segment; the message says only
    // what is wrong and where.
    const leak = "9876543210ACCT";
    const { sink, warnings } = newSink();
    const segment = seg(`AMT*AU*${leak}`);
    elementDecimal(segment, 2, DELIMS, sink);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).not.toContain(leak);
    expect(ALL_WARNING_MESSAGES.has(warnings[0]?.message ?? "")).toBe(true);
    // Not lost - preserved verbatim on the segment, which is where a consumer
    // that has decided it may handle these bytes goes to read them.
    expect(segment.elements[2]).toBe(leak);
  });
});

// ---------------------------------------------------------------------------
// 3. The readers, driven from literal EDI.
// ---------------------------------------------------------------------------

function readFixture(relPath: string): string {
  return readFileSync(join(FIXTURE_ROOT, relPath), "utf8").trimEnd();
}

/** Replace exactly one token in a fixture, refusing an ambiguous or absent needle. */
function substitute(raw: string, from: string, to: string): string {
  const first = raw.indexOf(from);
  if (first === -1) throw new Error(`needle not found in fixture: ${from}`);
  if (raw.indexOf(from, first + from.length) !== -1) {
    throw new Error(`needle is ambiguous (appears more than once): ${from}`);
  }
  return raw.replace(from, to);
}

function txOf(raw: string, stCode: string): { tx: X12TransactionSet; delimiters: Delimiters } {
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === stCode);
  if (tx === undefined) throw new Error(`no ${stCode} transaction set`);
  return { tx, delimiters: ix.delimiters };
}

function codes(warnings: readonly X12ParseWarning[]): string[] {
  return warnings.map((w) => w.code);
}

describe("get835 - the headline case: a paid amount that reads 0 and never was", () => {
  it("BPR-02 `1,234.56` warns instead of reporting a payer that paid nothing", () => {
    const raw = substitute(
      readFixture("remit/835-medicare-canonical.edi"),
      "BPR*I*450.00*",
      "BPR*I*1,234.56*",
    );
    const { tx, delimiters } = txOf(raw, "835");
    const remit = get835(delimiters, tx);

    // The model is unchanged: the slot is typed X12Decimal and reads 0. That 0
    // is precisely what the warning exists to contradict.
    expect(remit?.payment.totalActualPayment.toString()).toBe("0");
    expect(codes(remit?.warnings ?? [])).toContain(WARNING_CODES.X12_UNPARSEABLE_DECIMAL);

    const w = remit?.warnings.find((x) => x.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
    expect(w?.position.elementIndex).toBe(2);
  });

  it("CLP-04 (the claim paid amount) warns at CLP element 4", () => {
    const raw = substitute(
      readFixture("remit/835-medicare-canonical.edi"),
      "CLP*PT-ACCT-001*1*500.00*450.00*",
      "CLP*PT-ACCT-001*1*500.00*450.00USD*",
    );
    const { tx, delimiters } = txOf(raw, "835");
    const remit = get835(delimiters, tx);

    expect(remit?.claims[0]?.totalPaymentAmount.toString()).toBe("0");
    const w = remit?.warnings.find((x) => x.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
    expect(w?.position.elementIndex).toBe(4);
  });

  it("SVC-05 paid units warns even though the slot is optional and reads undefined", () => {
    const raw = substitute(
      readFixture("remit/835-medicare-canonical.edi"),
      "SVC*HC:99213*500.00*450.00**1~",
      "SVC*HC:99213*500.00*450.00**1.2.3~",
    );
    const { tx, delimiters } = txOf(raw, "835");
    const remit = get835(delimiters, tx);

    expect(remit?.claims[0]?.serviceLines[0]?.paidUnitsOfService).toBeUndefined();
    const w = remit?.warnings.find((x) => x.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
    expect(w?.position.elementIndex).toBe(5);
  });

  it("the unmodified fixture emits no X12_UNPARSEABLE_DECIMAL at all", () => {
    const { tx, delimiters } = txOf(readFixture("remit/835-medicare-canonical.edi"), "835");
    expect(codes(get835(delimiters, tx)?.warnings ?? [])).not.toContain(
      WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
    );
  });
});

describe("get837Claims - a submitted charge and a units count", () => {
  it("CLM-02 total charge warns", () => {
    const raw = substitute(
      readFixture("claim/837p-canonical.edi"),
      "CLM*PT-ACCT-001*150*",
      "CLM*PT-ACCT-001*$150*",
    );
    const { tx, delimiters } = txOf(raw, "837");
    const sub = get837Claims(delimiters, tx);

    expect(sub?.claims[0]?.totalCharge.toString()).toBe("0");
    const w = sub?.warnings.find((x) => x.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
    expect(w?.position.elementIndex).toBe(2);
  });

  it("SV1-04 service units warns", () => {
    const raw = substitute(
      readFixture("claim/837p-canonical.edi"),
      "SV1*HC:99213:25*150*UN*1*",
      "SV1*HC:99213:25*150*UN*N/A*",
    );
    const { tx, delimiters } = txOf(raw, "837");
    const sub = get837Claims(delimiters, tx);

    expect(sub?.claims[0]?.serviceLines[0]?.units.toString()).toBe("0");
    const w = sub?.warnings.find((x) => x.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
    expect(w?.position.elementIndex).toBe(4);
  });
});

describe("get277Status - an optional amount slot", () => {
  it("STC-04 total charge warns rather than reading as an omitted element", () => {
    const raw = substitute(
      readFixture("status/277-canonical.edi"),
      "STC*A2:20:PR*20260601*WQ*150~",
      "STC*A2:20:PR*20260601*WQ*1,50~",
    );
    const { tx, delimiters } = txOf(raw, "277");
    const status = get277Status(delimiters, tx);

    const w = status?.warnings.find((x) => x.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
    expect(w?.position.elementIndex).toBe(4);
  });
});

describe("get271Eligibility - a benefit amount", () => {
  it("EB-07 monetary amount warns", () => {
    const raw = substitute(
      readFixture("eligibility/271-canonical.edi"),
      "EB*C*IND*30**GOLD PPO*29*1000~",
      "EB*C*IND*30**GOLD PPO*29*1 000~",
    );
    const { tx, delimiters } = txOf(raw, "271");
    const elig = get271Eligibility(delimiters, tx);

    const w = elig?.warnings.find((x) => x.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
    expect(w?.position.elementIndex).toBe(7);
  });
});

describe("get820Payments - a premium total", () => {
  it("BPR-02 warns", () => {
    const raw = substitute(
      readFixture("premium/820-canonical.edi"),
      "BPR*C*12500.00*",
      "BPR*C*12,500.00*",
    );
    const { tx, delimiters } = txOf(raw, "820");
    const prem = get820Payments(delimiters, tx);

    expect(prem?.payment.totalPremiumAmount.toString()).toBe("0");
    const w = prem?.warnings.find((x) => x.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
    expect(w?.position.elementIndex).toBe(2);
  });
});

describe("get834Enrollments - scoped to the member it was read from", () => {
  it("AMT-02 warns on that member's own warning list", async () => {
    const raw = substitute(
      readFixture("enrollment/834-canonical.edi"),
      "AMT*P3*125.00~",
      "AMT*P3*125.00USD~",
    );
    const { tx, delimiters } = txOf(raw, "834");

    const seen: string[] = [];
    for await (const enrollment of get834Enrollments(delimiters, tx)) {
      seen.push(...codes(enrollment.warnings));
    }
    expect(seen).toContain(WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
  });
});

// ---------------------------------------------------------------------------
// 4. The chokepoint: a new decimal read cannot be silently added.
// ---------------------------------------------------------------------------

/**
 * Count the top-level arguments of the call whose opening `(` sits at
 * `openIndex`, by walking balanced parentheses / brackets / braces. Keying on
 * the argument COUNT rather than on a regex for `, sink)` is deliberate: the
 * sink binding is named by its caller and a name-matching scan would go
 * quietly slack the first time somebody named it something else.
 */
function topLevelArgCount(source: string, openIndex: number): number {
  let depth = 0;
  let args = 1;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source.charAt(i);
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) return args;
    } else if (ch === "," && depth === 1) args += 1;
  }
  throw new Error("unbalanced call expression in source scan");
}

/** Strip line and block comments so a call written in prose is not scanned. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^[^\n]*?\/\/[^\n]*$/gmu, "");
}

const READER_FILES = [
  "src/transactions/remit/get-835.ts",
  "src/transactions/claim/get-837.ts",
  "src/transactions/status/get-277.ts",
  "src/transactions/eligibility/get-271.ts",
  "src/transactions/enrollment/get-834.ts",
  "src/transactions/premium/get-820.ts",
] as const;

const CALL_RE = /\belementDecimal(?:OrZero)?\s*\(/gu;

interface DecimalCall {
  readonly file: string;
  readonly argCount: number;
  readonly excerpt: string;
}

function decimalCalls(source: string, file: string): DecimalCall[] {
  const out: DecimalCall[] = [];
  const text = stripComments(source);
  for (const m of text.matchAll(CALL_RE)) {
    const open = m.index + m[0].length - 1;
    out.push({
      file,
      argCount: topLevelArgCount(text, open),
      excerpt: text.slice(m.index, open + 60).replace(/\s+/gu, " "),
    });
  }
  return out;
}

describe("source scan: every decimal read in a reader carries a warning sink", () => {
  it("finds decimal reads in every reader, so the scan is not vacuous", () => {
    for (const file of READER_FILES) {
      const calls = decimalCalls(readFileSync(join(__dirname, "..", file), "utf8"), file);
      expect(
        calls.length,
        `${file} has no decimal reads - is the scan still pointed at it?`,
      ).toBeGreaterThan(0);
    }
  });

  it("passes a 4th argument at every one of them", () => {
    const offenders: DecimalCall[] = [];
    for (const file of READER_FILES) {
      for (const call of decimalCalls(readFileSync(join(__dirname, "..", file), "utf8"), file)) {
        if (call.argCount !== 4) offenders.push(call);
      }
    }
    expect(offenders.map((o) => `${o.file}: ${o.excerpt}`)).toEqual([]);
  });

  it("the scan is a real filter: a 3-argument call is what it catches", () => {
    // Negative control. Without this the scan could be green because it
    // matches nothing, which is how two allowlists in this repo went slack.
    const forged = "const x = elementDecimalOrZero(seg, 2, delimiters);";
    expect(decimalCalls(forged, "forged.ts")[0]?.argCount).toBe(3);
    const honest = "const x = elementDecimalOrZero(seg, 2, delimiters, sink);";
    expect(decimalCalls(honest, "honest.ts")[0]?.argCount).toBe(4);
  });

  it("handles a call broken across lines and one with a nested call", () => {
    const multiline = "elementDecimal(\n  seg,\n  base + 1,\n  delimiters,\n  sink,\n)";
    expect(decimalCalls(multiline, "m.ts")[0]?.argCount).toBe(5); // trailing comma
    const nested = "elementDecimal(seg, idx(a, b), delimiters, { warnings, position })";
    expect(decimalCalls(nested, "n.ts")[0]?.argCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 5. The sink is inert for everything that already worked.
// ---------------------------------------------------------------------------

describe("no diagnostic churn on well-formed input", () => {
  it.each([
    ["remit/835-medicare-canonical.edi", "835"],
    ["remit/835-with-plb.edi", "835"],
    ["remit/835-carc-rarc-mix.edi", "835"],
    ["claim/837p-comprehensive.edi", "837"],
    ["claim/837i-canonical.edi", "837"],
    ["status/277-canonical.edi", "277"],
    ["eligibility/271-canonical.edi", "271"],
    ["premium/820-canonical.edi", "820"],
  ])("%s emits no X12_UNPARSEABLE_DECIMAL", (name, stCode) => {
    const { tx, delimiters } = txOf(readFixture(name), stCode);
    const warnings =
      stCode === "835"
        ? (get835(delimiters, tx)?.warnings ?? [])
        : stCode === "837"
          ? (get837Claims(delimiters, tx)?.warnings ?? [])
          : stCode === "277"
            ? (get277Status(delimiters, tx)?.warnings ?? [])
            : stCode === "271"
              ? (get271Eligibility(delimiters, tx)?.warnings ?? [])
              : (get820Payments(delimiters, tx)?.warnings ?? []);
    expect(codes(warnings)).not.toContain(WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
  });

  it("a decoded X12Decimal is still BigInt-exact, never parseFloat", () => {
    const { sink } = newSink();
    const out = elementDecimalOrZero(seg("BPR*I*0.1"), 2, DELIMS, sink);
    expect(out.toString()).toBe("0.1");
    expect(out.toString()).toBe(X12Decimal.fromString("0.1")?.toString());
  });
});
