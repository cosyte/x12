// The synthetic X12 the benchmarks and the scaling gate run on, built in code from an index.
//
// Every interchange comes twice: as the text a trading partner sends (`*Text`), which the parse
// and read benchmarks take, and as the spec a caller hands a builder (`*Spec`), which the build
// benchmarks take. The two describe the same document: `test/perf/bench-corpus.test.ts` holds
// that a spec, built and serialized, is its text byte for byte, and that each text parses and
// reads with no warning. No file is read, and every name, identifier and amount is made up.
//
// A spec holds amounts as strings. A builder takes `X12Decimal` values of the module under test,
// so each `*Spec` function is handed that module's decimal reader (`dec`), which keeps one suite
// measuring a base build and a head build.

/** The interchange date and time every document carries. */
const DATE6 = "260601";
const DATE8 = "20260601";
const TIME = "1200";

/** An ISA control number for index `i`: nine digits. */
function icn(i) {
  return String((i % 999_999_999) + 1).padStart(9, "0");
}

/** A group control number for index `i`. */
function gcn(i) {
  return String((i % 999_999_999) + 1);
}

/** An identifier of six digits for index `k`. */
function id6(k) {
  return String(k % 1_000_000).padStart(6, "0");
}

/** A whole number of dollars as an X12 amount with two decimals. */
function money(dollars) {
  return `${String(dollars)}.00`;
}

/** The ISA, padded as a builder writes it. */
function isa(sender, receiver, i, version = "00501") {
  return (
    `ISA*00*          *00*          *ZZ*${sender.padEnd(15)}*ZZ*${receiver.padEnd(15)}` +
    `*${DATE6}*${TIME}*^*${version}*${icn(i)}*0*P*:~`
  );
}

/** Wrap a transaction set body (ST through the segment before SE) in its envelope. */
function envelope(sender, receiver, i, functionalId, guide, body, version = "00501") {
  const segments = body.length + 1;
  return (
    isa(sender, receiver, i, version) +
    `GS*${functionalId}*${sender}*${receiver}*${DATE8}*${TIME}*${gcn(i)}*X*${guide}~` +
    body.map((s) => `${s}~`).join("") +
    `SE*${String(segments)}*0001~` +
    `GE*1*${gcn(i)}~` +
    `IEA*1*${icn(i)}~`
  );
}

/** The envelope spec every builder takes, for index `i`. */
function envelopeSpec(sender, receiver, i) {
  return {
    senderId: sender,
    receiverId: receiver,
    interchangeDate: DATE6,
    interchangeTime: TIME,
    interchangeControlNumber: icn(i),
    groupControlNumber: gcn(i),
    transactionSetControlNumber: "0001",
  };
}

// ---- 835 remittance advice ------------------------------------------------------------------

/** Claim `k` of a remittance: what was charged and what was paid. The difference is PR 1. */
function remitClaimAmounts(k) {
  const charge = 120 + (k % 37) * 10;
  return { charge, paid: charge - 20, patient: 20 };
}

/**
 * A synthetic 835 for index `i` with `claims` CLP loops, each with one service line: the shape a
 * payer's weekly remittance has, one payment and thousands of claims. In balance at every level.
 */
