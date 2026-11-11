---
id: read-inquiries
title: Read eligibility and claim status inquiries
sidebar_label: Read 270 and 276 inquiries
description: "Read a 270 eligibility inquiry and a 276 claim status request, including the trace your 271 or 277 must echo back."
---

# Read eligibility and claim status inquiries

You are the payer or the clearinghouse, and what arrives is the **question** rather than the
answer. A 270 asks whether a member is covered; a 276 asks what happened to a claim. Both
are hierarchical documents, and the answer you send back has to reassociate to the trace the
submitter chose.

The 270 and the 276 follow two different implementation guides (`005010X279A1` and
`005010X212`), and each has a reader and a builder of its own.

## Read a 270 eligibility inquiry

`get270Inquiry(delimiters, tx)` walks one transaction set; `parse270Inquiries(raw)` takes the raw
bytes and gives you every 270 in the interchange, in transmitted order. The hierarchy is presented as
the sender declared it: source, receiver, subscriber, and a dependent as **its own level** rather
than flattened onto the subscriber it hangs under.

```ts runnable
import { parse270Inquiries } from "@cosyte/x12";

const raw270 = [
  "ISA*00*          *00*          *ZZ*ANYTOWNCLINIC  *ZZ*MEDPAY         *260601*1200*^*00501*000000001*0*P*:~",
  "GS*HS*ANYTOWNCLINIC*MEDPAY*20260601*1200*1*X*005010X279A1~",
  "ST*270*0001*005010X279A1~",
  "BHT*0022*13*REQ-0001*20260601*1200~",
  "HL*1**20*1~",
  "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
  "HL*2*1*21*1~",
  "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
  "HL*3*2*22*0~",
  "TRN*1*ELIG20260601001*9SAMPLEORG~",
  "NM1*IL*1*DOE*JANE*A***MI*MBR0001~",
  "N3*100 MAIN ST~",
  "N4*COLUMBUS*OH*43215~",
  "DMG*D8*19850515*F~",
  "DTP*291*D8*20260601~",
  "EQ*30^35*HC:99213:25*IND~",
  "SE*15*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("\n");

const inquiry = parse270Inquiries(raw270)[0];

inquiry?.header?.purposeCode; // => "13"

// This interchange is pretty-printed, and the 270 reader SAYS SO rather than
// absorbing it in silence: the shared parse consumes the CR / LF run before
// the next segment opens, so it is part of no element, nothing on the model
// records it, and `serializeX12` cannot put it back. The typed model is
// otherwise identical to the compact form's.
inquiry?.warnings.map((w) => w.code); // => ["X12_270_INTER_SEGMENT_LINE_BREAK"]

const asked = inquiry?.informationSources[0]?.receivers[0]?.subscribers[0];

// The trace you must echo on the 271 you send back.
asked?.traces[0]?.referenceId; // => "ELIG20260601001"

asked?.name?.lastNameOrOrganizationName; // => "DOE"
asked?.name?.idCode; // => "MBR0001"
asked?.name?.dateOfBirth; // => "19850515"

// EQ-01 repeats, so the service types come back as a list, and the bundled
// snapshot fills a description in beside the code without ever replacing it.
const request = asked?.inquiries[0];
request?.serviceTypeCodes.map((s) => s.code); // => ["30", "35"]
request?.serviceTypeCodes[0]?.description; // => "Health Benefit Plan Coverage"

// EQ-02 is a composite, and comes back as separated components rather than
// one joined string: the separator is framing and appears in no value.
request?.procedure?.qualifier; // => "HC"
request?.procedure?.code; // => "99213"
request?.procedure?.modifiers; // => ["25"]
```

**Read that line-break code's bound literally: CR and LF, and nothing else.** Whitespace that is not
CR or LF, a space or a tab between segments, is not consumed by the shared interchange parse at all.
It becomes part of the next segment's identifier, the functional group never frames, and
`parse270Inquiries` answers the **empty list**, with the loss reported on the interchange's own
warning channel rather than on a 270's. The code is raised once per transaction set however many
runs the document carries, and it is raised on the 270 path only.

