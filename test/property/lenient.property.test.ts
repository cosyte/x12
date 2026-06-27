/**
 * Property tests for the Postel's-Law PARSE side: liberal in what we accept.
 *
 * Contract (parser/index.ts + errors.ts): in lenient mode `parseX12` may
 * throw ONLY an `X12ParseError` carrying one of the four Tier-3 fatal codes
 * (`X12_EMPTY_INPUT`, `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`,
 * `X12_INVALID_DELIMITERS`). Every other deviation — vendor quirks,
 * truncation, weird delimiters, unknown segments, extra fields, random bytes —
 * must be recovered into `ix.warnings`, never thrown.
 *
 * Additional invariants on the warnings themselves:
 *   - every `warning.code` is a member of the public `WARNING_CODES` set
 *     (no ad-hoc / unregistered codes leak out);
 *   - every warning carries positional context (`position.segmentIndex` is
 *     a finite number).
 *
 * Wires the parser into `@cosyte/test-utils`' `lenientNeverThrowsProperty`
 * runner so the invariant is shared across the suite.
 */

import { describe, it } from "vitest";

import { lenientNeverThrowsProperty, type LenientWarning } from "@cosyte/test-utils";

import {
  FATAL_CODES,
  parseX12,
  WARNING_CODES,
  X12ParseError,
  type X12ParseWarning,
} from "../../src/index.js";

import { hostileInput } from "./_arbitraries.js";

const FATAL_CODE_SET: ReadonlySet<string> = new Set(Object.values(FATAL_CODES));
const WARNING_CODE_SET: ReadonlySet<string> = new Set(Object.values(WARNING_CODES));

describe("Postel's Law (parse): lenient mode never throws outside the 4 Tier-3 fatals", () => {
  it("hostile input → only sanctioned X12ParseError fatals may throw", () => {
    lenientNeverThrowsProperty({
      arbitrary: hostileInput,
      parse: (raw: string) => parseX12(raw),
      isFatal: (err) => err instanceof X12ParseError && FATAL_CODE_SET.has(err.code),
      getWarnings: (ix): readonly LenientWarning[] => {
        const interchange = ix as { warnings: readonly X12ParseWarning[] };
        return interchange.warnings;
      },
      isKnownCode: (code) => WARNING_CODE_SET.has(code),
      hasPositionalContext: (w) => {
        const pos = (w as { position?: { segmentIndex?: unknown } }).position;
        return typeof pos === "object" && pos !== null && typeof pos.segmentIndex === "number";
      },
      numRuns: 500,
    });
  });
});
