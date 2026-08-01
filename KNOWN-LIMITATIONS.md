# Known limitations & non-goals

`@cosyte/x12` is built to be **correct and honest about its edges** rather than to claim more than it
delivers. Misreading a payer's remittance, a claim's diagnosis, or a member's coverage can cause real
financial or clinical harm, so this is the deliberate "do not over-trust" list. Everything here is a
documented, intentional boundary, not a bug. The lenient parser never silently drops or garbles data:
where a limitation applies, the raw value is preserved (often with a warning), it is simply not
further decoded.

## Data / decode boundaries

- **Bundled code-list snapshots are pre-launch initial subsets, not the full WPC-published lists.**
  CARC, RARC, Claim-Status-Category (CSCC), Claim-Status (CSC), service-type, CLP-status, and
  maintenance-type ship as versioned data artifacts sized to the parser's Tier-1/Tier-2 fixtures plus
  the long-tail codes most workflows branch on. An inbound code **outside** a snapshot still parses:
  the verbatim code is preserved on the model and an `X12_UNKNOWN_*` warning is raised. Only the
  human-readable **description** is absent (`undefined`). A stale or partial snapshot therefore yields
  a missing description, **never a wrong code**. Run `pnpm refresh:code-lists` to audit snapshot
  freshness; regenerating the full lists (`--fetch`) is a redistribution-terms-gated release step (see
  below), not a runtime fetch.

- **837 claim-/line-level provider addresses (Loop 2310 / 2420 `N3`/`N4`) are not surfaced.** The
  provider **identities** (`NM1`) round-trip, but the street-address lines do not decode onto the
  model. Read them from the raw segments if you need them.

- **`get834Enrollments` streams members but still parses the whole file up front.** It yields one
  decoded member per `INS` loop (so a consumer holds one member at a time), but the underlying
  interchange is fully parsed into `tx.segments` before iteration begins. It is not a byte-streaming
  reader for arbitrarily large files.

- **Builder refusal messages are NOT registry-bound, and at least sixteen sites across ten builder
  modules echo a caller-supplied value unbounded.** The parse side is closed: no warning factory takes
  a value parameter and every `message` is a frozen-registry lookup. The emit side is not, and the
  sites divide into two kinds.

  **Gated on length (nine sites).** The `control number "${value}"` template in
  `X12_*_BUILD_INVALID_SPEC` repeats across `build-interchange.ts`, `build-999.ts`, `build-835.ts`,
  `build-837.ts`, `build-271.ts`, `build-277.ts`, `build-278.ts`, `build-820.ts` and `build-834.ts`,
  and it fires **precisely because the value is over-long**.

  **Not gated on length at all (seven sites).** `build-999.ts` interpolates the supplied ST-02
  transaction-set control number into two of its `X12_ACK_ACCEPT_WITH_ERRORS` refusals;
  `build-interchange.ts` interpolates the supplied transaction-set id code into its empty-segment-id
  refusal; `build-837.ts` interpolates a service line's `variant`; `build-834.ts` interpolates an
  unrecognized INS-03 and an unrecognized HD-01 maintenance type; and `build-ta1.ts` interpolates an
  unrecognized TA1-05 note code. Any of these renders a value of any size.

  Measured with a 120,000-byte caller value: `build999` throws a **120,155-byte** `message` with a
  120,670-byte `stack`, and `buildInterchange` throws a **120,069-byte** `message`. These are values
  **you** supplied rather than bytes off an inbound interchange, which is why this is a limitation
  rather than a parse-side leak, but a spec assembled from an inbound document carries inbound values.
  **Log `err.code` from a builder, not `err.message`.**

- **`X12ParseError.snippet` on a Tier-3 fatal can carry PHI, by design, and the library does not
  redact it.** Warning messages come from a frozen registry and no factory takes a value parameter, so
  they cannot echo an element; the four structural fatals are different, because they are raised
  before the envelope is readable and each carries a bounded (≤ 64 character) copy of the start of
  the input so the error is actionable. On real traffic those bytes can be patient data. Redact at
  your call site, or log `err.code` and `err.position` and drop `err.snippet`. A **strict-mode
  escalation carries no snippet**: the error it raises wraps a registry-built warning, so `err.snippet`
  is `""`.

