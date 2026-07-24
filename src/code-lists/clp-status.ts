/**
 * **CLP-02 - Claim Status Code** (X12 Code Source 65). Lives on `CLP-02`
 * of every 835 claim payment loop; identifies the **adjudication
 * disposition** of a single claim (paid as primary / secondary, denied,
 * reversed, predetermination). Misreading flips an accepted claim to a
 * denied one in a cash-poster's downstream system.
 *
 * Spec source: X12 005010X221A1 TR3 §"CLP Claim Payment Information",
 * Element `CLP-02` (Code Source 65). The full code list is bounded
 * (~25 values) and X12-internal (not WPC) - it grows rarely.
 *
 * **Initial bundled subset** covers the ~10 most common dispositions.
 * Codes outside the subset still parse (verbatim code preserved on the
 * model); a `X12_UNKNOWN_CLP_STATUS` warning would be a Phase 5+ addition
 * (not bundled at Phase 4 to keep the additions-only warning registry
 * surgical - Phase 4 only adds the codes it actually uses).
 */

import { makeLookup, type CodeListEntry, type CodeListSnapshot } from "./meta.js";

/**
 * Bundled CLP-02 (Claim Status) snapshot. Used by the 835 helper to
 * surface a human-readable description alongside the verbatim
 * disposition code.
 *
 * @example
 * ```ts
 * import { CLP_STATUS } from "@cosyte/x12";
 * CLP_STATUS.codes["1"];  // "Processed as Primary"
 * CLP_STATUS.codes["4"];  // "Denied"
 * ```
 */
export const CLP_STATUS: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "CLP-STATUS",
    description: "835 CLP-02 Claim Status Code (X12 Code Source 65)",
    source: "X12 005010X221A1 TR3 §CLP Claim Payment Information, Element CLP-02 (Code Source 65)",
    publishedDate: "2010-04-01",
    snapshotDate: "2026-06-27",
    note: "Initial subset; X12-internal list (not WPC) - codes are stable.",
  }),
  codes: Object.freeze({
    "1": "Processed as Primary",
    "2": "Processed as Secondary",
    "3": "Processed as Tertiary",
    "4": "Denied",
    "19": "Processed as Primary, Forwarded to Additional Payer(s)",
    "20": "Processed as Secondary, Forwarded to Additional Payer(s)",
    "21": "Processed as Tertiary, Forwarded to Additional Payer(s)",
    "22": "Reversal of Previous Payment",
    "23": "Not Our Claim, Forwarded to Additional Payer(s)",
    "25": "Predetermination Pricing Only - No Payment",
  }),
});

/**
 * Look up a CLP-02 claim status code's bundled description. Returns
 * `undefined` for codes outside the initial subset; the verbatim code is
 * still preserved on the parsed claim model.
 *
 * @example
 * ```ts
 * import { lookupClpStatus } from "@cosyte/x12";
 * lookupClpStatus("1")?.description; // "Processed as Primary"
 * lookupClpStatus("99");             // undefined (outside subset)
 * ```
 */
export const lookupClpStatus: (code: string) => CodeListEntry | undefined = makeLookup(CLP_STATUS);
