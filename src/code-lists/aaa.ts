/**
 * **AAA request-validation code snapshots** for the 271 Health Care
 * Eligibility Benefit Response: the Reject Reason Code (`AAA-03`, X12 data
 * element 901) and the Follow-up Action Code (`AAA-04`, X12 data element 889).
 *
 * **BOTH SHIP EMPTY, AND THAT IS THE INTENDED STATE RATHER THAN A GAP.** An
 * inbound code is echoed verbatim onto the typed model whether or not a
 * description resolves, so an empty snapshot costs a consumer the human text
 * and nothing else. Descriptions written from memory, or lifted from a source
 * whose redistribution terms nobody recorded, would cost the consumer a
 * confident wrong reading, which is strictly worse than a missing one.
 *
 * **Every description in a snapshot here carries a FOUR-part provenance
 * record, in the artifact rather than in prose kept elsewhere:** the source
 * the entries were captured from, the capture date, the maintaining
 * organisation of the list, and the redistribution terms under which those
 * descriptions may ship inside the published package. That record is
 * ENFORCED, not documented: {@link bundleAaaCodes} refuses to bundle a single
 * description while any of the four is unestablished or while the terms do not
 * permit the bundling, so an incomplete record cannot ship a description even
 * if someone writes one into the table below.
 *
 * Neither of the two lists here clears that bar today:
 *
 * - No code-list source was obtained at all. The document that establishes the
 *   ELEMENT LAYOUT this snapshot is keyed on names each element and its data
 *   element number and publishes no code values, so there is nothing captured
 *   to describe.
 * - The maintaining organisation is ASC X12, whose published terms require
 *   permission for the use of its work products, so the terms as recorded do
 *   NOT permit bundling descriptions inside this package.
 *
 * These snapshots are deliberately absent from `pnpm refresh:code-lists`,
 * whose validator requires a non-empty list with non-empty descriptions. They
 * are also outside the uncleared redistribution-terms review that gates that
 * tool's `--fetch` mode: nothing here regenerates, re-licenses or reopens any
 * existing bundled list.
 */

import { makeLookup, type CodeListEntry } from "./meta.js";

/**
 * Provenance for a bundled AAA code list. The FOUR parts a shipped
 * description requires all live here, beside the codes they describe, so a
 * consumer or a conformance test can assert the record by reading the
 * artifact alone.
 *
 * `source` and `snapshotDate` are the source and the capture date, exposed the
 * way every other bundled snapshot exposes its own. `maintainingOrganization`
 * and `redistributionTerms` are `undefined` where that part could not be
 * established, which is a different statement from an empty string and is
 * meant to be read as one.
 *
 * @example
 * ```ts
 * import { AAA_REJECT_REASON_CODES } from "@cosyte/x12";
 * AAA_REJECT_REASON_CODES.meta.maintainingOrganization; // "ASC X12"
 * AAA_REJECT_REASON_CODES.meta.redistributionPermitsBundledDescriptions; // false
 * ```
 */
export interface AaaCodeListMeta {
  readonly id: string;
  readonly description: string;
  /** Part 1: the canonical source the entries were captured from. */
  readonly source: string;
  /** Part 2: the date this package captured the list. */
  readonly snapshotDate: string;
  /** Part 3: who maintains the list, or `undefined` where unestablished. */
  readonly maintainingOrganization: string | undefined;
  /** Part 4: the terms, quoted or cited, or `undefined` where unestablished. */
  readonly redistributionTerms: string | undefined;
  /**
   * Whether part 4, as recorded, permits these descriptions to ship inside
   * the published package. Recording terms is not the same as being allowed
   * to bundle under them, and this is the field that says which.
   */
  readonly redistributionPermitsBundledDescriptions: boolean;
}

/**
 * A bundled AAA code list: its four-part provenance record plus the codes it
 * was permitted to ship. `codes` is empty whenever the record is incomplete.
 *
 * @example
 * ```ts
 * import { AAA_FOLLOW_UP_ACTION_CODES } from "@cosyte/x12";
 * Object.keys(AAA_FOLLOW_UP_ACTION_CODES.codes).length; // 0
 * ```
 */
export interface AaaCodeListSnapshot {
  readonly meta: AaaCodeListMeta;
  readonly codes: Readonly<Record<string, string>>;
}

/**
 * True only when all FOUR provenance parts are established AND the terms as
 * recorded permit bundling. Exported so a consumer can apply the same bar to
 * a snapshot rather than re-deriving it.
 *
 * @example
 * ```ts
 * import { AAA_REJECT_REASON_CODES, aaaProvenanceIsComplete } from "@cosyte/x12";
 * aaaProvenanceIsComplete(AAA_REJECT_REASON_CODES.meta); // false
 * ```
 */
export function aaaProvenanceIsComplete(meta: AaaCodeListMeta): boolean {
  return (
    meta.source.length > 0 &&
    meta.snapshotDate.length > 0 &&
    meta.maintainingOrganization !== undefined &&
    meta.maintainingOrganization.length > 0 &&
    meta.redistributionTerms !== undefined &&
    meta.redistributionTerms.length > 0 &&
    meta.redistributionPermitsBundledDescriptions
  );
}

/**
 * Bundle `codes` under `meta`, DROPPING every description unless the
 * four-part record is complete and permits it. The refusal is the whole
 * point: a description cannot reach a consumer on the strength of terms
 * nobody recorded, however it got into the source table.
 *
 * @internal - exported for the two snapshots below and their tests.
 */
