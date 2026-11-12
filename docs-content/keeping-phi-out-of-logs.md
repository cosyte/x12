---
id: keeping-phi-out-of-logs
title: Keeping PHI out of logs
sidebar_label: Keeping PHI out of logs
description: "Which of the package's messages and fields can carry a value from a document or a spec, which cannot, and what to log instead."
---

# Keeping PHI out of logs

An X12 healthcare interchange carries patients' identities, coverage and claims, and an error
reporter or a log line is the usual way such data leaves a system by accident. This page says, for
each thing the package hands you, whether it can carry a value from a document or from a spec you
built, and what to log instead. The short version: log `code` and `position`, and treat everything on
the model as PHI.

## What is safe to log

Log what says what kind of thing happened and where: a warning's `code`, `position` and `message`;
an error's `name`, `code` and `position`; a transaction set's id (`835`), a qualifier or a code from
a code list; a count, a length or a boolean. Every example on these pages prints only those, and
shows any other field by reading it or asserting on it, with its synthetic value in a comment.

Never log a field of the model: a name, a member or account number, a date of birth, an address, a
phone number, a trace or control number, or a whole interchange, segment or serialized string. Nor
these fields of this package's errors, which hold raw input:

- `X12ParseError.snippet`: up to 64 characters of the start of the input you parsed, on the four
  structural fatals. Its section below says why it is there.
- `X12CodeListError.rejectedValue`, and the `message` that carries it: the document date you passed
  to `checkCarcValidity` or `checkRarcValidity`, bounded and not redacted.
- The `message` of a `build*` refusal (`X12BuildError`, `Remit835BuildError`, `AckBuildError` and
  the rest): it can name a control number or code you passed in, bounded and not redacted, and a
  control number can carry an account identifier. Log its `code`.
- `X12ProfileError.profileName`, and the `message` that names it: the profile name you passed, as
  given.

A warning carries no such field: its `message` comes from a frozen registry. An orphan segment beside
it does: log its `context` and `segmentIndex`, never its `raw` or `segment`.

## Warnings carry no value from the document

A warning `message` is a **lookup into a frozen registry**, never anything built from your document.
No warning factory in the library takes a value parameter at all, so a `message` cannot interpolate an
element no matter what an interchange contains: it names the deviation, `position` says where to look,
and the bytes stay on the model. `ALL_WARNING_MESSAGES` is exported so you can assert that yourself:
`ix.warnings.every((w) => ALL_WARNING_MESSAGES.has(w.message))` is true for every input.

That means logging `w.code`, `w.position`, and `w.message` is safe. Keep the same discipline in your
own code: the values are one dereference away on the model (`isa.elements`, `seg.raw`,
`adjustment.reasonCode`), and putting them in a log line is your decision to make, not one the library
makes for you.

## Orphan segments are on the model side

Because a segment outside a transaction is reported as a warning, it is tempting to log the orphan
next to it, but an orphan carries the sender's bytes verbatim like any other model field and nothing
guarantees a segment outside a transaction is free of patient data. Log `o.context` and `o.segmentIndex` (a
library-owned discriminant and an integer), not `o.raw` or `o.segment.elements`.

## Attachment data refuses to print

A 275 attachment's `BDS-03` is a clinical document, so the reader holds it in an
`X12AttachmentData`, whose string, JSON and `util.inspect` forms (and so `console.log`) carry its
octet count and no octet; `readOctets()` is the one route to the data. That is the only field that
refuses to print. Every other field of every reading, names, member and claim identifiers and trace
numbers included, is a plain string. [Answer a request for additional information with a
275](./answer-an-attachment-request.md) shows it.

## The one exception: a fatal's snippet

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

## What a builder refusal can name

**The builders are a different surface, and the guarantee there is weaker on purpose.** A `build*`
function that refuses a spec throws a typed error. Most of those messages carry structural locators
and numeric totals only; some also name a value you passed in, so you can tell which control number,
count, maintenance code, review level code, or note code was refused.

**The values a refusal names are the ones its own template names by field, and nothing else.** A
builder's message will show you a control number, an X12 control code, or a count. It will not show you
a `claimId`, a member id, a member name, a trace, or a diagnosis code, whatever type you sent them as.
That second half used to be false and was fixed in the release after `0.0.10`: the shared guards that
check the TYPE of an element (the ones that fire when a JSON-driven caller sends a number where the
types say string) used to describe the value as `a number ("900412345678")`, bounded to 90 characters
and not redacted. They stand on **every element of every builder**, so the value in front of them was
as often `CLP-01` or `NM1-09` as a control number. They report the type now
(`build835: every element value must be a string, but received a number.`) and never the value. If you
were parsing a value back out of one of those messages, that is the change to know about.

**One arm is deliberately NOT redacted:** the array guard still
reports the `length` and the class tag of a forged array-like, bounded, because those describe the
shape you forged rather than the contents of a document element, and they are the whole diagnostic for
`{ length: "9".repeat(120000) }`.

