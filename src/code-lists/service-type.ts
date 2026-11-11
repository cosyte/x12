/**
 * **Service Type Code** (X12 element 1365, EB-03 / EQ-01). Identifies the
 * category of service or benefit a 270 inquires about and a 271 reports
 * eligibility for (`EB-03` in Loop 2110C/D). A repeating, `^`-separated
 * element - a single EB may list several service types under one benefit
 * statement. Misreading the service type silently re-scopes a coverage
 * answer (a dental answer read as a medical one).
 *
 * The list is ASC X12's external code list 958, carried in element 1365.
 * The full list is large (about 600 values). No source for the bundled code
 * values is recorded; they were not read from the 005010X279A1
 * implementation guide, which we did not read.
 *
 * **Initial bundled subset** covers common service types (plan-level,
 * professional, hospital, pharmacy, dental, vision, behavioral health).
 * Codes outside the subset still parse (the verbatim code is preserved on
 * the model).
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
import { SERVICE_TYPE_REDISTRIBUTION } from "./redistribution.js";

/**
 * Bundled Service Type Code (EB-03) snapshot. The 270 and 271 helpers read
 * it beside each verbatim service type code; it ships no description text.
 *
 * @example
 * ```ts
 * import { SERVICE_TYPE_CODES } from "@cosyte/x12";
 * Object.hasOwn(SERVICE_TYPE_CODES.codes, "30"); // true (bundled)
 * SERVICE_TYPE_CODES.codes["30"];                // undefined (no description ships)
 * SERVICE_TYPE_CODES.meta.redistribution?.status; // "licence-required"
 * ```
 */
export const SERVICE_TYPE_CODES: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "SERVICE-TYPE",
    description: "270/271 EB-03 Service Type Code (X12 external code source 1365)",
    source:
      "ASC X12 external code list 958, element 1365 (EB-03). No source for these code values is recorded; the 005010X279A1 implementation guide was not read.",
    publishedDate: "2008-08-01",
    snapshotDate: "2026-06-27",
    note: "Initial common subset; X12-maintained list (~600 codes) - refreshed with a package release, never at runtime.",
    maintainingOrganization: "ASC X12",
    redistribution: SERVICE_TYPE_REDISTRIBUTION,
    completeness: "cited-subset",
  }),
  codes: Object.freeze({
    "1": undefined,
    "30": undefined,
    "33": undefined,
    "35": undefined,
    "40": undefined,
    "42": undefined,
    "45": undefined,
    "47": undefined,
    "48": undefined,
    "50": undefined,
    "51": undefined,
    "52": undefined,
    "53": undefined,
    "60": undefined,
    "62": undefined,
    "65": undefined,
    "68": undefined,
    "73": undefined,
    "76": undefined,
    "78": undefined,
    "80": undefined,
    "81": undefined,
    "82": undefined,
    "86": undefined,
    "88": undefined,
    "93": undefined,
    "98": undefined,
    A4: undefined,
    A6: undefined,
    A7: undefined,
    A8: undefined,
    AD: undefined,
    AE: undefined,
    AF: undefined,
    AG: undefined,
    AL: undefined,
    BG: undefined,
    BH: undefined,
    MH: undefined,
    UC: undefined,
  }),
});

/**
 * Look up a Service Type Code (EB-03). A bundled code returns
 * `{ code, description: undefined }`, since this list ships no description
 * text; pass your own table as `options.descriptions` to fill it. Returns
 * `undefined` for a code outside the subset that your table does not
 * describe; the verbatim code is still preserved on the parsed benefit model.
 *
 * @example
 * ```ts
 * import { lookupServiceType } from "@cosyte/x12";
 * lookupServiceType("30");   // { code: "30", description: undefined }
 * lookupServiceType("30", { descriptions: { "30": "Made-up text" } })?.description; // "Made-up text"
 * lookupServiceType("ZZ");   // undefined (outside subset)
 * ```
 */
export const lookupServiceType: (
  code: string,
  options?: CodeListLookupOptions,
) => CodeListEntry | undefined = makeLookup(SERVICE_TYPE_CODES);
