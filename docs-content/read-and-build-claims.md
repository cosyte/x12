---
id: read-and-build-claims
title: Read and build 837 claims
sidebar_label: Read and build 837 claims
description: "Read an 837's variant, HL hierarchy, diagnoses and service lines, gate on the warnings that matter for line amounts, and build one."
---

# Read and build 837 claims

You received a claim and need to know which variant it is (Professional, Institutional or
Dental), walk the HL hierarchy (billing provider, subscriber, claim), and read the diagnosis codes
with their code system. Or you are sending one, and need to declare the implementation guide your
trading partner asked for.

`get837Claims(delimiters, tx)` returns an
[`X12_837Submission`](./api/src.md#x12_837submission), or `undefined` for a transaction set
that is not an 837.

## Read a claim

```ts runnable
import { parseX12, get837Claims, HL_LEVEL_CODES, WARNING_CODES } from "@cosyte/x12";

const raw837 = [
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *260601*1200*^*00501*000000001*0*P*:~",
  "GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*005010X222A2~",
  "ST*837*0001*005010X222A2~",
  "BHT*0019*00*0123*20260601*1200*CH~",
  "NM1*41*2*SUBMITTER ONE*****46*SUB001~",
  "PER*IC*JANE SUBMITTER*TE*5551234567~",
  "NM1*40*2*RECEIVER ONE*****46*REC001~",
  "HL*1**20*1~",
  "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
  "N3*123 BILLING WAY~",
  "N4*CLEVELAND*OH*44113~",
  "REF*EI*987654321~",
  "HL*2*1*22*0~",
  "SBR*P*18*GROUP123******MB~",
  "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
  "N3*456 PATIENT ST~",
  "N4*CLEVELAND*OH*44113~",
  "DMG*D8*19800101*M~",
  "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
  "N3*789 PAYER BLVD~",
  "N4*COLUMBUS*OH*43215~",
  "CLM*PT-ACCT-001*150***11:B:1*Y*A*Y*Y~",
  "DTP*431*D8*20260520~",
  "HI*ABK:J20.9~",
  "NM1*82*1*RENDERING*DOCTOR****XX*1112223330~",
  "LX*1~",
  "SV1*HC:99213:25*150*UN*1***1~",
  "DTP*472*D8*20260601~",
  "REF*6R*LINE-CTRL-001~",
  "SE*28*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("\n");

const ix = parseX12(raw837);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
const sub = tx ? get837Claims(ix.delimiters, tx) : undefined;
if (sub === undefined) throw new Error("not an 837");

sub.variant; // => "P"
sub.warnings; // => []

// The HL hierarchy, as declared. HL-02 parent pointers are validated, never re-numbered;
// a broken pointer surfaces as X12_HL_PARENT_MISMATCH.
sub.hierarchies.map((hl) => [hl.hlId, hl.parentHlId, hl.levelCode]); // => [["1", undefined, "20"], ["2", "1", "22"]]
sub.hierarchies[1]?.levelCode === HL_LEVEL_CODES.SUBSCRIBER; // => true

const claim = sub.claims[0];
// Read, never printed: the provider's name and NPI. Synthetic values:
claim?.billingProvider?.name; // => "BILLING CLINIC INC"
claim?.billingProvider?.idCode; // => "1234567890"
claim?.subscriber?.info.claimFilingIndicator; // => "MB"

// HI diagnoses: the qualifier says the code system AND the role.
const dx = claim?.diagnoses[0];
dx?.qualifier; // => "ABK"
dx?.codeSystem; // => "ICD-10-CM"
dx?.category; // => "principal-diagnosis"
dx?.code; // => "J20.9"

// Service lines are a union on `variant`: narrow before reading the SVx fields.
const line = claim?.serviceLines[0];
line?.charge?.toString(); // => "150"
line?.variant; // => "P"
if (line?.variant === "P") {
  line.procedureCode; // => "99213"
  line.modifiers; // => ["25"]
  line.diagnosisPointers; // => ["1"]
}

// An unknown HI qualifier would be kept verbatim (codeSystem "unknown") and warned:
sub.warnings.some((w) => w.code === WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER); // => false
```

## How the variant is decided

The reader decides the variant in this order:

1. The `type` option, when you pass one: `get837Claims(delimiters, tx, { type: "I" })`.
2. Otherwise the `ST-03` implementation convention reference. Each base guide and each of its
   published errata resolves: `005010X222`, `005010X222A1` and `005010X222A2` to P;
   `005010X223`, `005010X223A1`, `005010X223A2` and `005010X223A3` to I; `005010X224`,
   `005010X224A1`, `005010X224A2` and `005010X224A3` to D. The set is a list of identifiers, never
   a pattern: a reference outside it, in a different case, or padded falls through.
3. Otherwise the **first** `SV1`, `SV2` or `SV3` in the transaction body, whether or not a Loop
   2400 was open at it. Where nothing resolves, the variant is `"unknown"` and
   `X12_837_UNKNOWN_VARIANT` is raised.

When the fallback decided and the body carries service segments for more than one variant,
`X12_837_AMBIGUOUS_VARIANT` is raised at the `ST`: `sub.variant` is a guess between
contradictory evidence, and which segment is the stray one is not decided, because this reader
cannot tell a stray service segment from a conformant one. Re-read with the `type` option to decode
against a variant you trust. Where a `type` was passed, or `ST-03` named a known reference, no guess
was made and the code is not raised, however mixed the body is.

**Through `0.0.13` the reader recognized only `005010X222A2`, `005010X223A3` and `005010X224A2`.**
That set held none of the identifiers HIPAA adopts at 45 CFR 162.1102 and was missing
`005010X222A1` and `005010X223A2`, which CMS and state Medicaid companion guides require on
production professional and institutional claims. If you read 837 files on `0.0.13` or earlier,
re-check any routing driven off `variant` and any predicate written on `X12_837_UNKNOWN_VARIANT` or
`X12_837_AMBIGUOUS_VARIANT`: on a file whose `ST-03` is now recognized the variant can differ and
neither code fires.

## Gate on these warnings before you post a line amount

A service line whose `SVx` kind does not match the decided variant is **not** decoded (reading an
`SV2` into a Professional line would misread the charge). Its `charge` and `units` read
`undefined`, and an undecoded line keeps its identity fields seeded, so `procedureCode` is `""` on a
P or D line and `revenueCode` is `""` on an I one. Gate on the warning, never on a slot. Each of
these codes, anchored where its row in [Troubleshooting](./troubleshooting.md#common-symptoms)
says, reports a different way a line amount can fail to reach the model:

| Code                                        | What happened                                                                                                                                                                                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `X12_837_SERVICE_LINE_NOT_DECODED`          | The Loop 2400 line carries no `SV1` / `SV2` / `SV3` matching the decided variant, so nothing on the service segment was read. Raised at the `LX`.                                                                                                                |
| `X12_837_SERVICE_SEGMENT_REPEATED`          | A second service segment arrived inside one open Loop 2400. The line holds what the **last** matching one wrote; `SV1*HC:99213*8500*...` then `SV1*HC:99999*12*...` leaves `charge` `12` and `procedureCode` `99999`. Which one the sender meant is not decided. |
| `X12_837_SERVICE_LINE_DROPPED`              | An `LX` opened no Loop 2400 (no `CLM` was open, or the variant is not P, I or D), so an empty `serviceLines` is not evidence the claim had none.                                                                                                                 |
| `X12_837_SERVICE_SEGMENT_WITHOUT_LX`        | An `SVx` arrived with no Loop 2400 open, so nothing it carries was read. Raised at the service segment.                                                                                                                                                          |
| `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` | An `N3` / `N4` / `PER` / `REF` after such a dropped `LX` reached no party. Only that route, and only until the next `NM1` / `HL` / `CLM`.                                                                                                                        |
| `X12_UNPARSEABLE_DECIMAL`                   | The `SVx` decoded but the amount itself did not.                                                                                                                                                                                                                 |
| `X12_AMOUNT_ROW_DROPPED`                    | An `AMT` whose amount decoded nothing, so the whole row is off the model: off the line where one is open, and off the claim otherwise.                                                                                                                           |
| `X12_STATED_AMOUNT_DISCARDED`               | An `AMT` arriving while a Loop 2430 adjudication (`SVD`) is open decoded and was discarded, because the adjudication model carries no amount row.                                                                                                                |

None of them is a complete account of every way an amount can fail to reach the model; [Decimal-exact
money](./spec-notes-money.md) states the guarantee in the only direction it holds, and
[Troubleshooting](./troubleshooting.md#common-symptoms) gives each code's full bounds.

## Build one, and declare the guide your partner asked for

`build837P`, `build837I` and `build837D` default `ST-03` and `GS-08` to `005010X222A2`,
`005010X223A3` and `005010X224A2`. **Those defaults are not what every partner accepts**: CMS and
several state Medicaid companion guides require `005010X222A1` on professional and `005010X223A2`
on institutional claims, and a partner on one of those rejects a file declaring the default. Which
guide identifier a partner accepts is a partner fact rather than a spec fact, so this library will
not choose for you: state it on the envelope, and one value reaches both elements.

```ts runnable
import { build837P, get837Claims, X12Decimal, type Build837Spec } from "@cosyte/x12";

const spec: Build837Spec = {
  envelope: {
    senderId: "SUBMITTER",
    receiverId: "RECEIVER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
    // Omit this and you get 005010X222A2.
    implementationConventionReference: "005010X222A1",
  },
  submitter: {
    entityIdentifierCode: "41",
    entityTypeQualifier: "2",
    name: "SUBMITTER ONE",
    idQualifier: "46",
    idCode: "SUB001",
  },
  receiver: {
    entityIdentifierCode: "40",
    entityTypeQualifier: "2",
    name: "RECEIVER ONE",
    idQualifier: "46",
    idCode: "REC001",
  },
  billingProviders: [
    {
      provider: {
        entityIdentifierCode: "85",
        entityTypeQualifier: "2",
        name: "BILLING CLINIC INC",
        idQualifier: "XX",
        idCode: "1234567890",
      },
      subscribers: [
        {
          info: {
            payerResponsibilityCode: "P",
            individualRelationshipCode: "18",
            claimFilingIndicator: "MB",
          },
          subscriber: {
            entityIdentifierCode: "IL",
            entityTypeQualifier: "1",
            name: "PATIENT",
            firstName: "TEST",
            idQualifier: "MI",
            idCode: "MEMBER001",
          },
          payer: {
            entityIdentifierCode: "PR",
            entityTypeQualifier: "2",
            name: "PAYER ONE",
            idQualifier: "PI",
            idCode: "PAYER01",
          },
          claims: [
            {
              claimId: "PT-ACCT-001",
              totalCharge: X12Decimal.fromString("150.00")!,
              diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
              serviceLines: [
                {
                  variant: "P",
                  procedureQualifier: "HC",
                  procedureCode: "99213",
                  charge: X12Decimal.fromString("150.00")!,
                  unitOfMeasure: "UN",
                  units: X12Decimal.fromString("1")!,
                  diagnosisPointers: ["1"],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const built = build837P(spec);

// One value, BOTH elements: GS-08 and ST-03 never disagree.
built.groups[0]?.gs.elements[8]; // => "005010X222A1"
built.groups[0]?.transactions[0]?.st.elements[3]; // => "005010X222A1"

// And it reads back as a Professional claim, charge intact.
const builtTx = built.groups[0]?.transactions[0];
const readBack = builtTx ? get837Claims(built.delimiters, builtTx) : undefined;
readBack?.variant; // => "P"
readBack?.claims[0]?.serviceLines[0]?.charge?.toString(); // => "150.00"
```

**What it refuses**, each a `Claim837BuildError` with the code `X12_837_BUILD_INVALID_SPEC`, and no
refusal message echoes the value you passed: an **empty** reference (a trailing empty element is
not emitted, so it would delete `ST-03` and `GS-08` rather than send them empty); one carrying an
**active delimiter or the release character** (a guide identifier has no use for one, and a
trading partner's parser is not obliged to honor the escape); and one this library's own reader
resolves to a **different 837 variant**, such as `005010X223A2` handed to `build837P`, which would
emit a file declaring one variant and carrying another's service segments. These come on top of the
type check every string slot in every builder already has.

**Anything else is emitted as given.** The set of published errata is not provably exhaustive, so
an identifier this library does not recognize is your call, not an error, with one cost: on reading
such a file back, this library falls through to the `SVx` scan for the variant. The length is not
bounded either, and the two elements' maxima differ: `GS-08` is data element 480 (`AN 1/12`),
`ST-03` is element 1705 (`AN 1/35`).

**A guard on this element cannot make the element trustworthy.** An unescaped active delimiter in a
**different** envelope field (a control number, an application sender code) still ends its element,
because that is what a delimiter is, and shifts every element after it, so `ST-03` and `GS-08` can
be read out of a neighbor's slot. A release-escaped one is read correctly, and an envelope element
ending in a literal `?` merges with its successor. The behavior, in both directions, is measured in
[KNOWN-LIMITATIONS.md](https://github.com/cosyte/x12/blob/main/KNOWN-LIMITATIONS.md).

## Build a dental or an institutional claim

`build837D` and `build837I` take the same [`Build837Spec`](./api/src.md#build837spec) as
`build837P`; only the service lines differ. A `variant: "D"` line is written as `SV3`, with its
teeth as `TOO` segments after it, and a `variant: "I"` line as `SV2`, keyed by its revenue code.
The reader hands the variant's own fields back on the line once you narrow on `variant`. Every line
must match the builder: a line of another variant is refused with `X12_837_BUILD_INVALID_SPEC`.

```ts runnable
import {
  build837D,
  build837I,
  get837Claims,
  X12Decimal,
  type Build837ServiceLineSpec,
  type Build837Spec,
} from "@cosyte/x12";

/** One claim from one billing provider, with the service lines given. */
function claimSpec(provider: string, lines: readonly Build837ServiceLineSpec[]): Build837Spec {
  return {
    envelope: {
      senderId: "SUBMITTER",
      receiverId: "RECEIVER",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      groupControlNumber: "1",
      transactionSetControlNumber: "0001",
    },
    submitter: {
      entityIdentifierCode: "41",
      entityTypeQualifier: "2",
      name: "SUBMITTER ONE",
      idQualifier: "46",
      idCode: "SUB001",
    },
    receiver: {
      entityIdentifierCode: "40",
      entityTypeQualifier: "2",
      name: "RECEIVER ONE",
      idQualifier: "46",
      idCode: "REC001",
    },
    billingProviders: [
      {
        provider: {
          entityIdentifierCode: "85",
          entityTypeQualifier: "2",
          name: provider,
          idQualifier: "XX",
          idCode: "1234567890",
        },
        subscribers: [
          {
            info: {
              payerResponsibilityCode: "P",
              individualRelationshipCode: "18",
              claimFilingIndicator: "CI",
            },
            subscriber: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              name: "PATIENT",
              firstName: "TEST",
              idQualifier: "MI",
              idCode: "MEMBER001",
            },
            payer: {
              entityIdentifierCode: "PR",
              entityTypeQualifier: "2",
              name: "PAYER ONE",
              idQualifier: "PI",
              idCode: "PAYER01",
            },
            claims: [
              {
                claimId: "PT-ACCT-002",
                totalCharge: lines[0]!.charge,
                serviceLines: lines,
              },
            ],
          },
        ],
      },
    ],
  };
}

// A dental claim: one CDT procedure on tooth 14, occlusal surface.
const dental = build837D(
  claimSpec("BILLING DENTAL GROUP", [
    {
      variant: "D",
      procedureQualifier: "AD",
      procedureCode: "D2391",
      charge: X12Decimal.fromString("180.00")!,
      units: X12Decimal.fromString("1")!,
      placeOfServiceCode: "11",
      toothInformation: [{ qualifier: "JP", toothCode: "14", surfaces: ["O"] }],
    },
  ]),
);
dental.groups[0]?.transactions[0]?.st.elements[3]; // => "005010X224A2"

const dentalTx = dental.groups[0]?.transactions[0];
const dentalRead = dentalTx ? get837Claims(dental.delimiters, dentalTx) : undefined;
dentalRead?.variant; // => "D"
dentalRead?.warnings.length; // => 0
const tooth = dentalRead?.claims[0]?.serviceLines[0];
tooth?.charge?.toString(); // => "180.00"
tooth?.variant; // => "D"
if (tooth?.variant === "D") {
  tooth.procedureCode; // => "D2391"
  tooth.toothInformation[0]?.toothCode; // => "14"
  tooth.toothInformation[0]?.surfaces; // => ["O"]
}

// An institutional claim: one room and board line, keyed by its revenue code.
const institutional = build837I(
  claimSpec("BILLING HOSPITAL INC", [
    {
      variant: "I",
      revenueCode: "0120",
      charge: X12Decimal.fromString("1500.00")!,
      unitOfMeasure: "DA",
      units: X12Decimal.fromString("1")!,
    },
  ]),
);
institutional.groups[0]?.transactions[0]?.st.elements[3]; // => "005010X223A3"

const instTx = institutional.groups[0]?.transactions[0];
const instRead = instTx ? get837Claims(institutional.delimiters, instTx) : undefined;
instRead?.variant; // => "I"
const room = instRead?.claims[0]?.serviceLines[0];
room?.charge?.toString(); // => "1500.00"
room?.variant; // => "I"
if (room?.variant === "I") {
  room.revenueCode; // => "0120"
}
```

## Related

- [The envelope and loop model](./spec-notes-envelope.md): loops and the HL hierarchy.
- [Build and serialize X12](./emit-and-serialize.md): what every builder refuses.
- Reference: [`get837Claims`](./api/src.md#get837claims),
  [`build837P`](./api/src.md#build837p), [`build837I`](./api/src.md#build837i),
  [`build837D`](./api/src.md#build837d), [`Build837Spec`](./api/src.md#build837spec).
