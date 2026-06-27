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

Phase 1 (2026-06-27) ships the **envelope decoder**: `parseX12()` decodes ISA / GS / GE / IEA,
detects all four delimiters from fixed ISA byte positions, and round-trips the ISA byte-exact.
Transaction-set bodies inside ST..SE are kept **opaque** at this phase (raw segment strings,
terminator stripped). Per-transaction helpers (`get835`, `get837Claims`, ...) arrive in later phases.

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
ix.groups[0]?.transactions; // ST..SE — bodies opaque at Phase 1

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

## Coming in later phases

- **Phase 2** — segment / element / composite / repetition decode; `defineLoopSpec()`.
- **Phase 3** — `parse999` / `build999` / `parseTA1` / `buildTA1` (pure functions, never auto-sent,
  never open sockets).
- **Phase 4** — `get835` (cash posting — the #1 consultant ask).
- **Phase 5** — `get837Claims` (837P / I / D).
- **Phase 6+** — 270/271, 276/277, 277CA, 278, 820, 834; spec-clean serializer + builder; vendor
  / clearinghouse profile system.

## Next

- Read the **API reference** for every export, generated from source.
- See `@cosyte/hl7` for the matching HL7 v2 toolkit — the two share an API shape on purpose.
