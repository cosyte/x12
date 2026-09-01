<a href="https://cosyte.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cosyte.com/tile/cosyte-lockup-tile-on-dark-1200x300.png">
    <img alt="The Cosyte logo on its own white ground: the icon beside the word Cosyte." src="https://cosyte.com/tile/cosyte-lockup-tile-on-light-1200x300.png">
  </picture>
</a>

# @cosyte/x12

> Read the money out of an 835, an 837 or a 271 without a TR3 open on your desk.

[![npm version](https://img.shields.io/npm/v/@cosyte/x12.svg)](https://www.npmjs.com/package/@cosyte/x12)
[![CI](https://img.shields.io/github/actions/workflow/status/cosyte/x12/ci.yml?branch=main&label=CI)](https://github.com/cosyte/x12/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

Developer-focused ASC X12 EDI parser and utility library for Node.js/TypeScript.

## Why this exists

Reading an X12 healthcare transaction correctly normally means buying the TR3 implementation guide
for it and then hand-mapping element positions that no compiler will ever check. This library
removes that step for the engineer who has one 835 to post, one 271 to answer or one 837 to send,
and who needs the amounts to be exactly right rather than approximately right. The nearest
alternatives are a general-purpose EDI translator, which frames segments correctly but knows nothing
about what CLP-04 means, and a hand-rolled split on the segment terminator, which works until the
first trading partner sends a repetition separator you did not plan for. This is neither: a
zero-dependency TypeScript library that decodes the healthcare transaction sets into typed models,
keeps every amount in exact decimal arithmetic, and reports each vendor deviation it tolerated with
a stable code instead of failing or guessing.

## Status

**Version 0.0.18**, published on npm from a public repository.

On the `0.0.x` ladder the public API is not settled and may still move before `0.1.0`, so pin an
exact version rather than a range. Typed read and typed emit both ship for every transaction set
this package covers: 270, 271, 276, 277 and 277CA, 278 request and response, 820, 834, 835, 837P,
837I and 837D, 999 and TA1, each with a reader and a matching domain builder.
`X12_TR3_CONFORMANCE` is the machine-readable answer to which implementation guide each one
follows, and is a better source than this page.

Not covered, and deliberately so: a byte-exact round trip is not guaranteed in general (see
[Compatibility](#compatibility)), and non-healthcare transaction sets, EDIFACT, transport such as
AS2 and SFTP, and pre-005010 revisions are all out of scope.

## Install

```bash
pnpm add @cosyte/x12
```

`npm install @cosyte/x12` and `yarn add @cosyte/x12` work the same way.

Node `>=22.0.0` is the engine floor, and there are zero runtime dependencies. The package ships
dual ESM and CJS builds with type declarations for both conditions, so `import` and `require` each
resolve to the artifact meant for them.

## Usage

Parse an 835 remittance advice and read the money: the payment total, the claim's
charge/paid/patient-responsibility split, and the adjustment reason behind the difference. The
interchange below is synthetic, with a fabricated payer, provider, patient and amounts.

```ts runnable
import { parseX12, get835 } from "@cosyte/x12";

const raw = `ISA*00*          *00*          *ZZ*MEDICARE       *ZZ*SUBMITTER      *260601*1200*^*00501*000000001*0*P*:~
GS*HP*MEDICARE*SUBMITTER*20260601*1200*1*X*005010X221A1~
ST*835*0001~
BPR*I*450.00*C*ACH*CCP*01*123456789*DA*987654321*1512345678**01*111111111*DA*222222222*20260601~
TRN*1*0012345*1512345678~
DTM*405*20260601~
N1*PR*MEDICARE PART A~
N3*123 PAYER WAY~
N4*BALTIMORE*MD*21244~
PER*BL*JANE COORDINATOR*TE*5551234567~
N1*PE*SAMPLE CLINIC INC~
N3*456 PROVIDER LN~
N4*CLEVELAND*OH*44113~
REF*TJ*123456789~
LX*1~
CLP*PT-ACCT-001*1*500.00*450.00*50.00*MC*PAYER-CLAIM-001*11*1~
NM1*QC*1*PATIENT*TEST*A***MI*MEMBER001~
NM1*82*2*RENDERING PROVIDER INC*****XX*1234567890~
DTM*232*20260501~
DTM*233*20260501~
SVC*HC:99213*500.00*450.00**1~
DTM*472*20260501~
CAS*PR*1*50.00~
REF*6R*LINE-CTRL-001~
SE*23*0001~
GE*1*1~
IEA*1*000000001~`;

const ix = parseX12(raw);
ix.warnings; // => []

const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
if (tx === undefined) throw new Error("no 835 in this interchange");
const remit = get835(ix.delimiters, tx);

// The payment header: the money-movement primitive.
remit.payment.totalActualPayment?.toString(); // => "450.00"
remit.payment.creditDebitFlag; // => "C"
remit.payment.method; // => "ACH"
remit.traces[0]?.referenceId; // => "0012345"

// Per claim: your own account number echoed back, and the split.
const claim = remit.claims[0];
claim?.patientControlNumber; // => "PT-ACCT-001"
claim?.totalChargeAmount?.toString(); // => "500.00"
claim?.totalPaymentAmount?.toString(); // => "450.00"
claim?.patientResponsibilityAmount?.toString(); // => "50.00"

// Per service line: who owes the difference, and why.
const adjustment = claim?.serviceLines[0]?.adjustments[0];
adjustment?.groupCode; // => "PR"
adjustment?.reasonCode; // => "1"
adjustment?.reasonDescription; // => "Deductible Amount"
adjustment?.amount?.toString(); // => "50.00"
```

The `groupCode` is what tells you who owes the money (`PR` patient responsibility, `CO` contractual
obligation, and so on). Read it; never infer it.

## PHI and safety

X12 healthcare transactions carry protected health information, so treat every interchange you hand
this library as PHI.

**What it does with your document.** It decodes it in memory and nothing else. No socket is opened,
nothing is written to disk, and nothing is fetched at run time: the bundled code lists are versioned
data snapshots, so updating one is a release rather than a network call. The acknowledgment builders
are pure functions and never auto-send.

**What it keeps out of diagnostics.** A warning `message` is a lookup into a frozen registry rather
than something built from your document, and no warning factory in this library takes a value
parameter, so no element of yours can reach a diagnostic. The code and the `position` say what and
where; the bytes stay on the model. `ALL_WARNING_MESSAGES` is exported so you can assert that.

**The one deliberate exception.** `X12ParseError.snippet` on the four structural fatals is a bounded
copy of the start of the input, so on real traffic it can carry PHI, and it is not redacted. Log
`err.code` and `err.position` instead, or redact at your call site.

**Builder refusals are a weaker surface, deliberately.** A `build*` refusal names the control
number, count or code you passed in, so that you can see what was refused. The rendered fragment is
bounded by an exported constant, but it is bounded rather than redacted. Log `err.code`, not
`err.message`, from a builder.

**What you still own.** Transport, storage, retention, access control, audit logging, and every log
line your own code writes. This library makes no HIPAA compliance claim on your behalf.

## API

Everything ships from one entry point; there are no subpath imports.

- **Read.** `parseX12` decodes an interchange into a model, and a per-transaction reader turns a
  transaction set into a typed one (`get835`, `get837Claims`, `get270Inquiry`, `get271Eligibility`,
  `get276StatusInquiry`, `parse999`, `parseTA1`, and the rest).
- **Emit.** `serializeX12` and `buildInterchange` are the general path, and every transaction set
  with a reader also has a domain builder (`build835`, `build837P`, `build271`, and the rest) that
  layers that guide's own invariants on top.
- **Errors and warnings.** Parsing is lenient, and only **four** structural failures are ever fatal
  (`X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`).
  Everything else arrives on `ix.warnings` as a stable code with positional context, so a tolerated
  deviation is visible rather than silent.
- **Money.** Every monetary, percent and quantity field decodes as `X12Decimal`, which is
  string-backed with BigInt arithmetic, and this library never **`parseFloat`s** an EDI amount. A
  slot the sender left empty reads `undefined` rather than zero, so "stated zero" and "stated
  nothing" stay different readings.
- **Conformance.** `X12_TR3_CONFORMANCE` states which implementation guide each transaction set
  follows and how that identifier stands against the federal incorporation by reference.

Task-oriented recipes are in the [cookbook](./docs-content/cookbook.md), and
[KNOWN-LIMITATIONS.md](./KNOWN-LIMITATIONS.md) is the honest do-not-over-trust list.

## Compatibility

- **005010 HIPAA transaction sets**, with hooks for the errata revisions the industry actually
  exchanges. Non-healthcare sets such as 850, 856, 810 and 204, plus EDIFACT, AS2 and SFTP
  transport, and pre-005010 revisions, are out of scope.
- **Vendor deviations become warnings, not exceptions.** Built-in profiles record whose
  companion-guide deviation they accommodate; selecting one never changes an otherwise correct
  parse, and profiles are authored through the same public `defineProfile()` API you have.
- **Round trips are not byte-exact in general.** `serializeX12` reproduces the segments on the model
  verbatim, including element padding, composites and `?`-release escapes, but
  **`serialize(parse(s)) === s` is not guaranteed in general**. Line breaks between segments are the
  common case: any run of CR or LF between segments is absorbed at parse, so a pretty-printed file
  emits compact. Most of the constructs that break a round trip are silent, so "my file has no line
  breaks" is not sufficient either. [KNOWN-LIMITATIONS.md](./KNOWN-LIMITATIONS.md) is the canonical
  list.

## Contributing

Questions, bug reports and trading-partner quirks all belong in
[GitHub issues](https://github.com/cosyte/x12/issues).

Pull requests are welcome. A contribution must clear `pnpm typecheck`, `pnpm lint` and `pnpm test`,
hold the per-directory coverage floors, pass the PHI commit gate (`pnpm phi-scan`) and the prose
gates (`pnpm check:no-emdash`, `pnpm check:no-internal-refs`), and carry a changeset. Every fixture
must be synthetic: never open a pull request carrying a real patient's data.

## Trademarks

Availity and Blue Cross Blue Shield are trademarks of their respective owners. cosyte is not
affiliated with, endorsed by, or sponsored by any of them. The names identify the trading partners
whose companion-guide deviations the built-in profiles accommodate. See
[TRADEMARKS.md](./TRADEMARKS.md).

## License

MIT, copyright Cosyte. See [LICENSE](./LICENSE).

Built by [Cosyte](https://cosyte.com).
