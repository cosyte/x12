/**
 * Snapshot-integrity test for the bundled X12 code-list snapshots.
 *
 * `scripts/refresh-code-lists.ts` is the release-event tool that validates
 * (and, at release time under `--fetch`, regenerates) the bundled snapshots.
 * Its validator runs here on every `pnpm test` so a malformed snapshot — a
 * bad ISO date in `meta`, an empty description, a whitespace-variant duplicate
 * code — fails CI immediately, not only when a human runs the CLI before a
 * release. A stale snapshot is fine (it yields a missing description, never a
 * wrong code); a *malformed* one is a bug.
 */

import { describe, it, expect } from "vitest";

import { validateCodeLists } from "../../scripts/refresh-code-lists.js";

describe("bundled code-list snapshots are well-formed", () => {
  it("every snapshot passes the refresh-code-lists validator", () => {
    expect(validateCodeLists()).toEqual([]);
  });
});