export function remit835Text(i, claims) {
  let total = 0;
  const loops = [];
  for (let k = 0; k < claims; k++) {
    const { charge, paid, patient } = remitClaimAmounts(k);
    total += paid;
    const n = id6(k);
    loops.push(
      `CLP*PCN${n}*1*${money(charge)}*${money(paid)}*${money(patient)}*12*ICN${n}*11::1`,
      `NM1*QC*1*PATIENT*TEST****MI*MBR${n}`,
      `NM1*82*2*RENDERING CLINIC*****XX*1234567893`,
      `DTM*232*${DATE8}`,
      `DTM*233*${DATE8}`,
      `SVC*HC:99213*${money(charge)}*${money(paid)}**1`,
      `DTM*472*${DATE8}`,
      `CAS*PR*1*${money(patient)}`,
      `REF*6R*LINE${n}`,
      `AMT*B6*${money(paid)}`,
    );
  }
  return envelope("PAYER01", "CLINIC01", i, "HP", "005010X221A1", [
    "ST*835*0001*005010X221A1",
    `BPR*I*${money(total)}*C*ACH*CCP***********${DATE8}`,
    `TRN*1*EFT${id6(i)}*9999999999`,
    "N1*PR*SAMPLE PAYER",
    "N3*1 PAYER PLAZA",
    "N4*ANYTOWN*OH*44101",
    "PER*BL*PAYER CONTACT*TE*5550100000",
    "N1*PE*SAMPLE CLINIC*XX*1234567893",
    "N3*22 PROVIDER WAY",
    "N4*ANYTOWN*OH*44101",
    "REF*TJ*999000111",
    "LX*1",
    ...loops,
  ]);
}

/** The spec `build835` writes as {@link remit835Text}. */
export function remit835Spec(dec, i, claims) {
  let total = 0;
  const claimSpecs = [];
  for (let k = 0; k < claims; k++) {
    const { charge, paid, patient } = remitClaimAmounts(k);
    total += paid;
    const n = id6(k);
    claimSpecs.push({
      patientControlNumber: `PCN${n}`,
      claimStatusCode: "1",
      totalChargeAmount: dec(money(charge)),
      totalPaymentAmount: dec(money(paid)),
      patientResponsibilityAmount: dec(money(patient)),
      claimFilingIndicatorCode: "12",
      payerClaimControlNumber: `ICN${n}`,
      facilityTypeCode: "11",
      claimFrequencyCode: "1",
      patient: {
        entityIdentifierCode: "QC",
        lastName: "PATIENT",
        firstName: "TEST",
        idQualifier: "MI",
        idCode: `MBR${n}`,
      },
      serviceProvider: {
        entityIdentifierCode: "82",
        name: "RENDERING CLINIC",
        idQualifier: "XX",
        idCode: "1234567893",
      },
      servicePeriodStart: DATE8,
      servicePeriodEnd: DATE8,
      serviceLines: [
        {
          productServiceIdQualifier: "HC",
          productServiceId: "99213",
          chargeAmount: dec(money(charge)),
          paymentAmount: dec(money(paid)),
          paidUnitsOfService: dec("1"),
          serviceDateStart: DATE8,
          serviceDateEnd: DATE8,
          adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec(money(patient)) }],
          references: [{ qualifier: "6R", value: `LINE${n}` }],
          amounts: [{ qualifier: "B6", amount: dec(money(paid)) }],
        },
      ],
    });
  }
  return {
    envelope: envelopeSpec("PAYER01", "CLINIC01", i),
    payment: {
      transactionHandlingCode: "I",
      totalActualPayment: dec(money(total)),
      creditDebitFlag: "C",
      method: "ACH",
      paymentFormatCode: "CCP",
      paymentDate: DATE8,
    },
    traces: [
      { traceTypeCode: "1", referenceId: `EFT${id6(i)}`, originatingCompanyId: "9999999999" },
    ],
    payer: {
      entityIdentifierCode: "PR",
      name: "SAMPLE PAYER",
      address: { lines: ["1 PAYER PLAZA"], city: "ANYTOWN", state: "OH", postalCode: "44101" },
      contacts: [
        {
          contactFunctionCode: "BL",
          name: "PAYER CONTACT",
          communications: [{ qualifier: "TE", value: "5550100000" }],
        },
      ],
    },
    payee: {
      entityIdentifierCode: "PE",
      name: "SAMPLE CLINIC",
      idQualifier: "XX",
      idCode: "1234567893",
      address: { lines: ["22 PROVIDER WAY"], city: "ANYTOWN", state: "OH", postalCode: "44101" },
      additionalIdentifiers: [{ qualifier: "TJ", value: "999000111" }],
    },
    claims: claimSpecs,
  };
}

