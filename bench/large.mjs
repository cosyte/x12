// Time and peak heap of the large documents, on two builds side by side: a base and a head.
//
//   node bench/large.mjs --base <base checkout>/dist/index.mjs --head dist/index.mjs [--rounds 3]
//
// Each case runs in a fresh process for each build, the builds interleaved round by round, so a
// change in the runner's load lands on both. A case is a 10,000-claim 835 or 837P (2.5 MiB, built
// in code by `corpus.mjs`) parsed, or parsed and read by its typed reader; and, where the build has
// it, the same document read through `readTransactionSets` in 64 KiB chunks. Time is the median of
// five calls after one unmeasured call. Peak heap is the most the heap held over its level before
// the call, read before every collection inside the call and once after it (as `@cosyte/bench`
// reads it), the most of five calls. Every round is written out, never only the best, as a
// Markdown table on standard output and in the job summary when there is one.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { GCProfiler, getHeapStatistics, setFlagsFromString } from "node:v8";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { runInNewContext } from "node:vm";

import { claim837PText, remit835Text } from "./corpus.mjs";

const CLAIMS = 10_000;

/** The cases, each a document and what is done with it. */
const CASES = [
  { name: "835: parseX12", text: () => remit835Text(0, CLAIMS), run: (x12, t) => x12.parseX12(t) },
  {
    name: "835: parseX12, then get835",
    text: () => remit835Text(0, CLAIMS),
    run: (x12, t) => {
      const ix = x12.parseX12(t);
      return x12.get835(ix.delimiters, ix.groups[0].transactions[0]);
    },
  },
  {
    name: "835: readTransactionSets, then get835",
    text: () => remit835Text(0, CLAIMS),
    stream: "get835",
  },
  {
    name: "837P: parseX12",
    text: () => claim837PText(0, CLAIMS),
    run: (x12, t) => x12.parseX12(t),
  },
  {
    name: "837P: parseX12, then get837Claims",
    text: () => claim837PText(0, CLAIMS),
    run: (x12, t) => {
      const ix = x12.parseX12(t);
      return x12.get837Claims(ix.delimiters, ix.groups[0].transactions[0]);
    },
  },
  {
    name: "837P: readTransactionSets, then get837Claims",
    text: () => claim837PText(0, CLAIMS),
    stream: "get837Claims",
  },
];

/** The text in chunks of 64 KiB. */
function* chunked(text) {
  for (let i = 0; i < text.length; i += 64 * 1024) yield text.slice(i, i + 64 * 1024);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** One case on one build, in this process: `{ ms, peak }`, or `null` where the build lacks it. */
async function child(target, index) {
  setFlagsFromString("--expose-gc");
  const gc = runInNewContext("gc");
  const x12 = await import(pathToFileURL(resolve(target)).href);
  const c = CASES[index];
  if (c.stream !== undefined && typeof x12.readTransactionSets !== "function") return null;
  const text = c.text();
  const call = async () => {
    if (c.stream === undefined) return c.run(x12, text);
    let n = 0;
    for await (const item of x12.readTransactionSets(chunked(text))) {
      if (x12[c.stream](item.delimiters, item.transaction) !== undefined) n += 1;
    }
    return n;
  };
  await call();
  const times = [];
  const peaks = [];
  for (let i = 0; i < 5; i++) {
    gc();
    gc();
    const base = getHeapStatistics().used_heap_size;
    const profiler = new GCProfiler();
    profiler.start();
    const t0 = performance.now();
    let result = await call();
    times.push(performance.now() - t0);
    const after = getHeapStatistics().used_heap_size;
    let peak = after;
    for (const s of profiler.stop().statistics) {
      peak = Math.max(peak, s.beforeGC.heapStatistics.usedHeapSize);
    }
    peaks.push(peak - base);
    result = undefined;
  }
  return { ms: median(times), peak: Math.max(...peaks) };
}

const { values } = parseArgs({
  options: {
    base: { type: "string" },
    head: { type: "string" },
    rounds: { type: "string", default: "3" },
    child: { type: "string" },
    target: { type: "string" },
  },
});

if (values.child !== undefined) {
  process.stdout.write(JSON.stringify(await child(values.target, Number(values.child))));
} else {
  const builds = { base: values.base, head: values.head };
  const rows = [];
  for (let round = 1; round <= Number(values.rounds); round++) {
    for (const [index, c] of CASES.entries()) {
      const order = round % 2 === 1 ? ["base", "head"] : ["head", "base"];
      const got = {};
      for (const build of order) {
        const out = execFileSync(
          process.execPath,
          [new URL(import.meta.url).pathname, "--child", String(index), "--target", builds[build]],
          { maxBuffer: 1024 * 1024 },
        );
        got[build] = JSON.parse(out.toString());
      }
      rows.push({ round, name: c.name, ...got });
    }
  }
  const cell = (r, key) =>
    r === null
      ? "not in this build"
      : key === "ms"
        ? `${r.ms.toFixed(1)} ms`
        : `${(r.peak / (1024 * 1024)).toFixed(2)} MiB`;
  const lines = [
    "| Round | Case | Time, base | Time, head | Peak heap, base | Peak heap, head |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| ${String(r.round)} | ${r.name} | ${cell(r.base, "ms")} | ${cell(r.head, "ms")} | ` +
        `${cell(r.base, "peak")} | ${cell(r.head, "peak")} |`,
    ),
  ];
  const md = `${lines.join("\n")}\n`;
  process.stdout.write(md);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary !== undefined && summary !== "") appendFileSync(summary, md);
}
