/**
 * **Service Type Code** (X12 element 1365, EB-03 / EQ-01). Identifies the
 * category of service or benefit a 270 inquires about and a 271 reports
 * eligibility for (`EB-03` in Loop 2110C/D). A repeating, `^`-separated
 * element - a single EB may list several service types under one benefit
 * statement. Misreading the service type silently re-scopes a coverage
 * answer (e.g. "active coverage for Dental" read as "Medical").
 *
 * Spec source: ASC X12 005010X279A1 TR3 §"EB Eligibility or Benefit
 * Information", Element `EB-03` (Code Source: X12 external 1365 - Service
 * Type Code). The full list is large (~600 values) and X12-maintained.
 *
 * **Initial bundled subset** covers the most common service types seen in
 * real 270/271 traffic (plan-level, professional, hospital, pharmacy,
 * dental, vision, behavioral health). Codes outside the subset still parse
 * (the verbatim code is preserved on the model); only the human-readable
 * description is absent.
 */

import { makeLookup, type CodeListEntry, type CodeListSnapshot } from "./meta.js";

/**
 * Bundled Service Type Code (EB-03) snapshot. Used by the 271 helper to
 * surface a human-readable description alongside each verbatim service
 * type code under an eligibility/benefit statement.
 *
 * @example
 * ```ts
 * import { SERVICE_TYPE_CODES } from "@cosyte/x12";
 * SERVICE_TYPE_CODES.codes["30"]; // "Health Benefit Plan Coverage"
 * SERVICE_TYPE_CODES.codes["88"]; // "Pharmacy"
 * ```
 */
export const SERVICE_TYPE_CODES: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "SERVICE-TYPE",
    description: "270/271 EB-03 Service Type Code (X12 external code source 1365)",
    source:
      "ASC X12 005010X279A1 TR3 §EB Eligibility or Benefit Information, Element EB-03 (Code Source 1365)",
    publishedDate: "2008-08-01",
    snapshotDate: "2026-06-27",
    note: "Initial common subset; X12-maintained list (~600 codes) - refreshed on the Phase 10 release cadence, never at runtime.",
  }),
  codes: Object.freeze({
    "1": "Medical Care",
    "30": "Health Benefit Plan Coverage",
    "33": "Chiropractic",
    "35": "Dental Care",
    "40": "Oral Surgery",
    "42": "Home Health Care",
    "45": "Hospice",
    "47": "Hospital",
    "48": "Hospital - Inpatient",
    "50": "Hospital - Outpatient",
    "51": "Hospital - Emergency Accident",
    "52": "Hospital - Emergency Medical",
    "53": "Hospital - Ambulatory Surgical",
    "60": "General Benefits",
    "62": "MRI/CAT Scan",
    "65": "Newborn Care",
    "68": "Well Baby Care",
    "73": "Diagnostic Medical",
    "76": "Dialysis",
    "78": "Chemotherapy",
    "80": "Immunizations",
    "81": "Routine Physical",
    "82": "Family Planning",
    "86": "Emergency Services",
    "88": "Pharmacy",
    "93": "Podiatry",
    "98": "Professional (Physician) Visit - Office",
    A4: "Psychiatric",
    A6: "Psychotherapy",
    A7: "Psychiatric - Inpatient",
    A8: "Psychiatric - Outpatient",
    AD: "Occupational Therapy",
    AE: "Physical Medicine",
    AF: "Speech Therapy",
    AG: "Skilled Nursing Care",
    AL: "Vision (Optometry)",
    BG: "Cardiac Rehabilitation",
    BH: "Pediatric",
    MH: "Mental Health",
    UC: "Urgent Care",
  }),
});

/**
 * Look up a Service Type Code (EB-03) description from the bundled
 * snapshot. Returns `undefined` for codes outside the initial subset; the
 * verbatim code is still preserved on the parsed benefit model.
 *
 * @example
 * ```ts
 * import { lookupServiceType } from "@cosyte/x12";
 * lookupServiceType("30")?.description; // "Health Benefit Plan Coverage"
 * lookupServiceType("ZZ");              // undefined (outside subset)
 * ```
 */
export const lookupServiceType: (code: string) => CodeListEntry | undefined =
  makeLookup(SERVICE_TYPE_CODES);
