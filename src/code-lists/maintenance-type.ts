/**
 * **INS-03 - Maintenance Type Code** (X12 Code Source 875). Lives on
 * `INS-03` of every 834 member-level detail loop (and is echoed on
 * `HD-01` for each health-coverage loop); identifies what the enrollment
 * transaction *does to the member* - add, change, terminate, reinstate,
 * audit. This is the safety-critical field of the 834: misreading a
 * termination (`024`) as a change (`001`) leaves a member enrolled who the
 * sponsor dropped, or drops a member the sponsor kept. The verbatim code
 * is ALWAYS preserved; the bundled description is a convenience only.
 *
 * Spec source: WPC TR3 `005010X220A1` - Benefit Enrollment and Maintenance
 * (834), Element `INS-03` (Code Source 875). The HIPAA-relevant subset is
 * small and stable.
 */

import { makeLookup, type CodeListEntry, type CodeListSnapshot } from "./meta.js";

/**
 * Bundled INS-03 (Maintenance Type) snapshot. Used by the 834 helper to
 * surface a human-readable description alongside the verbatim maintenance
 * code, and to drive the `X12_834_UNKNOWN_MAINTENANCE_TYPE` warning when a
 * code falls outside this set.
 *
 * @example
 * ```ts
 * import { MAINTENANCE_TYPE_CODES } from "@cosyte/x12";
 * MAINTENANCE_TYPE_CODES.codes["021"]; // "Addition"
 * MAINTENANCE_TYPE_CODES.codes["024"]; // "Cancellation or Termination"
 * ```
 */
export const MAINTENANCE_TYPE_CODES: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "MAINTENANCE-TYPE",
    description: "834 INS-03 Maintenance Type Code (X12 Code Source 875)",
    source: "WPC TR3 005010X220A1 §INS Member Level Detail, Element INS-03 (Code Source 875)",
    publishedDate: "2010-04-01",
    snapshotDate: "2026-06-28",
    note: "HIPAA-relevant subset; X12-internal list - codes are stable.",
  }),
  codes: Object.freeze({
    "001": "Change",
    "002": "Delete",
    "003": "Reinstatement",
    "004": "Add (Loop 2000)",
    "021": "Addition",
    "024": "Cancellation or Termination",
    "025": "Reinstatement",
    "026": "Recertification",
    "030": "Audit or Compare",
  }),
});

/**
 * Look up an INS-03 maintenance type code's bundled description. Returns
 * `undefined` for codes outside the subset; the verbatim code is still
 * preserved on the parsed enrollment, and the 834 helper raises an
 * `X12_834_UNKNOWN_MAINTENANCE_TYPE` warning so a consumer never silently
 * mis-applies an unknown action.
 *
 * @example
 * ```ts
 * import { lookupMaintenanceType } from "@cosyte/x12";
 * lookupMaintenanceType("024")?.description; // "Cancellation or Termination"
 * lookupMaintenanceType("999");              // undefined (outside subset)
 * ```
 */
export const lookupMaintenanceType: (code: string) => CodeListEntry | undefined =
  makeLookup(MAINTENANCE_TYPE_CODES);
