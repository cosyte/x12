---
"@cosyte/x12": patch
---

Profile system — descriptive, fixture-grounded clearinghouse / payer companion-guide quirk attribution. A `defineProfile()` API mirroring the sibling `@cosyte/hl7` profile shape, plus a `profiles` namespace of built-ins (`availity`, `bcbsCommon`). Because the lenient parser is already lossless, a **v1 profile is DESCRIPTIVE**: it attaches attribution metadata to the returned `X12Interchange` (`ix.profile`) and powers `partitionWarnings`, but NEVER alters the parse — `groups`, `warnings`, and `isa` are byte-identical with and without a profile.

`defineProfile(spec)` validates the spec (fail-fast name → Levenshtein "did you mean?" on unknown keys → quirk set), merges any `extends` lineage (flatten + dedupe first-occurrence; child wins on quirk-id collision keeping first-seen position; scalar `description` last-wins), re-validates the composed set, and returns a frozen `X12Profile` whose `describe()` yields a structured `X12ProfileDescription` bucketed by effect (`relaxes` / `adds` / `requires`). `setDefaultProfile()` / `getDefaultProfile()` hold a process-scoped default; an explicit `{ profile }` wins, `{ profile: null }` opts out for that call.

The locked HARD RULE — "a profile entry without a Tier-2 fixture demonstrating the deviation is forbidden; no invented quirks" — is enforced at the type level (required `fixture`), in `defineProfile()`, and by a per-quirk DEMONSTRATOR registry in the accuracy suite that asserts each cited fixture exhibits its claimed deviation. Built-ins ship only where a Tier-2 fixture grounds them; profiles whose only "deviation" would be a canonical baseline are deferred, not invented.

API divergence from `@cosyte/hl7`, by design: `describe()` returns structured data (not a string), the input type is `X12ProfileSpec`, and `partitionWarnings` is x12-only — driven by x12's lossless-lenient reality.

New public exports: `defineProfile`, `setDefaultProfile`, `getDefaultProfile`, `partitionWarnings`, `profiles`, `X12ProfileError`, and the `X12Profile` / `X12ProfileSpec` / `X12ProfileQuirk` / `X12ProfileDescription` / `X12ProfileEffect` / `X12WarningPartition` type tree. No new warning codes.