**The declared HL parent pointers are preserved verbatim and never re-numbered.** A level whose
declared parent does not resolve is left off the tree, together with everything beneath it, and the
loss is reported (`X12_270_LEVEL_DETACHED`) rather than re-parented onto whichever level happened to
be open. Check `inquiry.warnings` before you conclude a subscriber had no dependents.

## Read a 276 claim status request

`get276StatusInquiry(delimiters, tx)` and `parse276StatusInquiries(raw)` are the same pair one guide
over. The 276 adds a provider level (`19`) between the receiver and the subscriber, and each claim
carries the `TRN-02` the 277 has to echo:

```ts runnable
import { parse276StatusInquiries } from "@cosyte/x12";

const raw276 = [
  "ISA*00*          *00*          *ZZ*ANYTOWNCLINIC  *ZZ*MEDPAY         *260601*1200*^*00501*000000011*0*P*:~",
  "GS*HR*ANYTOWNCLINIC*MEDPAY*20260601*1200*11*X*005010X212~",
  "ST*276*0001*005010X212~",
  "BHT*0010*13*STATUS-0001*20260601*1200~",
  "HL*1**20*1~",
  "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
  "HL*2*1*21*1~",
  "NM1*41*2*ANYTOWN CLINIC*****46*RECVR01~",
  "HL*3*2*19*1~",
  "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
  "HL*4*3*22*0~",
  "NM1*IL*1*DOE*JANE*A***MI*MBR0001~",
  "DMG*D8*19850515*F~",
  "TRN*1*STATUS20260601001*9SAMPLEORG~",
  "REF*1K*PCN0001~",
  "AMT*T3*150~",
  "DTP*472*D8*20260520~",
  "SVC*HC:99213:25*150*****1~",
  "REF*FJ*LINE001~",
  "DTP*472*D8*20260520~",
  "SE*19*0001~",
  "GE*1*11~",
  "IEA*1*000000011~",
].join("\n");

const statusRequest = parse276StatusInquiries(raw276)[0];

statusRequest?.warnings.map((w) => w.code); // => []
statusRequest?.hierarchies.map((h) => h.levelCode); // => ["20", "21", "19", "22"]

const subscriber = statusRequest?.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0];
subscriber?.name?.idCode; // => "MBR0001"

const askedAbout = subscriber?.claims[0];

// The trace the 277 must echo back, verbatim.
askedAbout?.trace?.referenceId; // => "STATUS20260601001"
askedAbout?.references.map((r) => [r.qualifier, r.value]); // => [["1K", "PCN0001"]]

// Money is X12Decimal here too, on the request side as much as the response.
askedAbout?.amounts[0]?.amount.toString(); // => "150"

const askedLine = askedAbout?.serviceLines[0];
askedLine?.procedure?.code; // => "99213"
askedLine?.lineChargeAmount?.toString(); // => "150"
askedLine?.unitsOfService?.toString(); // => "1"
```

The 276 reader attaches a level by its **own** HL-02 and by nothing else, exactly as the 270 does, so
a dangling pointer, a pointer naming a level of the wrong kind, and a parent chain that returns to
itself each leave that level and its subtree off the model, reported and never re-parented. The two
readers' warning codes are **siblings, never one widened set** (`X12_270_*` and `X12_276_*`): gate on
the one belonging to the document you are reading, and do not assume a code one of them raises has a
counterpart on the other. The line-break report above is exactly that case: it exists on the 270 path
and on no other, which is why the same pretty-printed framing leaves this 276 with an empty warning
list. A 276 short of what a row is built from has reports of its own instead
(`X12_276_REFERENCE_ROW_DROPPED` for a `REF` missing either element, `X12_276_DATE_ROW_DROPPED` for a
`DTP` missing its qualifier or its value), because each of those is a record rather than a slot and
there is no half a row to keep.

## Related

- [Answer an eligibility inquiry with a 271](./answer-an-eligibility-inquiry.md): the response
  that echoes the 270's trace.
- [Route 277CA acknowledgments and 277 status responses](./route-claim-status-responses.md): the
  answer to a 276.
- Reference: [`parse270Inquiries`](./api/src.md#parse270inquiries),
  [`get270Inquiry`](./api/src.md#get270inquiry),
  [`parse276StatusInquiries`](./api/src.md#parse276statusinquiries),
  [`get276StatusInquiry`](./api/src.md#get276statusinquiry).
