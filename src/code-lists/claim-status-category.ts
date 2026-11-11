/**
 * **Claim Status Category Code (CSCC)** - X12 external code source 507.
 * The first component of an `STC-01` (and `STC-10` / `STC-11`) composite
 * in a 277 Claim Status Response (`005010X212`) or 277CA Claim
 * Acknowledgment (`005010X214`). The CSCC is the *category* of a claim's
 * status - acknowledged, pending, finalized, returned, error. Paired with
 * a {@link "./claim-status.js".CLAIM_STATUS_CODES} (CSC) that carries the
 * specific status detail.
 *
 * **Safety:** the CSCC `A`-family (`A1`..`A8`) distinguishes *accepted into
 * adjudication* (`A2`) from *rejected / returned unprocessable* (`A3`,
 * `A6`, `A7`, `A8`). Misreading a category flips a rejected claim to an
 * accepted one in a provider's follow-up workflow - a real
 * cash-flow / timely-filing hazard. The parser surfaces the verbatim CSCC
 * and never derives an accept/reject boolean (that interpretation belongs
 * to the consumer's business rules).
 *
 * The list is ASC X12's external code list 507, used by the 005010X212 and
 * 005010X214 transactions. It is updated a few times a year.
 *
 * **No description text ships.** This list's redistribution record is
 * `"licence-required"`, so the snapshot keeps the codes and the metadata and
 * maps every code to `undefined`. Pass your own descriptions to the lookup as
 * `options.descriptions`.
 */

import {
  makeLookup,
  type CodeListEntry,
  type CodeListLookupOptions,
  type CodeListSnapshot,
} from "./meta.js";
import { CLAIM_STATUS_REDISTRIBUTION } from "./redistribution.js";

/**
 * Bundled Claim Status Category Code (CSCC) snapshot. The 277 and 277CA
 * helpers read it to tell a known CSCC from an unknown one; it ships no
 * description text.
 *
 * @example
 * ```ts
 * import { CLAIM_STATUS_CATEGORY_CODES } from "@cosyte/x12";
 * Object.hasOwn(CLAIM_STATUS_CATEGORY_CODES.codes, "A2"); // true (bundled)
 * CLAIM_STATUS_CATEGORY_CODES.codes["A2"];                // undefined (no description ships)
 * CLAIM_STATUS_CATEGORY_CODES.meta.redistribution?.status; // "licence-required"
 * ```
 */
export const CLAIM_STATUS_CATEGORY_CODES: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "CLAIM-STATUS-CATEGORY",
    description: "277/277CA STC Claim Status Category Code (X12 external code source 507)",
    source:
      "ASC X12 / WPC Claim Status Category Codes (Code Source 507); referenced by TR3 005010X212 + 005010X214",
    publishedDate: "2023-11-01",
    snapshotDate: "2026-06-27",
    note: "Common A/P/F/D/E-family subset; WPC-maintained list refreshed with a package release, never at runtime.",
    maintainingOrganization: "ASC X12",
    redistribution: CLAIM_STATUS_REDISTRIBUTION,
    completeness: "cited-subset",
  }),
  codes: Object.freeze({
    A0: undefined,
    A1: undefined,
    A2: undefined,
    A3: undefined,
    A4: undefined,
    A5: undefined,
    A6: undefined,
    A7: undefined,
    A8: undefined,
    D0: undefined,
    E0: undefined,
    E1: undefined,
    E2: undefined,
    E3: undefined,
    E4: undefined,
    F0: undefined,
    F1: undefined,
    F2: undefined,
    F3: undefined,
    F3F: undefined,
    F4: undefined,
    P0: undefined,
    P1: undefined,
    P2: undefined,
    P3: undefined,
    P4: undefined,
    P5: undefined,
    R0: undefined,
    R1: undefined,
  }),
});

/**
 * Look up a Claim Status Category Code (CSCC). A bundled code returns
 * `{ code, description: undefined }`, since this list ships no description
 * text; pass your own table as `options.descriptions` to fill it. Returns
 * `undefined` for a code outside the subset that your table does not
 * describe; the verbatim code is always preserved on the parsed status model.
 *
 * @example
 * ```ts
 * import { lookupClaimStatusCategory } from "@cosyte/x12";
 * lookupClaimStatusCategory("A2");   // { code: "A2", description: undefined }
 * lookupClaimStatusCategory("A2", { descriptions: { A2: "Made-up text" } })?.description; // "Made-up text"
 * lookupClaimStatusCategory("ZZ");   // undefined (outside subset)
 * ```
 */
export const lookupClaimStatusCategory: (
  code: string,
  options?: CodeListLookupOptions,
) => CodeListEntry | undefined = makeLookup(CLAIM_STATUS_CATEGORY_CODES);
