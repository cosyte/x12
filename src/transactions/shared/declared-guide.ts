/**
 * The declared-guide check every typed reader runs after its own ST-01 gate:
 * which implementation guide a transaction set declares, and whether the
 * reader handed it implements that guide.
 *
 * **What is declared.** ST-03, decoded exactly as the readers publish
 * `implementationConventionReference` (through {@link decodeSt03}, so a
 * release escape is resolved). Where ST-03 is absent (the ST has no third
 * element) or decodes to `""`, GS-08 of the functional group that framed the
 * transaction set, decoded the same way. Where GS-08 is absent or empty too,
 * or no group header reached the transaction set at all, nothing is declared.
 * Nothing is trimmed, case-folded or prefix-matched, so a whitespace-only
 * declaration is non-empty and is compared as it stands. Where ST-03 is
 * non-empty it alone decides and GS-08 is never read, so a disagreement
 * between the two is not reconciled here.
 *
 * **What is implemented.** Derived from `X12_TR3_CONFORMANCE` and never kept
 * as a second list: for the rows of one transaction that carry `read` and a
 * non-null `tr3`, that `tr3` plus every `cfrAdopted` entry. A caller may add
 * identifiers it already resolves by declaration (the 837 adds the keys of its
 * variant table), which is the only extension.
 *
 * **Membership is a `Set`.** The declaration is document bytes, and a plain
 * object keyed by them resolves every own property of `Object.prototype`
 * truthy (see `../../parser/lookup.ts`); `Set.prototype.has` consults no
 * prototype chain, so `constructor` or `__proto__` is simply not a member.
 *
 * **It decides only what is WARNED.** Every keyed decision a reader already
 * takes on the raw ST-03 text (the 837 variant, the 277 claim acknowledgment
 * discriminator and admission) is left to that reader, unmoved.
 *
 * @internal
 */

import { X12_TR3_CONFORMANCE } from "../../conformance/tr3.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import {
  guideNotDeclared,
  guideNotImplemented,
  type X12ParseWarning,
} from "../../parser/warnings.js";
import { decodeSt03 } from "./st03.js";

/**
 * The ST, transaction-relative, which is where every reader anchors this
 * check. No `elementIndex`: the declaration may have come from GS-08, or from
 * nowhere, so naming an ST element would point at a slot that did not decide.
 * @internal
 */
const ST_POSITION: X12Position = Object.freeze({ segmentIndex: 0, transactionIndex: 0 });

/**
 * The guides a reader implements, derived from `X12_TR3_CONFORMANCE`: for
 * every row whose `transaction` is `transaction` (and, where `variant` is
 * given, whose `variant` is that value; `null` selects the row that has no
 * variant) with `read` among its directions and a non-null `tr3`, the `tr3`
 * and every `cfrAdopted` entry, plus `extra`.
 *
 * @example
 * ```ts
 * // implementedGuides("835") holds "005010X221A1" and "005010X221".
 * // implementedGuides("277", null) holds the claim status row's guides alone.
 * ```
 *
 * @internal
 */
export function implementedGuides(
  transaction: string,
  variant?: string | null,
  extra: Iterable<string> = [],
): ReadonlySet<string> {
  const guides = new Set<string>();
  for (const row of X12_TR3_CONFORMANCE) {
    if (row.transaction !== transaction) continue;
    if (variant !== undefined && row.variant !== variant) continue;
    if (!row.directions.includes("read") || row.tr3 === null) continue;
    guides.add(row.tr3);
    for (const adopted of row.cfrAdopted) guides.add(adopted);
  }
  for (const identifier of extra) guides.add(identifier);
  return guides;
}

/**
 * The guide a transaction set declares, per the module comment: decoded ST-03
 * where it is non-empty, else decoded GS-08 where that is non-empty, else
 * `undefined`.
 *
 * @example
 * ```ts
 * // ST*835*0001*005010X221A1 declares "005010X221A1", whatever GS-08 says.
 * // ST*835*0001 under GS-08 005010X221A1 declares "005010X221A1".
 * // ST*835*0001* under an empty GS-08 declares nothing (undefined).
 * ```
 *
 * @internal
 */
export function declaredGuide(delimiters: Delimiters, tx: X12TransactionSet): string | undefined {
  const st03 = decodeSt03(tx.st.elements[3], delimiters, ST_POSITION);
  if (st03 !== undefined && st03 !== "") return st03;
  // GS-08 is decoded by the same function ST-03 is: both are envelope element
  // text framed by the same release-aware split, raw and pre-unescape.
  const gs08 = decodeSt03(tx.gs?.elements[8], delimiters, ST_POSITION);
  if (gs08 !== undefined && gs08 !== "") return gs08;
  return undefined;
}

/**
 * The one guide warning a reader raises for `tx`, or `undefined` where the
 * declared guide is in `implemented`. `X12_GUIDE_NOT_DECLARED` where nothing
 * is declared, `X12_GUIDE_NOT_IMPLEMENTED` where something is and it is not a
 * member. Both are anchored at the ST and neither carries the declared value.
 *
 * @example
 * ```ts
 * // const w = declaredGuideWarning(delimiters, tx, implementedGuides("835"));
 * // w === undefined where ST-03 reads 005010X221A1.
 * ```
 *
 * @internal
 */
export function declaredGuideWarning(
  delimiters: Delimiters,
  tx: X12TransactionSet,
  implemented: ReadonlySet<string>,
): X12ParseWarning | undefined {
  const declared = declaredGuide(delimiters, tx);
  if (declared === undefined) return guideNotDeclared(ST_POSITION);
  if (implemented.has(declared)) return undefined;
  return guideNotImplemented(ST_POSITION);
}
