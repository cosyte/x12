/**
 * **Claim Status Code (CSC)** — X12 external code source 508. The second
 * component of an `STC-01` (and `STC-10` / `STC-11`) composite in a 277
 * Claim Status Response (`005010X212`) or 277CA Claim Acknowledgment
 * (`005010X214`). The CSC carries the *specific* status detail that
 * refines its paired {@link "./claim-status-category.js".
 * CLAIM_STATUS_CATEGORY_CODES} (CSCC) — e.g. category `A7`
 * (rejected/invalid) + status `21` ("Missing or invalid information").
 *
 * **Safety:** a wrong CSC silently misattributes *why* a claim was
 * rejected or pended, sending a provider's correction workflow down the
 * wrong path. The parser surfaces the verbatim CSC and the bundled
 * description (when known); a code outside the subset keeps its verbatim
 * value and emits `X12_UNKNOWN_CLAIM_STATUS`.
 *
 * Spec source: ASC X12 / Washington Publishing Company "Claim Status
 * Codes" (Code Source 508). The full list is large (~800 values) and
 * WPC-maintained; this snapshot bundles a common subset.
 */

import { makeLookup, type CodeListEntry, type CodeListSnapshot } from "./meta.js";

/**
 * Bundled Claim Status Code (CSC) snapshot. Used by the 277 and 277CA
 * helpers to surface a human-readable status alongside each verbatim CSC
 * parsed from an STC composite.
 *
 * @example
 * ```ts
 * import { CLAIM_STATUS_CODES } from "@cosyte/x12";
 * CLAIM_STATUS_CODES.codes["20"]; // "Accepted for processing."
 * CLAIM_STATUS_CODES.codes["21"]; // "Missing or invalid information."
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
    note: "Common subset; WPC-maintained list (~800 codes) refreshed on the Phase 10 release cadence, never at runtime.",
  }),
  codes: Object.freeze({
    "1": "For more detailed information, see remittance advice.",
    "2": "More detailed information in letter.",
    "3": "Claim has been adjudicated and is awaiting payment cycle.",
    "6": "Balance due from the subscriber.",
    "15": "One or more originally submitted procedure codes have been combined.",
    "16": "Claim/encounter has been forwarded to entity.",
    "19": "Entity acknowledges receipt of claim/encounter.",
    "20": "Accepted for processing.",
    "21": "Missing or invalid information.",
    "23": "Returned to Entity.",
    "24": "Entity not approved as an electronic submitter.",
    "25": "Entity not approved.",
    "33": "Claim/service spans multiple months.",
    "35": "Claim/encounter not found.",
    "37": "Predetermination is on file, awaiting completion of services.",
    "45": "Charges exceed your contracted/legislated fee arrangement.",
    "65": "Claim/line has been paid.",
    "85": "Claim/encounter has been forwarded by third party entity to entity.",
    "88": "Entity not eligible for benefits for submitted dates of service.",
    "97": "Patient eligibility not found with entity.",
    "101": "Claim was processed as adjustment to previous claim.",
    "107":
      "Processed according to contract provisions (Contract refers to provisions that exist between the Health Plan and a Provider of Health Care Services).",
    "187": "Date(s) of service.",
    "454": "Procedure code for services rendered.",
    "509": "Claim being researched for Insured ID/Group Policy Number error.",
  }),
});

/**
 * Look up a Claim Status Code (CSC) description from the bundled snapshot.
 * Returns `undefined` for codes outside the subset; the verbatim code is
 * always preserved on the parsed status model.
 *
 * @example
 * ```ts
 * import { lookupClaimStatus } from "@cosyte/x12";
 * lookupClaimStatus("20")?.description; // "Accepted for processing."
 * lookupClaimStatus("99999");           // undefined (outside subset)
 * ```
 */
export const lookupClaimStatus: (code: string) => CodeListEntry | undefined =
  makeLookup(CLAIM_STATUS_CODES);
