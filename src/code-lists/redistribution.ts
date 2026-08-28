/**
 * **Per-list redistribution terms and maintaining organisation for the bundled
 * code-list snapshots.** Every bundled list gets its OWN record here, because
 * the lists do not share an answer: the Claim Adjustment Reason Codes are
 * maintained by X12 and their descriptions require a purchased licence, while
 * the Remittance Advice Remark Codes are maintained by CMS and require none.
 * Answering both with one sentence hides a permission this package already has
 * and hides a restriction it must respect.
 *
 * **"Not established" is a recorded answer, not a placeholder.** Three bundled
 * lists are printed inside a purchased ASC X12 Technical Report Type 3 rather
 * than on the X12 External Code Lists index, and no source obtained for this
 * package names them or states whether their descriptions may be redistributed.
 * Their status is `"not-established"`, and
 * {@link "./meta.js".codeListRedistributionIsPermitted} answers `false` for it
 * exactly as it does for a licence-restricted list: an unsettled question is
 * never read as a permission.
 *
 * Every quotation below is from a source retrieved on the date beside it. The
 * quoted text is the licensor's own statement of its terms; no code
 * description from any of those sources is reproduced here.
 */

/**
 * What the recorded evidence says about redistributing a bundled list's
 * descriptions.
 *
 * - `"permitted"` - the maintainer publishes the list without a licence
 *   requirement, so the descriptions may be redistributed.
 * - `"licence-required"` - the maintainer requires a purchased licence or
 *   express permission before the descriptions may be reproduced.
 * - `"not-established"` - the sources obtained for this package do not settle
 *   it. This is a real answer and is treated as NOT redistributable.
 *
 * @example
 * ```ts
 * import { CARC, RARC } from "@cosyte/x12";
 * CARC.meta.redistribution?.status; // "licence-required"
 * RARC.meta.redistribution?.status; // "permitted"
 * ```
 */
export type CodeListRedistributionStatus = "permitted" | "licence-required" | "not-established";

/**
 * Whether a bundled snapshot is the whole published list or a cited part of
 * it. It is what tells a code the lookup does not know from a code the
 * publisher never issued: outside a `"cited-subset"` the absence means nothing,
 * and outside a `"complete-published-list"` it means the code is not in the
 * list at all.
 *
 * @example
 * ```ts
 * import { SERVICE_TYPE_CODES } from "@cosyte/x12";
 * SERVICE_TYPE_CODES.meta.completeness; // "cited-subset"
 * ```
 */
export type CodeListCompleteness = "complete-published-list" | "cited-subset";

/**
 * A bundled list's redistribution record: the status, the terms it was read
 * off, and the party who must be approached where the descriptions are not
 * free to redistribute.
 *
 * `approach` is `undefined` only where nobody needs to be asked, which is to
 * say only where `status` is `"permitted"`.
 *
 * @example
 * ```ts
 * import { CARC } from "@cosyte/x12";
 * CARC.meta.redistribution?.approach; // names ASC X12 and its licensing page
 * ```
 */
export interface CodeListRedistribution {
  /** What the evidence establishes, or that it establishes nothing. */
  readonly status: CodeListRedistributionStatus;
  /** The terms, quoted or cited from the source that carries them. */
  readonly terms: string;
  /** The licensor to approach, or `undefined` where none need be. */
  readonly approach: string | undefined;
}

/**
 * The route to ASC X12 for permission, quoted from the statement HL7's CARIN
 * Consumer Directed Payer Data Exchange guide reproduces alongside the X12
 * code systems it binds.
 *
 * The route is given as X12's published licensing page rather than as the
 * intellectual-property mailbox that page carries. A literal address here
 * would be a contact-shaped token inside a library whose commit gate refuses
 * those on sight, and declaring an exception would clear that whole domain on
 * every route forever, which is a security control traded for a convenience.
 * The page names the mailbox; this record names the page.
 *
 * @internal - shared by the snapshots that are not free to redistribute.
 */
export const X12_PERMISSION_ROUTE =
  'ASC X12, which publishes that "X12 is the only organization authorized to grant permission for use of X12 products". Permission to reproduce X12 intellectual property is requested through the licensing programme X12 publishes at https://x12.org/products/licensing-program, by email to the intellectual-property address given there, giving the requester\'s name, organisation and contact details, a detailed description of the artifact and of the X12 product underlying it, and a description of the intended audience and planned distribution (HL7 CARIN Consumer Directed Payer Data Exchange code system stubs, retrieved 2026-08-28).';

