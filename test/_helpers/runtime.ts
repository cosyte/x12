/**
 * Where the suite runs, and how a test starts `tsx` so it starts on every system.
 *
 * CI runs the suite on Linux, Windows and macOS under Node, and on Linux under Bun and under Deno.
 * A test that cannot run on one of them is skipped there by name, with the reason beside the
 * skip, through the checks below.
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/**
 * True under Bun. Bun runs JavaScriptCore, whose own error messages (the text of a `TypeError` a
 * built-in raises) are worded differently from V8's, which Node and Deno run.
 */
export const IS_BUN = "Bun" in globalThis;

/** True on Windows. */
export const IS_WINDOWS = process.platform === "win32";

/**
 * True under Deno. The `deno` job takes Node off `PATH` and runs the suite with Deno alone, so a
 * test that starts Node, `tsx` (a Node command line that starts Node again with its loader) or a
 * Node-only command line cannot run there.
 */
export const IS_DENO = "Deno" in globalThis;

/**
 * tsx's own command-line entry file. `node_modules/.bin/tsx` is a shell script on Linux and macOS
 * and a `.cmd` file on Windows, which Node cannot start without a shell; the entry file is
 * JavaScript, which this Node starts on every system.
 */
export const TSX_CLI = join(dirname(require.resolve("tsx/package.json")), "dist", "cli.mjs");

/**
 * The command and arguments that run `args` under tsx: this Node, tsx's entry file, then `args`.
 * Pass them to `spawnSync` or `execFileSync` as they are, with no shell. Under Deno, where
 * `process.execPath` is Deno itself, it is the `.bin/tsx` shim, as before.
 *
 * @example
 * const [command, argv] = tsx(["scripts/phi-scan.ts", "--staged"]);
 * spawnSync(command, argv, { encoding: "utf8" });
 */
export function tsx(args: readonly string[]): [string, string[]] {
  if (IS_DENO) return [join(process.cwd(), "node_modules", ".bin", "tsx"), [...args]];
  return [process.execPath, [TSX_CLI, ...args]];
}
