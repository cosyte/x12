/**
 * Generators of build specs for the 278 request and response, the 275 and the 277 request for
 * additional information, and the helpers their property suites share: how a document is made
 * messy, how it is damaged, and how a lenient read is judged.
 *
 * Every value is invented: names, identifiers and references are letters and digits drawn here,
 * sometimes with a delimiter or the release character inside, which the builders must release
 * on emit and the readers must give back as it was. Codes are drawn from short lists of the
 * values each element takes, so a spec is one the builder accepts.
 */

import assert from "node:assert/strict";

import fc from "fast-check";
import type { Arbitrary } from "fast-check";

import {
  FATAL_CODES,
  WARNING_CODES,
  X12Decimal,
  X12ParseError,
  parseX12,
  type Build275AttachmentSpec,
  type Build275Spec,
  type Build277RfaiLevelSpec,
  type Build277RfaiRequestSpec,
  type Build277RfaiSpec,
  type Build277RfaiStatusSpec,
  type Build278EntitySpec,
  type Build278ReviewSpec,
  type Build278Spec,
  type X12Interchange,
  type X12ParseWarning,
  type X12TransactionSet,
} from "../../src/index.js";

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Letters and digits, `min` to `max` of them. */
export function token(min: number, max: number): Arbitrary<string> {
  return fc.string({ unit: fc.constantFrom(...ALPHANUMERIC), minLength: min, maxLength: max });
}

/** Digits, exactly `length` of them. */
function digits(length: number): Arbitrary<string> {
  return fc.string({
    unit: fc.constantFrom(..."0123456789"),
    minLength: length,
    maxLength: length,
  });
}

/**
 * A caller's free-text value: letters and digits, sometimes with a space, a delimiter or the
 * release character inside (never at either end), which the builder releases on emit.
 */
export function text(max = 12): Arbitrary<string> {
  return fc
    .tuple(
      token(1, max),
      fc.option(fc.tuple(fc.constantFrom(" ", "-", "*", "^", ":", "~", "?"), token(1, 4)), {
        nil: undefined,
      }),
    )
    .map(([head, tail]) => (tail === undefined ? head : `${head}${tail[0]}${tail[1]}`));
}

