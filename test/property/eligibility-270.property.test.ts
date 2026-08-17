/**
 * Property and hostile-input tests for the 005010X279A1 270 path.
 *
 * Four properties, each named for what it would catch:
 *
 * 1. **The emit is a fixed point.** `parse(emit(M))` and
 *    `parse(emit(parse(emit(M))))` agree in model and in warning stream, and
 *    the two emits are byte-identical. The antecedent is the SUCCESSIVE
 *    REPARSES of the emitted output and nothing else: the warning stream of an
 *    original document is compared against nothing here, and byte equality
 *    with an original input is not claimed. Emitting a model parsed from a
 *    document that carried a tolerated deviation therefore produces the
 *    SPEC-CLEAN form, which is what "spec-clean by construction" means.
 *
 *    **Its domain is the models the builder accepts**, which is the only
 *    consistent reading: a model the reader returned for a structurally
 *    incomplete document is missing a region, and emitting it would mean
 *    either fabricating that region or emitting something that is not
 *    spec-clean. The builder refuses such a model instead, and
 *    `test/transactions-eligibility-270-build.test.ts` asserts the refusal.
 *
 * 2. **A declared delimiter changes no value.** Over a generator of declared
 *    delimiter sets, the model decoded from a 270 delimited that way equals
 *    the model decoded from the conventional twin.
 *
 *    **The generator is bounded, and the bound is the point.** It draws four
 *    PAIRWISE DISTINCT visible non-whitespace characters, excluding the
 *    release character, so every generated interchange is one the shared parse
 *    can frame and every generated set has a spec-clean equivalent. A
 *    self-colliding declaration (the same byte in two roles) is a malformed
 *    interchange with no spec-clean twin to be equal to, so it is outside this
 *    property rather than a failure of it, and it is NOT a reason to stop.
 *
 * 3. **Truncation falls under exactly one of two rules, decided by whether the
 *    frame parsed.** Truncate a valid 270 at every segment boundary. Where the
 *    interchange frame does NOT parse, the shared parse raises a structural
 *    fatal and this work neither suppresses, downgrades, re-raises nor
 *    relocates it. Where the frame DOES parse, the 270 path returns a model,
 *    warns, and throws nothing. Never both.
 *
 * 4. **Hostile bytes raise nothing new.** Random and byte-flipped input raises
 *    nothing outside the structural fatal codes the package already defines,
 *    and the fatal set itself is unchanged.
 *
 * Plus the regression statement this work owes every other transaction set:
 * no committed fixture that is not a 270 gains any of the codes this work
 * added.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  FATAL_CODES,
  WARNING_CODES,
  X12ParseError,
  build270,
  get270Inquiry,
  parse270Inquiries,
  parseX12,
  serializeX12,
} from "../../src/index.js";
import type {
  Build270DateSpec,
  Build270InquirySpec,
  Build270NameSpec,
  Build270ReferenceSpec,
  Build270Spec,
  Build270SubscriberSpec,
  Build270TraceSpec,
  X12Inquiry,
  X12InquiryDate,
  X12InquiryName,
  X12InquiryReference,
  X12InquiryRequest,
  X12InquiryTrace,
} from "../../src/index.js";

import { fuzzRuns } from "./_fuzz-config.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

/** The codes this work added. Nothing outside the 270 path may raise one. */
const NEW_270_CODES: readonly string[] = [
  WARNING_CODES.X12_270_NON_CONVENTIONAL_DELIMITER,
  WARNING_CODES.X12_270_INTER_SEGMENT_WHITESPACE,
  WARNING_CODES.X12_270_DUPLICATE_HIERARCHY_ID,
  WARNING_CODES.X12_270_HIERARCHY_CYCLE,
  WARNING_CODES.X12_270_LEVEL_DETACHED,
];

// ---------------------------------------------------------------------------
// Turning a decoded model back into the spec the builder takes.
// ---------------------------------------------------------------------------

/**
 * Every optional field is spread conditionally rather than written as
 * `undefined`: the package compiles with `exactOptionalPropertyTypes`, so an
 * explicit `undefined` is a different thing from an absent key, and only the
 * absent key means "the sender said nothing".
 */
