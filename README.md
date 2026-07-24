# @cosyte/x12

> Parse real-world, vendor-quirky ASC X12 healthcare EDI (835 remits, 837 claims, 270/271 eligibility, 276/277 status, 278, 820, 834, 999/TA1) and pull the fields you need without reading a TR3.

[![npm version](https://img.shields.io/npm/v/@cosyte/x12.svg)](https://www.npmjs.com/package/@cosyte/x12)
[![CI](https://img.shields.io/github/actions/workflow/status/cosyte/x12/ci.yml?branch=main&label=CI)](https://github.com/cosyte/x12/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

A developer-focused ASC X12 EDI parser and utility library for Node.js and TypeScript: the payer-side sibling of [`@cosyte/hl7`](https://github.com/cosyte/hl7). Zero runtime dependencies, dual ESM/CJS, strict types. Lenient on the way in (vendor deviations become warnings, not exceptions), spec-clean on the way out.

> **Status:** pre-alpha, **published on npm at `0.0.1`**, on the `0.0.x`-until-first-alpha ladder, from a public repo. The full v1 **read** scope (270/271, 276/277/277CA, 278, 820, 834, 835, 837P/I/D, 999, TA1) and **emit** scope (per-transaction domain builders + a general serializer) are complete and hardened. Pre-alpha means the public API may still move before `0.1`. Pin an exact version.

## Quickstart

```bash
# pnpm (recommended), also works with: npm install @cosyte/x12  |  yarn add @cosyte/x12
pnpm add @cosyte/x12
```

Parse an 835 remittance advice and read the money, three lines of useful output, no TR3 lookup:

```ts
import { parseX12, get835 } from "@cosyte/x12";

const ix = parseX12(rawEdi); // never throws except on 4 structural fatals
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
const remit = tx ? get835(ix.delimiters, tx) : undefined;

remit?.payment.totalActualPayment.toString(); // "450.00": BigInt-exact, never a float
remit?.claims[0]?.patientControlNumber; // "PT-ACCT-001": your account number, echoed back
remit?.claims[0]?.serviceLines[0]?.adjustments[0]?.reasonCode; // "1": CARC (why it was adjusted)
```

That's the pitch: no schema upload, no spec knowledge. The parser accepts vendor-quirky input by default and flags what it tolerated with stable warning codes; you reach for strict mode, dot-paths, profiles, or the emit builders when you want them.

## What's inside

- **Every v1 HIPAA transaction, read + emit**: 270/271, 276/277/277CA, 278, 820, 834, 835, 837P/I/D, plus 999/TA1 acknowledgments. Per-transaction helpers (`get835`, `get837Claims`, `get271Eligibility`, …) and domain builders (`build835`, `build837P/I/D`, `build271`, …).
- **Postel's Law**: a lenient parser (deviations → warnings with a stable code + positional context) and a strict, spec-clean serializer with recomputed envelope counts. Only **4 structural failures** are ever fatal.
- **Money is exact**: every monetary/percent/quantity field decodes as `X12Decimal` (string-backed, BigInt arithmetic). The library **never `parseFloat`s** an EDI amount.
- **Safety-critical fidelity**: TRN reassociation traces, 835 balance invariants, 837 HL hierarchy integrity, 834 maintenance types, and 278 certification actions are preserved **verbatim** and never inferred; ambiguity yields a warning or a typed refusal, never a confident wrong answer.
- **PHI-disciplined**: synthetic-only fixtures, a PHI commit-gate, and warnings/errors that carry codes and positions but never patient data.

See the [**Cookbook**](./docs-content/cookbook.md) for task-oriented recipes (post an 835, route 277CA rejections, round-trip a 271, walk an 837, read a 999) and [**KNOWN-LIMITATIONS.md**](./KNOWN-LIMITATIONS.md) for the honest do-not-over-trust list.

## Trademarks

Availity and Blue Cross Blue Shield are trademarks of their respective owners. cosyte is not affiliated with, endorsed by, or
sponsored by any of them. The names identify the trading partners whose companion-guide deviations the built-in profiles accommodate. See [TRADEMARKS.md](./TRADEMARKS.md).

## License

MIT. See [LICENSE](./LICENSE).

Built by [Cosyte](https://cosyte.com).