/** A calendar date, `CCYYMMDD`. */
export function date8(): Arbitrary<string> {
  return fc
    .tuple(
      fc.integer({ min: 2000, max: 2030 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    )
    .map(([y, m, d]) => `${String(y)}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`);
}

/** A time of day, `HHMM`. */
function time4(): Arbitrary<string> {
  return fc
    .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
    .map(([h, m]) => `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`);
}

/** A DTP date and the format qualifier that says its shape. */
function dated(): Arbitrary<{ formatQualifier: string; value: string }> {
  return fc.oneof(
    date8().map((value) => ({ formatQualifier: "D8", value })),
    fc.tuple(date8(), date8()).map(([a, b]) => ({ formatQualifier: "RD8", value: `${a}-${b}` })),
  );
}

/** An amount or a quantity, as the decimal a builder takes. */
export function decimal(): Arbitrary<X12Decimal> {
  return fc
    .tuple(fc.integer({ min: 0, max: 99_999 }), fc.option(digits(2), { nil: undefined }))
    .map(([whole, cents]) => {
      const d = X12Decimal.fromString(
        cents === undefined ? String(whole) : `${String(whole)}.${cents}`,
      );
      assert.ok(d !== undefined);
      return d;
    });
}

/** An envelope with drawn control numbers. */
function envelope(senderId: string, receiverId: string) {
  return fc.record({
    senderId: fc.constant(senderId),
    receiverId: fc.constant(receiverId),
    interchangeDate: date8().map((d) => d.slice(2)),
    interchangeTime: time4(),
    interchangeControlNumber: fc
      .integer({ min: 1, max: 999_999_999 })
      .map((n) => String(n).padStart(9, "0")),
    groupControlNumber: fc.integer({ min: 1, max: 999_999 }).map(String),
    transactionSetControlNumber: fc
      .integer({ min: 1, max: 9999 })
      .map((n) => String(n).padStart(4, "0")),
  });
}

/** An id qualifier and its id, together or not at all. */
function identified(
  qualifiers: readonly string[],
): Arbitrary<{ idQualifier?: string; idCode?: string }> {
  return fc
    .option(fc.record({ idQualifier: fc.constantFrom(...qualifiers), idCode: token(2, 12) }), {
      nil: undefined,
    })
    .map((id) => id ?? {});
}

/** Up to `max` of `item`, or the list left out. */
function list<T>(item: Arbitrary<T>, max: number): Arbitrary<readonly T[] | undefined> {
  return fc.option(fc.array(item, { minLength: 1, maxLength: max }), { nil: undefined });
}

/** `T` with each key that may hold `undefined` made optional instead, as the spec types declare. */
type Compact<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

/** Drop the keys whose value is undefined, so a spec says only what it states. */
function compact<T extends object>(value: T): Compact<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Compact<T>;
}

// ---------------------------------------------------------------------------
// 278
// ---------------------------------------------------------------------------

function entity278(codes: readonly string[]): Arbitrary<Build278EntitySpec> {
  return fc
    .tuple(
      fc.constantFrom(...codes),
      fc.constantFrom("1", "2"),
      text(),
      identified(["XX", "PI", "46"]),
    )
    .map(([entityIdentifierCode, entityTypeQualifier, name, id]) => ({
      entityIdentifierCode,
      entityTypeQualifier,
      name,
      ...id,
    }));
}

function member278(code: string) {
  return fc
    .tuple(
      fc.option(text(), { nil: undefined }),
      fc.option(text(), { nil: undefined }),
      identified(["MI", "ZZ"]),
      fc.option(fc.tuple(date8(), fc.constantFrom("F", "M", "U")), { nil: undefined }),
    )
    .map(([lastName, firstName, id, demographics]) =>
      compact({
        entityIdentifierCode: code,
        entityTypeQualifier: "1",
        lastName,
        firstName,
        ...id,
        dateOfBirth: demographics?.[0],
        genderCode: demographics?.[1],
      }),
    );
}

function review278(direction: "request" | "response"): Arbitrary<Build278ReviewSpec> {
  const decision =
    direction === "response"
      ? fc
          .tuple(
            fc.constantFrom("A1", "A3", "A4", "A6", "CT", "NA"),
            fc.option(token(4, 12), { nil: undefined }),
          )
          .map(([actionCode, reviewIdentificationNumber]) =>
            compact({ actionCode, reviewIdentificationNumber }),
          )
      : fc.constant(undefined);
  return fc
    .record({
      requestCategoryCode: fc.constantFrom("HS", "AR", "SC"),
      certificationTypeCode: fc.option(fc.constantFrom("I", "R", "S"), { nil: undefined }),
      serviceTypeCode: fc.option(fc.constantFrom("1", "2", "3", "48"), { nil: undefined }),
      decision,
      traces: list(
        fc
          .tuple(fc.constantFrom("1", "2"), text(), fc.option(token(4, 9), { nil: undefined }))
          .map(([traceTypeCode, referenceId, company]) =>
            compact({
              traceTypeCode,
              referenceId,
              originatingCompanyId: company === undefined ? undefined : `9${company}`,
            }),
          ),
        2,
      ),
      diagnoses: list(
        fc.record({ qualifier: fc.constantFrom("ABK", "ABF"), code: token(3, 7) }),
        3,
      ),
      providers: list(entity278(["71", "72", "SJ", "FA"]), 2),
      references: list(fc.record({ qualifier: fc.constantFrom("BB", "NT"), value: text() }), 2),
      dates: list(
        fc
          .tuple(fc.constantFrom("472", "AAH"), dated())
          .map(([qualifier, d]) => ({ qualifier, ...d })),
        2,
      ),
      messages: list(text(30), 2),
    })
    .map((review) => compact(review));
}

/** A 278 spec for `direction`: a subscriber with one to three reviews, and sometimes a dependent. */
export function spec278(direction: "request" | "response"): Arbitrary<Build278Spec> {
  return fc
    .record({
      envelope: envelope("SUBMITTER", "UMOPAYER"),
      header: fc
        .record({
          structurePurposeCode: fc.constant("0007"),
          purposeCode: fc.constantFrom("13", "11"),
          referenceId: fc.option(text(), { nil: undefined }),
          date: fc.option(date8(), { nil: undefined }),
          time: fc.option(time4(), { nil: undefined }),
        })
        .map((header) => compact(header)),
      utilizationManagementOrganization: entity278(["X3"]),
      requester: entity278(["1P", "FA"]),
      member: fc.option(member278("IL"), { nil: undefined }),
      reviews: fc.array(review278(direction), { minLength: 1, maxLength: 3 }),
      dependent: fc.option(
        fc.record({
          member: member278("QC"),
          reviews: fc.array(review278(direction), { minLength: 1, maxLength: 2 }),
        }),
        { nil: undefined },
      ),
    })
    .map(
      ({
        envelope: env,
        header,
        utilizationManagementOrganization,
        requester,
        member,
        reviews,
        dependent,
      }) => ({
        envelope: env,
        header,
        utilizationManagementOrganization,
        requester,
        subscriber: compact({ member, reviews, dependent }),
      }),
    );
}

// ---------------------------------------------------------------------------
// 275
// ---------------------------------------------------------------------------

/** An attachment's octets: random bytes, as one character each, with a delimiter somewhere. */
function attachment(): Arbitrary<Build275AttachmentSpec> {
  return fc
    .tuple(
      fc.constantFrom("B64", "ASC", "BIN"),
      fc.uint8Array({ minLength: 0, maxLength: 60 }),
      fc.constantFrom("*", "^", ":", "~", "?", "\r", "\n", "A"),
      fc.nat(),
    )
    .map(([filterCode, bytes, delimiter, at]) => {
      const noise = Buffer.from(bytes).toString("latin1");
      const cut = at % (noise.length + 1);
      return { filterCode, data: noise.slice(0, cut) + delimiter + noise.slice(cut) };
    });
}

/** A 275 spec: an optional BGN and entities, then one to three lines, each with its attachments. */
export function spec275(): Arbitrary<Build275Spec> {
  return (
    fc
      .record({
        envelope: envelope("CLINIC01", "PAYER01"),
        beginning: fc.option(
          fc
            .record({
              transactionSetPurposeCode: fc.constantFrom("02", "06", "11"),
              referenceId: fc.option(text(), { nil: undefined }),
              date: fc.option(date8(), { nil: undefined }),
              time: fc.option(time4(), { nil: undefined }),
            })
            .map((b) => compact(b)),
          { nil: undefined },
        ),
        entities: list(
          fc
            .tuple(
              fc.constantFrom("PR", "41", "1P", "QC"),
              fc.constantFrom("1", "2"),
              fc.option(text(), { nil: undefined }),
              fc.option(text(), { nil: undefined }),
              identified(["PI", "46", "XX", "MI"]),
            )
            .map(
              ([
                entityIdentifierCode,
                entityTypeQualifier,
                lastOrOrganizationName,
                firstName,
                id,
              ]) =>
                compact({
                  entityIdentifierCode,
                  entityTypeQualifier,
                  lastOrOrganizationName,
                  firstName,
                  ...id,
                }),
            ),
          2,
        ),
        lines: fc.array(
          fc
            .record({
              trace: fc.option(
                fc.record({ traceTypeCode: fc.constantFrom("1", "2"), referenceId: text() }),
                { nil: undefined },
              ),
              status: fc.option(
                fc
                  .record({
                    codes: fc.array(
                      fc
                        .tuple(
                          fc.constantFrom("R0", "R1", "R3"),
                          token(2, 8),
                          fc.option(fc.constantFrom("1P", "PR"), { nil: undefined }),
                          fc.option(fc.constant("LOI"), { nil: undefined }),
                        )
                        .map(([categoryCode, statusCode, entityCode, codeListQualifier]) =>
                          compact({ categoryCode, statusCode, entityCode, codeListQualifier }),
                        ),
                      { minLength: 1, maxLength: 2 },
                    ),
                    statusEffectiveDate: fc.option(date8(), { nil: undefined }),
                  })
                  .map((s) => compact(s)),
                { nil: undefined },
              ),
              references: list(
                fc.record({ qualifier: fc.constantFrom("1K", "EJ"), value: text() }),
                2,
              ),
              attachments: list(attachment(), 3),
            })
            .map((line) => compact(line)),
          { minLength: 1, maxLength: 3 },
        ),
      })
      // The builder refuses a 275 with no attachment at all, so one line at least carries one.
      .filter((spec) => spec.lines.some((line) => line.attachments !== undefined))
      .map((spec) => compact(spec))
  );
}

// ---------------------------------------------------------------------------
// 277 request for additional information
// ---------------------------------------------------------------------------

function rfaiStatus(): Arbitrary<Build277RfaiStatusSpec> {
  return fc
    .record({
      // A code with C043-04 is the code source's own (a LOINC code here); one without is a claim
      // status code, which the reader looks up and warns about when it is not in the snapshot,
      // so those are drawn from codes the snapshot holds.
      codes: fc.array(
        fc
          .tuple(
            fc.constantFrom("R0", "R1"),
            fc.oneof(
              token(2, 8).map((statusCode) => ({ statusCode, codeListQualifier: "LOI" })),
              fc.constantFrom("15", "20", "21").map((statusCode) => ({ statusCode })),
            ),
            fc.option(fc.constantFrom("1P", "PR"), { nil: undefined }),
          )
          .map(([categoryCode, code, entityCode]) =>
            compact({
              categoryCode,
              statusCode: code.statusCode,
              entityCode,
              codeListQualifier: "codeListQualifier" in code ? code.codeListQualifier : undefined,
            }),
          ),
        { minLength: 1, maxLength: 3 },
      ),
      statusEffectiveDate: fc.option(date8(), { nil: undefined }),
      totalChargeAmount: fc.option(decimal(), { nil: undefined }),
    })
    .map((s) => compact(s));
}

const rfaiReference = fc.record({ qualifier: fc.constantFrom("1K", "EJ", "BLT"), value: text() });
const rfaiDate = fc
  .tuple(fc.constantFrom("472", "434"), dated())
  .map(([qualifier, d]) => ({ qualifier, ...d }));

function rfaiRequest(): Arbitrary<Build277RfaiRequestSpec> {
  return fc
    .record({
      trace: fc
        .tuple(fc.constantFrom("1", "2"), text(), fc.option(token(4, 9), { nil: undefined }))
        .map(([traceTypeCode, referenceId, company]) =>
          compact({
            traceTypeCode,
            referenceId,
            originatingCompanyId: company === undefined ? undefined : `9${company}`,
          }),
        ),
      statuses: list(rfaiStatus(), 2),
      references: list(rfaiReference, 2),
      dates: list(rfaiDate, 1),
      quantities: list(fc.record({ qualifier: fc.constant("90"), quantity: decimal() }), 1),
      amounts: list(fc.record({ qualifier: fc.constant("T3"), amount: decimal() }), 1),
      serviceLines: list(
        fc
          .record({
            service: fc
              .record({
                serviceIdQualifier: fc.constant("HC"),
                procedureCode: token(5, 5),
                modifiers: list(token(2, 2), 2),
                lineChargeAmount: fc.option(decimal(), { nil: undefined }),
                unitsOfService: fc.option(decimal(), { nil: undefined }),
              })
              .map((s) => compact(s)),
            statuses: list(rfaiStatus(), 1),
            references: list(rfaiReference, 1),
            dates: list(rfaiDate, 1),
          })
          .map((line) => compact(line)),
        2,
      ),
    })
    .map((r) => compact(r));
}

function rfaiEntity(code: string) {
  return fc
    .tuple(
      fc.constantFrom("1", "2"),
      fc.option(text(), { nil: undefined }),
      fc.option(text(), { nil: undefined }),
      identified(["PI", "46", "MI"]),
    )
    .map(([entityTypeQualifier, lastOrOrganizationName, firstName, id]) =>
      compact({
        entityIdentifierCode: code,
        entityTypeQualifier,
        lastOrOrganizationName,
        firstName,
        ...id,
      }),
    );
}

/**
 * A 277 request for additional information: an information source level (`20`) with one or two
 * patient levels (`22`) under it, each with one or two requests, and sometimes a service
 * provider level (`19`) between them.
 */
export function spec277Rfai(): Arbitrary<Build277RfaiSpec> {
  const patient: Arbitrary<Build277RfaiLevelSpec> = fc
    .record({
      entities: list(rfaiEntity("QC"), 1),
      requests: fc.array(rfaiRequest(), { minLength: 1, maxLength: 2 }),
    })
    .map((level) => compact({ levelCode: "22", childCode: "0", ...level }));
  const middle: Arbitrary<readonly Build277RfaiLevelSpec[]> = fc.oneof(
    fc.array(patient, { minLength: 1, maxLength: 2 }),
    fc
      .tuple(
        fc.option(rfaiEntity("1P"), { nil: undefined }),
        fc.array(patient, { minLength: 1, maxLength: 2 }),
      )
      .map(([provider, children]) => [
        compact({
          levelCode: "19",
          childCode: "1",
          entities: provider === undefined ? undefined : [provider],
          children,
        }),
      ]),
  );
  return fc.record({
    envelope: envelope("PAYER01", "CLINIC01"),
    header: fc
      .record({
        hierarchicalStructureCode: fc.constant("0010"),
        transactionSetPurposeCode: fc.constant("08"),
        referenceId: fc.option(text(), { nil: undefined }),
        date: fc.option(date8(), { nil: undefined }),
        time: fc.option(time4(), { nil: undefined }),
        transactionTypeCode: fc.option(fc.constant("DG"), { nil: undefined }),
      })
      .map((h) => compact(h)),
    levels: fc
      .tuple(rfaiEntity("PR"), middle)
      .map(([source, children]) => [
        { levelCode: "20", childCode: "1", entities: [source], children },
      ]),
  });
}

// ---------------------------------------------------------------------------
// Shared judging
// ---------------------------------------------------------------------------

/**
 * A value as plain data: a decimal as its text, an object without its undefined keys, so a
 * reading compares with the spec it was built from.
 */
export function plain(value: unknown): unknown {
  if (value instanceof X12Decimal) return value.toString();
  if (Array.isArray(value)) return value.map(plain);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, plain(v)]),
    );
  }
  return value;
}

