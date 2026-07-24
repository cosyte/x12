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
bug. The lenient parser never silently drops or garbles data; where a limitation applies, the raw
value is preserved (often with a warning), it is simply not further decoded.

## When does it throw vs warn?

Only **four** unrecoverable structural conditions throw; everything else is a warning on the model.

```ts runnable throws
import { parseX12 } from "@cosyte/x12";

parseX12(""); // throws X12ParseError (X12_EMPTY_INPUT)
```

| Fatal code (throws) | Meaning |
|---|---|
| `X12_EMPTY_INPUT` | Nothing to parse. |
| `X12_NO_ISA_HEADER` | Input does not begin with an ISA. It is not an X12 interchange. |
| `X12_ISA_TOO_SHORT` | ISA truncated below its fixed 106 bytes; delimiters unreadable. |
| `X12_INVALID_DELIMITERS` | Delimiters can't be recovered from the ISA. |

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

| Symptom | Likely cause | What to do |
|---|---|---|
| `get835` / `get837Claims` returns `undefined` | The transaction set isn't the one that reader decodes (wrong `ST-01`, or `get277CADisposition` on a non-`X214` message) | Route on `tx.st.elements[1]` (and GS-01) first; hand each transaction to the matching reader. |
| An adjustment's `reasonDescription` is `undefined` | The CARC/RARC code is outside the bundled snapshot | The verbatim code is still on the model; an `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC` warning is raised. A stale snapshot yields a missing description, never a wrong code. |
| A `X12_835_REMIT_BALANCE_MISMATCH` warning | The payer's numbers don't add up under the §1.10.2 invariants | Do **not** auto-post; the library preserves the inbound values and will not rebalance. Route to a human. |
| A `X12_HL_PARENT_MISMATCH` warning on an 837/271/277 | A broken HL parent pointer in the hierarchy | The pointer is preserved verbatim, never re-numbered; decide whether to trust the loop nesting. |
| Fields parse but `parseFloat` gives odd totals | You called `parseFloat` on an EDI amount | Read the `X12Decimal` and do exact arithmetic on it; never `parseFloat`. See [Decimal-exact money](./spec-notes-money). |
| A `X12_PRE_005010` warning | ISA-12 declares a version family other than `00501` | Tolerated and flagged, not decoded against older field maps. Pass `{ strict: true }` to make it a hard failure for a trusted partner. |

## Keeping PHI out of logs

Every warning `message` is **bounded and PHI-free by construction**. It carries the stable code and a
position, never a patient name, member ID, or date. That means you can log the full `.warnings` array
without leaking. The builders' refusal errors carry structural locators and numeric totals only, never
a `claimId`, member ID, or trace. Keep the same discipline in your own code: log the code and position,
not the field content.

## Known limitations & non-goals

### Data / decode boundaries

- **Bundled code-list snapshots are pre-launch initial subsets, not the full WPC-published lists.**
  CARC, RARC, Claim-Status-Category (CSCC), Claim-Status (CSC), service-type, CLP-status, and
  maintenance-type ship as versioned data artifacts. An inbound code outside a snapshot still parses:
  the verbatim code is preserved and an `X12_UNKNOWN_*` warning is raised. Only the human-readable
  **description** is absent. A stale or partial snapshot yields a missing description, **never a wrong
  code**.
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
- **Published, still pre-alpha.** The package is published on npm as `@cosyte/x12` at `0.0.1` and is
  public, but it stays on the `0.0.x`-until-first-alpha ladder. Treat the API as pre-alpha and pin
  the exact version until the first alpha.

For the phase-by-phase surface and the exact fields each helper decodes, see the package's
`CLAUDE.md` status section and the [Cookbook](./cookbook).
