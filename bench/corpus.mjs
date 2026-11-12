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

// ---- 997, the functional acknowledgment some partners still send ------------------------------

/**
 * The spec of a synthetic 997 for index `i`, accepting `sets` 837 transaction sets. The 999's
 * shape on the base standard: AK1 without AK1-03, AK5 where the 999 has IK5.
 */
export function ack997Spec(_dec, i, sets = 1) {
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
      disposition: "A",
      numberOfTransactionSets: sets,
      numberOfReceivedTransactionSets: sets,
      numberOfAcceptedTransactionSets: sets,
      transactionResponses: responses,
    },
  };
}

/** The text of {@link ack997Spec}. */
export function ack997Text(i, sets = 1) {
  const body = ["ST*997*0001", `AK1*HC*${gcn(i)}`];
  for (let k = 0; k < sets; k++) body.push(`AK2*837*${String(k + 1).padStart(4, "0")}`, "AK5*A");
  body.push(`AK9*A*${String(sets)}*${String(sets)}*${String(sets)}`);
  return envelope("PAYER01", "CLINIC01", i, "FA", "005010", body);
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

// ---- 276 and 277, the claim status pair ------------------------------------------------------

/** The payer, the clinic as information receiver, and the clinic as provider, in both halves. */
const STATUS_PAYER = {
  entityIdentifierCode: "PR",
  entityTypeQualifier: "2",
  name: "SAMPLE PAYER",
  idQualifier: "PI",
  idCode: "PAYER01",
};
const STATUS_RECEIVER = {
  entityIdentifierCode: "41",
  entityTypeQualifier: "2",
  name: "SAMPLE CLINIC",
  idQualifier: "46",
  idCode: "CLINIC01",
};
const STATUS_PROVIDER = {
  entityIdentifierCode: "1P",
  entityTypeQualifier: "2",
  name: "SAMPLE CLINIC",
  idQualifier: "XX",
  idCode: "1234567893",
};

/** A 276 name: the shared parties above in the 276's own field names. */
function name276({ name, ...rest }) {
  return { ...rest, lastNameOrOrganizationName: name };
}

/**
 * The spec of a synthetic 276 for index `i` asking after `claims` claims, each under its own
 * subscriber: the batch a practice sends to learn where its open claims stand.
 */
export function inquiry276Spec(dec, i, claims) {
  const subscribers = [];
  for (let k = 0; k < claims; k++) {
    const n = id6(k);
    subscribers.push({
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
      claims: [
        {
          trace: { traceTypeCode: "1", referenceId: `TRC${n}`, originatingCompanyId: "9SAMPLEORG" },
          references: [{ qualifier: "1K", value: `PCN${n}` }],
          amounts: [{ qualifier: "T3", amount: dec(money(claimCharge(k))) }],
          dates: [{ qualifier: "472", formatQualifier: "D8", value: DATE8 }],
        },
      ],
    });
  }
  return {
    envelope: envelopeSpec("CLINIC01", "PAYER01", i),
    header: { referenceId: `STS${id6(i)}` },
    informationSources: [
      {
        name: name276(STATUS_PAYER),
        receivers: [
          {
            name: name276(STATUS_RECEIVER),
            providers: [{ name: name276(STATUS_PROVIDER), subscribers }],
          },
        ],
      },
    ],
  };
}

/**
 * The spec of a synthetic 277 for index `i` answering {@link inquiry276Spec}: one status for each
 * of `claims` claims, each under its own subscriber.
 */
export function status277Spec(dec, i, claims) {
  const subscribers = [];
  for (let k = 0; k < claims; k++) {
    const n = id6(k);
    subscribers.push({
      member: {
        entityIdentifierCode: "IL",
        entityTypeQualifier: "1",
        lastName: "PATIENT",
        firstName: "TEST",
        idQualifier: "MI",
        idCode: `MBR${n}`,
      },
      claims: [
        {
          trace: { traceTypeCode: "2", referenceId: `TRC${n}` },
          statuses: [
            {
              statuses: [{ categoryCode: "A2", statusCode: "20", entityCode: "PR" }],
              statusEffectiveDate: DATE8,
              actionCode: "WQ",
              totalChargeAmount: dec(money(claimCharge(k))),
            },
          ],
          references: [{ qualifier: "1K", value: `PCN${n}` }],
          dates: [{ qualifier: "472", formatQualifier: "D8", value: DATE8 }],
        },
      ],
    });
  }
  return {
    envelope: envelopeSpec("PAYER01", "CLINIC01", i),
    informationSources: [
      {
        entity: STATUS_PAYER,
        receivers: [
          { entity: STATUS_RECEIVER, providers: [{ entity: STATUS_PROVIDER, subscribers }] },
        ],
      },
    ],
  };
}

/**
 * The spec of a synthetic 277CA for index `i` acknowledging `claims` claims of a batch. The 277CA
 * takes the 277's spec; `build277CA` writes it on its own guide.
 */
export function ack277CASpec(dec, i, claims) {
  return status277Spec(dec, i, claims);
}

// ---- 277 request for additional information --------------------------------------------------

/**
 * The spec of a synthetic 277 request for additional information for index `i`, asking for an
 * attachment on each of `claims` claims, each under its own patient.
 */
export function request277Spec(dec, i, claims) {
  const patients = [];
  for (let k = 0; k < claims; k++) {
    const n = id6(k);
    patients.push({
      levelCode: "22",
      childCode: "0",
      entities: [
        {
          entityIdentifierCode: "QC",
          entityTypeQualifier: "1",
          lastOrOrganizationName: "PATIENT",
          firstName: "TEST",
          idQualifier: "MI",
          idCode: `MBR${n}`,
        },
      ],
      requests: [
        {
          trace: { traceTypeCode: "1", referenceId: `TRC${n}`, originatingCompanyId: "9SAMPLEORG" },
          statuses: [
            {
              codes: [{ categoryCode: "R0", statusCode: "18842-5", codeListQualifier: "LOI" }],
              statusEffectiveDate: DATE8,
              totalChargeAmount: dec(money(claimCharge(k))),
            },
          ],
          references: [{ qualifier: "1K", value: `PCN${n}` }],
          dates: [{ qualifier: "472", formatQualifier: "D8", value: DATE8 }],
        },
      ],
    });
  }
  return {
    envelope: envelopeSpec("PAYER01", "CLINIC01", i),
    header: {
      hierarchicalStructureCode: "0010",
      transactionSetPurposeCode: "08",
      referenceId: `RFAI${id6(i)}`,
      date: DATE8,
      time: TIME,
      transactionTypeCode: "DG",
    },
    levels: [
      {
        levelCode: "20",
        childCode: "1",
        entities: [
          {
            entityIdentifierCode: "PR",
            entityTypeQualifier: "2",
            lastOrOrganizationName: "SAMPLE PAYER",
            idQualifier: "PI",
            idCode: "PAYER01",
          },
        ],
        children: patients,
      },
    ],
  };
}

// ---- 278, the services review pair -----------------------------------------------------------

/** The spec of a synthetic 278 for index `i`, one patient event with `services` services. */
function review278SpecOf(dec, i, services, response) {
  const reviews = [];
  for (let k = 0; k < services; k++) {
    const n = id6(k);
    reviews.push({
      levelCode: "SS",
      requestCategoryCode: "HS",
      certificationTypeCode: "I",
      serviceTypeCode: "1",
      ...(response
        ? { decision: { actionCode: "A1", reviewIdentificationNumber: `AUTH${n}` } }
        : {}),
      traces: [{ traceTypeCode: "1", referenceId: `SRV${n}`, originatingCompanyId: "9SAMPLEORG" }],
      dates: [{ qualifier: "472", formatQualifier: "D8", value: DATE8 }],
    });
  }
  const n = id6(i);
  return {
    envelope: envelopeSpec(response ? "UMO01" : "CLINIC01", response ? "CLINIC01" : "UMO01", i),
    header: {
      structurePurposeCode: "0078",
      purposeCode: response ? "11" : "13",
      referenceId: `REV${n}`,
      date: DATE8,
      time: TIME,
    },
    utilizationManagementOrganization: {
      entityIdentifierCode: "X3",
      entityTypeQualifier: "2",
      name: "SAMPLE REVIEW ORG",
      idQualifier: "PI",
      idCode: "UMO01",
    },
    requester: STATUS_PROVIDER,
    subscriber: {
      member: {
        entityIdentifierCode: "IL",
        entityTypeQualifier: "1",
        lastName: "PATIENT",
        firstName: "TEST",
        idQualifier: "MI",
        idCode: `MBR${n}`,
        dateOfBirth: "19850515",
        genderCode: "F",
      },
      reviews: [
        {
          levelCode: "EV",
          requestCategoryCode: "HS",
          certificationTypeCode: "I",
          serviceTypeCode: "1",
          ...(response
            ? { decision: { actionCode: "A1", reviewIdentificationNumber: `AUTH${n}` } }
            : {}),
          traces: [
            { traceTypeCode: "1", referenceId: `EVT${n}`, originatingCompanyId: "9SAMPLEORG" },
          ],
          diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
          dates: [{ qualifier: "472", formatQualifier: "RD8", value: `${DATE8}-20260605` }],
          reviews,
        },
      ],
    },
  };
}

/** The spec of a synthetic 278 request for index `i`: one patient event, `services` services. */
export function review278RequestSpec(dec, i, services) {
  return review278SpecOf(dec, i, services, false);
}

/** The spec of a synthetic 278 response for index `i`, certifying every service it was asked. */
export function review278ResponseSpec(dec, i, services) {
  return review278SpecOf(dec, i, services, true);
}

// ---- 820, a premium payment ------------------------------------------------------------------

/** The premium paid for member `k`. */
function premium(k) {
  return 200 + (k % 23) * 25;
}

/**
 * The spec of a synthetic 820 for index `i`: an employer's monthly premium payment, one
 * remittance per member of `members`. In balance: the payment is the sum of what each pays.
 */
export function premium820Spec(dec, i, members) {
  let total = 0;
  const remittances = [];
  for (let k = 0; k < members; k++) {
    const n = id6(k);
    const paid = premium(k);
    total += paid;
    remittances.push({
      individual: {
        entityIdentifierCode: "IL",
        lastName: "PATIENT",
        firstName: "TEST",
        idQualifier: "MI",
        idCode: `MBR${n}`,
      },
      openItems: [
        {
          qualifier: "AZ",
          referenceId: `POL${n}`,
          amountPaid: dec(money(paid)),
          amountDue: dec(money(paid)),
        },
      ],
    });
  }
  return {
    envelope: envelopeSpec("EMPLOYER01", "PAYER01", i),
    payment: {
      transactionHandlingCode: "I",
      totalPremiumAmount: dec(money(total)),
      creditDebitFlag: "C",
      method: "ACH",
      paymentFormatCode: "CTX",
      paymentDate: DATE8,
    },
    traces: [
      { traceTypeCode: "1", referenceId: `PREM${id6(i)}`, originatingCompanyId: "1999999999" },
    ],
    receiver: {
      entityIdentifierCode: "PE",
      name: "SAMPLE PAYER",
      idQualifier: "FI",
      idCode: "999000111",
    },
    remitter: {
      entityIdentifierCode: "PR",
      name: "SAMPLE EMPLOYER",
      idQualifier: "FI",
      idCode: "999000333",
    },
    remittances,
  };
}

// ---- 834, a benefit enrollment file ----------------------------------------------------------

/**
 * The spec of a synthetic 834 for index `i`: an employer's enrollment file adding `members`
 * subscribers, each with one health coverage.
 */
export function enrollment834Spec(dec, i, members) {
  const list = [];
  for (let k = 0; k < members; k++) {
    const n = id6(k);
    list.push({
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "021",
      maintenanceReasonCode: "28",
      benefitStatusCode: "A",
      employmentStatusCode: "FT",
      member: {
        lastName: "PATIENT",
        firstName: "TEST",
        idQualifier: "MI",
        idCode: `MBR${n}`,
        dateOfBirth: "19850515",
        genderCode: "F",
        address: { lines: ["1 SAMPLE ST"], city: "ANYTOWN", state: "OH", postalCode: "44101" },
      },
      references: [{ qualifier: "0F", value: `MBR${n}` }],
      dates: [{ qualifier: "356", value: DATE8 }],
      healthCoverages: [
        {
          maintenanceTypeCode: "021",
          insuranceLineCode: "HLT",
          coverageLevelCode: "EMP",
          dates: [{ qualifier: "348", value: DATE8 }],
        },
      ],
    });
  }
  return {
    envelope: envelopeSpec("EMPLOYER01", "PAYER01", i),
    header: {
      transactionSetPurposeCode: "00",
      referenceId: `ENR${id6(i)}`,
      date: DATE8,
      time: TIME,
      actionCode: "2",
      sponsor: {
        entityIdentifierCode: "P5",
        name: "SAMPLE EMPLOYER",
        idQualifier: "FI",
        idCode: "999000333",
      },
      payer: {
        entityIdentifierCode: "IN",
        name: "SAMPLE PAYER",
        idQualifier: "FI",
        idCode: "999000111",
      },
      references: [{ qualifier: "38", value: "POLICY001" }],
    },
    members: list,
  };
}

// ---- 837D, a dental claim batch --------------------------------------------------------------

/**
 * The spec of a synthetic 837D for index `i` with `claims` claims in one transaction set, each
 * under its own subscriber, each with one dental line on one tooth.
 */
export function claim837DSpec(dec, i, claims) {
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
          serviceLines: [
            {
              variant: "D",
              procedureQualifier: "AD",
              procedureCode: "D2391",
              charge,
              units: dec("1"),
              placeOfServiceCode: "11",
              toothInformation: [{ qualifier: "JP", toothCode: "14", surfaces: ["O"] }],
              dates: [{ qualifier: "472", formatQualifier: "D8", value: DATE8 }],
            },
          ],
        },
      ]),
    );
  }
  return {
    envelope: envelopeSpec("DENTAL01", "PAYER01", i),
    submitter: SUBMITTER,
    receiver: RECEIVER,
    billingProviders: [
      billingProviderSpec("SAMPLE DENTAL", "300 DENTAL LN", "999000444", subscribers),
    ],
  };
}

