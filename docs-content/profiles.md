---
id: profiles
title: Trading-partner profiles
sidebar_label: Trading-partner profiles
sidebar_position: 9
---

# Trading-partner profiles

Two senders can both be conformant and still hand you different bytes. A clearinghouse adds a `REF`
the base guide never mentions; a plan declares a backslash where everyone else declares a colon; a
payer mandates an element the implementation guide calls situational. A **profile** is how
`@cosyte/x12` writes that down: as typed, fixture-grounded data you can read, rather than as silent
leniency buried in the parser.

> Every interchange below is **synthetic**: fabricated names, obviously-fake ids, pre-2024 control
> numbers. X12 healthcare data is PHI; a fixture must never hold a real one.

## Descriptive, not prescriptive

This is the load-bearing sentence on the page, so it is the first one. **A profile describes what a
partner sends. It does not change how the parser reads.**

The lenient parser already absorbs the corpus deviations losslessly, most of them with no warning at
all, so a profile has nothing to relax. Attaching one alters no decode, promotes no value, suppresses
no warning and drops no byte. What it buys you is **attribution**: the deviation stops being an
unexplained shape in someone's file and becomes a named, documented, fixture-cited convention. That
is the opposite of a prescriptive profile, which would tell the parser to expect a shape and quietly
discard whatever failed to match it. Discarding is exactly what making the deviation explicit exists
to prevent.

Two consequences worth being blunt about:

- **A profile is not validation.** It never asserts that an interchange conforms to the partner's
  guide, and a document that contradicts every quirk in the profile parses identically with it and
  without it.
- **A profile is not permission.** Each quirk optionally records a judgement of whether a partner may
  lawfully _require_ the deviation, under 45 CFR 162.915. That judgement is a human reading of the
  rule that somebody wrote down, never a check this library performed, and its fail-safe default is
  `"undetermined"`. Read that as "no claim was made", never as "permitted".

## What a profile declares

`defineProfile()` takes a name, an optional description, an optional `extends` (parent profiles
compose: lineage and quirks merge), and a list of **quirks**. Each quirk is:

| Field              | What it says                                                                       |
| ------------------ | ---------------------------------------------------------------------------------- |
| `id`               | Stable, kebab-case, unique within the profile.                                     |
| `effect`           | Which bucket `describe()` renders it into: `relaxes`, `adds`, or `requires`.       |
| `summary`          | One line, structural only. A summary never contains patient data.                  |
| `fixture`          | A real corpus file, relative to `test/fixtures/`, that demonstrates the deviation. |
| `sourceCategory`   | Where the deviation was observed (which companion guide, which corpus).            |
| `expectedWarnings` | The warning codes this deviation leads you to expect. Often empty.                 |
| `conformance`      | The optional 45 CFR 162.915 judgement above. Absent means `"undetermined"`.        |

**`fixture` is required at the type level, and that is the hard rule of the whole subsystem: there
are no invented quirks.** A quirk with no file demonstrating it does not compile, and the repo's own
accuracy suite parses each cited fixture and asserts the claimed deviation is actually present. A
profile is therefore a record of something observed, not a guess about what a partner might do.

Two profiles ship built in, `profiles.availity` and `profiles.bcbsCommon`, and both are authored
through the same public `defineProfile()` a consumer uses. There is no private authoring path.

```ts runnable
import { defineProfile, type X12ProfileSpec } from "@cosyte/x12";

const spec: X12ProfileSpec = {
  name: "anytown-regional",
  description: "Anytown Regional Health Plan - 835 remittance conventions",
  quirks: [
    {
      id: "service-line-ref-f8",
      effect: "adds",
      summary: "Service line (Loop 2110) carries a REF*F8 original-reference identifier.",
      fixture: "remit/835-availity-quirk.edi",
      sourceCategory: "Anytown Regional 835 companion guide - service-line REF",
    },
  ],
};

const profile = defineProfile(spec);

profile.name; // => "anytown-regional"
profile.quirks.length; // => 1

// `describe()` returns DATA, not a formatted string, so tooling can consume it.
const described = profile.describe();
described.adds.map((q) => q.id); // => ["service-line-ref-f8"]
described.relaxes.length; // => 0

// No judgement was recorded, so none is reported. This is the fail-safe
// default, and it is NOT a claim that a partner may require the deviation.
described.adds[0]?.conformance; // => "undetermined"
described.conformance.permitted.length; // => 0
described.conformance.undetermined.map((q) => q.id); // => ["service-line-ref-f8"]
```

