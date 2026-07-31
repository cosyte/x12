<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://cosyte.com/tile/cosyte-lockup-tile-on-dark-1200x300.png">
  <img alt="Cosyte: a plus mark set in two overlapping rounded squares, one solid and one outlined, beside the Cosyte wordmark" src="https://cosyte.com/tile/cosyte-lockup-tile-on-light-1200x300.png">
</picture>

# @cosyte/x12

> Parse real-world, vendor-quirky ASC X12 healthcare EDI (835 remits, 837 claims, 271 eligibility responses, 277/277CA status, 278, 820, 834, 999/TA1) and pull the fields you need without reading a TR3.

[![npm version](https://img.shields.io/npm/v/@cosyte/x12.svg)](https://www.npmjs.com/package/@cosyte/x12)
[![CI](https://img.shields.io/github/actions/workflow/status/cosyte/x12/ci.yml?branch=main&label=CI)](https://github.com/cosyte/x12/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

A developer-focused ASC X12 EDI parser and utility library for Node.js and TypeScript: the payer-side sibling of [`@cosyte/hl7`](https://github.com/cosyte/hl7). Zero runtime dependencies, dual ESM/CJS, strict types. Lenient on the way in (vendor deviations become warnings, not exceptions), spec-clean on the way out: every domain builder emits spec-clean X12 by construction, and the general serializer does so on request.

> **Status:** pre-alpha, **published on npm** from a public repo, on the `0.0.x`-until-first-alpha ladder. `npm view @cosyte/x12 version` is the source of truth for the current version and this page does not restate it; the badge above is a convenience, not the record. Typed **read** and **emit** support is complete for 271, 277/277CA, 278 (request + response), 820, 834, 835, 837P/I/D, 999, and TA1: every one of those has both a per-transaction reader and a matching domain builder, on top of a general serializer and interchange builder. The **270** and **276** inquiry directions do not: they parse into segments and dot-paths like any other X12, but nothing decodes them into a typed model yet. Pre-alpha means the public API may still move before `0.1`. Pin an exact version.

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

- **Typed read + emit, per transaction**: 271, 277/277CA, 278, 820, 834, 835, 837P/I/D, plus 999/TA1 acknowledgments. Per-transaction helpers (`get835`, `get837Claims`, `get271Eligibility`, …) and a matching domain builder for each (`build835`, `build837P/I/D`, `build271`, …). The 270 and 276 inquiries parse as generic segments; they have no typed model yet.
- **Postel's Law**: a lenient parser (deviations → warnings with a stable code + positional context) and a conservative serializer. `serializeX12` is byte-faithful by default; `{ specClean: true }` reconciles the envelope, and `{ specClean: true, recomputeCounts: true }` also emits the corrected counts (`recomputeCounts` does nothing on its own). A mismatch is always warned, never silently corrected. Only **4 structural failures** are ever fatal.
- **Money is exact**: every monetary/percent/quantity field decodes as `X12Decimal` (string-backed, BigInt arithmetic). The library **never `parseFloat`s** an EDI amount.
- **Safety-critical fidelity**: TRN reassociation traces, 835 balance invariants, 837 HL hierarchy integrity, 834 maintenance types, and 278 certification actions are preserved **verbatim** and never inferred; ambiguity yields a warning or a typed refusal, never a confident wrong answer.
- **PHI-disciplined**: synthetic-only fixtures, a PHI commit-gate, and a warning `message` that is a **lookup into a frozen registry**, not something built from your document. No warning factory in the library takes a value parameter, so no element can reach a diagnostic: the code and `position` say what and where, and the bytes stay on the model. `ALL_WARNING_MESSAGES` is exported so you can assert it. **Builder refusals are a different, and weaker, surface:** a `build*` function that refuses a spec carries structural locators and numeric totals in most cases, but nine of them interpolate an over-long control number into the thrown message verbatim and unbounded, and `build834` / `buildTA1` do the same with an unrecognized maintenance type / TA1 note code. Those are caller-supplied values, so a 120,000-byte one produces a 120,000-byte `Error.message`. Log `err.code`, not `err.message`, from a builder. Tracked in [KNOWN-LIMITATIONS.md](./KNOWN-LIMITATIONS.md). **The one deliberate exception:** `X12ParseError.snippet` on the four Tier-3 structural fatals is a bounded (≤ 64 character) copy of the start of the input, so on real traffic it can carry PHI. The library does not redact it. Redact at your call site, or log `err.code` and `err.position` instead. See [Keeping PHI out of logs](./docs-content/troubleshooting.md).

See the [**Cookbook**](./docs-content/cookbook.md) for task-oriented recipes (post an 835, route 277CA rejections, round-trip a 271, walk an 837, read a 999) and [**KNOWN-LIMITATIONS.md**](./KNOWN-LIMITATIONS.md) for the honest do-not-over-trust list.

## Trademarks

Availity and Blue Cross Blue Shield are trademarks of their respective owners. cosyte is not affiliated with, endorsed by, or
sponsored by any of them. The names identify the trading partners whose companion-guide deviations the built-in profiles accommodate. See [TRADEMARKS.md](./TRADEMARKS.md).

## License

MIT. See [LICENSE](./LICENSE).

Built by [Cosyte](https://cosyte.com).
