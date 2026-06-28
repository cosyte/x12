/**
 * Built-in `bcbsCommon` profile — the lowest-common-denominator BCBS
 * envelope quirk. Authored via the public `defineProfile()` API; use via
 * `parseX12(raw, { profile: profiles.bcbsCommon })`.
 *
 * Each BCBS plan still ships its own companion guide — this is a documented
 * starting point, not a complete BCBS edit set. The one quirk here is
 * grounded in `test/fixtures/envelope/bcbs-subelement.edi` (see
 * `test/parser-envelope.test.ts`), which uses a backslash component separator
 * (ISA-16 = `\`) instead of the common `:`. The parser detects ISA-16 from
 * its fixed byte position and handles this losslessly; the profile documents
 * that BCBS senders may diverge from the `:` most consumers assume.
 */

import { defineProfile } from "./define.js";

/**
 * Built-in BCBS common-denominator profile. See file header for grounding;
 * use via `parseX12(raw, { profile: profiles.bcbsCommon })`.
 *
 * @example
 * ```ts
 * import { parseX12, profiles } from "@cosyte/x12";
 * const ix = parseX12(raw, { profile: profiles.bcbsCommon });
 * ix.profile?.describe().relaxes.map((q) => q.id);
 * ```
 */
export const bcbsCommon = defineProfile({
  name: "bcbsCommon",
  description:
    "Lowest-common-denominator BCBS envelope quirks — a documented starting point, not a complete plan-specific edit set",
  quirks: [
    {
      id: "backslash-component-separator",
      effect: "relaxes",
      summary:
        "ISA-16 component (sub-element) separator is a backslash `\\`, not the commonly-assumed `:`.",
      fixture: "envelope/bcbs-subelement.edi",
      sourceCategory: "BCBS plan companion guides — non-colon ISA-16 sub-element separator",
    },
  ],
});
