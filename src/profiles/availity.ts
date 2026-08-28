/**
 * Built-in `availity` profile - common Availity clearinghouse 835 ERA
 * conventions. Authored via the public `defineProfile()` API; use via
 * `parseX12(raw, { profile: profiles.availity })`.
 *
 * Every quirk is grounded in `test/fixtures/remit/835-availity-quirk.edi`,
 * the Tier-2 fixture that demonstrates the payer-routed REF additions (see
 * `test/transactions-remit-835.test.ts` "Tier-2 Availity quirk"). The parser
 * already tolerates these losslessly with zero warnings - the profile makes
 * the convention explicit and documented rather than relying on silent
 * leniency.
 */

import { defineProfile } from "./define.js";

/**
 * Built-in Availity 835 ERA profile. See file header for grounding; use via
 * `parseX12(raw, { profile: profiles.availity })`.
 *
 * @example
 * ```ts
 * import { parseX12, profiles } from "@cosyte/x12";
 * const ix = parseX12(raw, { profile: profiles.availity });
 * ix.profile?.describe().adds.map((q) => q.id);
 * ```
 */
export const availity = defineProfile({
  name: "availity",
  description: "Availity clearinghouse 835 ERA conventions - payer-routed REF segment additions",
  quirks: [
    {
      id: "payer-loop-ref-2u",
      effect: "adds",
      summary:
        "Payer Loop 1000A carries an additional REF*2U payer-identification segment alongside the N1*PR.",
      fixture: "remit/835-availity-quirk.edi",
      sourceCategory: "Availity 835 ERA companion guide - payer-loop REF*2U routing identifier",
      // Recorded judgement, read against 45 CFR 162.915(b) and (c). Whether a
      // partner may lawfully REQUIRE a REF*2U in Loop 1000A turns on whether
      // that segment sits inside the adopted remittance guide's maximum
      // defined data set. No readable copy of that guide was available when
      // this was recorded (45 CFR 162.920(a) states a fee is charged for the
      // implementation specifications), so the question is open and this must
      // NOT be reported as permitted. Describing that Availity SENDS it is a
      // different claim, is unaffected, and stays true.
      conformance: "undetermined",
    },
    {
      id: "service-line-ref-f8",
      effect: "adds",
      summary:
        "Service line (Loop 2110) carries a REF*F8 original-reference identifier for clearinghouse trace-back.",
      fixture: "remit/835-availity-quirk.edi",
      sourceCategory: "Availity 835 ERA companion guide - service-line REF*F8 original reference",
      // Recorded judgement, same axis as the quirk above for REF*F8 at Loop
      // 2110, and open for the same reason: no readable copy of the adopted
      // guide.
      conformance: "undetermined",
    },
  ],
});