// ---- 837P and 837I claim batches ------------------------------------------------------------

/** The submitter and receiver every 837 names. */
const SUBMITTER = {
  entityIdentifierCode: "41",
  entityTypeQualifier: "2",
  name: "SAMPLE SUBMITTER",
  idQualifier: "46",
  idCode: "SUB001",
};
const RECEIVER = {
  entityIdentifierCode: "40",
  entityTypeQualifier: "2",
  name: "SAMPLE RECEIVER",
  idQualifier: "46",
  idCode: "REC001",
};

/** The charge on claim `k` of a batch. */
function claimCharge(k) {
  return 150 + (k % 41) * 5;
}

/** The subscriber and payer of claim `k`, holding `claims`. */
function claimSubscriberSpec(k, claims) {
  return {
    info: {
      payerResponsibilityCode: "P",
      individualRelationshipCode: "18",
      groupNumber: "GRP001",
      claimFilingIndicator: "CI",
    },
    subscriber: {
      entityIdentifierCode: "IL",
      entityTypeQualifier: "1",
      name: "PATIENT",
      firstName: "TEST",
      idQualifier: "MI",
      idCode: `MBR${id6(k)}`,
    },
    payer: {
      entityIdentifierCode: "PR",
      entityTypeQualifier: "2",
      name: "SAMPLE PAYER",
      idQualifier: "PI",
      idCode: "PAYER01",
    },
    claims,
  };
}

/** The billing provider of a batch. */
function billingProviderSpec(name, address, taxId, subscribers) {
  return {
    provider: {
      entityIdentifierCode: "85",
      entityTypeQualifier: "2",
      name,
      idQualifier: "XX",
      idCode: "1234567893",
      address: { lines: [address], city: "ANYTOWN", state: "OH", postalCode: "44101" },
      references: [{ qualifier: "EI", value: taxId }],
    },
    subscribers,
  };
}

/**
 * The spec of a synthetic 837P for index `i` with `claims` claims in one transaction set, each
 * under its own subscriber: the batch a clearinghouse forwards from a practice's billing system.
 */
export function claim837PSpec(dec, i, claims) {
  const subscribers = [];
  for (let k = 0; k < claims; k++) {
    const charge = dec(money(claimCharge(k)));
    subscribers.push(
      claimSubscriberSpec(k, [
        {
          claimId: `PCN${id6(k)}`,
          totalCharge: charge,
          placeOfServiceCode: "11",
          facilityCodeQualifier: "B",
          claimFrequencyCode: "1",
          providerSignatureOnFile: "Y",
          providerAcceptAssignment: "A",
          benefitsAssignment: "Y",
          releaseOfInformationCode: "Y",
          diagnoses: [
            { qualifier: "ABK", code: "J20.9" },
            { qualifier: "ABF", code: "R05.9" },
          ],
          dates: [{ qualifier: "431", formatQualifier: "D8", value: DATE8 }],
          serviceLines: [
            {
              variant: "P",
              procedureQualifier: "HC",
              procedureCode: "99213",
              modifiers: ["25"],
              charge,
              unitOfMeasure: "UN",
              units: dec("1"),
              placeOfServiceCode: "11",
              diagnosisPointers: ["1", "2"],
              dates: [{ qualifier: "472", formatQualifier: "D8", value: DATE8 }],
            },
          ],
        },
      ]),
    );
  }
  return {
    envelope: envelopeSpec("CLINIC01", "PAYER01", i),
    submitter: SUBMITTER,
    receiver: RECEIVER,
    billingProviders: [
      billingProviderSpec("SAMPLE CLINIC", "22 PROVIDER WAY", "999000111", subscribers),
    ],
  };
}