const FATAL: ReadonlySet<string> = new Set(Object.values(FATAL_CODES));
const KNOWN: ReadonlySet<string> = new Set(Object.values(WARNING_CODES));

/** Parse leniently: the interchange, or `undefined` when refused with a documented fatal. */
export function parseOrFatal(raw: string | Buffer): X12Interchange | undefined {
  try {
    return parseX12(raw);
  } catch (err) {
    assert.ok(err instanceof X12ParseError, `lenient parse threw ${String(err)}`);
    assert.ok(FATAL.has(err.code), `lenient parse threw the non-fatal code ${err.code}`);
    return undefined;
  }
}

/** Every warning carries a registered code and a segment position. */
export function assertWarningsRegistered(warnings: readonly X12ParseWarning[]): void {
  for (const w of warnings) {
    assert.ok(KNOWN.has(w.code), `unregistered warning code ${w.code}`);
    assert.ok(Number.isInteger(w.position.segmentIndex), `warning ${w.code} has no position`);
  }
}

/** Every transaction set of an interchange, in order. */
export function transactions(ix: X12Interchange): readonly X12TransactionSet[] {
  return ix.groups.flatMap((g) => g.transactions);
}

/**
 * Spec-clean text made messy the ways real files are: a line break after every segment
 * terminator, a line break of either kind, or neither.
 */
