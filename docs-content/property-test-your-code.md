---
id: property-test-your-code
title: Property-test your own code with generated interchanges
sidebar_label: Property-test your code
description: "Test your own X12 code on generated interchanges, messy text and hostile input with the fast-check generators at @cosyte/x12/arbitraries."
---

# Property-test your own code with generated interchanges

A test written by hand checks the interchanges its author thought of. A property-based test states
a rule, such as "this never throws" or "what I write reads back", and checks it on as many
generated inputs as you ask for. `@cosyte/x12/arbitraries` exports the generators we use to test
this library, built on [fast-check](https://fast-check.dev), so you can point them at code you
build on it.

Every generated value is synthetic and random: nothing in one looks like a patient's name, date of
birth, member id or address, or an amount from a real claim, so a failing case is safe to paste
into an issue.

## Install fast-check

```bash
npm install --save-dev fast-check
```

fast-check is an optional peer dependency of `@cosyte/x12`. Only `@cosyte/x12/arbitraries` loads
it; the main entry point never does, so code that only parses and builds interchanges does not
need it.

## Check that your code handles any interchange

`interchange()` generates a parsed `X12Interchange`: an ISA over generated delimiters, sometimes a
TA1, then one or more functional groups of one or more transaction sets. Each transaction set is a
type the library declares a guide for (270, 271, 275, 276, 277, 278, 820, 834, 835, 837 or 999),
and its body segments carry repetitions, components and values that need the release character. Every
count and control number agrees, so the parser warns about nothing. State the rule your code must
keep, and let fast-check look for an interchange that breaks it.

```ts runnable
import fc from "fast-check";
import type { X12Interchange } from "@cosyte/x12";
import { interchange } from "@cosyte/x12/arbitraries";

const QUEUES = ["remittance", "claims", "eligibility", "other"];

// Your code: pick a queue for each transaction set by its ST-01.
function queuesFor(ix: X12Interchange): string[] {
  return ix.groups.flatMap((group) =>
    group.transactions.map((tx) => {
      switch (tx.st.elements[1]) {
        case "835":
          return "remittance";
        case "837":
          return "claims";
        case "270":
        case "271":
          return "eligibility";
        default:
          return "other";
      }
    }),
  );
}

// The rule: every transaction set lands in a known queue, and none is skipped.
fc.assert(
  fc.property(interchange(), (ix) => {
    const queues = queuesFor(ix);
    const count = ix.groups.reduce((n, group) => n + group.transactions.length, 0);
    return queues.length === count && queues.every((q) => QUEUES.includes(q));
  }),
  { numRuns: 50 },
);

const [sample] = fc.sample(interchange(), { numRuns: 1, seed: 1 });
sample?.warnings.length; // => 0
```

## Check that what you write reads back

`interchangeSpec()` generates what `buildInterchange` takes, and `value()` generates the text of
one element as a reader sees it, including the delimiters and the `?` that have to be released on
the wire. Pair them, and the rule is the one that matters most for code that writes X12: what you
put in comes back out.

```ts runnable
import fc from "fast-check";
import {
  buildInterchange,
  getSegmentValue,
  parseX12,
  serializeX12,
  type InterchangeSpec,
} from "@cosyte/x12";
import { interchangeSpec, value } from "@cosyte/x12/arbitraries";

// Your code: add a note to the first transaction set before sending it on.
function withNote(spec: InterchangeSpec, note: string): InterchangeSpec {
  const [group, ...groups] = spec.groups;
  const [tx, ...txs] = group?.transactions ?? [];
  if (group === undefined || tx === undefined) return spec;
  const noted = { ...tx, segments: [...tx.segments, ["NTE", "ADD", note]] };
  return { ...spec, groups: [{ ...group, transactions: [noted, ...txs] }, ...groups] };
}

fc.assert(
  fc.property(interchangeSpec(), value(), (spec, note) => {
    const ix = parseX12(serializeX12(buildInterchange(withNote(spec, note))));
    const segments = ix.groups[0]?.transactions[0]?.segments ?? [];
    const nte = segments[segments.length - 2]; // the SE is last
    return nte !== undefined && getSegmentValue(nte, "02", ix.delimiters) === note;
  }),
  { numRuns: 50 },
);

const spec: InterchangeSpec = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "260101",
  interchangeTime: "1200",
  interchangeControlNumber: "1",
  groups: [
    {
      functionalIdCode: "HC",
      groupControlNumber: "1",
      versionRelease: "005010X222A2",
      transactions: [
        { transactionSetIdCode: "837", transactionSetControlNumber: "0001", segments: [] },
      ],
    },
  ],
};
serializeX12(buildInterchange(withNote(spec, "a*b"))).includes("~NTE*ADD*a?*b~"); // => true
```

## Feed your code messy and hostile input

Two generators produce raw input rather than parsed interchanges:

- `interchangeText()` is text a real sender might produce: line breaks between segments, an older
  version in the ISA, counts and control numbers that disagree, a missing SE, GE or IEA, a TA1
  inside a group, segments outside any transaction set, bytes after the IEA, no final terminator,
  trailing empty elements, a lower-case segment id, characters outside the X12 character sets and
  a binary segment. The ISA is always whole, so the parser accepts all of it, with a warning for
  what it departs from.
- `hostileInput()` is random strings, random bytes, interchanges cut short or with text inserted
  and deleted, binary segments with a wrong octet count, and interchanges as bytes. The parser may
  refuse these, with one of its four documented fatal errors, but throws nothing else.

```ts runnable
import fc from "fast-check";
import { X12ParseError, parseX12 } from "@cosyte/x12";
import { hostileInput, interchangeText } from "@cosyte/x12/arbitraries";

// Your code: read the interchange control number off a file drop without crashing the job.
function readControlNumber(raw: string | Buffer): string | undefined {
  try {
    return parseX12(raw).isa.elements[13];
  } catch (err) {
    if (err instanceof X12ParseError) return undefined;
    throw err;
  }
}

// Messy text always parses, so its control number is always there.
fc.assert(
  fc.property(interchangeText(), (raw) => readControlNumber(raw) !== undefined),
  { numRuns: 50 },
);

// Hostile input may be refused, but never crashes the reader.
fc.assert(
  fc.property(hostileInput(), (raw) => {
    readControlNumber(raw);
  }),
  { numRuns: 50 },
);

readControlNumber("not an interchange"); // => undefined
```

## Pick the generators

| Generator              | Generates                                                                                                     | Options                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `interchange()`        | a parsed, spec-clean `X12Interchange` that serializes back to the text it was parsed from                     | `delimiters`, `maxGroups`, `maxTransactions`, `maxSegments`, `maxElements` |
| `interchangeText()`    | messy interchange text the parser accepts                                                                     | the same as `interchange()`                                                |
| `hostileInput()`       | a string or a `Buffer` the parser may refuse                                                                  | `maxLength`                                                                |
| `interchangeSpec()`    | an `InterchangeSpec` that `buildInterchange` builds with no warning                                           | the same as `interchange()`                                                |
| `transactionSetType()` | `{ id, functionalIdCode, version }`, such as `{ id: "835", functionalIdCode: "HP", version: "005010X221A1" }` | none                                                                       |
| `segment()`            | a body segment as `buildInterchange` takes one: the id, then each element's value                             | `ids`, `maxElements`, `values`                                             |
| `value()`              | the text of one element or component, from the X12 character sets, delimiters and `?` included                | `minLength`, `maxLength`                                                   |
| `delimiters()`         | a delimiter set: the standard `*`, `^`, `:` and `~`, or any four distinct punctuation characters but `?`      | `delimiters`                                                               |

`segment()` and the elements `interchange()` writes end on a non-empty element, because X12 writes
no trailing empty element, so a generated interchange reads back exactly as it was generated.

## Replay a failure

When a rule fails, fast-check shrinks the case to a small one and reports the seed and path that
produced it. A failing interchange prints as the `parseX12(...)` call that rebuilds it.

```ts runnable
import fc from "fast-check";
import { interchange } from "@cosyte/x12/arbitraries";

// A rule that is wrong: not every interchange carries claims.
const everyInterchangeHasClaims = fc.property(interchange(), (ix) =>
  ix.groups.some((group) => group.gs.elements[1] === "HC"),
);

let report = "";
try {
  fc.assert(everyInterchangeHasClaims, { seed: 42 });
} catch (err) {
  report = String(err);
}
report.includes("seed: 42"); // => true
report.includes('Counterexample: [parseX12("ISA'); // => true
```

Pass the reported `seed` and `path` back to `fc.assert` to run that one case again, already shrunk,
while you fix it. A test in CI can run more cases than one on a laptop: set `numRuns` from an
environment variable, as we do with `COSYTE_PROPERTY_RUNS`.

## Reference

- [`parseX12`](./api/README.md#parsex12), [`serializeX12`](./api/README.md#serializex12),
  [`buildInterchange`](./api/README.md#buildinterchange),
  [`getSegmentValue`](./api/README.md#getsegmentvalue),
  [`X12ParseError`](./api/README.md#x12parseerror)
- The generators' options are in their TSDoc comments, which an editor shows on hover.
- [Testing and quality](./testing-and-quality.md) says how we use these generators on this
  library, and [Tolerance tiers and warning codes](./spec-notes-tolerance.md) explains what lenient
  parsing tolerates and what it refuses.