/** The 837 heading through the billing provider's loop, as both batches open. */
function claimHeading(guide, name, address, taxId) {
  return [
    `ST*837*0001*${guide}`,
    `BHT*0019*00*0001*${DATE8}*${TIME}*CH`,
    "NM1*41*2*SAMPLE SUBMITTER*****46*SUB001",
    "NM1*40*2*SAMPLE RECEIVER*****46*REC001",
    "HL*1**20*1",
    `NM1*85*2*${name}*****XX*1234567893`,
    `N3*${address}`,
    "N4*ANYTOWN*OH*44101",
    `REF*EI*${taxId}`,
  ];
}

/** The subscriber loop of claim `k`, through its NM1*PR. */
function claimSubscriber(k) {
  return [
    `HL*${String(k + 2)}*1*22*0`,
    "SBR*P*18*GRP001******CI",
    `NM1*IL*1*PATIENT*TEST****MI*MBR${id6(k)}`,
    "NM1*PR*2*SAMPLE PAYER*****PI*PAYER01",
  ];
}

/** The text of {@link claim837PSpec}. */
export function claim837PText(i, claims) {
  const body = claimHeading("005010X222A2", "SAMPLE CLINIC", "22 PROVIDER WAY", "999000111");
  for (let k = 0; k < claims; k++) {
    const charge = money(claimCharge(k));
    body.push(
      ...claimSubscriber(k),
      `CLM*PCN${id6(k)}*${charge}***11:B:1*Y*A*Y*Y`,
      `DTP*431*D8*${DATE8}`,
      "HI*ABK:J20.9",
      "HI*ABF:R05.9",
      "LX*1",
      `SV1*HC:99213:25*${charge}*UN*1*11**1:2`,
      `DTP*472*D8*${DATE8}`,
    );
  }
  return envelope("CLINIC01", "PAYER01", i, "HC", "005010X222A2", body);
}

/** The text of {@link claim837ISpec}. */
export function claim837IText(i, claims) {
  const body = claimHeading("005010X223A3", "SAMPLE HOSPITAL", "100 HOSPITAL DR", "999000222");
  for (let k = 0; k < claims; k++) {
    const lines = institutionalLines(k);
    const total = lines.reduce((sum, line) => sum + line.charge, 0);
    body.push(
      ...claimSubscriber(k),
      `CLM*PCN${id6(k)}*${money(total)}***11:A:1**A*Y*Y`,
      `DTP*434*RD8*${DATE8}-20260603`,
      `DTP*435*DT*${DATE8}0800`,
      "HI*ABK:J18.9:::::::Y",
      "HI*ABF:I10:::::::Y",
    );
    lines.forEach((line, n) => {
      const procedure = line.procedureCode === undefined ? "" : `HC:${line.procedureCode}`;
      body.push(
        `LX*${String(n + 1)}`,
        `SV2*${line.revenueCode}*${procedure}*${money(line.charge)}*UN*${line.units}`,
      );
    });
  }
  return envelope("HOSP01", "PAYER01", i, "HC", "005010X223A3", body);
}

/** The three revenue-coded lines of inpatient claim `k`. */
function institutionalLines(k) {
  return [
    { revenueCode: "0120", procedureCode: undefined, charge: claimCharge(k) * 4, units: "2" },
    { revenueCode: "0250", procedureCode: undefined, charge: 240, units: "6" },
    { revenueCode: "0300", procedureCode: "80053", charge: 180, units: "1" },
  ];
}

/**
 * The spec of a synthetic 837I for index `i` with `claims` inpatient claims in one transaction
 * set, each under its own subscriber, each with three revenue-coded lines.
 */
