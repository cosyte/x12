---
id: read-and-build-a-premium-payment
title: Read and build an 820 premium payment
sidebar_label: Read and build an 820 payment
description: "Read the payment, the parties and each member's premium out of an 820, reconcile the total yourself, and build one that reads back."
---

# Read and build an 820 premium payment

A plan sponsor pays its group premium and sends an 820 to say what the money covers: one payment
header, the trace that ties it to the bank deposit, the two parties, and a remittance per group or
member with the policy each amount was paid against. You need to post each amount to the right
policy, and to know whether the parts add up to the deposit. Or you are the sponsor, and need to
send one.

`get820Payments(delimiters, tx)` reads the `005010X218` guide and returns an
[`X12PremiumPayments`](./api/README.md#x12premiumpayments), or `undefined` for a transaction set
that is not an 820. `build820(spec)` writes one.

## Read a premium payment

```ts runnable
import { parseX12, get820Payments } from "@cosyte/x12";

const raw820 = [
  "ISA*00*          *00*          *ZZ*EMPLOYERCO     *ZZ*MEDPAY         *260601*1200*^*00501*000000001*0*P*:~",
  "GS*RA*EMPLOYERCO*MEDPAY*20260601*1200*1*X*005010X218~",
  "ST*820*0001*005010X218~",
  "BPR*I*375.00*C*ACH*CCP***********20260601~",
  "TRN*1*PREM-202606*1512345678~",
  "N1*PE*MEDPAY INSURANCE*FI*111223333~",
  "N1*RM*EMPLOYER CO*FI*444556666~",
  "ENT*1*2J*EI*GRP-0001~",
  "NM1*IL*1*DOE*JANE****ZZ*MBR0001~",
  "RMR*AZ*POL-0001**250.00*250.00~",
  "DTM*582*20260601~",
  "NM1*IL*1*ROE*JOHN****ZZ*MBR0002~",
  "RMR*AZ*POL-0002**125.00*150.00~",
  "ADX*-25.00*52~",
  "SE*13*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("");

const ix820 = parseX12(raw820);
const tx820 = ix820.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
if (tx820 === undefined) throw new Error("no 820 in interchange");

const premium = get820Payments(ix820.delimiters, tx820);
premium?.warnings.length; // => 0

// The payment header: BPR-02 is what the bank moved.
premium?.payment.totalPremiumAmount?.toString(); // => "375.00"
premium?.payment.method; // => "ACH"
premium?.payment.paymentDate; // => "20260601"

// The trace a bank statement carries for the same deposit.
premium?.traces[0]?.referenceId; // => "PREM-202606"

// The parties, keyed on the N1 qualifier: PE receives, PR or RM remits.
premium?.receiver?.name; // => "MEDPAY INSURANCE"
premium?.remitter?.name; // => "EMPLOYER CO"

// One remittance per ENT or NM1 loop. An NM1 right after an ENT names the
// member of that same loop; any other NM1 opens a loop of its own.
premium?.remittances.length; // => 2
const first = premium?.remittances[0];
first?.entity?.idCode; // => "GRP-0001"
first?.individual?.lastName; // => "DOE"
first?.openItems[0]?.referenceId; // => "POL-0001"
first?.openItems[0]?.amountPaid?.toString(); // => "250.00"
first?.dates[0]?.value; // => "20260601"

const second = premium?.remittances[1];
second?.entity; // => undefined
second?.individual?.idCode; // => "MBR0002"
second?.openItems[0]?.amountPaid?.toString(); // => "125.00"
second?.openItems[0]?.amountDue?.toString(); // => "150.00"
second?.adjustments[0]?.amount.toString(); // => "-25.00"
second?.adjustments[0]?.reasonCode; // => "52"
```

Every amount is an [`X12Decimal`](./api/README.md#x12decimal), never a `number`. An amount
element that is absent, empty or not a decimal reads `undefined`, never zero; one that is not a
decimal also raises `X12_UNPARSEABLE_DECIMAL`. An `RMR` with neither a qualifier nor a reference
id is not on the model, and if it stated an amount the reader raises
`X12_STATED_AMOUNT_DISCARDED` at it. [Decimal-exact money](./spec-notes-money.md) has the rest.

## Reconcile the total yourself

The 820 guide sets no balance equation between `BPR-02` and the open items, so `get820Payments`
does not compare them and `build820` writes the amounts you give it as they are. That is a
deliberate contrast with the 835, whose reader checks its balance. If your posting depends on the
parts adding up to the deposit, check it before you post, with exact decimals:

```ts runnable
import { parseX12, get820Payments, X12Decimal } from "@cosyte/x12";

const raw820 = [
  "ISA*00*          *00*          *ZZ*EMPLOYERCO     *ZZ*MEDPAY         *260601*1200*^*00501*000000001*0*P*:~",
  "GS*RA*EMPLOYERCO*MEDPAY*20260601*1200*1*X*005010X218~",
  "ST*820*0001*005010X218~",
  "BPR*I*375.00*C*ACH*CCP***********20260601~",
  "TRN*1*PREM-202606*1512345678~",
  "NM1*IL*1*DOE*JANE****ZZ*MBR0001~",
  "RMR*AZ*POL-0001**250.00~",
  "NM1*IL*1*ROE*JOHN****ZZ*MBR0002~",
  "RMR*AZ*POL-0002**125.00~",
  "SE*8*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("");

const ix = parseX12(raw820);
const tx = ix.groups[0]?.transactions[0];
const premium = tx ? get820Payments(ix.delimiters, tx) : undefined;
if (premium === undefined) throw new Error("not an 820");

/** The sum of every open item's amount paid, or undefined when one did not decode. */
function sumPaid(p: NonNullable<typeof premium>): X12Decimal | undefined {
  let total = X12Decimal.ZERO;
  for (const remittance of p.remittances) {
    for (const item of remittance.openItems) {
      if (item.amountPaid === undefined) return undefined;
      total = total.add(item.amountPaid);
    }
  }
  return total;
}

const paid = sumPaid(premium);
const deposit = premium.payment.totalPremiumAmount;
paid?.toString(); // => "375.00"
paid !== undefined && deposit !== undefined && paid.equals(deposit); // => true
```

An amount that did not decode makes the sum unknown rather than smaller, so route that payment to a
person instead of posting a partial total.

## Build a premium payment and read it back

`build820(spec)` fixes `GS-01` to `RA` and `GS-08` and `ST-03` to `005010X218`, counts the
segments, and returns an `X12Interchange`. It never sends anything, opens a socket or touches the
filesystem. Write it out with `serializeX12`.

```ts runnable
import { build820, get820Payments, serializeX12, X12Decimal, type Build820Spec } from "@cosyte/x12";

const spec: Build820Spec = {
  envelope: {
    senderId: "EMPLOYERCO",
    receiverId: "MEDPAY",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  payment: {
    transactionHandlingCode: "I",
    totalPremiumAmount: X12Decimal.fromString("375.00")!,
    creditDebitFlag: "C",
    method: "ACH",
    paymentFormatCode: "CCP",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "PREM-202606", originatingCompanyId: "1512345678" }],
  receiver: {
    entityIdentifierCode: "PE",
    name: "MEDPAY INSURANCE",
    idQualifier: "FI",
    idCode: "111223333",
  },
  remitter: {
    entityIdentifierCode: "RM",
    name: "EMPLOYER CO",
    idQualifier: "FI",
    idCode: "444556666",
  },
  remittances: [
    {
      entity: {
        assignedNumber: "1",
        entityIdentifierCode: "2J",
        idQualifier: "EI",
        idCode: "GRP-0001",
      },
      individual: {
        entityIdentifierCode: "IL",
        lastName: "DOE",
        firstName: "JANE",
        idQualifier: "ZZ",
        idCode: "MBR0001",
      },
      openItems: [
        {
          qualifier: "AZ",
          referenceId: "POL-0001",
          amountPaid: X12Decimal.fromString("250.00")!,
          amountDue: X12Decimal.fromString("250.00")!,
        },
      ],
    },
    {
      individual: {
        entityIdentifierCode: "IL",
        lastName: "ROE",
        firstName: "JOHN",
        idQualifier: "ZZ",
        idCode: "MBR0002",
      },
      openItems: [
        {
          qualifier: "AZ",
          referenceId: "POL-0002",
          amountPaid: X12Decimal.fromString("125.00")!,
          amountDue: X12Decimal.fromString("150.00")!,
        },
      ],
      adjustments: [{ amount: X12Decimal.fromString("-25.00")!, reasonCode: "52" }],
    },
  ],
};

const built = build820(spec);
built.groups[0]?.gs.elements[1]; // => "RA"
built.groups[0]?.transactions[0]?.st.elements[3]; // => "005010X218"

const builtTx = built.groups[0]?.transactions[0];
const readBack = builtTx ? get820Payments(built.delimiters, builtTx) : undefined;
readBack?.warnings.length; // => 0
readBack?.payment.totalPremiumAmount?.toString(); // => "375.00"
readBack?.remittances[1]?.openItems[0]?.amountDue?.toString(); // => "150.00"
readBack?.remittances[1]?.adjustments[0]?.amount.toString(); // => "-25.00"

serializeX12(built).includes("RMR*AZ*POL-0001**250.00*250.00~"); // => true
```

**What it refuses**, each a [`Premium820BuildError`](./api/README.md#premium820builderror) with the
code `X12_820_BUILD_INVALID_SPEC`: no trace, no remittance, a remittance with neither an `entity`
nor an `individual` to open its loop, a remittance with no open item, and an open item whose
qualifier and reference id are both empty, since the reader would drop it. The message names the
position in the spec, never a member's name or id.

```ts runnable
import { build820, Premium820BuildError, X12Decimal } from "@cosyte/x12";

let code: string | undefined;
try {
  build820({
    envelope: {
      senderId: "EMPLOYERCO",
      receiverId: "MEDPAY",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      groupControlNumber: "1",
      transactionSetControlNumber: "0001",
    },
    payment: {
      transactionHandlingCode: "I",
      totalPremiumAmount: X12Decimal.fromString("250.00")!,
      creditDebitFlag: "C",
      method: "ACH",
      paymentDate: "20260601",
    },
    traces: [{ traceTypeCode: "1", referenceId: "PREM-202606" }],
    // A remittance with no open item: nothing to post, so nothing is written.
    remittances: [
      {
        individual: { entityIdentifierCode: "IL", idQualifier: "ZZ", idCode: "MBR0001" },
        openItems: [],
      },
    ],
  });
} catch (err) {
  if (err instanceof Premium820BuildError) code = err.code;
}
code; // => "X12_820_BUILD_INVALID_SPEC"
```

## Related

- [Decimal-exact money](./spec-notes-money.md): why an amount that does not decode reads
  `undefined`, and when an `RMR` leaves the model.
- [The 80/20 transaction sets](./spec-notes-transaction-sets.md): where the 820 sits among the
  other sets.
- [Build and serialize X12](./emit-and-serialize.md): what every builder refuses.
- Reference: [`get820Payments`](./api/README.md#get820payments),
  [`build820`](./api/README.md#build820), [`Build820Spec`](./api/README.md#build820spec),
  [`X12PremiumPayments`](./api/README.md#x12premiumpayments),
  [`Premium820BuildError`](./api/README.md#premium820builderror).