export function messy(clean: string, terminator: string): Arbitrary<string> {
  return fc
    .constantFrom("", "\n", "\r\n")
    .map((breakAfter) =>
      breakAfter === "" ? clean : clean.split(terminator).join(terminator + breakAfter),
    );
}

/**
 * Text damaged the ways a feed damages it: one byte changed, a run cut out, a segment dropped or
 * repeated, or the end cut off.
 */
export function damaged(clean: string, terminator: string): Arbitrary<string> {
  const segments = clean.split(terminator);
  return fc.oneof(
    fc
      .tuple(fc.nat(clean.length - 1), fc.integer({ min: 0, max: 255 }))
      .map(([at, code]) => clean.slice(0, at) + String.fromCharCode(code) + clean.slice(at + 1)),
    fc
      .tuple(fc.nat(clean.length - 1), fc.integer({ min: 1, max: 40 }))
      .map(([at, length]) => clean.slice(0, at) + clean.slice(at + length)),
    fc.nat(segments.length - 1).map((at) => segments.filter((_, i) => i !== at).join(terminator)),
    fc
      .nat(segments.length - 1)
      .map((at) => segments.flatMap((s, i) => (i === at ? [s, s] : [s])).join(terminator)),
    fc.nat(clean.length - 1).map((at) => clean.slice(0, at)),
  );
}
