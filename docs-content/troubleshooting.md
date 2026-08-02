---
id: troubleshooting
title: Troubleshooting & known limitations
sidebar_label: Troubleshooting
sidebar_position: 1
---

# Troubleshooting & known limitations

`@cosyte/x12` is built to be **correct and honest about its edges** rather than to claim more than it
delivers. Mis-reading a payer's remittance, a claim's diagnosis, or a member's coverage can cause real
financial or clinical harm, so this page is the deliberate "do not over-trust" list: the error model,
the common symptoms, and the intentional boundaries. Everything here is a documented boundary, not a
bug. The lenient parser never silently drops or garbles a **decoded value**; where a limitation
applies, the raw value is preserved (often with a warning), it is simply not further decoded. Two
things the **emit** does not reproduce are worth knowing before you rely on a round trip, and both are
silent: **line breaks between segments** and **a doubled segment terminator** outside a transaction.
Both are in the symptoms table below. **Segments outside a transaction** used to be a third: they are
now warned, kept on the model at `ix.orphanSegments`, and re-emitted at the structural anchor recorded
with them, so both the bytes and the warning survive a round trip.

## When does it throw vs warn?

Only **four** unrecoverable structural conditions throw; everything else is a warning on the model.

```ts runnable throws
import { parseX12 } from "@cosyte/x12";

parseX12(""); // throws X12ParseError (X12_EMPTY_INPUT)
```

| Fatal code (throws)      | Meaning                                                         |
| ------------------------ | --------------------------------------------------------------- |
| `X12_EMPTY_INPUT`        | Nothing to parse.                                               |
| `X12_NO_ISA_HEADER`      | Input does not begin with an ISA. It is not an X12 interchange. |
| `X12_ISA_TOO_SHORT`      | ISA truncated below its fixed 106 bytes; delimiters unreadable. |
| `X12_INVALID_DELIMITERS` | Delimiters can't be recovered from the ISA.                     |

Catch them by narrowing on `X12ParseError`:

```ts
import { parseX12, X12ParseError, FATAL_CODES } from "@cosyte/x12";

try {
  parseX12(maybeGarbage);
} catch (err) {
  if (err instanceof X12ParseError && err.code === FATAL_CODES.X12_NO_ISA_HEADER) {
    // The bytes aren't X12. Reject the file, don't retry.
  }
}
```

Everything a real payer or clearinghouse does short of that (miscounts, dangling release characters,
unknown CARC/RARC/HI codes, HL parent mismatches, balance mismatches, pre-005010 versions) is a
Tier-2 warning you triage, not an exception you catch. See [Tolerance tiers](./spec-notes-tolerance).

## Common symptoms