export function bundleAaaCodes(
  meta: AaaCodeListMeta,
  codes: Readonly<Record<string, string>>,
): AaaCodeListSnapshot {
  return Object.freeze({
    meta: Object.freeze({ ...meta }),
    codes: Object.freeze(aaaProvenanceIsComplete(meta) ? { ...codes } : {}),
  });
}

/**
 * The redistribution terms recorded for both lists, quoted from the statement
 * ASC X12 publishes about the use of its work products. Recorded as terms that
 * do NOT permit bundling: the quotation says permission is required, and no
 * permission has been obtained.
 *
 * @internal
 */
const X12_REDISTRIBUTION_TERMS =
  'ASC X12 publishes that "X12 is the only organization authorized to grant permission for use of X12 products" and that any use of an X12 work product must comply with US copyright law and X12 intellectual property policy. No such permission has been obtained for this package, so these descriptions are not bundled.';

/**
 * The element layout both lists are keyed on. It is reproduced by a
 * third-party EDI reference and is NOT the paid ASC X12 Technical Report Type
 * 3, which was not purchased. The reference names each element and its data
 * element number and publishes no code values, so it establishes the POSITION
 * and supplies no descriptions.
 *
 * The sha256 of the exact bytes read is carried with the URL so a reader can
 * tell whether the page they fetch is the page this snapshot was keyed on: a
 * URL alone names a moving target. The digest is of the retrieved document
 * itself; the document is third-party content and is not redistributed here.
 *
 * @internal
 */
const LAYOUT_REFERENCE =
  "Element layout reproduced by an EDI reference at https://www.stedi.com/edi/x12-005010/segment/AAA (retrieved 2026-08-22, 92094 bytes, sha256 0eb534233fd3099059fe765ada88ddef738e803d2812ca7b9a19c91afed13ba2). It names the element and its data element number and publishes no code values, so NO description source was obtained.";

/**
 * Bundled **AAA-03 Reject Reason Code** snapshot (X12 data element 901), for
 * the 271 request-validation surface. Ships EMPTY: no description source was
 * obtained, and the recorded redistribution terms do not permit bundling.
 * Every inbound reject reason code is echoed verbatim on the typed result with
 * its description absent.
 *
 * @example
 * ```ts
 * import { AAA_REJECT_REASON_CODES } from "@cosyte/x12";
 * AAA_REJECT_REASON_CODES.meta.id;          // "AAA-REJECT-REASON"
 * Object.keys(AAA_REJECT_REASON_CODES.codes).length; // 0
 * ```
 */
export const AAA_REJECT_REASON_CODES: AaaCodeListSnapshot = bundleAaaCodes(
  {
    id: "AAA-REJECT-REASON",
    description: "271 AAA-03 Reject Reason Code (X12 data element 901)",
    source: LAYOUT_REFERENCE,
    snapshotDate: "2026-08-22",
    maintainingOrganization: "ASC X12",
    redistributionTerms: X12_REDISTRIBUTION_TERMS,
    redistributionPermitsBundledDescriptions: false,
  },
  {},
);

/**
 * Bundled **AAA-04 Follow-up Action Code** snapshot (X12 data element 889),
 * for the 271 request-validation surface. Ships EMPTY on the same terms as
 * {@link AAA_REJECT_REASON_CODES}; every inbound follow-up action code is
 * echoed verbatim with its description absent.
 *
 * @example
 * ```ts
 * import { AAA_FOLLOW_UP_ACTION_CODES } from "@cosyte/x12";
 * AAA_FOLLOW_UP_ACTION_CODES.meta.id; // "AAA-FOLLOW-UP-ACTION"
 * ```
 */
export const AAA_FOLLOW_UP_ACTION_CODES: AaaCodeListSnapshot = bundleAaaCodes(
  {
    id: "AAA-FOLLOW-UP-ACTION",
    description: "271 AAA-04 Follow-up Action Code (X12 data element 889)",
    source: LAYOUT_REFERENCE,
    snapshotDate: "2026-08-22",
    maintainingOrganization: "ASC X12",
    redistributionTerms: X12_REDISTRIBUTION_TERMS,
    redistributionPermitsBundledDescriptions: false,
  },
  {},
);

/**
 * Look up an AAA-03 Reject Reason Code description. Returns `undefined` for
 * every code while the snapshot is empty, which is the fail-safe: the verbatim
 * inbound code is preserved on the typed result either way.
 *
 * @example
 * ```ts
 * import { lookupAaaRejectReason } from "@cosyte/x12";
 * lookupAaaRejectReason("42"); // undefined (snapshot ships empty)
 * ```
 */
export const lookupAaaRejectReason: (code: string) => CodeListEntry | undefined =
  makeLookup(AAA_REJECT_REASON_CODES);

/**
 * Look up an AAA-04 Follow-up Action Code description. Returns `undefined` for
 * every code while the snapshot is empty.
 *
 * @example
 * ```ts
 * import { lookupAaaFollowUpAction } from "@cosyte/x12";
 * lookupAaaFollowUpAction("C"); // undefined (snapshot ships empty)
 * ```
 */
export const lookupAaaFollowUpAction: (code: string) => CodeListEntry | undefined = makeLookup(
  AAA_FOLLOW_UP_ACTION_CODES,
);
