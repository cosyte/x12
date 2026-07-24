---
id: spec-notes-tolerance
title: Tolerance tiers & warning codes
sidebar_label: Tolerance tiers
sidebar_position: 3
---

# Tolerance tiers & warning codes

`@cosyte/x12` follows Postel's Law: **liberal on input, conservative on output.** Real payer and
clearinghouse traffic is full of deviations that a strict validator would reject and a production
integration cannot afford to drop. The parser tolerates them, records each one as a stable-coded
warning with positional context, and preserves the raw value, so you decide what to do, instead of
the library throwing your pipeline off the rails on a vendor quirk.

## The three tiers

- **Tier 1: spec-clean.** Parses with no warnings.
- **Tier 2: tolerated deviation.** A miscount, a dangling release character, an unknown CARC/RARC/HI
  code, an HL parent mismatch, a balance mismatch, a pre-005010 version. The parser **keeps going**,
  preserves the verbatim value, and emits a warning. This is the overwhelming majority of real-world
  quirks.
- **Tier 3: unrecoverable structural corruption.** The bytes are not X12 at all. There are exactly
  **four** of these, and they always throw (see below).

Only Tier 3 throws by default. Everything in Tier 2 is a warning you triage, not an exception you
catch.

## Warnings collect on the model, and stream

Every warning lands on the returned model's `.warnings` array (`ix.warnings`, `remit.warnings`,
`sub.warnings`, …), each carrying a stable `code` (from `WARNING_CODES`), a **bounded, PHI-free**
`message` (it never echoes names, IDs, or dates), and a `position`. You can also stream them live via
the `onWarning` callback:

```ts runnable
import { parseX12, type X12ParseWarning } from "@cosyte/x12";

const seen: X12ParseWarning[] = [];

// ISA-12 declares an old version family (004010): tolerated, flagged, not fatal.
const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00401*000000001*0*P*:~" +
  "IEA*0*000000001~";

const ix = parseX12(raw, { onWarning: (w) => seen.push(w) });

seen.length > 0; // => true
ix.warnings.length > 0; // => true
```

## The four fatal codes

These are the only conditions that throw an `X12ParseError`, regardless of `strict`. They are
unrecoverable structural corruption, not tolerable quirks:

```ts runnable
import { FATAL_CODES } from "@cosyte/x12";

FATAL_CODES.X12_EMPTY_INPUT; // => "X12_EMPTY_INPUT"
FATAL_CODES.X12_NO_ISA_HEADER; // => "X12_NO_ISA_HEADER"
FATAL_CODES.X12_ISA_TOO_SHORT; // => "X12_ISA_TOO_SHORT"
FATAL_CODES.X12_INVALID_DELIMITERS; // => "X12_INVALID_DELIMITERS"
```

- **`X12_EMPTY_INPUT`**: nothing to parse.
- **`X12_NO_ISA_HEADER`**: the input does not begin with an ISA; it is not an X12 interchange.
- **`X12_ISA_TOO_SHORT`**: the ISA is truncated below its fixed 106 bytes, so delimiters can't be read.
- **`X12_INVALID_DELIMITERS`**: the delimiters can't be recovered from the ISA.

```ts runnable throws
import { parseX12 } from "@cosyte/x12";

parseX12(""); // throws X12ParseError (X12_EMPTY_INPUT)
```

## Escalate to strict when you want a conformance gate

For a trusted trading partner where any deviation should be a hard failure, pass `{ strict: true }`.
Every Tier-2 deviation then throws an `X12ParseError` **carrying the same warning code** it would
otherwise have recorded, so a strict run is a spec-conformance gate, and a lenient run is production
tolerance, with one code vocabulary across both:

```ts runnable throws
import { parseX12 } from "@cosyte/x12";

const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00401*000000001*0*P*:~" +
  "IEA*0*000000001~";

// The pre-005010 version is a warning by default; strict turns it into a throw.
parseX12(raw, { strict: true }); // throws X12ParseError (X12_PRE_005010)
```

## Integrity checks warn: they never rebalance or renumber

The 835 balance invariants, the 837 HL parent-pointer integrity, and the serializer's envelope-count
reconciliation all follow the same rule: on a mismatch they **surface a warning and preserve the
inbound values verbatim**. The library will not "fix" a payer artifact for you. Gate your own
posting/adjudication on the warning. See [Decimal-exact money](./spec-notes-money) for the 835 balance
equations, and [Troubleshooting](./troubleshooting) for the full symptom → cause table.