function nameSpec(name: X12InquiryName | undefined): Build270NameSpec {
  if (name === undefined) throw new Error("property: a level came back with no name");
  return {
    entityIdentifierCode: name.entityIdentifierCode,
    entityTypeQualifier: name.entityTypeQualifier,
    ...(name.lastNameOrOrganizationName === undefined
      ? {}
      : { lastNameOrOrganizationName: name.lastNameOrOrganizationName }),
    ...(name.firstName === undefined ? {} : { firstName: name.firstName }),
    ...(name.middleName === undefined ? {} : { middleName: name.middleName }),
    ...(name.suffix === undefined ? {} : { suffix: name.suffix }),
    ...(name.idQualifier === undefined ? {} : { idQualifier: name.idQualifier }),
    ...(name.idCode === undefined ? {} : { idCode: name.idCode }),
    ...(name.address === undefined
      ? {}
      : {
          address: {
            lines: [...name.address.lines],
            ...(name.address.city === undefined ? {} : { city: name.address.city }),
            ...(name.address.state === undefined ? {} : { state: name.address.state }),
            ...(name.address.postalCode === undefined
              ? {}
              : { postalCode: name.address.postalCode }),
            ...(name.address.countryCode === undefined
              ? {}
              : { countryCode: name.address.countryCode }),
          },
        }),
    ...(name.dateOfBirth === undefined ? {} : { dateOfBirth: name.dateOfBirth }),
    ...(name.genderCode === undefined ? {} : { genderCode: name.genderCode }),
  };
}

function traceSpec(trace: X12InquiryTrace): Build270TraceSpec {
  return {
    traceTypeCode: trace.traceTypeCode,
    referenceId: trace.referenceId,
    ...(trace.originatingCompanyId === undefined
      ? {}
      : { originatingCompanyId: trace.originatingCompanyId }),
    ...(trace.supplementalReferenceId === undefined
      ? {}
      : { supplementalReferenceId: trace.supplementalReferenceId }),
  };
}

function referenceSpec(ref: X12InquiryReference): Build270ReferenceSpec {
  return {
    qualifier: ref.qualifier,
    value: ref.value,
    ...(ref.description === undefined ? {} : { description: ref.description }),
  };
}

function dateSpec(date: X12InquiryDate): Build270DateSpec {
  return { qualifier: date.qualifier, formatQualifier: date.formatQualifier, value: date.value };
}

function inquirySpec(request: X12InquiryRequest): Build270InquirySpec {
  return {
    serviceTypeCodes: request.serviceTypeCodes.map((s) => ({ code: s.code })),
    ...(request.procedure === undefined
      ? {}
      : {
          procedure: {
            qualifier: request.procedure.qualifier,
            ...(request.procedure.code === undefined ? {} : { code: request.procedure.code }),
            modifiers: [...request.procedure.modifiers],
            ...(request.procedure.description === undefined
              ? {}
              : { description: request.procedure.description }),
          },
        }),
    ...(request.coverageLevelCode === undefined
      ? {}
      : { coverageLevelCode: request.coverageLevelCode }),
    ...(request.insuranceTypeCode === undefined
      ? {}
      : { insuranceTypeCode: request.insuranceTypeCode }),
    diagnosisCodePointers: [...request.diagnosisCodePointers],
    references: request.references.map(referenceSpec),
    dates: request.dates.map(dateSpec),
  };
}

/** Re-derive the build spec from a decoded model, so the emit can be re-run. */
function specFromModel(model: X12Inquiry, envelope: Build270Spec["envelope"]): Build270Spec {
  return {
    envelope,
    ...(model.header === undefined
      ? {}
      : {
          header: {
            hierarchicalStructureCode: model.header.hierarchicalStructureCode,
            purposeCode: model.header.purposeCode,
            ...(model.header.referenceId === undefined
              ? {}
              : { referenceId: model.header.referenceId }),
            ...(model.header.date === undefined ? {} : { date: model.header.date }),
            ...(model.header.time === undefined ? {} : { time: model.header.time }),
          },
        }),
    informationSources: model.informationSources.map((source) => ({
      name: nameSpec(source.name),
      references: source.references.map(referenceSpec),
      receivers: source.receivers.map((receiver) => ({
        name: nameSpec(receiver.name),
        references: receiver.references.map(referenceSpec),
        subscribers: receiver.subscribers.map(
          (subscriber): Build270SubscriberSpec => ({
            traces: subscriber.traces.map(traceSpec),
            name: nameSpec(subscriber.name),
            references: subscriber.references.map(referenceSpec),
            dates: subscriber.dates.map(dateSpec),
            inquiries: subscriber.inquiries.map(inquirySpec),
            dependents: subscriber.dependents.map((dependent) => ({
              traces: dependent.traces.map(traceSpec),
              name: nameSpec(dependent.name),
              references: dependent.references.map(referenceSpec),
              dates: dependent.dates.map(dateSpec),
              inquiries: dependent.inquiries.map(inquirySpec),
            })),
          }),
        ),
      })),
    })),
  };
}

