---
"@cosyte/x12": patch
---

Trading-partner profiles now say whether the deviation they describe is one a
trading partner may lawfully require, and the emit path's independence from
them is an enforced invariant rather than a property that held by construction.

**Emit independence is locked.** A profile describes what a partner SENDS and
must never touch what this library emits. That was true at every release and
nothing asserted it, so the next profile-aware convenience added to the emit
path would have met no test and no type. `serializeX12`, `buildInterchange` and
every `build*` domain builder are now held to byte-identical output with each
built-in profile registered as the process default, with a caller-defined
profile carrying a quirk in each of the `relaxes`, `adds` and `requires`
buckets, and with none, over the whole committed fixture corpus and over each
builder's own inputs. Refusals are held to the same standard: the same error
type, the same code and the same message, so an active profile can turn neither
a refusal into an emission nor an emission into a refusal. The covered builder
set is DERIVED from the package root's exports rather than hand-listed, so a
builder added later fails the run naming itself instead of slipping past a
check nobody extended. Beside the behavioural lock is a structural one: the
emit modules are read from disk and asserted to import nothing from the profile
subsystem, which catches a profile that is consulted and happens not to move a
byte today. No emitted byte changed.

**Every described quirk now carries a conformance classification.** A quirk
that says "this partner requires X" used to be indistinguishable from "X is a
supported requirement". `describe()` now renders each quirk with a
`conformance` state and groups the same quirks by that state:

- `permitted` - a recorded judgement that 45 CFR 162.915 is not engaged, so a
  partner may lawfully require the deviation.
- `not-permitted` - a recorded judgement that it is: the partner is deviating
  from the adopted standard rather than the standard supporting the mandate.
- `undetermined` - no judgement was recorded. The FAIL-SAFE DEFAULT: a quirk
  that says nothing renders as `undetermined` and never as `permitted`, and so
  does an out-of-enum value from a profile object that bypassed
  `defineProfile`.

`conformance` is an OPTIONAL quirk field, so a profile written against the
older quirk shape defines and describes exactly as it did and gains no claim
nobody made. The `requires` bucket confers nothing on this axis: a partner
mandating an element the adopted implementation guide marks "not used"
classifies as a deviation from the standard.

**Read a classification as documentation, not as a check.** Whether an element
is marked "not used" in an adopted implementation guide is not machine-checkable
here, because 45 CFR 162.920(a) states a fee is charged for the implementation
specifications and none is bundled with this package. Every classification is a
recorded human judgement; confirm it against your own copy of the guide before
you rely on it. Of the three quirks the built-in profiles ship, the BCBS
backslash component separator is recorded `permitted` (ISA-16 is the element
whose job is to declare the component separator, and the sender declares it in
band), and both Availity REF additions are recorded `undetermined` for the fee
reason above. `KNOWN-LIMITATIONS.md` carries the same caveat for consumers who
never open the type.
