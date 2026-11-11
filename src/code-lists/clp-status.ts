/**
 * **CLP-02 - Claim Status Code** (X12 Code Source 65). Lives on `CLP-02`
 * of every 835 claim payment loop; identifies the **adjudication
 * disposition** of a single claim (paid as primary / secondary, denied,
 * reversed, predetermination). Misreading flips an accepted claim to a
 * denied one in a cash-poster's downstream system.
 *
 * The list is X12 Code Source 65, printed in the 005010X221A1
 * implementation guide rather than published as an external code list. We
 * did not read that guide, and no other source for these code values is
 * recorded. The full list is small and grows rarely.
 *
 * **No description text ships.** This list's redistribution record is
 * `"not-established"`, which is treated as not redistributable, so the
 * snapshot keeps the codes and the metadata and maps every code to
 * `undefined`. Pass your own descriptions to the lookup as
 * `options.descriptions`.
 *
 * **Initial bundled subset** covers the ~10 most common dispositions.
 * Codes outside the subset still parse (verbatim code preserved on the
 * model); a `X12_UNKNOWN_CLP_STATUS` warning would be a later addition
 * (not bundled here, to keep the additions-only warning registry surgical -
 * this table only carries the codes the readers actually use).
 */

import {
  makeLookup,
  type CodeListEntry,
  type CodeListLookupOptions,
  type CodeListSnapshot,
} from "./meta.js";
import { X12_TR3_REDISTRIBUTION_NOT_ESTABLISHED } from "./redistribution.js";

/**
 * Bundled CLP-02 (Claim Status) snapshot. The 835 helper reads it beside the
 * verbatim disposition code; it ships no description text.
 *
 * @example
 * ```ts
 * import { CLP_STATUS } from "@cosyte/x12";
 * Object.hasOwn(CLP_STATUS.codes, "1"); // true (bundled)
 * CLP_STATUS.codes["1"];                // undefined (no description ships)
 * CLP_STATUS.meta.redistribution?.status; // "not-established"
 * ```
 */
export const CLP_STATUS: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "CLP-STATUS",
    description: "835 CLP-02 Claim Status Code (X12 Code Source 65)",
    source:
      "X12 Code Source 65, element CLP-02. No source for these code values is recorded; the 005010X221A1 implementation guide that prints the list was not read.",
    publishedDate: "2010-04-01",
    snapshotDate: "2026-06-27",
    note: "Initial subset; X12-internal list (not WPC) - codes are stable.",
    maintainingOrganization: "ASC X12",
    redistribution: X12_TR3_REDISTRIBUTION_NOT_ESTABLISHED,
    completeness: "cited-subset",
  }),
  codes: Object.freeze({
    "1": undefined,
    "2": undefined,
    "3": undefined,
    "4": undefined,
    "19": undefined,
    "20": undefined,
    "21": undefined,
    "22": undefined,
    "23": undefined,
    "25": undefined,
  }),
});

/**
 * Look up a CLP-02 claim status code. A bundled code returns
 * `{ code, description: undefined }`, since this list ships no description
 * text; pass your own table as `options.descriptions` to fill it. Returns
 * `undefined` for a code outside the subset that your table does not
 * describe; the verbatim code is still preserved on the parsed claim model.
 *
 * @example
 * ```ts
 * import { lookupClpStatus } from "@cosyte/x12";
 * lookupClpStatus("1");    // { code: "1", description: undefined }
 * lookupClpStatus("1", { descriptions: { "1": "Made-up text" } })?.description; // "Made-up text"
 * lookupClpStatus("99");   // undefined (outside subset)
 * ```
 */
export const lookupClpStatus: (
  code: string,
  options?: CodeListLookupOptions,
) => CodeListEntry | undefined = makeLookup(CLP_STATUS);
