/**
 * `buildTA1` — pure-function builder for an envelope-level TA1 Interchange
 * Acknowledgment. PURE FUNCTION; NEVER auto-sends. The library mechanically
 * builds the disposition it is told; an `A` ack code paired with a note
 * other than `000` (no error) is REFUSED via `AckBuildError` — the same
 * safety invariant as `build999`.
 *
 * Returns the typed {@link Ta1Segment} (matching the envelope-level shape
 * the Phase 3 envelope walker surfaces on
 * {@link "../../parser/types.js".X12Interchange.ta1Segments}). Callers that
 * want a complete on-the-wire byte stream concatenate `raw` + a segment
 * terminator, or wrap the segment inside their preferred envelope. The
 * library does NOT silently invent envelope bytes around it — the caller's
 * application boundary owns whether the TA1 is embedded in an outbound
 * interchange or sent as a standalone TA1-only interchange.
 */

import type { Ta1Segment } from "../../parser/types.js";

import { TA1_ACK_CODES, type Ta1AckCode, type Ta1NoteCode } from "./codes.js";
import { ACK_BUILD_ERROR_CODES, AckBuildError } from "./errors.js";
import type { BuildTA1Spec } from "./types.js";

/**
 * `buildTA1` — assemble a TA1 Interchange Acknowledgment segment from the
 * supplied spec. The returned {@link Ta1Segment} carries the 1-indexed
 * 5-element value array (`elements[0]` = `"TA1"`, `elements[1]` =
 * TA1-01, …, `elements[5]` = TA1-05) plus the verbatim wire text on `raw`
 * (no segment terminator appended — that's the envelope's job).
 *
 * Safety guards (refused via {@link AckBuildError}):
 *
 * - `ackCode === "A"` paired with `noteCode !== "000"` →
 *   {@link "./errors.js".ACK_BUILD_ERROR_CODES.X12_TA1_ACCEPT_WITH_NOTE}.
 *   Accept must mean accept. Use `E` (accept with errors) when the
 *   inbound had structural defects you elected to ignore.
 *
 * @param spec - The TA1 fields. `interchangeControlNumber` echoes the
 *               inbound ISA-13; `interchangeDate` / `interchangeTime` echo
 *               the inbound ISA-09 / ISA-10; `ackCode` is the disposition;
 *               `noteCode` is the note (`000` for no-error pairings).
 * @param options - Optional delimiter overrides for callers building TA1
 *                  segments embedded in non-default envelopes. The
 *                  defaults match the cosyte parser archetype (`*` element,
 *                  `~` segment) — override when wrapping a TA1 in an ISA
 *                  envelope whose declared delimiters differ.
 *
 * @example
 * ```ts
 * import { buildTA1 } from "@cosyte/x12";
 *
 * // Accept (canonical "no error" pairing).
 * const ok = buildTA1({
 *   interchangeControlNumber: "000000001",
 *   interchangeDate: "250101",
 *   interchangeTime: "1200",
 *   ackCode: "A",
 *   noteCode: "000",
 * });
 * ok.raw; // 'TA1*000000001*250101*1200*A*000'
 *
 * // Reject (control number mismatch).
 * const reject = buildTA1({
 *   interchangeControlNumber: "000000007",
 *   interchangeDate: "250101",
 *   interchangeTime: "1200",
 *   ackCode: "R",
 *   noteCode: "001",
 * });
 * ```
 */
export function buildTA1(spec: BuildTA1Spec, options: BuildTA1Options = {}): Ta1Segment {
  enforceAcceptIsClean(spec);

  const elementSeparator = options.elementSeparator ?? "*";

  const elements: readonly string[] = Object.freeze([
    "TA1",
    spec.interchangeControlNumber,
    spec.interchangeDate,
    spec.interchangeTime,
    spec.ackCode,
    spec.noteCode,
  ]);
  const raw = elements.join(elementSeparator);
  return Object.freeze({ raw, elements });
}

/**
 * Options accepted by {@link buildTA1}. Both fields are optional — pass
 * none for the cosyte default envelope (`*` element separator). Override
 * only when the TA1 is being embedded in an outer envelope whose declared
 * delimiters differ from the cosyte default.
 */
export interface BuildTA1Options {
  readonly elementSeparator?: string;
}

/**
 * Refuse a fabricated `A` (accept) paired with a non-`000` note code.
 *
 * @internal
 */
function enforceAcceptIsClean(spec: BuildTA1Spec): void {
  if (spec.ackCode === TA1_ACK_CODES.A && spec.noteCode !== "000") {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_TA1_ACCEPT_WITH_NOTE,
      `buildTA1: TA1-04 was "A" (Accept) but TA1-05 carried note "${spec.noteCode}". An accept must cite "000" (no error). Use ackCode "E" (accept, errors noted) when the inbound had defects you elected to ignore.`,
    );
  }
}

// Type-only re-exports for callers wanting just the TA1 surface.
export type { Ta1AckCode, Ta1NoteCode };
