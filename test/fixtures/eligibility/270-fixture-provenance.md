# 270 fixture provenance

Every `270-*.edi` file in this directory is **synthetic**: hand-authored here
against the WPC TR3 `005010X279A1` request structure. None was captured from a
feed, a clearinghouse sample or a partner's test file, and none was
de-identified from anything.

## Provenance category

The vocabulary is `phi-scan-overrides.md` at the repo root, which names two
routes by which a fixture is declared safe, and prefers the first:

1. **Declared** - the fixture's realistic-shaped tokens are positively listed
   in `scripts/phi-allow-list.txt`, or they match a synthetic SHAPE the scanner
   recognises on its own (`isSyntheticMemberId`, `isSyntheticNpi`).
2. **Overridden** - `phi-scan --allow-fixture <path>` plus a matching
   `### <path>` subsection in `phi-scan-overrides.md`. An override is global and
   route-blind: it silences every check for that file, on the whole-tree sweep
   and on the commit-blocking `--staged` route alike.

**Every fixture below is category 1, and NONE of them takes route 2.** No entry
was added to `phi-scan-overrides.md` for this work and no new token was added to
`scripts/phi-allow-list.txt` either: each fixture reuses tokens already declared
there, or a shape the scanner already recognises.

The declared tokens each fixture reuses:

| token | where it sits | why it clears |
|---|---|---|
| `DOE`, `JANE`, `JOHN`, `BABY` | NM1-03 / NM1-04 on a person level | already `NAME` entries in the allow-list |
| `19850515`, `19800101`, `20240101` | DMG-02 | already `DOB` entries in the allow-list |
| `MBR0001`, `MBR0002` | NM1-09 under an `MI` qualifier | the `MBR` prefix is a shape `isSyntheticMemberId` recognises |
| `1234567890` | NM1-09 under an `XX` qualifier | the `123456789` sequential base is a shape `isSyntheticNpi` recognises |
| `PAYER01` | NM1-09 under a `PI` qualifier on a non-person | not a member id and not an NPI shape |

Single-letter middle initials (`A`, `C`) are below the scanner's two-character
token floor and are not name tokens to it. Every service and transaction date is
`2026`, which is past the scanner's service-date cutoff.

## Framing, which is load-bearing for two of these

Every fixture is written as ONE line, so that the only file carrying whitespace
between segments is the one whose whole purpose is to carry it. That is
deliberate rather than a style choice: `X12_270_INTER_SEGMENT_WHITESPACE`
reports exactly this deviation, so a pretty-printed corpus would have made every
fixture a quirky one and left the spec-clean baseline with no member.

Both tolerance codes are raised **once per 270 transaction set**, not once per
occurrence. That granularity is chosen here and held across BOTH deviation
classes: a document declaring four non-conventional delimiters raises one
delimiter warning, and a document with a line break after every terminator
raises one framing warning. Each is anchored at the ISA, which is where a
delimiter set is declared and where the framing rules come from.

## The files

| fixture | what it is | expected on the 270 path |
|---|---|---|
| `270-canonical.edi` | realistic subscriber-level inquiry: payer, provider, subscriber with trace, address, demographics, a plan date and one EQ carrying two service types and a procedure composite | no warning |
| `270-minimal.edi` | spec-clean minimal: three levels, one EQ, nothing optional | no warning |
| `270-dependent.edi` | a dependent under a subscriber, each with its own trace and its own EQ; the dependent's date is an `RD8` range | no warning |
| `270-quirk-delimiters.edi` | the canonical, re-delimited: element `\|`, repetition `!`, component `>`, terminator `\` | `X12_270_NON_CONVENTIONAL_DELIMITER` |
| `270-quirk-linebreaks.edi` | the canonical, with a line break after every segment terminator | `X12_270_INTER_SEGMENT_WHITESPACE` |
| `270-missing-hierarchy.edi` | a transaction set carrying a BHT and no HL at all | `X12_MISSING_REQUIRED_LOOP` |
| `270-dangling-parent.edi` | a subscriber whose HL-02 names a level the document does not carry | `X12_HL_PARENT_MISMATCH`, `X12_270_LEVEL_DETACHED` |
| `270-no-inquiry.edi` | a subscriber level carrying no EQ | `X12_MISSING_REQUIRED_LOOP` |
| `270-hl-cycle.edi` | a receiver and a subscriber naming each other, so every pointer names a level that IS present and the chain returns to itself | `X12_270_HIERARCHY_CYCLE`, `X12_270_LEVEL_DETACHED` |
| `270-duplicate-hl-id.edi` | two subscriber levels transmitted with the same HL-01, and a dependent naming it | `X12_270_DUPLICATE_HIERARCHY_ID` |
| `270-two-transactions.edi` | one interchange carrying two 270 transaction sets, the second short of an EQ | first: none; second: `X12_MISSING_REQUIRED_LOOP` |

The eleventh document the 270 corpus needs is an interchange carrying NO 270 at
all, and that one is not authored here: `271-canonical.edi` beside this file is
already such an interchange, and using it is the stronger test, because it also
proves the reader returns no model built from another transaction set's
segments.

`test/fixtures/golden/270.edi` is generated, not authored: it is
`serializeX12(parseX12("270-canonical.edi"))`, written by
`test/scripts/gen-serialize-goldens.ts`, and it inherits this file's provenance.
