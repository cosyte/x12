#!/usr/bin/env node
/**
 * Run one of the tools `@cosyte/process` owns, at the version it pins, with the arguments given.
 *
 *     node scripts/process-tool.mjs eslint examples --max-warnings=0
 *
 * Why this exists: `cosyte-process` runs its five verbs over this repository's own source, and the
 * tools behind them (tsup, vitest, eslint, prettier, tsc) are its dependencies, not this
 * repository's. `lint:examples` lints a second project, `examples/`, which only lints after a build
 * because each example imports the built package by name, so it cannot be folded into the `lint`
 * verb that CI runs before the build. This runs that one invocation through the same eslint the
 * `lint` verb runs, instead of a second, separately pinned copy that could drift from it.
 *
 * The tool's own exit status is this script's exit status.
 */
import { spawnSync } from "node:child_process";

import { resolveToolBin } from "@cosyte/process";

const [tool, ...args] = process.argv.slice(2);
if (tool === undefined) {
  console.error("process-tool: name a tool: tsup, vitest, eslint, prettier or tsc");
  process.exit(2);
}

const result = spawnSync(process.execPath, [resolveToolBin(tool), ...args], { stdio: "inherit" });
if (result.error !== undefined) {
  console.error(`process-tool: could not run ${tool}: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
