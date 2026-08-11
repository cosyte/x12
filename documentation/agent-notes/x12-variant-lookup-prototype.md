# `X12-VARIANT-LOOKUP-PROTOTYPE` (2026-08-05)

> **RELOCATED VERBATIM from `CLAUDE.md` on 2026-08-11 to pay for the `X12-ISA-VALUE-POINTERS` trap,
> nothing dropped.** The measurement, the sources and the probe-by-probe record stay where they have
> always been, in `documentation/agent-notes.md#x12-variant-lookup-prototype-2026-08-05`; this file
> carries the imperatives that were inline in `CLAUDE.md` until the ratchet needed paying.

### 🩺 `X12-VARIANT-LOOKUP-PROTOTYPE` (2026-08-05) · `documentation/agent-notes.md#x12-variant-lookup-prototype-2026-08-05`

- **🩺 A lookup keyed by DOCUMENT BYTES is built with `wireLookup` (`Object.create(null)`) where this
  package declares the table, and read through `Object.hasOwn` where it does not.** A literal
  inherits `Object.prototype`, so EVERY OWN PROPERTY of it resolved TRUTHY. **`Object.freeze` DOES
  NOT HELP and is why this passed review** - it seals OWN properties only. **🩺 NAME THE SET, NEVER
  THE MEMBERS:** a draft published EIGHT across six surfaces; the engine has TWELVE. **Cut back,
  never grow a census.**
- **🩺 What it destroyed, strictly more than `#67`: relocated narrative §8**, and four more sites
  probe by probe in the agent-notes section. **🩺 `in` IS NOT THE SAFE FORM** - it walks the prototype chain. Reach for
  `Object.hasOwn`.
- **271 / 277 / 278 were NEVER exposed and their literal tables are LEFT ALONE:** `shared/hl.ts` has
  always guarded with `hasOwnProperty`; the 837's LOCAL `validateHl` copy did not. **Do not "finish
  the job" there.** **NO SOURCE SCAN SHIPS, DELIBERATELY** (the reason it cannot work here:
  relocated narrative §9). The defence derives its keys from
  `Object.getOwnPropertyNames(Object.prototype)` AT RUN TIME, UNFILTERED.
- **`X12_837_SERVICE_LINE_DROPPED` is a NEW code, NOT `#67`'s renamed.** Two routes (no `CLM` open,
  or the variant is not P/I/D), one message, no discriminant. The family is the trap below.
- **🩺 STATE ITS THREE BOUNDS; DRAFTS PUBLISHED ALL THREE FALSE.** It does **NOT** travel with
  `X12_837_UNKNOWN_VARIANT` (an out-of-enum caller `type` reaches route 2 without it - read
  `submission.variant`); an **`SVx` with NO `LX` at all is a DIFFERENT code** (the trap below); and a
  trailing `DTP`/`AMT`/`NTE`/`REF` is **ROUTE-DEPENDENT** (claim open: onto the claim; no claim: all
  four discarded). **Never state that unqualified** - two drafts did, opposite ways.
- **🩺 DO NOT RESTRUCTURE THE `LX` CASE; LET NO ROUTE OUT OF IT SKIP `activeEntity = undefined`**
  (trap below). **State no count of how it differs from a base - two drafts did, both wrong.**
- **🩺 EVERY WARNING-CHANNEL ASSERTION IS `toEqual` ON THE WHOLE ARRAY** - `#67`'s residual pinned a
  value plus the absence of a DIFFERENT code and stayed green. Pair every lying document with an
  honest control. **State the property, never an absolute about a matcher
  NAME** - published twice, false both times, the second inside the fix for the first.
- **Every guard has its own red negative control. Re-derive a red/green census by RUNNING head's
  suite against a base tree, never by arithmetic** - a partitioned form was wrong four ways, and a
  suite total quoted here goes stale the next slice. Derive it.
- **🩺 The ABSENT `SV1-02` deferred here is CLOSED: `X12-837-SV-UNDEFINED-DECIMAL`, its own trap below.**