export function claim837ISpec(dec, i, claims) {
  const subscribers = [];
  for (let k = 0; k < claims; k++) {
    const lines = institutionalLines(k);
    const total = lines.reduce((sum, line) => sum + line.charge, 0);
    subscribers.push(
      claimSubscriberSpec(k, [
        {
          claimId: `PCN${id6(k)}`,
          totalCharge: dec(money(total)),
          placeOfServiceCode: "11",
          facilityCodeQualifier: "A",
          claimFrequencyCode: "1",
          providerAcceptAssignment: "A",
          benefitsAssignment: "Y",
          releaseOfInformationCode: "Y",
          diagnoses: [
            { qualifier: "ABK", code: "J18.9", poaIndicator: "Y" },
            { qualifier: "ABF", code: "I10", poaIndicator: "Y" },
          ],
          dates: [
            { qualifier: "434", formatQualifier: "RD8", value: `${DATE8}-20260603` },
            { qualifier: "435", formatQualifier: "DT", value: `${DATE8}0800` },
          ],
          serviceLines: lines.map((line) => ({
            variant: "I",
            revenueCode: line.revenueCode,
            ...(line.procedureCode === undefined
              ? {}
              : { procedureQualifier: "HC", procedureCode: line.procedureCode }),
            charge: dec(money(line.charge)),
            unitOfMeasure: "UN",
            units: dec(line.units),
          })),
        },
      ]),
    );
  }
  return {
    envelope: envelopeSpec("HOSP01", "PAYER01", i),
    submitter: SUBMITTER,
    receiver: RECEIVER,
    billingProviders: [
      billingProviderSpec("SAMPLE HOSPITAL", "100 HOSPITAL DR", "999000222", subscribers),
    ],
  };
}

// ---- 270 and 271, the real-time eligibility pair --------------------------------------------

/** The payer and the provider in both halves of the pair. */
const PAYER_270 = {
  entityIdentifierCode: "PR",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "SAMPLE PAYER",
  idQualifier: "PI",
  idCode: "PAYER01",
};
const PROVIDER_270 = {
  entityIdentifierCode: "1P",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "SAMPLE CLINIC",
  idQualifier: "XX",
  idCode: "1234567893",
};

/** The spec of a synthetic 270 for index `i`: one subscriber, one inquiry. */
export function inquiry270Spec(_dec, i) {
  const n = id6(i);
  return {
    envelope: envelopeSpec("CLINIC01", "PAYER01", i),
    header: { referenceId: `REQ${n}` },
    informationSources: [
      {
        name: PAYER_270,
        receivers: [
          {
            name: PROVIDER_270,
            subscribers: [
              {
                traces: [
                  {
                    traceTypeCode: "1",
                    referenceId: `TRC${n}`,
                    originatingCompanyId: "9SAMPLEORG",
                  },
                ],
                name: {
                  entityIdentifierCode: "IL",
                  entityTypeQualifier: "1",
                  lastNameOrOrganizationName: "PATIENT",
                  firstName: "TEST",
                  idQualifier: "MI",
                  idCode: `MBR${n}`,
                  dateOfBirth: "19850515",
                  genderCode: "F",
                },
                dates: [{ qualifier: "291", formatQualifier: "D8", value: DATE8 }],
                inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
              },
            ],
          },
        ],
      },
    ],
  };
}

/** The text of {@link inquiry270Spec}. */
export function inquiry270Text(i) {
  const n = id6(i);
  return envelope("CLINIC01", "PAYER01", i, "HS", "005010X279A1", [
    "ST*270*0001*005010X279A1",
    `BHT*0022*13*REQ${n}*${DATE8}*${TIME}`,
    "HL*1**20*1",
    "NM1*PR*2*SAMPLE PAYER*****PI*PAYER01",
    "HL*2*1*21*1",
    "NM1*1P*2*SAMPLE CLINIC*****XX*1234567893",
    "HL*3*2*22*0",
    `TRN*1*TRC${n}*9SAMPLEORG`,
    `NM1*IL*1*PATIENT*TEST****MI*MBR${n}`,
    "DMG*D8*19850515*F",
    `DTP*291*D8*${DATE8}`,
    "EQ*30",
  ]);
}