| Symptom                                              | Likely cause                                                                                                                                                                                                                          | What to do                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get835` / `get837Claims` returns `undefined`        | The transaction set isn't the one that reader decodes (wrong `ST-01`, or `get277CADisposition` on a non-`X214` message)                                                                                                               | Route on `tx.st.elements[1]` (and GS-01) first; hand each transaction to the matching reader.                                                                                                                                                                                                                                                                                             |
| An adjustment's `reasonDescription` is `undefined`   | The CARC/RARC code is outside the bundled snapshot                                                                                                                                                                                    | The verbatim code is still on the model; an `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC` warning is raised. A stale snapshot yields a missing description, never a wrong code.                                                                                                                                                                                                                 |
| A `X12_835_REMIT_BALANCE_MISMATCH` warning           | The payer's numbers don't add up under the §1.10.2 invariants                                                                                                                                                                         | Do **not** auto-post; the library preserves the inbound values and will not rebalance. Route to a human.                                                                                                                                                                                                                                                                                  |
| A `X12_HL_PARENT_MISMATCH` warning on an 837/271/277 | A broken HL parent pointer in the hierarchy                                                                                                                                                                                           | The pointer is preserved verbatim, never re-numbered; decide whether to trust the loop nesting.                                                                                                                                                                                                                                                                                           |
| Fields parse but `parseFloat` gives odd totals       | You called `parseFloat` on an EDI amount                                                                                                                                                                                              | Read the `X12Decimal` and do exact arithmetic on it; never `parseFloat`. See [Decimal-exact money](./spec-notes-money).                                                                                                                                                                                                                                                                   |
| A `X12_PRE_005010` warning                           | ISA-12 declares a version family other than `00501`                                                                                                                                                                                   | Tolerated and flagged, not decoded against older field maps. Pass `{ strict: true }` to make it a hard failure for a trusted partner.                                                                                                                                                                                                                                                     |
| `serializeX12(parseX12(file)) !== file`              | Usually pretty-printing: the parser absorbs the line break after each terminator and the model does not record it, so the emit is compact. But it is **not** the only cause, and the others fire on files with no line breaks at all. | If the file is merely pretty-printed the difference is line breaks only, and diffing your emit against `serializeX12(parseX12(source))` ignores that noise. Otherwise see [Line endings between segments](./spec-notes-envelope) for everything the emit does not reproduce.                                                                                                              |
| An `X12_UNEXPECTED_SEGMENT` warning                  | A segment arrived where the envelope grammar has no place for it: outside any open `ST..SE` transaction set, such as a stray segment between `GE` and `IEA` or a `TA1` inside an open group.                                          | The segment is **kept**, verbatim, on `ix.orphanSegments`, and its `segmentIndex` matches the warning's `position.segmentIndex`. No `get*` reader will see it, so read it there. `serializeX12` **does** re-emit it, at the structural `anchor` recorded with it, so the segment and this warning both survive a round trip. See [Segments outside a transaction](./spec-notes-envelope). |
| A segment is missing from `ix.groups`                | It fell outside every transaction set, so the typed tree has nowhere for it                                                                                                                                                           | Check `ix.orphanSegments` before concluding the sender omitted it. That array is empty for a well-formed interchange, so a non-empty one tells you the framing did not match the envelope grammar.                                                                                                                                                                                        |

## Keeping PHI out of logs

A warning `message` is a **lookup into a frozen registry**, never anything built from your document.
No warning factory in the library takes a value parameter at all, so a `message` cannot interpolate an
element no matter what an interchange contains: it names the deviation, `position` says where to look,
and the bytes stay on the model. `ALL_WARNING_MESSAGES` is exported so you can assert that yourself:
`ix.warnings.every((w) => ALL_WARNING_MESSAGES.has(w.message))` is true for every input.

That means logging `w.code`, `w.position` and `w.message` is safe. Keep the same discipline in your
own code: the values are one dereference away on the model (`isa.elements`, `seg.raw`,
`adjustment.reasonCode`), and putting them in a log line is your decision to make, not one the library
makes for you.

**`ix.orphanSegments` is on the model side of that line, not the warning side.** Because a segment
outside a transaction is reported as a warning, it is tempting to log the orphan next to it, but an
orphan carries the sender's bytes verbatim like any other model field and nothing guarantees a
segment outside a transaction is free of patient data. Log `o.context` and `o.segmentIndex` (a
library-owned discriminant and an integer), not `o.raw` or `o.segment.elements`.

**The builders are a different surface, and the guarantee there is weaker on purpose.** A `build*`
function that refuses a spec throws a typed error. Most of those messages carry structural locators
and numeric totals only; twenty-three sites across ten builder modules also name a value you passed in,
so you can tell which control number, count, maintenance code or note code was refused.

Since `0.0.4` every one of those twenty-three goes through `renderCallerValue`, and the fragment it produces
is capped at `BUILD_REFUSAL_VALUE_MAX_RENDERED` (90 characters: up to
`BUILD_REFUSAL_VALUE_MAX_LENGTH` = 63 of your value, then an ellipsis and the true length). All three
are exported, so you can assert the ceiling instead of trusting it.

**That ceiling is on the fragment, not on the whole message.** A message is the fragment plus the
site's own fixed text, so it is bounded by a constant but a larger one. Measured: a 120,000-character
control number produced a 120,066-character `X12BuildError.message` from `buildInterchange` before the
change and produces a 150-character one now.

Be exact about what that buys, because it is not what the parse-side registry buys. **These are values
you passed in.** You handed them to the builder, you still have them, and bounding them redacts
nothing: put patient data in a control number and the refusal shows up to 63 characters of it. The
bound is there so `Error.message` has a fixed size rather than growing with your input, which is what
makes it safe to put in a log line or a JSON error envelope. It is also **not escaped** - the
surviving characters are whatever you supplied, newline included.

One qualification, stated precisely because the categorical version would be false: **on the ack path
the value is not always strictly your own.** TR3 005010X231A1 requires AK2-02 to be a verbatim copy of
the acknowledged transaction set's ST-02, and `buildTA1` echoes an inbound ISA-13, so a document's
control numbers reach those refusals by design. They are envelope control numbers, not clinical
content, and they are bounded like the rest.

**`defineProfile()` follows the same rule, since `0.0.6`.** An `X12ProfileError` naming a bad profile
name, quirk id, effect, fixture path or expected-warning code used to interpolate it verbatim: one call
measured a **240,092-character** message. Twelve refusal sites now route all twenty-three of their
caller values through the same bound, and the longest message any of them produces is 431 characters.
Where the value's **type** is the mistake, the rendering keeps `null` distinguishable from `"null"`.
One asymmetry worth knowing: **`X12ProfileError.profileName` is not bounded**, on purpose, so it still
matches the name you passed. Log `err.message`, not the whole error object.

**Hand a builder something that is not an array and it refuses, in most places.** The types say
`readonly T[]`, but a JSON-driven caller can pass anything. As of `0.0.6` every indexed loop in every
builder takes its bound from a checked array, so `{ length: "9".repeat(120000) }` draws that builder's
own typed refusal - before this the length coerced to `Infinity` and the builder **looped forever
instead of refusing.** The places a builder reads a caller array with `for…of` are not covered:
`buildInterchange`'s `spec.groups`, `build999`'s `functionalGroup.transactionResponses` and every
optional leaf array such as `claim.dates` throw `TypeError: … is not iterable`, which terminates but
carries **no `code`**. Validate the shape at your own boundary if the spec comes from JSON.

**`err.code` is still the thing to branch on and the safest thing to log.** Tracked in
`KNOWN-LIMITATIONS.md`; the parse side above is unaffected and stronger.

> **This page previously said the opposite of what the code did.** Until `0.0.4` it read "warning
> messages are bounded and PHI-free by construction … you can log the full `.warnings` array
> without leaking", and named `.snippet` as the one exception. `X12_CONTROL_NUMBER_MISMATCH` echoed
> **both** control numbers verbatim and unbounded, on all six ISA-13 / IEA-02 / GS-06 / GE-02 / ST-02
> / SE-02 slots, and the three declared counts and ISA-12 did the same. `.snippet` is not even a field
> on a warning. If you are on `0.0.3` or earlier, treat `w.message` as untrusted.

**`X12ParseError.snippet` on a Tier-3 fatal is the one exception, and it is deliberate.** The four
structural fatals (`X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`,
`X12_EMPTY_INPUT`) are raised before the envelope is readable and are undebuggable without a few bytes
of context, so each carries a bounded (≤ 64 character) copy of the start of the input. On real
traffic those bytes can be patient data. The library does **not** redact it. Redact at your call site,
or log `err.code` and `err.position` and drop `err.snippet`.

A **strict-mode escalation carries no snippet** (`err.snippet` is `""`). `{ strict: true }` turns the
first Tier-2 warning into a thrown error, and that error's `message` is the same registry entry the
warning carried, so there is nothing to redact. Until `0.0.4` it attached 64 bytes of the interchange,
which put document bytes into `err.stack` and from there into whatever an error reporter ships to a
third party.

## Known limitations & non-goals

### Data / decode boundaries

- **Bundled code-list snapshots are pre-launch initial subsets, not the full WPC-published lists.**
  CARC, RARC, Claim-Status-Category (CSCC), Claim-Status (CSC), service-type, CLP-status, and
  maintenance-type ship as versioned data artifacts. An inbound code outside a snapshot still parses:
  the verbatim code is preserved and an `X12_UNKNOWN_*` warning is raised. Only the human-readable
  **description** is absent. A stale or partial snapshot yields a missing description, **never a wrong
  code**.
- **`serialize(parse(s)) === s` is not guaranteed.** Every segment on the model comes back verbatim,
  in the order the model holds it. Six constructs are known not to survive: line breaks between
  segments, a doubled terminator outside a transaction, a missing final terminator,
  post-IEA `trailingBytes`, a TA1 that followed a functional group (emitted right after the ISA,
  so reordered, though nothing is lost), and a segment whose first element is empty outside a
  transaction (skipped entirely, with no warning at all). The last five fire on inputs with no line
  breaks, so a compact file is not guaranteed to round-trip either, and five of the six are silent, so a clean
  warnings list is not evidence of byte-exactness. Measured across the 56 committed fixtures: every emit is a fixed point
  and re-parses to an identical model with an identical warning stream, the 14 with no line breaks
  return byte-identical (13 of those are `golden/*.edi`, serializer output by construction), and the
  other 42 differ by line breaks and nothing else. See
  [Line endings between segments](./spec-notes-envelope).
- **A segment outside a transaction is retained and re-emitted, but never decoded.** The envelope
  walker binds body segments to an open ST..SE transaction. Anything else raises
  `X12_UNEXPECTED_SEGMENT` and is kept verbatim on `ix.orphanSegments`, joinable to the warning by
  `segmentIndex` and carrying the structural `anchor` `serializeX12` puts it back at, so it survives
  a round trip along with its warning. One boundary remains: no `get*` reader sees an orphan, so read
  them from `ix.orphanSegments` yourself.
- **837 claim-/line-level provider addresses (Loop 2310 / 2420 `N3`/`N4`) are not surfaced.** The
  provider **identities** (`NM1`) round-trip; the street-address lines do not decode onto the model.
  Read them from the raw segments if you need them.
- **`get834Enrollments` streams members but still parses the whole file up front.** It yields one
  decoded member per `INS` loop (so a consumer holds one member at a time), but the underlying
  interchange is fully parsed into `tx.segments` before iteration begins. It is not a byte-streaming
  reader for arbitrarily large files.
- **Balance and integrity checks warn; they never rebalance or renumber.** The 835 §1.10.2 balance
  invariants, 837 HL parent-pointer integrity, and envelope-count reconciliation surface a warning on
  a mismatch and preserve the inbound values verbatim.

### Conformance testing not yet wired

- **No external-oracle differential corpus yet.** A best-effort differential harness against CMS
  Medicare 835 public examples (and/or another external X12 reader) is planned for the first real
  release but is **not yet wired**, pending a redistribution-terms review. Conformance today rests on
  the three-tier synthetic corpus (spec-clean → vendor-quirk → round-trip goldens), property/round-trip
  tests, and a byte-flip fuzz job, not on parity with a third-party implementation. Do not assume
  byte-for-byte agreement with any specific vendor parser.

### Scope (non-goals for v1)

- **Healthcare HIPAA 005010 only.** Non-healthcare sets (850/856/810/204, …), the EDIFACT syntax
  family, and pre-005010 versions are out of v1 scope. Pre-005010 input is tolerated and flagged
  (`X12_PRE_005010`), not decoded to older field maps.
- **No transport.** AS2, SFTP, and MLLP-style delivery are out of scope. This is a parser/serializer,
  not a communications stack.
- **Published, still pre-alpha.** The package is published on npm as `@cosyte/x12` from a public
  repo, but it stays on the `0.0.x`-until-first-alpha ladder. `npm view @cosyte/x12 version` is the
  only source of truth for the current version, so this page does not restate one. Treat the API as
  pre-alpha and pin the exact version until the first alpha.
- **No typed model for the 270 and 276 inquiries.** Every other v1 transaction has both a
  per-transaction reader and a domain builder. The 270 eligibility inquiry and the 276 claim-status
  inquiry have neither: they parse into segments, composites, and dot-paths like any other X12 input,
  and the responses (271, 277) decode fully, but the inquiry directions have no typed surface yet.

For the phase-by-phase surface and the exact fields each helper decodes, see the package's
`CLAUDE.md` status section and the [Cookbook](./cookbook).