// ---- TA1, the interchange acknowledgment -----------------------------------------------------

/** The spec of a synthetic TA1 for index `i`, accepting the interchange it acknowledges. */
export function ta1Spec(_dec, i) {
  return {
    interchangeControlNumber: icn(i),
    interchangeDate: DATE6,
    interchangeTime: TIME,
    ackCode: "A",
    noteCode: "000",
  };
}

// ---- The texts of the specs above ------------------------------------------------------------

/** The NM1 of one of the shared parties above. */
function partyNm1({ entityIdentifierCode, entityTypeQualifier, name, idQualifier, idCode }) {
  return `NM1*${entityIdentifierCode}*${entityTypeQualifier}*${name}*****${idQualifier}*${idCode}`;
}

/** The payer, receiver and provider levels both claim status sets open with. */
function statusHeading() {
  return [
    "HL*1**20*1",
    partyNm1(STATUS_PAYER),
    "HL*2*1*21*1",
    partyNm1(STATUS_RECEIVER),
    "HL*3*2*19*1",
    partyNm1(STATUS_PROVIDER),
  ];
}

/** The text of {@link inquiry276Spec}. */
export function inquiry276Text(i, claims) {
  const body = [
    "ST*276*0001*005010X212",
    `BHT*0010*13*STS${id6(i)}*${DATE8}*${TIME}`,
    ...statusHeading(),
  ];
  for (let k = 0; k < claims; k++) {
    const n = id6(k);
    body.push(
      `HL*${String(k + 4)}*3*22*0`,
      `NM1*IL*1*PATIENT*TEST****MI*MBR${n}`,
      "DMG*D8*19850515*F",
      `TRN*1*TRC${n}*9SAMPLEORG`,
      `REF*1K*PCN${n}`,
      `AMT*T3*${money(claimCharge(k))}`,
      `DTP*472*D8*${DATE8}`,
    );
  }
  return envelope("CLINIC01", "PAYER01", i, "HR", "005010X212", body);
}