/** The decoded model of the first 270 in a built interchange. */
function decode(raw: string): X12Inquiry {
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("property: built interchange has no transaction");
  const model = get270Inquiry(ix.delimiters, tx);
  if (model === undefined) throw new Error("property: built interchange is not a 270");
  return model;
}

// ---------------------------------------------------------------------------
// Generators.
// ---------------------------------------------------------------------------

/** Uppercase alphanumeric words, which every X12 element slot admits. */
const word = fc
  .stringMatching(/^[A-Z0-9]{1,10}$/u)
  .filter((s) => s.length > 0 && /^[A-Z0-9]+$/u.test(s));

const serviceTypeCode = fc.constantFrom("1", "30", "35", "47", "48", "50", "86", "88", "98");

const inquiryArb = fc.record({
  serviceTypeCodes: fc
    .array(serviceTypeCode, { minLength: 1, maxLength: 3 })
    .map((codes) => codes.map((code) => ({ code }))),
  coverageLevelCode: fc.constantFrom("IND", "FAM", "CHD"),
});

const subscriberArb = fc.record({
  traces: fc
    .array(word, { minLength: 0, maxLength: 2 })
    .map((ids) => ids.map((referenceId) => ({ traceTypeCode: "1", referenceId }))),
  lastName: fc.constantFrom("DOE", "ROE", "TEST"),
  firstName: fc.constantFrom("JANE", "JOHN", "SAM"),
  memberId: word.map((w) => `MBR${w}`),
  inquiries: fc.array(inquiryArb, { minLength: 1, maxLength: 3 }),
});

const specArb: fc.Arbitrary<Build270Spec> = fc
  .record({
    payer: word,
    provider: word,
    subscribers: fc.array(subscriberArb, { minLength: 1, maxLength: 3 }),
    reference: word,
  })
  .map((gen) => ({
    envelope: {
      senderId: "ANYTOWNCLINIC",
      receiverId: "MEDPAY",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      groupControlNumber: "1",
      transactionSetControlNumber: "0001",
    },
    header: { referenceId: gen.reference },
    informationSources: [
      {
        name: {
          entityIdentifierCode: "PR",
          entityTypeQualifier: "2",
          lastNameOrOrganizationName: gen.payer,
        },
        receivers: [
          {
            name: {
              entityIdentifierCode: "1P",
              entityTypeQualifier: "2",
              lastNameOrOrganizationName: gen.provider,
            },
            subscribers: gen.subscribers.map((s) => ({
              traces: s.traces,
              name: {
                entityIdentifierCode: "IL",
                entityTypeQualifier: "1",
                lastNameOrOrganizationName: s.lastName,
                firstName: s.firstName,
                idQualifier: "MI",
                idCode: s.memberId,
              },
              inquiries: s.inquiries,
            })),
          },
        ],
      },
    ],
  }));

/**
 * Four PAIRWISE DISTINCT visible non-whitespace delimiter characters, drawn
 * from a pool that excludes the release character. See the file header for why
 * the bound is stated rather than left to chance.
 */
const DELIMITER_POOL = [
  "*",
  "|",
  "^",
  "\\",
  "@",
  ":",
  "!",
  "#",
  "+",
  "&",
  "%",
  "$",
  ">",
  "<",
  "~",
] as const;

const declaredDelimiters = fc
  .shuffledSubarray([...DELIMITER_POOL], { minLength: 4, maxLength: 4 })
  .map((picked) => {
    const [element, repetition, component, segment] = picked;
    if (
      element === undefined ||
      repetition === undefined ||
      component === undefined ||
      segment === undefined
    ) {
      throw new Error("property: shuffledSubarray returned fewer than four");
    }
    return { element, repetition, component, segment };
  })
  .filter((d) => new Set([d.element, d.repetition, d.component, d.segment]).size === 4);

// ---------------------------------------------------------------------------
// 1. The emit is a fixed point.
// ---------------------------------------------------------------------------

