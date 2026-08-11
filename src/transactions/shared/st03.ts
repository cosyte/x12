/**
 * `ST-03` (implementation convention reference) decoding, shared by the typed
 * readers that publish it.
 *
 * `X12TransactionSet.st.elements` is the ST segment as framed: post-element-
 * split and PRE-`?`-unescape. A reader that hands one of those strings
 * straight to a consumer publishes the ESCAPE rather than the value the sender
 * stated - the defect a later release corrected in `parseTA1`, on the
 * ground that every dot-path read in this package already unescapes and so
 * does `parse999`, on `AK2-03`, which is the identically-named field in a
 * sibling reader in this same tree.
 *
 * **This module decodes what is PUBLISHED and nothing that is KEYED.** Each
 * caller's own comment records what it keys on and what moving that key would
 * cost; the callers deliberately still look up `ST-03` in their tables with
 * the raw text.
 *
 * @internal
 */

import { unescapeRelease } from "../../parser/release.js";
import type { Delimiters, X12Position } from "../../parser/types.js";
import type { X12ParseWarning } from "../../parser/warnings.js";

/**
 * The warning sink for the decode below.
 *
 * A dangling `?` at the end of an element raises `X12_DANGLING_RELEASE_CHAR`
 * when it is read through a dot-path with a sink supplied. It is dropped here,
 * and the ground is consistency inside the readers themselves rather than an
 * absent channel: `getSegmentValue` defaults its sink to a no-op, so every
 * other element these readers decode - through `elementValue`,
 * `elementOptional` and `componentOptional`, none of which forwards a sink -
 * drops the same warning. Forwarding one here would make `ST-03` the single
 * element in the reader that reports it. `parseTA1` and `parse999` drop it
 * too. It is disclosed in `KNOWN-LIMITATIONS.md` and open, not absorbed here.
 *
 * @internal
 */
const noopWarningSink = (_w: X12ParseWarning): void => {
  /* see the note above: no element read by these readers forwards a sink */
};

/**
 * Decode the framed `ST-03` text. `undefined` in, `undefined` out - an ST
 * segment with no third element has no reference, and that is distinct from
 * one carrying `""`, which each caller maps on its own existing terms.
 *
 * @example
 * ```ts
 * import type { Delimiters } from "@cosyte/x12";
 * declare const d: Delimiters; // { element: "*", repetition: "^", component: ":", segment: "~" }
 * // decodeSt03("005010X2?*22A1", d) === "005010X2*22A1"
 * ```
 *
 * @internal
 */
export function decodeSt03(
  raw: string | undefined,
  delimiters: Delimiters,
  position: X12Position,
): string | undefined {
  if (raw === undefined) return undefined;
  return unescapeRelease(raw, delimiters, noopWarningSink, position);
}