/** The text `build277` or `build277CA` writes, by the guide it names. */
function status277TextOf(i, claims, guide) {
  const body = [`ST*277*0001*${guide}`, ...statusHeading()];
  for (let k = 0; k < claims; k++) {
    const n = id6(k);
    body.push(
      `HL*${String(k + 4)}*3*22*0`,
      `NM1*IL*1*PATIENT*TEST****MI*MBR${n}`,
      `TRN*2*TRC${n}`,
      `STC*A2:20:PR*${DATE8}*WQ*${money(claimCharge(k))}`,
      `REF*1K*PCN${n}`,
      `DTP*472*D8*${DATE8}`,
    );
  }
  return envelope("PAYER01", "CLINIC01", i, "HN", guide, body);
}

/** The text of {@link status277Spec}. */
export function status277Text(i, claims) {
  return status277TextOf(i, claims, "005010X212");
}

/** The text of {@link ack277CASpec}. */
export function ack277CAText(i, claims) {
  return status277TextOf(i, claims, "005010X214");
}

/** The text of {@link request277Spec}. */
export function request277Text(i, claims) {
  const body = [
    "ST*277*0001*006020X313",
    `BHT*0010*08*RFAI${id6(i)}*${DATE8}*${TIME}*DG`,
    "HL*1**20*1",
    "NM1*PR*2*SAMPLE PAYER*****PI*PAYER01",
  ];
  for (let k = 0; k < claims; k++) {
    const n = id6(k);
    body.push(
      `HL*${String(k + 2)}*1*22*0`,
      `NM1*QC*1*PATIENT*TEST****MI*MBR${n}`,
      `TRN*1*TRC${n}*9SAMPLEORG`,
      `STC*R0:18842-5::LOI*${DATE8}**${money(claimCharge(k))}`,
      `REF*1K*PCN${n}`,
      `DTP*472*D8*${DATE8}`,
    );
  }
  return envelope("PAYER01", "CLINIC01", i, "HN", "006020X313", body);
}