/** The benefit lines a 271 answers with, in turn: coverage, then deductibles, co-pays and limits. */
const BENEFITS = [
  { code: "1", stc: "30", plan: "GOLD PPO" },
  { code: "C", stc: "30", period: "23", amount: "1500.00", network: "Y" },
  { code: "C", stc: "30", period: "29", amount: "1200.00", network: "Y" },
  { code: "G", stc: "30", period: "23", amount: "6000.00", network: "Y" },
  { code: "B", stc: "98", period: "27", amount: "25.00", network: "Y" },
  { code: "A", stc: "AL", percent: "0.2", network: "Y" },
  { code: "F", stc: "AD", quantityQualifier: "VS", quantity: "30", message: "PER CALENDAR YEAR" },
];

/** Benefit `k` of a 271. */
function benefitOf(k) {
  return BENEFITS[k % BENEFITS.length];
}

/**
 * The spec of a synthetic 271 for index `i` answering {@link inquiry270Spec}, with `benefits` EB
 * loops for its one subscriber.
 */
export function eligibility271Spec(dec, i, benefits) {
  const n = id6(i);
  const lines = [];
  for (let k = 0; k < benefits; k++) {
    const b = benefitOf(k);
    lines.push({
      eligibilityCode: b.code,
      coverageLevelCode: "IND",
      serviceTypeCodes: [{ code: b.stc }],
      ...(b.plan === undefined ? {} : { planCoverageDescription: b.plan }),
      ...(b.period === undefined ? {} : { timePeriodQualifier: b.period }),
      ...(b.amount === undefined ? {} : { monetaryAmount: dec(b.amount) }),
      ...(b.percent === undefined ? {} : { percent: dec(b.percent) }),
      ...(b.quantityQualifier === undefined
        ? {}
        : { quantityQualifier: b.quantityQualifier, quantity: dec(b.quantity) }),
      ...(b.network === undefined ? {} : { inPlanNetwork: b.network }),
      ...(b.message === undefined ? {} : { messages: [b.message] }),
    });
  }
  return {
    envelope: envelopeSpec("PAYER01", "CLINIC01", i),
    header: { referenceId: `RSP${n}` },
    informationSources: [
      {
        entity: {
          entityIdentifierCode: "PR",
          entityTypeQualifier: "2",
          name: "SAMPLE PAYER",
          idQualifier: "PI",
          idCode: "PAYER01",
        },
        receivers: [
          {
            entity: {
              entityIdentifierCode: "1P",
              entityTypeQualifier: "2",
              name: "SAMPLE CLINIC",
              idQualifier: "XX",
              idCode: "1234567893",
            },
            subscribers: [
              {
                traces: [
                  {
                    traceTypeCode: "2",
                    referenceId: `TRC${n}`,
                    originatingCompanyId: "9SAMPLEORG",
                  },
                ],
                name: {
                  entityIdentifierCode: "IL",
                  entityTypeQualifier: "1",
                  lastName: "PATIENT",
                  firstName: "TEST",
                  idQualifier: "MI",
                  idCode: `MBR${n}`,
                },
                benefits: lines,
              },
            ],
          },
        ],
      },
    ],
  };
}

/** The text of {@link eligibility271Spec}. */
export function eligibility271Text(i, benefits) {
  const n = id6(i);
  const body = [
    "ST*271*0001*005010X279A1",
    `BHT*0022*11*RSP${n}*${DATE8}*${TIME}`,
    "HL*1**20*1",
    "NM1*PR*2*SAMPLE PAYER*****PI*PAYER01",
    "HL*2*1*21*1",
    "NM1*1P*2*SAMPLE CLINIC*****XX*1234567893",
    "HL*3*2*22*0",
    `TRN*2*TRC${n}*9SAMPLEORG`,
    `NM1*IL*1*PATIENT*TEST****MI*MBR${n}`,
  ];
  for (let k = 0; k < benefits; k++) {
    const b = benefitOf(k);
    // EB-01 through EB-12: code, level, service type, insurance type, plan, period, amount,
    // percent, quantity qualifier, quantity, authorization, in network. Trailing empties dropped.
    const elements = [
      b.code,
      "IND",
      b.stc,
      "",
      b.plan ?? "",
      b.period ?? "",
      b.amount ?? "",
      b.percent ?? "",
      b.quantityQualifier ?? "",
      b.quantity ?? "",
      "",
      b.network ?? "",
    ];
    while (elements.at(-1) === "") elements.pop();
    body.push(`EB*${elements.join("*")}`);
    if (b.message !== undefined) body.push(`MSG*${b.message}`);
  }
  return envelope("PAYER01", "CLINIC01", i, "HB", "005010X279A1", body);
}

