/**
 * Regenerate the Phase 8 serializer golden files. For each canonical fixture
 * this writes `serializeX12(parseX12(fixture))` — the byte-faithful,
 * newline-free spec-clean emit — to `test/fixtures/golden/<name>.edi`. The
 * committed goldens are the LOCK: `test/serialize.test.ts` asserts the
 * serializer still reproduces them byte-for-byte, so any change to the emit
 * surface is a failing test with a reviewable diff.
 *
 * The goldens deliberately differ from their source fixtures: the canonical
 * fixtures are pretty-printed with `~\n` between segments and a trailing
 * newline, all of which the lenient parser silently normalizes away. The
 * golden is therefore the COMPACT canonical form — the idempotency fixed
 * point `serialize(parse(s)) === s`.
 *
 * Run from the package root:
 *   pnpm tsx test/scripts/gen-serialize-goldens.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseX12, serializeX12 } from "../../src/index.js";

import { SERIALIZE_GOLDEN_CASES } from "./serialize-golden-cases.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "..", "fixtures");
const goldenRoot = join(fixturesRoot, "golden");

mkdirSync(goldenRoot, { recursive: true });

for (const { name, fixture } of SERIALIZE_GOLDEN_CASES) {
  const raw = readFileSync(join(fixturesRoot, fixture), "utf8");
  const serialized = serializeX12(parseX12(raw));
  writeFileSync(join(goldenRoot, `${name}.edi`), serialized);
  process.stdout.write(`wrote golden/${name}.edi (${String(serialized.length)} bytes)\n`);
}