/** The text of a 278 request or response: one patient event, `services` services under it. */
function review278TextOf(i, services, response) {
  const n = id6(i);
  const body = [
    "ST*278*0001*005010X217",
    `BHT*0078*${response ? "11" : "13"}*REV${n}*${DATE8}*${TIME}`,
    "HL*1**20*1",
    "NM1*X3*2*SAMPLE REVIEW ORG*****PI*UMO01",
    "HL*2*1*21*1",
    partyNm1(STATUS_PROVIDER),
    "HL*3*2*22*1",
    `NM1*IL*1*PATIENT*TEST****MI*MBR${n}`,
    "DMG*D8*19850515*F",
    `HL*4*3*EV*${services > 0 ? "1" : "0"}`,
    `TRN*1*EVT${n}*9SAMPLEORG`,
    "UM*HS*I*1",
    ...(response ? [`HCR*A1*AUTH${n}`] : []),
    `DTP*472*RD8*${DATE8}-20260605`,
    "HI*ABK:J20.9",
  ];
  for (let k = 0; k < services; k++) {
    const s = id6(k);
    body.push(
      `HL*${String(k + 5)}*4*SS*0`,
      `TRN*1*SRV${s}*9SAMPLEORG`,
      "UM*HS*I*1",
      ...(response ? [`HCR*A1*AUTH${s}`] : []),
      `DTP*472*D8*${DATE8}`,
    );
  }
  const [sender, receiver] = response ? ["UMO01", "CLINIC01"] : ["CLINIC01", "UMO01"];
  return envelope(sender, receiver, i, "HI", "005010X217", body);
}