// ---- 999, the acknowledgment every batch gets back ------------------------------------------

/** The spec of a synthetic 999 for index `i`, accepting `sets` 837 transaction sets. */
export function ack999Spec(_dec, i, sets = 1) {
  const responses = [];
  for (let k = 0; k < sets; k++) {
    responses.push({
      transactionSetIdCode: "837",
      transactionSetControlNumber: String(k + 1).padStart(4, "0"),
      disposition: "A",
    });
  }
  return {
    envelope: envelopeSpec("PAYER01", "CLINIC01", i),
    functionalGroup: {
      functionalIdCode: "HC",
      groupControlNumber: gcn(i),
      versionRelease: "005010X222A2",
      disposition: "A",
      numberOfTransactionSets: sets,
      numberOfReceivedTransactionSets: sets,
      numberOfAcceptedTransactionSets: sets,
      transactionResponses: responses,
    },
  };
}

/** The text of {@link ack999Spec}. */
export function ack999Text(i, sets = 1) {
  const body = ["ST*999*0001*005010X231A1", `AK1*HC*${gcn(i)}*005010X222A2`];
  for (let k = 0; k < sets; k++) body.push(`AK2*837*${String(k + 1).padStart(4, "0")}`, "IK5*A");
  body.push(`AK9*A*${String(sets)}*${String(sets)}*${String(sets)}`);
  return envelope("PAYER01", "CLINIC01", i, "FA", "005010X231A1", body);
}

// ---- 275, an attachment: one large opaque payload -------------------------------------------

/** `bytes` of base64 text: the shape a scanned record takes inside a BDS segment. */
function base64Payload(i, bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let text = "";
  const block = Array.from({ length: 4096 }, (_, k) => alphabet[(k * 7 + i) % 64]).join("");
  while (text.length < bytes) text += block;
  return text.slice(0, bytes);
}

/** The spec of a synthetic 275 for index `i` carrying one base64 attachment of `bytes` octets. */
export function attachment275Spec(_dec, i, bytes) {
  const n = id6(i);
  return {
    envelope: envelopeSpec("CLINIC01", "PAYER01", i),
    beginning: { transactionSetPurposeCode: "02", referenceId: `ATT${n}`, date: DATE8 },
    entities: [
      {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        lastOrOrganizationName: "SAMPLE PAYER",
      },
    ],
    lines: [
      {
        trace: { traceTypeCode: "2", referenceId: `TRC${n}` },
        status: {
          codes: [{ categoryCode: "R0", statusCode: "18842-5", codeListQualifier: "LOI" }],
        },
        references: [{ qualifier: "1K", value: `ICN${n}` }],
        attachments: [{ filterCode: "B64", data: base64Payload(i, bytes) }],
      },
    ],
  };
}

/** The text of {@link attachment275Spec}. */
export function attachment275Text(i, bytes) {
  const n = id6(i);
  return envelope("CLINIC01", "PAYER01", i, "PI", "006020X314", [
    "ST*275*0001*006020X314",
    `BGN*02*ATT${n}*${DATE8}`,
    "NM1*PR*2*SAMPLE PAYER",
    "LX*1",
    `TRN*2*TRC${n}`,
    "STC*R0:18842-5::LOI",
    `REF*1K*ICN${n}`,
    `BDS*B64*${String(bytes)}*${base64Payload(i, bytes)}`,
  ]);
}
