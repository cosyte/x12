/**
 * Capture the 271 non-regression goldens.
 *
 * `pnpm tsx scripts/capture-271-goldens.ts <what>` where `<what>` is one of:
 *
 * - `baseline` - write BOTH baseline sets (the frozen four, and the warnings
 *   collection) plus the AAA partition of the corpus. Run ONCE, on the
 *   unmodified tree, before the AAA surface exists. Refuses to overwrite a
 *   baseline that is already committed, because a baseline that can be
 *   re-taken is not a baseline.
 * - `warnings` - re-write the CURRENT warnings golden and nothing else. This
 *   is the one collection that is deliberately re-captured, because the AAA
 *   surface exists in order to add warnings to it.
 *
 * There is deliberately no mode that re-writes the frozen four. Fixing a
 * golden mismatch by re-taking one of them would erase the only evidence that
 * the decoded model did not move, so the way to change one is to delete it in
 * a reviewed commit that says why, not to run a script.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  GOLDEN_FILES,
  GOLDEN_ROOT,
  aaaSegmentCount,
  corpus271,
  frozenCollections,
  projectCorpus,
  warningsCollection,
} from "../test/_helpers/eligibility-271-corpus.js";

function write(name: string, value: unknown): void {
  mkdirSync(GOLDEN_ROOT, { recursive: true });
  writeFileSync(join(GOLDEN_ROOT, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
  process.stdout.write(`wrote ${name}\n`);
}

function refuseOverwrite(name: string): void {
  if (!existsSync(join(GOLDEN_ROOT, name))) return;
  process.stderr.write(
    `refusing to overwrite ${name}: a baseline is captured once, on the unmodified tree.\n`,
  );
  process.exit(2);
}

const mode = process.argv[2];
const docs = corpus271();

if (mode === "baseline") {
  refuseOverwrite(GOLDEN_FILES.FROZEN_BASELINE);
  refuseOverwrite(GOLDEN_FILES.WARNINGS_BASELINE);
  refuseOverwrite(GOLDEN_FILES.AAA_PARTITION_BASELINE);
  write(GOLDEN_FILES.FROZEN_BASELINE, projectCorpus(docs, frozenCollections));
  write(GOLDEN_FILES.WARNINGS_BASELINE, projectCorpus(docs, warningsCollection));
  const partition: Record<string, number> = {};
  for (const doc of docs) partition[doc.id] = aaaSegmentCount(doc.tx);
  write(GOLDEN_FILES.AAA_PARTITION_BASELINE, partition);
} else if (mode === "warnings") {
  write(GOLDEN_FILES.WARNINGS_CURRENT, projectCorpus(docs, warningsCollection));
} else {
  process.stderr.write("usage: capture-271-goldens.ts baseline|warnings\n");
  process.exit(2);
}