`defineProfile()` refuses a malformed spec with a typed `X12ProfileError` rather than defining a
half-valid profile, and the refusal message is bounded so a large value cannot grow it without limit.

## Applying one to a parse

Pass the profile on the parse options. It attaches to the result as `ix.profile`, and it changes
nothing else about the parse:

```ts runnable
import { parseX12, profiles } from "@cosyte/x12";

// A BCBS-style envelope: ISA-16 declares a backslash component separator
// rather than the colon most consumers assume.
const raw =
  "ISA*00*          *00*          *ZZ*BCBSPLAN       *ZZ*ANYTOWNCLINIC  " +
  "*260601*1200*^*00501*000000001*0*P*\\~" +
  "GS*HP*BCBSPLAN*ANYTOWNCLINIC*20260601*1200*1*X*005010X221A1~" +
  "ST*835*0001~" +
  "SE*2*0001~GE*1*1~IEA*1*000000001~";

const withProfile = parseX12(raw, { profile: profiles.bcbsCommon });
const withoutProfile = parseX12(raw);

// Attribution: the parse says which partner convention it was read under.
withProfile.profile?.name; // => "bcbsCommon"
withoutProfile.profile; // => undefined

// And the decode is identical either way. The separator was detected from
// ISA-16 by the parser, not supplied by the profile.
withProfile.delimiters.component; // => "\\"
withoutProfile.delimiters.component; // => "\\"
withProfile.warnings.length === withoutProfile.warnings.length; // => true

// What the profile adds is the documented reason that byte is what it is.
withProfile.profile?.describe().relaxes.map((q) => q.id); // => ["backslash-component-separator"]
```

An explicit `profile` always wins. `parseX12(raw, { profile: null })` opts out for a single call.
`setDefaultProfile()` registers a process-scoped default that `parseX12(raw)` consults when you pass
none, and `getDefaultProfile()` reads it back. That default is the only mutable state in the library:
it is not shared across worker threads and is not reset between test files, so prefer passing the
profile explicitly and clean up in teardown if you do register one.

## Separating the warnings you expect from the ones you do not

The one behavioural hook a profile carries is `partitionWarnings()`. It splits a parse's warnings
against the union of every quirk's `expectedWarnings`, so an integration can alert on the genuinely
unexpected instead of on a partner's known convention. It is a pure function: it never mutates the
warnings, never removes one, and both halves together are always the whole input.

```ts runnable
import { defineProfile, parseX12, partitionWarnings } from "@cosyte/x12";

// This partner is still on a pre-005010 version family. It is a known,
// documented fact about them rather than a surprise about this file.
const legacyPartner = defineProfile({
  name: "legacy-version-partner",
  quirks: [
    {
      id: "pre-005010-envelope",
      effect: "relaxes",
      summary: "ISA-12 declares a pre-005010 interchange control version.",
      fixture: "envelope/bcbs-subelement.edi",
      sourceCategory: "partner companion guide - interchange control version",
      expectedWarnings: ["X12_PRE_005010"],
    },
  ],
});

const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00401*000000001*0*P*:~" +
  "IEA*0*000000001~";

const ix = parseX12(raw, { profile: legacyPartner });
const { expected, unexpected } = partitionWarnings(ix.warnings, legacyPartner);

// The warning is still raised, still on the model, and still says the same
// thing. The profile only sorts it.
ix.warnings.some((w) => w.code === "X12_PRE_005010"); // => true
expected.map((w) => w.code); // => ["X12_PRE_005010"]
unexpected.length; // => 0

// Nothing was removed: the two halves are the whole warning list.
expected.length + unexpected.length === ix.warnings.length; // => true
```

Alert on `unexpected`. An empty `expected` on a partner you wrote a profile for is worth looking at
too: it usually means the convention you documented did not appear in this file.

## Where to go next

- [Tolerance tiers & warning codes](./spec-notes-tolerance): what the parser tolerates before a
  profile is involved at all, and the codes `expectedWarnings` names.
- [Building and serializing X12](./emit-and-serialize): the emit side, which profiles do not touch.
- [Troubleshooting & known limitations](./troubleshooting): the bounds on the conformance judgement,
  and what a refusal message may and may not contain.
