// A CPU profile and a sampled heap profile of the hottest paths, against the built entry.
//
//   pnpm build && pnpm bench:profile [--out <dir>] [--target <entry>]
//
// Each path runs on the largest dense shape of `x12.bench.mjs`, warm, for at least two seconds
// under the V8 sampling profiler, then again under the sampling heap profiler. The raw profiles are
// written to the out directory (`.cpuprofile` opens in Chrome DevTools; `.heapprofile` too), and a
// Markdown summary of the functions with the most self time and the allocation sites with the most
// bytes goes to standard output and to `profile.md` beside them. Every document is synthetic and
// built in code by `corpus.mjs`; a profile names functions and lines of the library, never an input.

import { mkdirSync, writeFileSync } from "node:fs";
import { Session } from "node:inspector/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

import {
  attachment275Text,
  claim837ISpec,
  claim837IText,
  claim837PSpec,
  claim837PText,
  remit835Spec,
  remit835Text,
} from "./corpus.mjs";

const { values } = parseArgs({
  options: {
    out: { type: "string", default: "bench-results/profile" },
    target: { type: "string", default: "dist/index.mjs" },
    seconds: { type: "string", default: "2" },
  },
});
const outDir = resolve(values.out);
const minMs = Number(values.seconds) * 1000;
const x12 = await import(pathToFileURL(resolve(values.target)).href);

function dec(value) {
  const d = x12.X12Decimal.fromString(value);
  if (d === undefined) throw new Error("a corpus amount is not an X12 decimal");
  return d;
}

function read(getter) {
  return (text) => {
    const ix = x12.parseX12(text);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("the interchange holds no transaction set");
    return x12[getter](ix.delimiters, tx);
  };
}

const remit = remit835Text(0, 10_000);
const claims = claim837PText(0, 10_000);
const institutional = claim837IText(0, 10_000);
const attachment = attachment275Text(0, 4 * 1024 * 1024);
const remitSpec = remit835Spec(dec, 0, 10_000);
const claimSpec = claim837PSpec(dec, 0, 10_000);
const institutionalSpec = claim837ISpec(dec, 0, 10_000);

/** The hottest paths: the largest dense documents read and built, and the large opaque one. */
const PATHS = [
  { name: "835-parse", what: "835, 10,000 claims: parseX12", run: () => x12.parseX12(remit) },
  {
    name: "835-read",
    what: "835, 10,000 claims: parseX12, then get835",
    run: () => read("get835")(remit),
  },
  {
    name: "837p-read",
    what: "837P, 10,000 claims: parseX12, then get837Claims",
    run: () => read("get837Claims")(claims),
  },
  {
    name: "835-build",
    what: "835, 10,000 claims: build835, then serializeX12",
    run: () => x12.serializeX12(x12.build835(remitSpec)),
  },
  {
    name: "837p-build",
    what: "837P, 10,000 claims: build837P, then serializeX12",
    run: () => x12.serializeX12(x12.build837P(claimSpec)),
  },
  {
    name: "837i-read",
    what: "837I, 10,000 claims: parseX12, then get837Claims",
    run: () => read("get837Claims")(institutional),
  },
  {
    name: "837i-build",
    what: "837I, 10,000 claims: build837I, then serializeX12",
    run: () => x12.serializeX12(x12.build837I(institutionalSpec)),
  },
  { name: "275-parse", what: "275, 4 MiB payload: parseX12", run: () => x12.parseX12(attachment) },
  {
    name: "275-read",
    what: "275, 4 MiB payload: parseX12, then get275Attachments",
    run: () => read("get275Attachments")(attachment),
  },
];

/** Run `fn` until `minMs` have passed, at least three times; return the calls made. */
function repeat(fn) {
  let calls = 0;
  const start = performance.now();
  while (calls < 3 || performance.now() - start < minMs) {
    fn();
    calls++;
  }
  return calls;
}

/** Where a call frame is, relative to the target's directory. */
function where(frame) {
  const file = frame.url === "" ? "(native)" : frame.url.slice(frame.url.lastIndexOf("/") + 1);
  return `${file}:${String(frame.lineNumber + 1)}`;
}

/** The functions with the most self time in a CPU profile, as rows of a table. */
function topSelfTime(profile, count) {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  const self = new Map();
  const deltas = profile.timeDeltas;
  let total = 0;
  profile.samples.forEach((id, i) => {
    const node = byId.get(id);
    const dt = deltas[i] ?? 0;
    const frame = node.callFrame;
    // The profiler's own messages are not the library's time.
    if (frame.url.startsWith("node:inspector")) return;
    total += dt;
    const key = `${frame.functionName || "(anonymous)"} ${where(frame)}`;
    self.set(key, (self.get(key) ?? 0) + dt);
  });
  return [...self.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key, us]) => `| ${key} | ${((100 * us) / total).toFixed(1)}% |`);
}

/** The allocation sites with the most sampled bytes in a heap profile, as rows of a table. */
function topAllocations(profile, count) {
  const sites = new Map();
  let total = 0;
  const walk = (node) => {
    const frame = node.callFrame;
    if (!frame.url.startsWith("node:inspector")) {
      const key = `${frame.functionName || "(anonymous)"} ${where(frame)}`;
      sites.set(key, (sites.get(key) ?? 0) + node.selfSize);
      total += node.selfSize;
    }
    for (const child of node.children) walk(child);
  };
  walk(profile.head);
  return [...sites.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key, bytes]) => `| ${key} | ${((100 * bytes) / total).toFixed(1)}% |`);
}

mkdirSync(outDir, { recursive: true });
const session = new Session();
session.connect();
await session.post("Profiler.enable");
await session.post("Profiler.setSamplingInterval", { interval: 100 });
await session.post("HeapProfiler.enable");

const lines = [
  "### Profile: @cosyte/x12",
  "",
  `Node ${process.version} on ${process.platform}-${process.arch}, ${new Date().toISOString()}.`,
  "Self time is the share of CPU samples taken in that function; allocations are the share of",
  "bytes the sampling heap profiler attributed to that site. Both are over every call of the path.",
];
for (const path of PATHS) {
  repeat(path.run); // warm
  await session.post("Profiler.start");
  const calls = repeat(path.run);
  const { profile } = await session.post("Profiler.stop");
  writeFileSync(join(outDir, `${path.name}.cpuprofile`), JSON.stringify(profile));

  // Every sampled allocation, including what the collector has already freed: the bytes a path
  // allocates, not only what is still live when the sampling stops.
  await session.post("HeapProfiler.startSampling", {
    samplingInterval: 4096,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
  repeat(path.run);
  const { profile: heap } = await session.post("HeapProfiler.stopSampling");
  writeFileSync(join(outDir, `${path.name}.heapprofile`), JSON.stringify(heap));

  lines.push(
    "",
    `#### ${path.what} (${String(calls)} calls)`,
    "",
    "| Function, self time | Share |",
    "| --- | --- |",
    ...topSelfTime(profile, 12),
    "",
    "| Allocation site | Share |",
    "| --- | --- |",
    ...topAllocations(heap, 8),
  );
}
session.disconnect();

const summary = `${lines.join("\n")}\n`;
writeFileSync(join(outDir, "profile.md"), summary);
process.stdout.write(summary);
