/**
 * **Claim Status Code (CSC)** - X12 external code source 508. The second
 * component of an `STC-01` (and `STC-10` / `STC-11`) composite in a 277
 * Claim Status Response (`005010X212`) or 277CA Claim Acknowledgment
 * (`005010X214`). The CSC carries the *specific* status detail that
 * refines its paired {@link "./claim-status-category.js".
 * CLAIM_STATUS_CATEGORY_CODES} (CSCC).
 *
 * **Safety:** a wrong CSC silently misattributes *why* a claim was
 * rejected or pended, sending a provider's correction workflow down the
 * wrong path. The parser surfaces the verbatim CSC; a code outside the
 * subset keeps its verbatim value and emits `X12_UNKNOWN_CLAIM_STATUS`.
 *
 * The list is ASC X12's external code list 508. The full list is large
 * (about 800 values); this snapshot bundles a common subset of the codes.
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
 * Bundled Claim Status Code (CSC) snapshot. The 277 and 277CA helpers read
 * it to tell a known CSC from an unknown one; it ships no description text.
 *
 * @example
 * ```ts
 * import { CLAIM_STATUS_CODES } from "@cosyte/x12";
 * Object.hasOwn(CLAIM_STATUS_CODES.codes, "20"); // true (bundled)
 * CLAIM_STATUS_CODES.codes["20"];                // undefined (no description ships)
 * CLAIM_STATUS_CODES.meta.redistribution?.status; // "licence-required"
 * ```
 */
export const CLAIM_STATUS_CODES: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "CLAIM-STATUS",
    description: "277/277CA STC Claim Status Code (X12 external code source 508)",
    source:
      "ASC X12 / WPC Claim Status Codes (Code Source 508); referenced by TR3 005010X212 + 005010X214",
    publishedDate: "2023-11-01",
    snapshotDate: "2026-06-27",
    note: "Common subset; WPC-maintained list (~800 codes) refreshed with a package release, never at runtime.",
    maintainingOrganization: "ASC X12",
    redistribution: CLAIM_STATUS_REDISTRIBUTION,
    completeness: "cited-subset",
  }),
  codes: Object.freeze({
    "1": undefined,
    "2": undefined,
    "3": undefined,
    "6": undefined,
    "15": undefined,
    "16": undefined,
    "19": undefined,
    "20": undefined,
    "21": undefined,
    "23": undefined,
    "24": undefined,
    "25": undefined,
    "33": undefined,
    "35": undefined,
    "37": undefined,
    "45": undefined,
    "65": undefined,
    "85": undefined,
    "88": undefined,
    "97": undefined,
    "101": undefined,
    "107": undefined,
    "187": undefined,
    "454": undefined,
    "509": undefined,
  }),
});

/**
 * Look up a Claim Status Code (CSC). A bundled code returns
 * `{ code, description: undefined }`, since this list ships no description
 * text; pass your own table as `options.descriptions` to fill it. Returns
 * `undefined` for a code outside the subset that your table does not
 * describe; the verbatim code is always preserved on the parsed status model.
 *
 * @example
 * ```ts
 * import { lookupClaimStatus } from "@cosyte/x12";
 * lookupClaimStatus("20");              // { code: "20", description: undefined }
 * lookupClaimStatus("20", { descriptions: { "20": "Made-up text" } })?.description; // "Made-up text"
 * lookupClaimStatus("99999");           // undefined (outside subset)
 * ```
 */
export const lookupClaimStatus: (
  code: string,
  options?: CodeListLookupOptions,
) => CodeListEntry | undefined = makeLookup(CLAIM_STATUS_CODES);