Since `0.0.4` every one of those values goes through `renderCallerValue`, and the fragment it produces
is capped at `BUILD_REFUSAL_VALUE_MAX_RENDERED` (90 characters: up to
`BUILD_REFUSAL_VALUE_MAX_LENGTH` = 63 of your value, then an ellipsis and the true length). All three
are exported, so you can assert the ceiling instead of trusting it.

**That ceiling is on the fragment, not on the whole message.** A message is the fragment plus the
site's own fixed text, so it is bounded by a constant but a larger one. Before `0.0.4` a
120,000-character control number produced a `buildInterchange` refusal longer than the value itself.

Be exact about what that buys, because it is not what the parse-side registry buys. **These are values
you passed in.** You handed them to the builder, you still have them, and bounding them redacts
nothing: put patient data in a control number and the refusal shows up to 63 characters of it. The
bound is there so `Error.message` has a fixed size rather than growing with your input, which is what
makes it safe to put in a log line or a JSON error envelope. It is also **not escaped**: the
surviving characters are whatever you supplied, newline included.

One qualification, stated precisely because the categorical version would be false: **on the ack path
the value is not always strictly your own.** TR3 005010X231A1 requires AK2-02 to be a verbatim copy of
the acknowledged transaction set's ST-02, and `buildTA1` echoes an inbound ISA-13, so a document's
control numbers reach those refusals by design. They are envelope control numbers, not clinical
content, and they are bounded like the rest.

**`defineProfile()` follows the same rule, since `0.0.6`.** An `X12ProfileError` naming a bad profile
name, quirk id, effect, fixture path, or expected-warning code used to interpolate it verbatim, so a
long value grew the message without limit. Every profile refusal site now routes its caller values
through the same bound, and the test suite holds every such message under 500 characters. Where the
value's **type** is the mistake, the rendering keeps `null` distinguishable from `"null"`.
One asymmetry worth knowing: **`X12ProfileError.profileName` is not bounded**, on purpose, so it still
matches the name you passed. Log `err.message`, not the whole error object. See
[Describe a trading partner with a profile](./profiles.md) for what a profile does and does not do to a parse.

## How the builders treat a JSON-driven caller's values

**Hand a builder something that is not an array and it refuses, in most places.** The types say
`readonly T[]`, but a JSON-driven caller can pass anything. As of `0.0.6` every indexed loop in every
builder takes its bound from a checked array, so `{ length: "9".repeat(120000) }` draws that builder's
own typed refusal. Before this, the length coerced to `Infinity` and the builder **looped forever
instead of refusing** (measured over the entry-point probes the suite shipped at that base: most hung,
and each of them refuses cleanly now). No probe count is quoted here; the suite re-derives it. A list
you send as `null` is still treated as absent, exactly as before. The places a builder reads a
caller array with `for…of` (`buildInterchange`'s `spec.groups`, `build999`'s
`functionalGroup.transactionResponses` and the optional leaf arrays such as `claim.dates`) go
through the same chokepoint, so a forged value there refuses with the typed code too.

**A hole or a `null` inside a list refuses, in every builder.** An array with `undefined` or `null`
in a slot IS an array and clears the chokepoint: that is what a JSON payload with a dropped record
looks like. Every builder checks each slot of the lists it reads, at any depth, and refuses with its
`INVALID_SPEC` code. In a list of objects the refusal names the slot with a structural locator such
as `subscriber.benefits[0]`, never a value.
`build270` and `build276` refuse a hole in their hierarchy spine on their `INVALID_HIERARCHY` code,
as they did before.

**A separate, long-standing hazard on the same JSON-caller path, FIXED in `0.0.9`: passing a builder a
number where the types say string used to emit an EMPTY element, with no warning and no refusal.** On
an 835 that emptied CLP-01, the patient control number that reassociates the remittance back to the
837's CLM-01; the same one line reached every escaped slot in every builder of that release, including the 837's
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
`null`, `undefined`, a boolean, or an object in a slot that goes through one draws that builder's
typed refusal, naming the slot the way the spec does: `build999: "AK9"-01 must be a string, …`.
It names the slot and the TYPE and never the value, per the redaction above; the slot itself is
admitted only when it matches the X12 segment-id grammar, so free text you park in element 0 of a
`buildInterchange` segment spec degrades to `element N` rather than being echoed.
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
and not through the segment joiner at all. They have a guard of their own: a value that is not a
string, or is longer than its slot (`senderId` over 15 characters, `interchangeDate` over 6), draws
the builder's typed `INVALID_SPEC` refusal naming the field, rather than being cut to fit. A short
value still pads with spaces. What is left to check there is content: a delimiter inside an ISA
value is written as that byte.

