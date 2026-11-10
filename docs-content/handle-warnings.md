---
id: handle-warnings
title: Handle warnings and fatal errors
sidebar_label: Handle warnings
description: "Collect or stream every tolerated deviation as a coded warning, escalate to strict mode for a trusted partner, and catch the four fatal codes."
---

# Handle warnings and fatal errors

You want to log or triage every tolerated deviation without your pipeline throwing on a vendor
quirk. `@cosyte/x12` is liberal on input: **only four fatal structural errors ever throw**, and
everything else is a warning carrying a stable code and its position.
[Tolerance tiers and warning codes](./spec-notes-tolerance.md) explains the model; this page is how
to use it.

## Read the warnings, or stream them

Every warning is collected on the model it belongs to (`ix.warnings`, `remit.warnings`,
`sub.warnings`, and so on). Pass `onWarning` to see each one as `parseX12` raises it:

```ts runnable
import { parseX12, WARNING_CODES, type X12ParseWarning } from "@cosyte/x12";

// ISA-12 declares the older 004010 version family: tolerated, flagged, not fatal.
const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00401*000000001*0*P*:~" +
  "IEA*0*000000001~";

const seen: X12ParseWarning[] = [];
const ix = parseX12(raw, { onWarning: (w) => seen.push(w) });

// The same warnings, streamed and collected.
seen.map((w) => w.code); // => ["X12_PRE_005010"]
ix.warnings.map((w) => w.code); // => ["X12_PRE_005010"]

// Branch on the code. `message` comes from a frozen registry and `position` says where to look.
const pre005010 = ix.warnings.find((w) => w.code === WARNING_CODES.X12_PRE_005010);
typeof pre005010?.message; // => "string"
pre005010?.position.segmentIndex; // => 0
```

Log `w.code`, `w.position` and `w.message`: none of them holds a value from the document.
[Keeping PHI out of logs](./keeping-phi-out-of-logs.md) says what that covers and what it does not.

## Escalate to strict for a trusted partner

Pass `{ strict: true }` and the first deviation `parseX12` would have warned about throws an
`X12ParseError` carrying the same code instead, which makes a strict run a conformance gate for a
partner whose files should be clean:

```ts runnable
import { parseX12, X12ParseError } from "@cosyte/x12";

const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00401*000000001*0*P*:~" +
  "IEA*0*000000001~";

let code: string | undefined;
try {
  parseX12(raw, { strict: true });
} catch (err) {
  if (err instanceof X12ParseError) code = err.code;
}
code; // => "X12_PRE_005010"
```

## Catch the four fatal codes

These are unrecoverable structural corruption and always throw an `X12ParseError`, whatever
`strict` says:

```ts runnable
import { parseX12, FATAL_CODES, X12ParseError } from "@cosyte/x12";

const maybeGarbage = "this is not an X12 interchange";

let rejected = false;
try {
  parseX12(maybeGarbage);
} catch (err) {
  if (err instanceof X12ParseError) {
    switch (err.code) {
      case FATAL_CODES.X12_EMPTY_INPUT: // nothing to parse
      case FATAL_CODES.X12_NO_ISA_HEADER: // not an X12 interchange at all
      case FATAL_CODES.X12_ISA_TOO_SHORT: // ISA truncated below 106 bytes
      case FATAL_CODES.X12_INVALID_DELIMITERS: // delimiters unrecoverable from the ISA
        // The bytes are not X12: reject the file, do not retry.
        rejected = true;
        break;
    }
  }
}
rejected; // => true
```

An `X12ParseError` from a fatal carries `snippet`, a bounded copy of up to 64 characters of the
start of the input, and on real traffic those bytes can be patient data. Log `err.code`, not the
whole error. [Keeping PHI out of logs](./keeping-phi-out-of-logs.md#the-one-exception-a-fatals-snippet)
has the detail.

Everything a payer or clearinghouse does short of that (miscounts, dangling release characters,
unknown CARC, RARC or HI codes, HL parent mismatches, balance mismatches, pre-005010 versions) is a
warning you triage, not an exception you catch.

## Related

- [Warning and error codes](./warning-and-error-codes.md): every code and its message.
- [Describe a trading partner with a profile](./profiles.md#separate-the-warnings-you-expect-from-the-ones-you-do-not):
  split a partner's known deviations from the unexpected ones.
- [Troubleshooting](./troubleshooting.md): what a given warning usually means and what to do.
- Reference: [`X12ParseWarning`](./api/README.md#x12parsewarning),
  [`X12ParseError`](./api/README.md#x12parseerror), [`WARNING_CODES`](./api/README.md#warning_codes).
