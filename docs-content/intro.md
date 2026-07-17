---
id: intro
title: Getting started
sidebar_position: 1
---

# @cosyte/x12

A developer-focused ASC X12 EDI parser for Node.js and TypeScript. Parse a real-world, vendor-quirky
healthcare interchange and read fields out of it without first reading the X12 standard or a TR3
implementation guide. `@cosyte/x12` is the payer-side sibling of [`@cosyte/hl7`](https://github.com/cosyte/hl7):
the API shape, profile system, and lenient-parser philosophy are deliberately mirrored.

> **Status:** pre-alpha (`0.0.x`), not yet published to npm. The **shipped** surface is the full v1
> HIPAA 005010 read side (270/271, 276/277/277CA, 278, 820, 834, 835, 837P/I/D, 999, TA1), the emit
> side (`serializeX12` + `buildInterchange` and a per-transaction domain builder for every v1 set),
> and the descriptive trading-partner profile system. This documentation is gated to that surface —
> where the parser does not yet do a thing, this site says so rather than promising it. Non-healthcare
> sets, EDIFACT, transport (AS2/SFTP/MLLP), and pre-005010 field maps are explicit v1 non-goals; see
> [Troubleshooting & known limitations](./troubleshooting).

## The transaction sets it covers

The HIPAA **005010** healthcare transaction sets, read and (for every set below) emitted:

- **270 / 271** — eligibility inquiry and response
- **276 / 277** — claim status inquiry and response (incl. **277CA** claim acknowledgment)
- **278** — services review (request and response)
- **820** — premium payment
- **834** — benefit enrollment and maintenance
- **835** — healthcare claim payment / advice (remittance / ERA)
- **837P / 837I / 837D** — professional, institutional, and dental claims
- **999 / TA1** — implementation and interchange acknowledgments

See [The 80/20 transaction sets](./spec-notes-transaction-sets) for the exact reader/builder pair each
one ships and the safety-critical field each preserves verbatim.

## Install and smoke-test

```bash
npm install @cosyte/x12
```

Confirm the package resolves and a real entry point is callable — decode the smallest useful
interchange (an ISA/IEA envelope) and read the version symbol back:

```ts runnable
import { parseX12, VERSION } from "@cosyte/x12";

typeof VERSION; // => "string"

const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "IEA*0*000000001~";

const ix = parseX12(raw);

ix.isa.elements[6].trim(); // => "SENDER"
ix.delimiters.element; // => "*"
Array.isArray(ix.warnings); // => true
```

If that resolves and returns, the install is good — head to the [Installation](./installation) page
for prerequisites and module-system notes, then the [Quickstart](./quickstart) for a first useful
result.

## The archetype in one line

The parser is **lenient by default** — vendor deviations become Tier-2 `warnings` carrying a stable
code and positional context, not failures — while the builders emit spec-clean X12 and **refuse**
(never silently corrupt) a structurally impossible spec (Postel's Law). Only four unrecoverable
Tier-3 structural errors ever throw. Money is decimal-exact end to end (`X12Decimal`, BigInt-backed —
**never `parseFloat` an EDI amount**). See [Core Concepts](./spec-notes-envelope) for the mental
model.

## Next

- [Installation](./installation) — prerequisites, module systems, and the PHI discipline.
- [Quickstart](./quickstart) — parse an 835 remittance and post the cash in a few lines.
- [Core Concepts](./spec-notes-envelope) — the envelope/loop model, the transaction sets, the
  tolerance tiers, and decimal-exact money.
- [Cookbook](./cookbook) — task-oriented recipes for the transactions you actually get handed.
- [Troubleshooting & known limitations](./troubleshooting) — fatal codes, the fail-safe rules, and
  what v1 does not do.
- **API reference** — every export, generated from source.
