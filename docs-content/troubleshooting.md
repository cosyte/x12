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

| Symptom                                                                             | Likely cause                                                                                                                                                                                                                                                                                                                         | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get835` / `get837Claims` returns `undefined`                                       | The transaction set isn't the one that reader decodes (wrong `ST-01`, or `get277CADisposition` on a non-`X214` message)                                                                                                                                                                                                              | Route on `tx.st.elements[1]` (and GS-01) first; hand each transaction to the matching reader.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| An adjustment's `reasonDescription` is `undefined`                                  | The CARC/RARC code is outside the bundled snapshot                                                                                                                                                                                                                                                                                   | The verbatim code is still on the model; an `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC` warning is raised. A stale snapshot yields a missing description, never a wrong code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| A `X12_835_REMIT_BALANCE_MISMATCH` warning                                          | The payer's numbers don't add up under the §1.10.2 invariants                                                                                                                                                                                                                                                                        | Do **not** auto-post; the library preserves the inbound values and will not rebalance. Route to a human.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A `X12_HL_PARENT_MISMATCH` warning on an 837/271/277                                | A broken HL parent pointer in the hierarchy                                                                                                                                                                                                                                                                                          | The pointer is preserved verbatim, never re-numbered; decide whether to trust the loop nesting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| An amount or quantity reads `0` and the payer says otherwise                        | An `X12_UNPARSEABLE_DECIMAL` warning at that element: the sender put bytes in a decimal element that are not an X12 R-type decimal (a thousands separator, a currency symbol, `N/A`), so nothing decoded and the slot fell back to `X12Decimal.ZERO`                                                                                 | Treat that `0` as unread, not as zero. The warning's `position.elementIndex` names the element; the verbatim bytes are on `tx.segments[…].raw`. An **absent** element does not warn, so an unwarned `0` **at an element a reader decoded** is a zero the sender sent or omitted. It is not a guarantee about every `0` on the model: a slot a reader never read cannot warn. The known instance of that in this library, an 837 service line whose `SVx` never decoded, has a warning of its own (the next row); no census of never-read slots is published. See [Decimal-exact money](./spec-notes-money).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| An optional amount or quantity is `undefined`                                       | Either the sender omitted the element, or it was present and did not decode                                                                                                                                                                                                                                                          | Look for an `X12_UNPARSEABLE_DECIMAL` at that `position.elementIndex`. One present means the second; none means the first. `readElementDecimal` gives the same distinction in-band if you walk segments yourself.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| An 837 service line's `charge` and `units` both read `0`                            | An `X12_837_SERVICE_LINE_NOT_DECODED` warning: the Loop 2400 line carries no `SV1` / `SV2` / `SV3` matching the variant the submission resolved to, either because it carries none at all or because it carries one for a different 837 variant than `ST-03` (or your `type` option) named. Nothing on the service segment was read. | Treat `charge`, `units`, the procedure code, the modifiers, the unit of measure and the place of service on that line as **unread**, not as zero or empty. The warning's `position.segmentIndex` names the `LX` that opened the line; the segments are verbatim on `tx.segments[…].raw`. If `ST-03` and the `SVx` disagree, decide which one the sender meant before re-reading with the matching `type`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| A claim's `serviceLines` is empty but the file has `LX` segments                    | An `X12_837_SERVICE_LINE_DROPPED` warning at each such `LX`: it opened no Loop 2400, so the line reached no claim at all. Either no `CLM` was open at that point in the transaction, or the submission's variant is not one of `P` / `I` / `D`.                                                                                      | Do **not** read the empty `serviceLines` as "the claim had no service lines". Nothing was fabricated to stand in and no claim was synthesized; the segments are verbatim on `tx.segments[…].raw`. Read `submission.variant` to tell the two causes apart: this code does **not** travel with `X12_837_UNKNOWN_VARIANT`, because a caller-supplied `type` outside `"P" \| "I" \| "D"` reaches the same route without it. If the cause is the variant, re-read with a valid `type`. Two bounds: an `SVx` with **no `LX` at all** is reported by `X12_837_SERVICE_SEGMENT_WITHOUT_LX` instead (the next row), because this code is anchored at the `LX`, and a `DTP` / `AMT` / `NTE` / `REF` / `N3` / `N4` / `PER` after a dropped `LX` is **not** simply absent, and which of the two routes above fired decides it: with a `CLM` open the date, amount, note and reference land among the **claim-level** ones, and with **no** `CLM` open all seven are **discarded**, including where the `LX` was stray inside an entity loop and they were that entity's own. Where that `LX` landed inside an entity loop, each `N3` / `N4` / `PER` / `REF` it discards raises `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` at itself; that code's own row below carries its bound, which is **narrower than this row's route** and is the only place to read it from, because a discarded entity segment is not always on that channel. This code reports the service line, not an entity's address, id or contact. Read the segments off `tx.segments[…].raw` rather than inferring either. This is a different loss from the row above, where the line **is** on the model and only its service segment went unread. |
| An `SV1`/`SV2`/`SV3` in the file has its charge and units on no service line at all | An `X12_837_SERVICE_SEGMENT_WITHOUT_LX` warning at that service segment: no Loop 2400 was open when it arrived, so there was no line to decode it into and nothing it carries was read.                                                                                                                                              | Treat the charge, units, procedure code, modifiers, unit of measure and place of service on that segment as **unread**. Nothing was fabricated to stand in and no line or claim was synthesized; the warning's `position.segmentIndex` names the service segment itself, and its bytes are verbatim on `tx.segments[…].raw`. It reports once per service segment, not once per loop. **Read the condition literally: "no line open", not "the file contains no `LX`"** - an `LX` in an earlier claim is still an `LX`, so other claims in the same file can have perfectly good service lines. It never reports the same segment as the two rows above, which are both raised at an `LX`, though a file with several claims can carry all three codes. It also says nothing about how `submission.variant` resolved: a `type` option you pass wins first, and absent one, where `ST-03` names no known implementation convention, the reader falls back to the first `SVx` in the transaction - a segment reported here is eligible for that fallback like any other.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| An entity's `address`, `contacts` or `references` is empty and the file has those segments | An `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` warning at each `N3` / `N4` / `PER` / `REF` that reached no party: an `LX` earlier in the transaction opened no Loop 2400 (no `CLM` was open at it) and closed the entity loop those segments belonged to, so nothing they carry is on the model. | Read the segments off `tx.segments[…].raw`: the bytes are verbatim there, and nothing was fabricated to stand in. The `LX` itself is reported separately by `X12_837_SERVICE_LINE_DROPPED`, which names the **service line's** loss and never an entity segment, so the two codes report different things about the same stretch of the document. **Read this code's bound literally: it is not a general "this segment reached no party" report.** It fires only after such an `LX`, and only until the next `NM1` / `HL` / `CLM` opens a loop - a party named after that `LX` is outside this code's scope again, and its trailing segments are silent whether or not this reader surfaces them on it. An `N3` / `N4` / `PER` / `REF` that reaches no party by any other route is silent, as are a `DTP` / `AMT` / `NTE` on this one, which never attach to a party on any route. Which party a segment following a stray `LX` belongs to is not derivable from the TR3s in either direction, so it is discarded rather than attributed; releases through `0.0.10` attached it to whichever party the last `NM1` left active, wherever this reader surfaces that segment kind on that party at all - a `PER` on a patient or a pay-to address reached the model on no release, so this code reports that a segment reached **no** party and not that it would otherwise have reached one. `KNOWN-LIMITATIONS.md` records the trade. |
| `build277` throws `X12_277_BUILD_INVALID_SPEC` naming `SVC-07`                      | A Loop 2220 service line in the spec has no `unitsOfService`. SVC-07, the units of service count, is a **required** element in `005010X212`, so emitting the line without it would put a non-conformant 277 on the wire.                                                                                                             | Supply the count the submitter sent. The builder will not default it: a quantity nobody sent is invented data, and a units figure is one a payer reprices against. The same spec is accepted by `build277CA`, where TR3 `005010X214` makes SVC-07 situational - that asymmetry is deliberate, not a gap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Fields parse but `parseFloat` gives odd totals                                      | You called `parseFloat` on an EDI amount                                                                                                                                                                                                                                                                                             | Read the `X12Decimal` and do exact arithmetic on it; never `parseFloat`. See [Decimal-exact money](./spec-notes-money).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| A `X12_PRE_005010` warning                                                          | ISA-12 declares a version family other than `00501`                                                                                                                                                                                                                                                                                  | Tolerated and flagged, not decoded against older field maps. Pass `{ strict: true }` to make it a hard failure for a trusted partner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `serializeX12(parseX12(file)) !== file`                                             | Usually pretty-printing: the parser absorbs the line break after each terminator and the model does not record it, so the emit is compact. But it is **not** the only cause, and the others fire on files with no line breaks at all.                                                                                                | If the file is merely pretty-printed the difference is line breaks only, and diffing your emit against `serializeX12(parseX12(source))` ignores that noise. Otherwise see [Line endings between segments](./spec-notes-envelope) for everything the emit does not reproduce.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| An `X12_UNEXPECTED_SEGMENT` warning                                                 | A segment arrived where the envelope grammar has no place for it: outside any open `ST..SE` transaction set, such as a stray segment between `GE` and `IEA` or a `TA1` inside an open group.                                                                                                                                         | The segment is **kept**, verbatim, on `ix.orphanSegments`, and its `segmentIndex` matches the warning's `position.segmentIndex`. No `get*` reader will see it, so read it there. `serializeX12` **does** re-emit it, at the structural `anchor` recorded with it, so the segment and this warning both survive a round trip. See [Segments outside a transaction](./spec-notes-envelope).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| A segment is missing from `ix.groups`                                               | It fell outside every transaction set, so the typed tree has nowhere for it                                                                                                                                                                                                                                                          | Check `ix.orphanSegments` before concluding the sender omitted it. That array is empty for a well-formed interchange, so a non-empty one tells you the framing did not match the envelope grammar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

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
measured a **360,181-character** message. Twelve refusal sites now route all twenty-three of their
caller values through the same bound, and that same refusal now measures 431 characters. Read 431 as
a measurement at a 120,000-character value rather than a maximum: the reported length widens with its
own decimal width, so that site's ceiling is 443, and every site is asserted under 500. Where the
value's **type** is the mistake, the rendering keeps `null` distinguishable from `"null"`.
One asymmetry worth knowing: **`X12ProfileError.profileName` is not bounded**, on purpose, so it still
matches the name you passed. Log `err.message`, not the whole error object.

**Hand a builder something that is not an array and it refuses, in most places.** The types say
`readonly T[]`, but a JSON-driven caller can pass anything. As of `0.0.6` every indexed loop in every
builder takes its bound from a checked array, so `{ length: "9".repeat(120000) }` draws that builder's
own typed refusal - before this the length coerced to `Infinity` and the builder **looped forever
instead of refusing** (measured across nineteen entry-point probes: 16 hung at base, 17 refuse
cleanly now). A list you send as `null` is still treated as absent, exactly as before. The places a builder reads a
caller array with `for…of` are not covered:
`buildInterchange`'s `spec.groups`, `build999`'s `functionalGroup.transactionResponses` and every
optional leaf array such as `claim.dates` throw `TypeError: … is not iterable`, which terminates but
carries **no `code`**. Validate the shape at your own boundary if the spec comes from JSON.

**A separate, long-standing hazard on the same JSON-caller path, FIXED in `0.0.9`: passing a builder a
number where the types say string used to emit an EMPTY element, with no warning and no refusal.** On
an 835 that emptied CLP-01, the patient control number that reassociates the remittance back to the
837's CLM-01; the same one line reached every escaped slot in all nine builders, including the 837's
own CLM-01. It now draws that builder's typed, code-tagged refusal before anything is emitted.

**It refuses rather than coercing, on purpose. Do not just wrap your value in `String()` without
thinking.** A JSON payload that carried `"0012345"` as a number lost the leading zeros before the
library saw it, so coercion would emit `12345`: a well-formed identifier that is not the one you sent,
and a remittance that reassociates to the **wrong** claim. Convert at your own boundary, where you can
still tell whether the zeros mattered.

**The type check now covers every element of every segment a builder emits through its segment
joiner, not only the ones routed through the escape helper.** Two earlier drafts of this page
published a counted list of the slots that escaped the check and both were measured incomplete, so
the check moved to the place every element of those segments has to pass, the joiner. A number,
`null`, `undefined`, a boolean or an object in a slot that goes through one draws that builder's
typed refusal, naming the slot the way the spec does: `build999: "AK9"-01 must be a string, …`.
`buildTA1` does not use a segment joiner and is not covered; see below.

**Monetary and quantity slots have their own guard on top of that**, because a raw `number` answers
`.toString()` with a perfectly good string and used to sail straight through: a
`patientResponsibilityAmount` of `0.1 + 0.2` emitted `…*0.30000000000000004*…`, `1e21` emitted
`…*1e+21*…` and `NaN` emitted `…*NaN*…`, each with zero warnings, and the library cannot parse the
last two back. A slot typed `X12Decimal` now refuses anything that is not one. It will **not** round
for you: choosing between `0.30` and `0.3` is a decision about your money.

**Four things are still worth validating at your own boundary.** First, a `string` carrying an active
delimiter: the type check passes it, and only slots routed through the escape helper release it
(`"1*BOGUS"` emits as `1?*BOGUS`). Second, **the fixed-width ISA slots**, which go through padding
and not through the segment joiner at all. A number there throws an untyped `TypeError`, or for
`interchangeControlNumber` a typed refusal whose text misleadingly says "exceeds the 9-char spec
limit". Both terminate, which is why they are the smaller hazard.

Third, **`buildTA1`**, which uses no segment joiner and no escape helper: it joins its five
caller-supplied elements directly, so a numeric or `undefined` `interchangeControlNumber` is emitted
silently as `TA1**250101*1200*A*000`. TA1-01 reassociates the acknowledgment to the interchange it
acknowledges, so build it as a string.

Fourth, **`build835`'s balance-equation amounts refuse UNTYPED.** The balance guard runs before the
escape helper is built and calls `X12Decimal` methods on your value, so a raw `number` there throws a
plain `TypeError` with **no `code`** rather than the typed refusal. The rule is the equation, not a
list: an amount refuses untyped exactly when the balance guard reads it as a term of one of the three
TR3 X221A1 §1.10.2 invariants. Named by spec field rather than element number, the untyped set is
`payment.totalActualPayment`, `claim.totalChargeAmount`, `claim.totalPaymentAmount`, every
`adjustments[].amount` at claim and line level, `serviceLine.chargeAmount`,
`serviceLine.paymentAmount` and `providerAdjustments[].amount`. Every other `X12Decimal` field
refuses typed, including `claim.patientResponsibilityAmount`, `serviceLine.paidUnitsOfService` and
every `amounts[].amount`.

One other behaviour change: the exported `escapeRelease` now throws `TypeError` on a non-string
instead of returning `""`, and a boxed `new String("…")` is refused where it built at `0.0.8`. See
`KNOWN-LIMITATIONS.md`.

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
