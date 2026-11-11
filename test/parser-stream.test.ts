/**
 * `readTransactionSets`: an interchange read as it arrives, one transaction set at a time. Each
 * set it yields is the one `parseX12` of the whole input holds at the same place, and the warnings
 * and fatal errors are the ones `parseX12` reports, in the same order, wherever the chunks end.
 * Every interchange is synthetic.
 */

import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import { remit835Text } from "../bench/corpus.mjs";
import {
  parseX12,
  readTransactionSets,
  type X12ParseWarning,
  type X12StreamSource,
  type X12StreamTransaction,
} from "../src/index.js";

import { corpusInputs, record } from "./_helpers/output-corpus.js";
import { buildInterchange } from "./_helpers/envelope.js";

/** `input` cut into chunks of `size`, as text or as bytes. */
function chunks(input: string | Buffer, size: number, bytes: boolean): (string | Uint8Array)[] {
  const text = typeof input === "string" ? input : input.toString("latin1");
  const out: (string | Uint8Array)[] = [];
  for (let i = 0; i < text.length; i += size) {
    const piece = text.slice(i, i + size);
    out.push(bytes ? new Uint8Array(Buffer.from(piece, "latin1")) : piece);
  }
  return out;
}

/** An async source of `pieces`, one per turn. */
async function* asyncSource(
  pieces: readonly (string | Uint8Array)[],
): AsyncGenerator<string | Uint8Array> {
  for (const piece of pieces) {
    await Promise.resolve();
    yield piece;
  }
}

interface Read {
  readonly items: X12StreamTransaction[];
  readonly warnings: X12ParseWarning[];
  readonly error: unknown;
}

async function readAll(source: X12StreamSource, strict = false): Promise<Read> {
  const items: X12StreamTransaction[] = [];
  const warnings: X12ParseWarning[] = [];
  let error: unknown;
  try {
    for await (const item of readTransactionSets(source, {
      strict,
      onWarning: (w) => warnings.push(w),
    })) {
      items.push(item);
    }
  } catch (e) {
    error = e;
  }
  return { items, warnings, error };
}

/** What `parseX12` reports for `input`, recorded as the stream must report it. */
function expected(
  input: string | Buffer,
  strict = false,
): { items: string; warnings: string; error: string } {
  try {
    const ix = parseX12(input, { profile: null, strict });
    const items = ix.groups.flatMap((g, groupIndex) =>
      g.transactions.map((transaction, transactionIndex) =>
        Object.freeze({
          delimiters: ix.delimiters,
          isa: ix.isa,
          groupIndex,
          transactionIndex,
          transaction,
        }),
      ),
    );
    return { items: record(items), warnings: record([...ix.warnings]), error: record(undefined) };
  } catch (error) {
    return { items: "", warnings: "", error: record(error) };
  }
}

function observed(read: Read): { items: string; warnings: string; error: string } {
  if (read.error !== undefined) return { items: "", warnings: "", error: record(read.error) };
  return { items: record(read.items), warnings: record(read.warnings), error: record(undefined) };
}