/**
 * X12's own copyright statement over its work products, and the route by which
 * subscriptions to its maintained code lists are bought.
 *
 * @internal
 */
const X12_COPYRIGHT =
  'The X12 External Code Lists index publishes that "All X12 work products are copyrighted. Any use of any X12 work product must be compliant with US Copyright laws and X12 Intellectual Property policies", and directs a buyer of an X12-maintained code list to the Code List Update Subscription page (https://x12.org/codes, retrieved 2026-08-28).';

/**
 * Terms for the **Claim Adjustment Reason Codes**. Two independent sources
 * agree: the maintainer's own index records the list as X12-maintained, and
 * HL7's CARIN terminology licensure page puts it among the code systems a
 * licence must be purchased for.
 *
 * @internal
 */
export const CARC_REDISTRIBUTION: CodeListRedistribution = Object.freeze({
  status: "licence-required",
  terms: `The X12 External Code Lists index records the Claim Adjustment Reason Codes as external code list 139, maintained by an X12 code maintenance committee group (https://x12.org/codes, retrieved 2026-08-28). HL7's CARIN Consumer Directed Payer Data Exchange terminology licensure page lists CARC, owned by X12, among code systems that "require implementers to purchase a license before the coded concepts can be used" (retrieved 2026-08-28). ${X12_COPYRIGHT}`,
  approach: X12_PERMISSION_ROUTE,
});

/**
 * Terms for the **Remittance Advice Remark Codes**. The one bundled list whose
 * descriptions the evidence says may be redistributed: X12's own index records
 * the maintainer as CMS rather than X12, and CARIN lists it under the code
 * systems that need no licence.
 *
 * @internal
 */
export const RARC_REDISTRIBUTION: CodeListRedistribution = Object.freeze({
  status: "permitted",
  terms:
    'The X12 External Code Lists index records the Remittance Advice Remark Codes as external code list 411, maintained by CMS rather than by X12 (https://x12.org/codes, retrieved 2026-08-28). HL7\'s CARIN Consumer Directed Payer Data Exchange terminology licensure page lists the RARC codes, owned by CMS, under "Code Systems Not Requiring Licenses" (retrieved 2026-08-28). No licence is required to redistribute these descriptions.',
  approach: undefined,
});

/**
 * Terms for the two claim-status lists, external code lists 507 and 508. The
 * maintainer's own index records both as X12-maintained committee lists, which
 * puts them under the copyright statement and the paid subscription route that
 * govern every X12-maintained list.
 *
 * @internal
 */
export const CLAIM_STATUS_REDISTRIBUTION: CodeListRedistribution = Object.freeze({
  status: "licence-required",
  terms: `The X12 External Code Lists index records the Claim Status Category Codes as external code list 507 and the Claim Status Codes as external code list 508, both maintained by an X12 code maintenance committee group (https://x12.org/codes, retrieved 2026-08-28). ${X12_COPYRIGHT} No source obtained for this package exempts either list from those terms, so their descriptions are treated the same way the Claim Adjustment Reason Codes are.`,
  approach: X12_PERMISSION_ROUTE,
});

/**
 * Terms for the lists printed inside a purchased Technical Report Type 3. NOT
 * ESTABLISHED, deliberately and on the record: the sources obtained for this
 * package do not name these lists at all, so neither a permission nor a
 * restriction can be read off them. They are treated as not redistributable,
 * which is what an unsettled question has to mean here.
 *
 * @internal
 */
export const X12_TR3_REDISTRIBUTION_NOT_ESTABLISHED: CodeListRedistribution = Object.freeze({
  status: "not-established",
  terms:
    "NOT ESTABLISHED. This list is printed inside a purchased ASC X12 Technical Report Type 3 rather than published on the X12 External Code Lists index, and no source obtained for this package names it or states whether its descriptions may be redistributed. Nothing here is a permission: the status is recorded as unsettled rather than assumed, and the list is treated as not redistributable wherever a permission decision is made. Settling it means asking the maintainer.",
  approach: X12_PERMISSION_ROUTE,
});
