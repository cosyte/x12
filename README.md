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
- **Postel's Law**: a lenient parser (deviations → warnings with a stable code + positional context) and a conservative serializer. `serializeX12` is byte-faithful **for the segments on the model** by default: each comes back verbatim, including element padding, composites, and `?`-release escapes. **`serialize(parse(s)) === s` is not guaranteed in general.** Six constructs are known not to survive: line breaks between segments (any run of CR / LF between segments is absorbed at parse, so a pretty-printed or double-spaced file emits compact), a doubled terminator outside a transaction, a missing final terminator (the emit supplies one), post-IEA `trailingBytes` (re-joined, not verbatim), a TA1 that followed a functional group (emitted right after the ISA, so it is **reordered**, though nothing is lost), and a segment whose first element is empty outside a transaction (skipped entirely, with no warning at all). A **segment outside a transaction is not on that list**: it is reported as `X12_UNEXPECTED_SEGMENT`, kept on the model at `ix.orphanSegments` with a structural `anchor`, and re-emitted at that anchor, so the segment, its value and its warning all survive the round trip - placement is by the anchor and never by `segmentIndex`, which indexes the input stream the emit does not follow. The last five break the round trip on inputs with no line breaks at all, so do not treat "no line breaks" as sufficient; five of the six are silent, so a clean warnings list does not mean byte-exact either. Measured across this repo's 56 fixtures: every emit is a fixed point and re-parses to an identical model with an identical warning stream, the 14 with no line breaks return byte-identical, and the other 42 differ by line breaks and nothing else. See [Line endings between segments](./docs-content/spec-notes-envelope.md). `{ specClean: true }` reconciles the envelope, and `{ specClean: true, recomputeCounts: true }` also emits the corrected counts (`recomputeCounts` does nothing on its own). A mismatch is always warned, never silently corrected. Only **4 structural failures** are ever fatal.
- **Money is exact**: every monetary/percent/quantity field decodes as `X12Decimal` (string-backed, BigInt arithmetic). The library **never `parseFloat`s** an EDI amount.
- **Safety-critical fidelity**: TRN reassociation traces, 835 balance invariants, 837 HL hierarchy integrity, 834 maintenance types, and 278 certification actions are preserved **verbatim** and never inferred; ambiguity yields a warning or a typed refusal, never a confident wrong answer.
- **PHI-disciplined**: synthetic-only fixtures, a PHI commit-gate, and a warning `message` that is a **lookup into a frozen registry**, not something built from your document. No warning factory in the library takes a value parameter, so no element can reach a diagnostic: the code and `position` say what and where, and the bytes stay on the model. `ALL_WARNING_MESSAGES` is exported so you can assert it. **Builder refusals are a different, and deliberately weaker, surface:** twenty-four refusal sites across ten builder modules name a value you passed in, so you can see which control number, count or code was refused. **What they will never name is a `claimId`, a member id, a member name, a trace or a diagnosis code** - a guarantee that held for the refusal templates and, until the release after `0.0.10`, did not hold for the shared type guards underneath them: a JSON-driven caller who sent a number where the types say string got `a number ("900412345678")` back, bounded but not redacted, from a guard standing on every element of every builder. Those guards report the type and the slot now and never the value. Each goes through `renderCallerValue`, capping the rendered **fragment** at `BUILD_REFUSAL_VALUE_MAX_RENDERED` (90 characters); all three names are exported so you can assert the ceiling. The whole `message` is that plus the site's own fixed text, so it is bounded by a constant but a larger one: a 120,000-character control number gave a 120,066-character `X12BuildError.message` before this and gives 150 now. That is robustness, not redaction: the value is one you supplied and bounding it hides nothing from you. It is also not escaped, and on the **ack** path it is not always strictly your own, since `build999`'s AK2-02 and `buildTA1` echo an inbound document's control numbers by design. Log `err.code`, not `err.message`, from a builder. **`defineProfile()` is bounded on the same terms since `0.0.6`** (twelve refusal sites, twenty-three caller values; the worst message measured **360,181 characters** before and **431** now, both at the `fixture` refusal, which names three caller values; the ceiling for that site is 443 and the suite asserts every site under 500; `X12ProfileError.profileName` is deliberately left unbounded so it still matches the name you passed). **And a forged non-array in a builder spec now refuses instead of hanging:** every indexed loop takes its bound from a checked array, so `{ length: "9".repeat(120000) }` draws a typed refusal rather than coercing to `Infinity` and looping forever. A few `for…of` reads still throw an untyped `TypeError` instead; both are in [KNOWN-LIMITATIONS.md](./KNOWN-LIMITATIONS.md). **The one deliberate exception:** `X12ParseError.snippet` on the four Tier-3 structural fatals is a bounded (≤ 64 character) copy of the start of the input, so on real traffic it can carry PHI. The library does not redact it. Redact at your call site, or log `err.code` and `err.position` instead. See [Keeping PHI out of logs](./docs-content/troubleshooting.md).

See the [**Cookbook**](./docs-content/cookbook.md) for task-oriented recipes (post an 835, route 277CA rejections, round-trip a 271, walk an 837, read a 999) and [**KNOWN-LIMITATIONS.md**](./KNOWN-LIMITATIONS.md) for the honest do-not-over-trust list.

## Trademarks

Availity and Blue Cross Blue Shield are trademarks of their respective owners. cosyte is not affiliated with, endorsed by, or
sponsored by any of them. The names identify the trading partners whose companion-guide deviations the built-in profiles accommodate. See [TRADEMARKS.md](./TRADEMARKS.md).

## License

MIT. See [LICENSE](./LICENSE).

Built by [Cosyte](https://cosyte.com).