describe("readTransactionSets", () => {
  it("reads every document of the output corpus as parseX12 does, wherever the chunks end", async () => {
    let k = 0;
    for (const { input } of corpusInputs()) {
      const want = expected(input);
      // Chunk sizes that cut inside the ISA, inside segments and between them; text and bytes.
      const size = [1, 2, 3, 7, 50, 105, 106, 107, 4096][k % 9] ?? 1;
      // Text input may hold characters above U+00FF, which no byte is: bytes only for bytes.
      const bytes = typeof input !== "string";
      k += 1;
      expect(observed(await readAll(chunks(input, size, bytes)))).toEqual(want);
      expect(observed(await readAll(asyncSource(chunks(input, size + 1, false))))).toEqual(want);
    }
  }, 300_000);

  it("throws the first warning in strict mode, as parseX12 does", async () => {
    let strictCases = 0;
    for (const { input } of corpusInputs()) {
      const want = expected(input, true);
      const read = await readAll(chunks(input, 64, false), true);
      expect(record(read.error)).toBe(want.error);
      if (want.error !== record(undefined)) strictCases += 1;
    }
    expect(strictCases).toBeGreaterThan(10);
  }, 300_000);

  it("yields each transaction set before the next one arrives", async () => {
    const body = (n: string) => [`ST*835*${n}`, "BPR*I*10*C*ACH", `SE*3*${n}`];
    const isa = buildInterchange({ functionalIdCode: "HP" }).slice(0, 106);
    const pieces = [
      `${isa}GS*HP*S*R*20250101*1200*1*X*005010X221A1~`,
      `${body("0001").join("~")}~`,
      `${body("0002").join("~")}~`,
      "GE*2*1~IEA*1*000000001~",
    ];
    let given = 0;
    const seen: number[] = [];
    function* source(): Generator<string> {
      for (const piece of pieces) {
        given += 1;
        yield piece;
      }
    }
    for await (const item of readTransactionSets(source())) {
      seen.push(given);
      expect(item.transaction.st.elements[2]).toBe(`000${String(item.transactionIndex + 1)}`);
      expect(item.groupIndex).toBe(0);
      expect(Object.isFrozen(item)).toBe(true);
    }
    expect(seen).toEqual([2, 3]);
  });

  it("reports a warning on the ISA as soon as the ISA is all here", async () => {
    const raw = buildInterchange({ transactionBody: ["BHT*0019"] }).replace("*00501*", "*00401*");
    const log: string[] = [];
    function* source(): Generator<string> {
      // The ISA alone, exactly its 106 bytes, then the rest.
      log.push("first");
      yield raw.slice(0, 106);
      log.push("rest");
      yield raw.slice(106);
    }
    for await (const item of readTransactionSets(source(), {
      onWarning: (w) => log.push(w.code),
    })) {
      log.push(`set ${String(item.transactionIndex)}`);
    }
    expect(log).toEqual(["first", "X12_PRE_005010", "rest", "set 0"]);
    expect(parseX12(raw).warnings.map((w) => w.code)).toEqual(["X12_PRE_005010"]);
  });

  it("yields a transaction set holding a binary segment before the next chunk arrives", async () => {
    const isa = buildInterchange({ functionalIdCode: "PI" }).slice(0, 106);
    const pieces = [
      `${isa}GS*PI*S*R*20250101*1200*1*X*005010X210~`,
      "ST*275*0001~BDS*B64*9*ab~cd?~ef~SE*3*0001~",
      "GE*1*1~IEA*1*000000001~",
    ];
    let given = 0;
    const seen: number[] = [];
    function* source(): Generator<string> {
      for (const piece of pieces) {
        given += 1;
        yield piece;
      }
    }
    for await (const item of readTransactionSets(source())) {
      seen.push(given);
      expect(item.transaction.rawSegments).toEqual([
        "ST*275*0001",
        "BDS*B64*9*ab~cd?~ef",
        "SE*3*0001",
      ]);
    }
    expect(seen).toEqual([2]);
  });

  it("frames a binary segment whose count spans chunks and holds the terminator", async () => {
    const raw = buildInterchange({
      functionalIdCode: "PI",
      transactionSetId: "275",
      versionRelease: "005010X210",
      transactionBody: ["BDS*B64*9*ab~cd?~ef", "REF*ZZ*AFTER"],
    });
    for (let size = 1; size < 40; size++) {
      expect(observed(await readAll(chunks(raw, size, false)))).toEqual(expected(raw));
    }
    const read = await readAll([raw]);
    expect(read.items[0]?.transaction.rawSegments).toContain("BDS*B64*9*ab~cd?~ef");
  });

  it("reports what follows the IEA, and nothing when only line breaks follow it", async () => {
    const raw = buildInterchange({ transactionBody: ["BHT*0019*00*1*20250101*1200*CH"] });
    for (const tail of ["", "\r\n", "~", "~~", "X", "\r\nREF*X*Y~", "ISA*00~"]) {
      for (const size of [1, 5, 1000]) {
        expect(observed(await readAll(chunks(raw + tail, size, false)))).toEqual(
          expected(raw + tail),
        );
      }
    }
  });

  it("throws the fatal errors parseX12 throws, an empty source included", async () => {
    for (const input of ["", "IS", "GS*HC~", buildInterchange().slice(0, 105)]) {
      const want = expected(input);
      expect(want.error).not.toBe(record(undefined));
      expect(observed(await readAll(chunks(input, 3, false)))).toEqual(want);
    }
    expect(observed(await readAll([]))).toEqual(expected(""));
  });

  it("keeps reading when the warning callback throws", async () => {
    const raw = buildInterchange({ transactionBody: ["BHT*0019"] }).replace("IEA*1*", "IEA*2*");
    const items: X12StreamTransaction[] = [];
    for await (const item of readTransactionSets([raw], {
      onWarning: () => {
        throw new Error("noisy");
      },
    })) {
      items.push(item);
    }
    expect(items).toHaveLength(1);
    expect(parseX12(raw).warnings.length).toBeGreaterThan(0);
  });

  it("leaves segments for the first read, or splits them all with { lazy: false }", async () => {
    const raw = remit835Text(1, 2);
    const [lazy] = (await readAll([raw])).items;
    const eager: X12StreamTransaction[] = [];
    for await (const item of readTransactionSets([raw], { lazy: false })) eager.push(item);
    expect(Object.getOwnPropertyDescriptor(lazy?.transaction, "segments")).toHaveProperty("get");
    expect(Object.getOwnPropertyDescriptor(eager[0]?.transaction, "segments")).toHaveProperty(
      "writable",
      true,
    );
    expect(lazy?.transaction.segments).toEqual(eager[0]?.transaction.segments);
  });
});
