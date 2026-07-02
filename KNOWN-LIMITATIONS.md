# Known limitations & non-goals

`@cosyte/x12` is built to be **correct and honest about its edges** rather than to claim more than it
delivers. Misreading a payer's remittance, a claim's diagnosis, or a member's coverage can cause real
financial or clinical harm, so this is the deliberate "do not over-trust" list. Everything here is a
documented, intentional boundary — not a bug. The lenient parser never silently drops or garbles data:
where a limitation applies, the raw value is preserved (often with a warning), it is simply not
further decoded.

## Data / decode boundaries

- **Bundled code-list snapshots are pre-launch initial subsets, not the full WPC-published lists.**
  CARC, RARC, Claim-Status-Category (CSCC), Claim-Status (CSC), service-type, CLP-status, and
  maintenance-type ship as versioned data artifacts sized to the parser's Tier-1/Tier-2 fixtures plus
  the long-tail codes most workflows branch on. An inbound code **outside** a snapshot still parses:
  the verbatim code is preserved on the model and an `X12_UNKNOWN_*` warning is raised — only the
  human-readable **description** is absent (`undefined`). A stale or partial snapshot therefore yields
  a missing description, **never a wrong code**. Run `pnpm refresh:code-lists` to audit snapshot
  freshness; regenerating the full lists (`--fetch`) is a redistribution-terms-gated release step (see
  below), not a runtime fetch.

- **837 claim-/line-level provider addresses (Loop 2310 / 2420 `N3`/`N4`) are not surfaced.** The
  provider **identities** (`NM1`) round-trip, but the street-address lines do not decode onto the
  model. Read them from the raw segments if you need them.

- **`get834Enrollments` streams members but still parses the whole file up front.** It yields one
  decoded member per `INS` loop (so a consumer holds one member at a time), but the underlying
  interchange is fully parsed into `tx.segments` before iteration begins — it is not a byte-streaming
  reader for arbitrarily large files.

- **Balance and integrity checks warn; they never rebalance or renumber.** The 835 TR3 §1.10.2 balance
  invariants, 837 HL parent-pointer integrity, and envelope-count reconciliation surface a warning on
  mismatch and preserve the inbound values verbatim. The library will not "fix" a payer artifact for
  you — gate your own posting/adjudication on the warning.

## Conformance testing not yet wired

- **No external-oracle differential corpus yet.** A best-effort differential harness against CMS
  Medicare 835 public examples (and/or another external X12 reader) is planned for the first real
  release but is **not yet wired**, pending a redistribution-terms review of the CMS sample material.
  Conformance today rests on the three-tier synthetic corpus (spec-clean → vendor-quirk → round-trip
  goldens), property/round-trip tests, and a nightly amplified byte-flip fuzz job — not on parity with
  a third-party implementation. Do not assume byte-for-byte agreement with any specific vendor parser.

## Scope (non-goals for v1)

- **Healthcare HIPAA 005010 only.** Non-healthcare transaction sets (850/856/810/204, etc.), the
  EDIFACT syntax family, and pre-005010 versions are out of v1 scope. Pre-005010 input is tolerated
  and flagged (`X12_PRE_005010`), not decoded to those older field maps.
- **No transport.** AS2, SFTP, and MLLP-style delivery are out of scope — this is a parser/serializer,
  not a communications stack.
- **Not yet published.** The package sits at `0.0.0` on the `0.0.x`-until-first-alpha ladder and is
  **not on npm**; the first provenance publish is gated on the coordinated public launch.

## Code-list `--fetch` regeneration

`pnpm refresh:code-lists` (default) validates the bundled snapshots and prints a freshness audit —
offline and CI-safe. The `--fetch` mode that would **regenerate** the full lists from their canonical
WPC / X12 sources is deliberately **not** run in automation: redistributing the full WPC code
descriptions requires a redistribution-terms review that has not cleared, and it needs outbound
network. The tool prints the canonical source manifest and exits rather than fabricating descriptions
the maintainers have not reviewed.

---

For the phase-by-phase surface and the exact fields each helper decodes, see the package's
[`CLAUDE.md`](./CLAUDE.md) status section and the [Cookbook](./docs-content/cookbook.md).