describe("270 emit: the fixed point", () => {
  it("re-emitting a reparse produces byte-identical output", () => {
    fc.assert(
      fc.property(specArb, (spec) => {
        const first = serializeX12(build270(spec));
        const second = serializeX12(build270(specFromModel(decode(first), spec.envelope)));
        expect(second).toBe(first);
      }),
      { numRuns: 200 },
    );
  });

  it("the two reparses agree in model and in warning stream", () => {
    fc.assert(
      fc.property(specArb, (spec) => {
        const first = serializeX12(build270(spec));
        const modelOne = decode(first);
        const second = serializeX12(build270(specFromModel(modelOne, spec.envelope)));
        const modelTwo = decode(second);
        expect(JSON.stringify(modelTwo)).toBe(JSON.stringify(modelOne));
        expect(modelTwo.warnings).toEqual(modelOne.warnings);
      }),
      { numRuns: 200 },
    );
  });

  it("emits the spec-clean form of a model parsed from a document that deviated", () => {
    // The tolerated deviation is NOT reproduced, and byte equality with the
    // original is neither claimed nor asserted: what is asserted is that the
    // emit lands on the spec-clean twin of the document it came from.
    const quirky = readFileSync(join(FIXTURES, "eligibility", "270-quirk-linebreaks.edi"), "utf8");
    const model = parse270Inquiries(quirky)[0];
    if (model === undefined) throw new Error("property: the quirky fixture decoded no 270");
    const envelope: Build270Spec["envelope"] = {
      senderId: "ANYTOWNCLINIC",
      receiverId: "MEDPAY",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      groupControlNumber: "1",
      transactionSetControlNumber: "0001",
    };
    const emitted = serializeX12(build270(specFromModel(model, envelope)));
    expect(emitted).not.toContain("\n");
    expect(emitted).toBe(
      readFileSync(join(FIXTURES, "eligibility", "270-canonical.edi"), "utf8").trimEnd(),
    );
  });
});

// ---------------------------------------------------------------------------
// 2. A declared delimiter changes no value.
// ---------------------------------------------------------------------------

