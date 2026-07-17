import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { beforeAll } from "vitest";

import { docSnippetSuite } from "@cosyte/vitest-config/snippets";

/**
 * Doc/code-agreement gate. Every ```` ```ts runnable ```` block in `docs-content/` is extracted,
 * compiled, and executed, and its inline `// =>` assertions are checked — so a documented example
 * can never silently drift from the shipped code (the documentation analog of the parser conformance
 * runners). Blocks tagged ` ```ts runnable throws ` must throw; plain ` ```ts ` blocks are
 * illustrative and are not executed.
 *
 * `@cosyte/x12` ships a single top-level entry, so every snippet imports `@cosyte/x12` and resolves
 * against the **built** ESM artifact — exactly what an installer loads, not the source tree. The
 * runnable blocks stay on the deterministic, in-process readers / builders (`parseX12`, `get835`,
 * `build271`, `parse999`, …); nothing here opens a socket or reads a real feed, and every EDI fixture
 * is synthetic.
 *
 * The shared CI gate runs `test` before `build`, so we provision `dist/` on demand here rather than
 * assuming order.
 */
const root = join(import.meta.dirname, "..");

/** Map the published entry point to its built ESM artifact. */
const ENTRY = join(root, "dist", "index.mjs");

beforeAll(() => {
  execFileSync("pnpm", ["build"], { cwd: root, stdio: "inherit" });
}, 120_000);

docSnippetSuite({
  docsDir: join(root, "docs-content"),
  resolve: (specifier) => (specifier === "@cosyte/x12" ? ENTRY : undefined),
});
