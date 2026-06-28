---
id: intro
title: Getting started
sidebar_position: 1
---

# @cosyte/x12

A developer-focused ASC X12 EDI parser for Node.js and TypeScript. Parse a real-world, vendor-quirky
healthcare interchange and read fields out of it without first reading the X12 standard or a TR3
implementation guide. `@cosyte/x12` is the payer-side sibling of [`@cosyte/hl7`](../hl7/intro): the
API shape, profile system, and lenient-parser philosophy are deliberately mirrored.

It covers the HIPAA **005010** healthcare transaction sets:

- **270 / 271** — eligibility inquiry and response
- **276 / 277** — claim status inquiry and response
- **278** — services review (request and response)
- **834** — benefit enrollment and maintenance
- **835** — healthcare claim payment / advice (remittance)
- **837P / 837I / 837D** — professional, institutional, and dental claims
- **999 / TA1** — implementation and interchange acknowledgments

## Status — pre-alpha `0.0.x`

Phase 1 (2026-06-27) shipped the **envelope decoder**: `parseX12()` decodes ISA / GS / GE / IEA,
detects all four delimiters from fixed ISA byte positions, and round-trips the ISA byte-exact.

Phase 2 (2026-06-27) adds the **syntactic core**: every body segment is decoded into an immutable
`X12Segment` (id + 1-indexed elements), the `?`-release-character escape is honored losslessly,
and a dot-path resolver (`getSegmentValue(seg, "03-1")`) walks elements, composites (`-N`), and
repetitions (`[N]`, 0-indexed). The public `defineLoopSpec()` API ships for TR3 loop authoring —
Phase 3+ transaction extractors are authored through the same public API consumers use.

Per-transaction helpers (`get835`, `get837Claims`, ...) arrive in later phases.

The package is not yet published to npm.

## Install (when published)

```bash
npm install @cosyte/x12
```

## Parse an envelope today

```ts
import { parseX12, WARNING_CODES } from "@cosyte/x12";

const ix = parseX12(raw); // string | Buffer

ix.isa.elements[6]; // ISA-06 — sender ID
ix.isa.elements[12]; // ISA-12 — version, expected "00501"
ix.delimiters.element; // detected from ISA byte 4
ix.delimiters.component; // ISA-16 (rarely `:` outside Medicare)
ix.delimiters.segment; // post-ISA-16
ix.groups[0]?.gs.elements[1]; // GS-01 — functional ID code ("HC" for claims)
ix.groups[0]?.transactions; // ST..SE — bodies decoded at Phase 2

for (const w of ix.warnings) {
  if (w.code === WARNING_CODES.X12_PRE_005010) {
    // sender on pre-005010 version family
  }
}
```

The parser is **lenient by default** — vendor deviations become Tier-2 warnings carrying a stable
code and positional context, not failures. Four unrecoverable Tier-3 errors throw `X12ParseError`:
`X12_EMPTY_INPUT`, `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`. Pass
`{ strict: true }` to escalate every tolerated deviation into a thrown error carrying the warning
code.

## Read inside a transaction (Phase 2)

```ts
import { getSegmentValue, parseX12 } from "@cosyte/x12";

const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions[0];

// Every body segment is decoded — id + 1-indexed elements (raw text).
const hi = tx?.segments.find((s) => s.id === "HI");
hi?.elements[1]; // "ABK:J45.50" (verbatim composite text)

// Dot-path resolves composites and repetitions:
getSegmentValue(hi!, "01-1", ix.delimiters); // "ABK"   — diagnosis qualifier
getSegmentValue(hi!, "01-2", ix.delimiters); // "J45.50" — code
getSegmentValue(hi!, "02-1", ix.delimiters); // "ABF"   — second composite

// Repetitions are 0-indexed:
const eq = tx?.segments.find((s) => s.id === "EQ");
getSegmentValue(eq!, "01[0]", ix.delimiters); // first repetition
getSegmentValue(eq!, "01[2]", ix.delimiters); // third repetition
```

Define a TR3 loop spec the same way the built-in transaction extractors do (dogfooding):

```ts
import { defineLoopSpec } from "@cosyte/x12";

const Loop2300 = defineLoopSpec({
  id: "2300",
  description: "837 Claim Information",
  trigger: "CLM",
  segments: [
    { id: "CLM", usage: "required", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "HI", usage: "situational", max: ">1" },
  ],
});
```

## Coming in later phases

- **Phase 3** — `parse999` / `build999` / `parseTA1` / `buildTA1` (pure functions, never auto-sent,
  never open sockets).
- **Phase 4** — `get835` (cash posting — the #1 consultant ask).
- **Phase 5** — `get837Claims` (837P / I / D).
- **Phase 6** — `get271Eligibility` (270/271), `get277Status` (276/277), `get277CADisposition`
  (277CA). The 271 echoes the requesting 270's TRN verbatim (safety-critical reassociation);
  STC status decodes verbatim CSCC / CSC codes against bundled snapshots.
- **Phase 7** — 278 services review, 820 premium payment, 834 enrollment.
- **Phase 8** — the **emit** half: `serializeX12(ix, opts?)` (byte-faithful by default; spec-clean
  envelope-count + control-pair reconciliation via `onWarning`, never silently corrected) and the
  general `buildInterchange(spec)` (owns the ISA / GS / GE / SE / IEA mechanics + counts).
- **Domain builders** — pure-function per-transaction emit helpers that layer the safety-critical
  per-TR3 invariants on the general surface and round-trip through their reader field-for-field:
  `build835` (005010X221A1 ERA, REFUSES an out-of-balance remit via `Remit835BuildError`),
  `build837P/I/D` (claim submission, computes the HL spine + REFUSES an impossible hierarchy via
  `Claim837BuildError`), `build271` / `build277` / `build277CA` (eligibility + claim-status
  responses, echo the requesting TRN verbatim + compute the HL spine + REFUSE a broken hierarchy via
  `Eligibility271BuildError` / `ClaimStatus277BuildError`), and `build278Request` / `build278Response`
  / `build820` / `build834` (services review + premium + enrollment; the 278 echoes the HCR
  certification verbatim, the 834 refuses an unknown maintenance type). The v1 emit scope is now
  complete; none ever auto-send, open a socket, or touch the filesystem.
- **Profile system** — `defineProfile()` (mirroring `@cosyte/hl7`) + a `profiles` namespace of
  built-ins that ATTRIBUTE clearinghouse / payer companion-guide quirks. v1 profiles are
  **descriptive**: a profile attaches metadata to `ix.profile` and powers `partitionWarnings`, but
  never alters the lossless lenient parse. The locked hard rule — **no invented quirks** — requires
  every quirk to cite a Tier-2 fixture that demonstrably exhibits the deviation. Ships `availity` and
  `bcbsCommon`; profiles whose only "deviation" is a canonical baseline are deferred, not invented.

## Next

- Read the **API reference** for every export, generated from source.
- See `@cosyte/hl7` for the matching HL7 v2 toolkit — the two share an API shape on purpose.