/** The text of {@link review278RequestSpec}. */
export function review278RequestText(i, services) {
  return review278TextOf(i, services, false);
}

/** The text of {@link review278ResponseSpec}. */
export function review278ResponseText(i, services) {
  return review278TextOf(i, services, true);
}

/** The text of {@link premium820Spec}. */
export function premium820Text(i, members) {
  let total = 0;
  const remittances = [];
  for (let k = 0; k < members; k++) {
    const n = id6(k);
    const paid = money(premium(k));
    total += premium(k);
    remittances.push(`NM1*IL*1*PATIENT*TEST****MI*MBR${n}`, `RMR*AZ*POL${n}**${paid}*${paid}`);
  }
  return envelope("EMPLOYER01", "PAYER01", i, "RA", "005010X218", [
    "ST*820*0001*005010X218",
    `BPR*I*${money(total)}*C*ACH*CTX***********${DATE8}`,
    `TRN*1*PREM${id6(i)}*1999999999`,
    "N1*PE*SAMPLE PAYER*FI*999000111",
    "N1*PR*SAMPLE EMPLOYER*FI*999000333",
    ...remittances,
  ]);
}

/** The text of {@link enrollment834Spec}. */
export function enrollment834Text(i, members) {
  const body = [
    "ST*834*0001*005010X220A1",
    `BGN*00*ENR${id6(i)}*${DATE8}*${TIME}****2`,
    "N1*P5*SAMPLE EMPLOYER*FI*999000333",
    "N1*IN*SAMPLE PAYER*FI*999000111",
    "REF*38*POLICY001",
  ];
  for (let k = 0; k < members; k++) {
    const n = id6(k);
    body.push(
      "INS*Y*18*021*28*A***FT",
      `NM1*IL*1*PATIENT*TEST****MI*MBR${n}`,
      "DMG*D8*19850515*F",
      "N3*1 SAMPLE ST",
      "N4*ANYTOWN*OH*44101",
      `REF*0F*MBR${n}`,
      `DTP*356*D8*${DATE8}`,
      "HD*021**HLT**EMP",
      `DTP*348*D8*${DATE8}`,
    );
  }
  return envelope("EMPLOYER01", "PAYER01", i, "BE", "005010X220A1", body);
}

/** The text of {@link claim837DSpec}. */
export function claim837DText(i, claims) {
  const body = claimHeading("005010X224A2", "SAMPLE DENTAL", "300 DENTAL LN", "999000444");
  for (let k = 0; k < claims; k++) {
    const charge = money(claimCharge(k));
    body.push(
      ...claimSubscriber(k),
      `CLM*PCN${id6(k)}*${charge}***11:B:1*Y*A*Y*Y`,
      "LX*1",
      `SV3*AD:D2391*${charge}*11***1`,
      `DTP*472*D8*${DATE8}`,
      "TOO*JP*14*O",
    );
  }
  return envelope("DENTAL01", "PAYER01", i, "HC", "005010X224A2", body);
}

/** The text of a TA1-only interchange carrying {@link ta1Spec}: an ISA, the TA1, and the IEA. */
export function ta1Text(i) {
  return `${isa("PAYER01", "CLINIC01", i)}TA1*${icn(i)}*${DATE6}*${TIME}*A*000~IEA*0*${icn(i)}~`;
}
