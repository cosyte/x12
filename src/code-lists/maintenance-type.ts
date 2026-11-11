/**
 * **INS-03 - Maintenance Type Code** (X12 Code Source 875). Lives on
 * `INS-03` of every 834 member-level detail loop (and is echoed on
 * `HD-01` for each health-coverage loop); identifies what the enrollment
 * transaction *does to the member* - add, change, terminate, reinstate,
 * audit. This is the safety-critical field of the 834: misreading a
 * termination (`024`) as a change (`001`) leaves a member enrolled who the
 * sponsor dropped, or drops a member the sponsor kept. The verbatim code
 * is ALWAYS preserved.
 *
 * The list is X12 Code Source 875, printed in the 005010X220A1 implementation
 * guide rather than published as an external code list. We did not read that
 * guide, and no other source for these code values is recorded. The subset
 * is small and stable.
 *
 * **No description text ships.** This list's redistribution record is
 * `"not-established"`, which is treated as not redistributable, so the
 * snapshot keeps the codes and the metadata and maps every code to
 * `undefined`. Pass your own descriptions to the lookup as
 * `options.descriptions`.
 */

import {
  makeLookup,
  type CodeListEntry,
  type CodeListLookupOptions,
  type CodeListSnapshot,
} from "./meta.js";
import { X12_TR3_REDISTRIBUTION_NOT_ESTABLISHED } from "./redistribution.js";

/**
 * Bundled INS-03 (Maintenance Type) snapshot. The 834 helper reads it to
 * drive the `X12_834_UNKNOWN_MAINTENANCE_TYPE` warning when a code falls
 * outside this set, and `build834` to refuse such a code; it ships no
 * description text.
 *
 * @example
 * ```ts
 * import { MAINTENANCE_TYPE_CODES } from "@cosyte/x12";
 * Object.hasOwn(MAINTENANCE_TYPE_CODES.codes, "024"); // true (bundled)
 * MAINTENANCE_TYPE_CODES.codes["024"];                // undefined (no description ships)
 * MAINTENANCE_TYPE_CODES.meta.redistribution?.status; // "not-established"
 * ```
 */
export const MAINTENANCE_TYPE_CODES: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "MAINTENANCE-TYPE",
    description: "834 INS-03 Maintenance Type Code (X12 Code Source 875)",
    source:
      "X12 Code Source 875, element INS-03. No source for these code values is recorded; the 005010X220A1 implementation guide that prints the list was not read.",
    publishedDate: "2010-04-01",
    snapshotDate: "2026-06-28",
    note: "HIPAA-relevant subset; X12-internal list - codes are stable.",
    maintainingOrganization: "ASC X12",
    redistribution: X12_TR3_REDISTRIBUTION_NOT_ESTABLISHED,
    completeness: "cited-subset",
  }),
  codes: Object.freeze({
    "001": undefined,
    "002": undefined,
    "003": undefined,
    "004": undefined,
    "021": undefined,
    "024": undefined,
    "025": undefined,
    "026": undefined,
    "030": undefined,
  }),
});

/**
 * Look up an INS-03 maintenance type code. A bundled code returns
 * `{ code, description: undefined }`, since this list ships no description
 * text; pass your own table as `options.descriptions` to fill it. Returns
 * `undefined` for a code outside the subset that your table does not
 * describe; the verbatim code is still preserved on the parsed enrollment,
 * and the 834 helper raises an `X12_834_UNKNOWN_MAINTENANCE_TYPE` warning so
 * a consumer never silently mis-applies an unknown action. The 834 reader
 * and builder judge membership off the bundled codes alone.
 *
 * @example
 * ```ts
 * import { lookupMaintenanceType } from "@cosyte/x12";
 * lookupMaintenanceType("024");   // { code: "024", description: undefined }
 * lookupMaintenanceType("024", { descriptions: { "024": "Made-up text" } })?.description; // "Made-up text"
 * lookupMaintenanceType("999");   // undefined (outside subset)
 * ```
 */
export const lookupMaintenanceType: (
  code: string,
  options?: CodeListLookupOptions,
) => CodeListEntry | undefined = makeLookup(MAINTENANCE_TYPE_CODES);