describe("270 read: a declared delimiter set changes no value", () => {
  it("decodes equal to the conventional twin, over every generated set", () => {
    fc.assert(
      fc.property(specArb, declaredDelimiters, (spec, delimiters) => {
        const conventional = decode(serializeX12(build270(spec)));
        const declared = decode(
          serializeX12(
            build270({
              ...spec,
              envelope: {
                ...spec.envelope,
                elementSeparator: delimiters.element,
                repetitionSeparator: delimiters.repetition,
                componentSeparator: delimiters.component,
                segmentTerminator: delimiters.segment,
              },
            }),
          ),
        );
        const strip = (m: X12Inquiry): string => {
          const { warnings: _warnings, ...rest } = m;
          return JSON.stringify(rest);
        };
        expect(strip(declared)).toBe(strip(conventional));
      }),
      { numRuns: 200 },
    );
  });

  it("reports the tolerance exactly when the declared set is not the conventional one", () => {
    fc.assert(
      fc.property(specArb, declaredDelimiters, (spec, delimiters) => {
        const raw = serializeX12(
          build270({
            ...spec,
            envelope: {
              ...spec.envelope,
              elementSeparator: delimiters.element,
              repetitionSeparator: delimiters.repetition,
              componentSeparator: delimiters.component,
              segmentTerminator: delimiters.segment,
            },
          }),
        );
        const conventional =
          delimiters.element === "*" &&
          delimiters.repetition === "^" &&
          delimiters.component === ":" &&
          delimiters.segment === "~";
        const model = decode(raw);
        const raised = model.warnings.filter(
          (w) => w.code === WARNING_CODES.X12_270_NON_CONVENTIONAL_DELIMITER,
        );
        expect(raised).toHaveLength(conventional ? 0 : 1);
        for (const w of model.warnings) expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Truncation splits by whether the frame parsed.
// ---------------------------------------------------------------------------

/**
 * Every prefix of `raw` that ends at a segment terminator, plus the whole, plus
 * prefixes inside the ISA itself.
 *
 * The ISA carries the FIRST terminator, so segment-boundary truncation alone
 * only ever produces inputs whose frame parses. The sub-ISA prefixes are what
 * reach the other half of the split, which is the half that must keep raising
 * the shared parse's structural fatal.
 */
function truncations(raw: string): string[] {
  const out: string[] = [];
  for (let i = 0; i <= 106 && i <= raw.length; i += 4) out.push(raw.slice(0, i));
  for (let i = 0; i < raw.length; i += 1) {
    if (raw.charAt(i) === "~") out.push(raw.slice(0, i + 1));
  }
  out.push(raw);
  return out;
}

describe("270 read: truncation falls under exactly one rule", () => {
  const canonical = readFileSync(
    join(FIXTURES, "eligibility", "270-canonical.edi"),
    "utf8",
  ).trimEnd();

  it("either the frame does not parse and the shared fatal stands, or the 270 path returns a model", () => {
    let framed = 0;
    let fatal = 0;
    for (const input of truncations(canonical)) {
      let thrown: unknown;
      let models: readonly X12Inquiry[] = [];
      try {
        models = parse270Inquiries(input);
      } catch (err) {
        thrown = err;
      }
      if (thrown !== undefined) {
        // The frame did not parse. The fatal is the shared parse's, raised at
        // the pin, and this work neither suppresses nor relocates it.
        fatal += 1;
        expect(thrown).toBeInstanceOf(X12ParseError);
        expect(Object.values(FATAL_CODES)).toContain((thrown as X12ParseError).code);
        continue;
      }
      framed += 1;
      for (const model of models) {
        for (const w of model.warnings) {
          expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
          expect(Object.values(WARNING_CODES)).toContain(w.code);
        }
      }
    }
    // Both halves are exercised: a truncation short of a readable ISA fatals,
    // and one past it frames and warns.
    expect(fatal).toBeGreaterThan(0);
    expect(framed).toBeGreaterThan(0);
  });

  it("a frame that parses never throws out of the 270 path", () => {
    for (const input of truncations(canonical)) {
      let framed = true;
      try {
        parseX12(input);
      } catch {
        framed = false;
      }
      if (!framed) continue;
      expect(() => parse270Inquiries(input)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Hostile bytes raise nothing new.
// ---------------------------------------------------------------------------

describe("270 read: hostile bytes", () => {
  it("raises nothing outside the structural fatal set the package already defines", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 400 }), (noise) => {
        for (const input of [noise, `ISA${noise}`]) {
          try {
            parse270Inquiries(input);
          } catch (err) {
            expect(err).toBeInstanceOf(X12ParseError);
            expect(Object.values(FATAL_CODES)).toContain((err as X12ParseError).code);
          }
        }
      }),
      { numRuns: fuzzRuns(500) },
    );
  });

  it("adds no fatal code and removes none", () => {
    expect(Object.keys(FATAL_CODES).sort((a, b) => a.localeCompare(b))).toEqual([
      "X12_EMPTY_INPUT",
      "X12_INVALID_DELIMITERS",
      "X12_ISA_TOO_SHORT",
      "X12_NO_ISA_HEADER",
    ]);
  });

  it("survives a byte flipped anywhere in a valid 270", () => {
    const canonical = readFileSync(
      join(FIXTURES, "eligibility", "270-canonical.edi"),
      "utf8",
    ).trimEnd();
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: canonical.length - 1 }),
        fc.constantFrom("X", "0", "!", "?", "~", "*", ":", "^"),
        (position, byte) => {
          const flipped = canonical.slice(0, position) + byte + canonical.slice(position + 1);
          try {
            for (const model of parse270Inquiries(flipped)) {
              for (const w of model.warnings) {
                expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
              }
            }
          } catch (err) {
            expect(err).toBeInstanceOf(X12ParseError);
            expect(Object.values(FATAL_CODES)).toContain((err as X12ParseError).code);
          }
        },
      ),
      { numRuns: fuzzRuns(500) },
    );
  });
});

// ---------------------------------------------------------------------------
// The regression statement this work owes every other transaction set.
// ---------------------------------------------------------------------------

/** Every committed `.edi` fixture that is not a 270. */
function nonInquiryFixtures(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".edi")) continue;
      if (entry.name.startsWith("270")) continue;
      out.push(full);
    }
  };
  walk(FIXTURES);
  return out.sort();
}

describe("AC11: no fixture that is not a 270 gains anything from this work", () => {
  const fixtures = nonInquiryFixtures();

  it("finds the committed corpus", () => {
    expect(fixtures.length).toBeGreaterThan(20);
  });

  it("raises none of the added codes on any of them", () => {
    for (const path of fixtures) {
      const raw = readFileSync(path, "utf8").trimEnd();
      let ix;
      try {
        ix = parseX12(raw);
      } catch {
        continue;
      }
      for (const w of ix.warnings) {
        expect(NEW_270_CODES).not.toContain(w.code);
      }
      // And the 270 path claims none of them.
      expect(parse270Inquiries(raw)).toEqual([]);
    }
  });

  it("still emits every golden byte-for-byte", () => {
    const goldenDir = join(FIXTURES, "golden");
    for (const name of readdirSync(goldenDir)) {
      if (!name.endsWith(".edi")) continue;
      if (name.startsWith("270")) continue;
      const golden = readFileSync(join(goldenDir, name), "utf8");
      expect(serializeX12(parseX12(golden))).toBe(golden);
    }
  });
});