- **Two classes of locator-flavoured model field are left unbounded on purpose, and a downstream
  package should not interpolate them.** `X12HierarchicalLevel.hlId` / `.parentHlId` / `.levelCode` /
  `.hasChild` (and the shared `X12Hl`) stay byte-verbatim because collapsing two distinct
  non-conformant HL ids to one sentinel would make them compare equal and silently merge two
  subscribers' claims into one hierarchy; a wrong hierarchy is worse than a wide locator. The 999's
  error report is the other class: `X12Ack999Ak1.functionalIdCode`,
  `X12Ack999Ak2.transactionSetIdCode`, `X12Ack999Ik3.segmentIdCode` / `.loopIdentifier` and
  `X12Ack999Ik4.dataElementReferenceNumber` are the trading partner's report of
  where **they** found a problem, which is the content a 999 exists to deliver. `X12Segment.id` is
  bounded to the X12 segment-id grammar (a non-conformant first element yields
  `NON_SPEC_SEGMENT_ID`) precisely because it is a derived locator with no such argument; the bytes
  stay on `seg.raw` and `seg.elements[0]`. **No warning code is raised for that substitution, and no
  code distinguishes two different non-conformant ids through `seg.id`.** That is deliberate rather
  than an oversight: it bounds a derived field, it is not a parse deviation, and every walker
  dispatches on an exact segment-id match, so a first element outside the grammar could never have
  matched a walker in the first place. Compare `seg.id === NON_SPEC_SEGMENT_ID` when you need to
  detect one, and read `seg.elements[0]` for which one it was.

- **`X12Ack999Ik4.copyOfBadDataElement` is a copy of the offending bytes and can carry PHI.** It is
  whatever the sender put in IK4-04; the library never auto-populates it, and senders SHOULD omit it
  when the bytes are PHI.

- **Balance and integrity checks warn; they never rebalance or renumber.** The 835 TR3 §1.10.2 balance
  invariants, 837 HL parent-pointer integrity, and envelope-count reconciliation surface a warning on
  mismatch and preserve the inbound values verbatim. The library will not "fix" a payer artifact for
  you. Gate your own posting/adjudication on the warning.

## Conformance testing not yet wired

- **No external-oracle differential corpus yet.** A best-effort differential harness against CMS
  Medicare 835 public examples (and/or another external X12 reader) is planned for the first real
  release but is **not yet wired**, pending a redistribution-terms review of the CMS sample material.
  Conformance today rests on the three-tier synthetic corpus (spec-clean → vendor-quirk → round-trip
  goldens), property/round-trip tests, and a nightly amplified byte-flip fuzz job, not on parity with
  a third-party implementation. Do not assume byte-for-byte agreement with any specific vendor parser.

## Scope (non-goals for v1)

- **Healthcare HIPAA 005010 only.** Non-healthcare transaction sets (850/856/810/204, etc.), the
  EDIFACT syntax family, and pre-005010 versions are out of v1 scope. Pre-005010 input is tolerated
  and flagged (`X12_PRE_005010`), not decoded to those older field maps.
- **No transport.** AS2, SFTP, and MLLP-style delivery are out of scope. This is a parser/serializer,
  not a communications stack.
- **Published, still pre-alpha.** The package is published on npm as `@cosyte/x12` from a public
  repo, but it stays on the `0.0.x`-until-first-alpha ladder. `npm view @cosyte/x12 version` is the
  only source of truth for the current version, so this page does not restate one. Treat the API as
  pre-alpha and pin the exact version until the first alpha.
- **No typed model for the 270 and 276 inquiries.** Every other v1 transaction has both a
  per-transaction reader and a domain builder. The 270 eligibility inquiry and the 276 claim-status
  inquiry have neither: they parse into segments, composites, and dot-paths like any other X12 input,
  and the responses (271, 277) decode fully, but the inquiry directions have no typed surface yet.

## Code-list `--fetch` regeneration

`pnpm refresh:code-lists` (default) validates the bundled snapshots and prints a freshness audit,
offline and CI-safe. The `--fetch` mode that would **regenerate** the full lists from their canonical
WPC / X12 sources is deliberately **not** run in automation: redistributing the full WPC code
descriptions requires a redistribution-terms review that has not cleared, and it needs outbound
network. The tool prints the canonical source manifest and exits rather than fabricating descriptions
the maintainers have not reviewed.

---

For the phase-by-phase surface and the exact fields each helper decodes, see the package's
[`CLAUDE.md`](./CLAUDE.md) status section and the [Cookbook](./docs-content/cookbook.md).