Third, **the delimiter set `buildTA1` releases against.** It uses no segment joiner, but its five
elements do go through the escape helper: a
numeric or `undefined` `interchangeControlNumber` now refuses instead of emitting
`TA1**250101*1200*A*000`, and an active delimiter is released instead of shifting the disposition
element. An **empty** element refuses too, at all five slots; a whitespace-only one does not, and
that residual is in [KNOWN-LIMITATIONS.md](https://github.com/cosyte/x12/blob/main/KNOWN-LIMITATIONS.md). What it cannot verify is the
envelope you will embed the segment in. The separators default
to the Cosyte archetype, so state them on `BuildTA1Options` if yours differ, or a value carrying a
byte that is a delimiter here and not there comes back with a stray `?`.

Fourth, **`build835`'s balance-equation amounts refuse UNTYPED.** The balance guard runs before the
escape helper is built and calls `X12Decimal` methods on your value, so a raw `number` there throws a
plain `TypeError` with **no `code`** rather than the typed refusal. The rule is the equation, not a
list: an amount refuses untyped exactly when the balance guard reads it as a term of one of the three
835 balance equations. Named by spec field rather than element number, the untyped set is
`payment.totalActualPayment`, `claim.totalChargeAmount`, `claim.totalPaymentAmount`, every
`adjustments[].amount` at claim and line level, `serviceLine.chargeAmount`,
`serviceLine.paymentAmount` and `providerAdjustments[].amount`. Every other `X12Decimal` field
refuses typed, including `claim.patientResponsibilityAmount`, `serviceLine.paidUnitsOfService` and
every `amounts[].amount`.

**An EMPTY control number is refused now too, and that one used to be INVENTED rather than dropped.**
Every builder that assembles an ISA zero-pads the control number to nine characters, so
`interchangeControlNumber: ""` came back as `000000000`: a frozen, well-formed interchange with zero
warnings, ISA-13 reconciling against IEA-02, carrying a control number you never sent. The group and
transaction-set control numbers went out short a required element instead: empty in
`buildInterchange` and `build999`, and dropped altogether by the domain builders, whose segment
helper trims a trailing empty, so their `GE` and `SE` carried no control number at all. The
acknowledgment builders did the same at the slots that echo what they are acknowledging
(`AK1*HC**…`, `AK2*837*~`, `TA1**260601*1200*A*000`). Every one of those emitted `warnings: []`.
All of them refuse as of this release, naming the slot and the property: `build837:
groupControlNumber is empty. GS-06 / GE-02 is a required control number …`. No new error code and no
warning code, and a build that used to hand you a document now throws.

**One ordering did move, so read this before you branch on a builder error code.** The guards sit at
the envelope-assembly site, so everything that already ran before them still wins: `build835`'s
balance equation, `build999`'s AK9 counts, `buildTA1`'s accept-must-mean-accept check, the hierarchy
checks. A defect detected **later**, during body assembly, now reports the control-number refusal
instead. `build999` with an empty `interchangeControlNumber` and six AK9 syntax error codes threw
`X12_ACK_COUNT_MISMATCH` at `0.0.15` and throws `X12_ACK_INVALID_SPEC` now.

**The check is byte-strict, which leaves blanks open and is the one thing to screen for.** A
whitespace-only control number is still accepted and still padded, so `" "` emits ISA-13 as
`00000000 `; `buildTA1` does no padding at all and emits whatever whitespace you hand it, verbatim.
Trimming would be a normalization rule and nothing this library can cite says to. A **short** control
number is not affected and never was: at ISA-13, `"1"` still pads to `000000001`, which is what the
padding is for, and `buildTA1` pads nothing, so a TA1-01 of `"1"` goes out as `TA1*1*…`.

One other behavior change: the exported `escapeRelease` now throws `TypeError` on a non-string
instead of returning `""`, and a boxed `new String("…")` is refused where it built at `0.0.8`. See
[KNOWN-LIMITATIONS.md](https://github.com/cosyte/x12/blob/main/KNOWN-LIMITATIONS.md).

**`err.code` is still the thing to branch on and the safest thing to log.** Tracked in
[KNOWN-LIMITATIONS.md](https://github.com/cosyte/x12/blob/main/KNOWN-LIMITATIONS.md); the parse side above is unaffected and stronger.

## Before 0.0.4

> **The troubleshooting page used to say the opposite of what the code did.** Until `0.0.4` it read "warning
> messages are bounded and PHI-free by construction … you can log the full `.warnings` array
> without leaking", and named `.snippet` as the one exception. `X12_CONTROL_NUMBER_MISMATCH` echoed
> **both** control numbers verbatim and unbounded, on all six ISA-13 / IEA-02 / GS-06 / GE-02 / ST-02
> / SE-02 slots, and the three declared counts and ISA-12 did the same. `.snippet` is not even a field
> on a warning. If you are on `0.0.3` or earlier, treat `w.message` as untrusted.
