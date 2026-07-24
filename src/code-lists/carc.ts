/**
 * **CARC - Claim Adjustment Reason Codes.** Lives on every CAS adjustment
 * in an 835 (and on 837 COB CAS adjustments). The numeric code identifies
 * *why* the adjustment was made (e.g. "deductible", "non-covered",
 * "exceeds fee schedule"); paired with the Claim Adjustment Group Code on
 * `CAS-01` it tells a cash-poster who owes the unpaid balance and what
 * the next action is (appeal, write-off, patient bill).
 *
 * Source: **WPC (Washington Publishing Company)** - `x12.org/codes/claim-
 * adjustment-reason-codes`. WPC updates the list **monthly**. Misreading a
 * code drives wrong patient billing or a wrong appeal - the parser surfaces
 * the verbatim code AND the bundled-snapshot description; unknown codes
 * carry the verbatim value with `description: undefined` AND emit a
 * `X12_UNKNOWN_CARC` warning.
 *
 * **Pre-launch initial subset.** This snapshot covers the ~30 most
 * commonly observed CARC codes - every value exercised by the Tier-1 /
 * Tier-2 fixtures plus the long-tail codes most cash-posting workflows
 * branch on. The Phase 10 `pnpm refresh:code-lists` script regenerates
 * the full WPC-published list from the canonical source for the first
 * real publish; until then a CARC absent from the snapshot still parses
 * fine (verbatim) - only its description is unavailable.
 */

import { makeLookup, type CodeListEntry, type CodeListSnapshot } from "./meta.js";

/**
 * Bundled CARC snapshot. `meta.publishedDate` is the WPC publication
 * date this subset reflects; `meta.snapshotDate` is when cosyte captured
 * it. The `codes` map is frozen - use the {@link lookupCarc} helper for
 * the ergonomic `{ code, description }` shape consumed by the 835
 * helper.
 *
 * @example
 * ```ts
 * import { CARC } from "@cosyte/x12";
 * CARC.meta.snapshotDate;          // "2026-06-27"
 * CARC.codes["45"];                // "Charge exceeds fee schedule..."
 * Object.keys(CARC.codes).length;  // count of bundled codes
 * ```
 */
export const CARC: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "CARC",
    description: "Claim Adjustment Reason Codes",
    source: "WPC (Washington Publishing Company) - x12.org/codes/claim-adjustment-reason-codes",
    publishedDate: "2026-03-01",
    snapshotDate: "2026-06-27",
    note: "Pre-launch initial subset (~30 most commonly observed codes). Phase 10 ships a full-regen script.",
  }),
  codes: Object.freeze({
    "1": "Deductible Amount",
    "2": "Coinsurance Amount",
    "3": "Co-payment Amount",
    "4": "The procedure code is inconsistent with the modifier used.",
    "5": "The procedure code/type of bill is inconsistent with the place of service.",
    "6": "The procedure/revenue code is inconsistent with the patient's age.",
    "7": "The procedure/revenue code is inconsistent with the patient's gender.",
    "8": "The procedure code is inconsistent with the provider type/specialty (taxonomy).",
    "9": "The diagnosis is inconsistent with the patient's age.",
    "10": "The diagnosis is inconsistent with the patient's gender.",
    "11": "The diagnosis is inconsistent with the procedure.",
    "15": "The authorization number is missing, invalid, or does not apply to the billed services or provider.",
    "16": "Claim/service lacks information or has submission/billing error(s).",
    "18": "Exact duplicate claim/service.",
    "22": "This care may be covered by another payer per coordination of benefits.",
    "23": "The impact of prior payer(s) adjudication including payments and/or adjustments.",
    "24": "Charges are covered under a capitation agreement/managed care plan.",
    "26": "Expenses incurred prior to coverage.",
    "27": "Expenses incurred after coverage terminated.",
    "29": "The time limit for filing has expired.",
    "31": "Patient cannot be identified as our insured.",
    "45": "Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement.",
    "50": "These are non-covered services because this is not deemed a 'medical necessity' by the payer.",
    "96": "Non-covered charge(s).",
    "97": "The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated.",
    "109": "Claim/service not covered by this payer/contractor.",
    "119": "Benefit maximum for this time period or occurrence has been reached.",
    "197": "Precertification/authorization/notification/pre-treatment absent.",
    "204": "This service/equipment/drug is not covered under the patient's current benefit plan.",
  }),
});

/**
 * Look up a CARC code's bundled description. Returns `undefined` when
 * the code is not in the initial subset - the verbatim code is still
 * preserved on the parsed model and the 835 walker emits
 * `X12_UNKNOWN_CARC` so consumers know the description gap exists.
 *
 * @example
 * ```ts
 * import { lookupCarc } from "@cosyte/x12";
 * lookupCarc("45")?.description; // "Charge exceeds fee schedule..."
 * lookupCarc("9999");            // undefined (outside the bundled subset)
 * ```
 */
export const lookupCarc: (code: string) => CodeListEntry | undefined = makeLookup(CARC);
