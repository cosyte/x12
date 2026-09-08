/**
 * The date conversion surface shared by every `@cosyte/*` parser: `toObject`,
 * `toISO` and `toDate` over the date carriers this package's typed readers
 * surface.
 *
 * **This package refuses to invent a timezone, and that refusal is the whole
 * design.** A `DTP` or `DTM` element states a calendar DAY. A JavaScript
 * `Date` is an INSTANT, and turning a day into an instant needs a zone: the
 * same midnight is two different instants either side of a border, and reading
 * the host machine's zone would make the answer depend on where the code ran.
 * So `toDate` returns `undefined` unless the caller states the offset, and
 * nothing here ever reads `Intl`, `getTimezoneOffset` or the local zone. That
 * is the same stance `parseDocumentDate` already takes for the date-aware
 * code-list queries, and this module does not soften it.
 *
 * **What it decodes is exactly what this package already parses or builds.**
 * DTP-02 is the date/time period format qualifier, and the readers and
 * builders in this tree handle two of its values and no others: `D8`, a single
 * `CCYYMMDD` day, and `RD8`, a `CCYYMMDD-CCYYMMDD` RANGE. No format qualifier
 * is invented here. A qualifier this package does not already handle decodes to
 * `undefined` rather than to a guess at what its wire form would have been.
 *
 * **A range is not a point in time.** `RD8` names an interval, so there is no
 * single day, no single ISO string and no single instant to hand back for one.
 * All three functions answer `undefined` for it. Returning its first endpoint
 * would be a quiet wrong answer with a right-looking shape, which on a service
 * period or an eligibility span is a clinical or financial value read wrong.
 *
 * **None of the three ever throws.** An undecodable carrier, a value whose
 * digits do not match the format its own qualifier declares, a calendar-invalid
 * day, `null` and `undefined` all answer `undefined`. That is the deliberate
 * divergence from {@link "../../code-lists/document-date.js".parseDocumentDate},
 * which THROWS on its own invalid input and keeps that contract unchanged: it
 * answers a caller who asked a validity question and cannot state the day,
 * while these three answer a caller reading a document that has already been
 * parsed leniently, where a warning has already been raised and an exception
 * would be a second, worse report of the same thing.
 */

import { parseDocumentDate } from "../../code-lists/document-date.js";

/**
 * DTP-02 / DTM-03 `D8`: one calendar day written `CCYYMMDD`. The only
 * point-in-time format qualifier this package parses or builds.
 *
 * @internal
 */
const SINGLE_DAY_FORMAT = "D8";

/**
 * DTP-02 `RD8`: a date RANGE written `CCYYMMDD-CCYYMMDD`. Decoded here only so
 * far as recognising that it is an interval; see the module doc for why it
 * converts to `undefined` rather than to either endpoint.
 *
 * @internal
 */
const DATE_RANGE_FORMAT = "RD8";

/**
 * The `D8` wire shape: eight digits, century through day, nothing else. A
 * value that fails this does not match the format its own qualifier declares,
 * so it decodes to `undefined` - `2026-06-01` under `D8` included, even though
 * `parseDocumentDate` accepts that spelling from a caller who is not quoting a
 * DTP-02.
 *
 * @internal
 */
const D8_SHAPE = /^\d{8}$/u;

/** Milliseconds in a minute, for applying a stated offset. @internal */
const MS_PER_MINUTE = 60_000;

/**
 * Any date carrier this package's typed readers surface, read structurally
 * rather than by name.
 *
 * Every `X12*Date` this package exports is accepted through this one shape:
 * `X12ClaimDate`, `X12InquiryDate`, `X12EligibilityDate`, `X12StatusInquiryDate`,
 * `X12StatusDate`, `X12PremiumDate`, `X12EnrollmentDate` and `X12AuthDate`. It
 * is structural on purpose - a ninth carrier added later is accepted with no
 * change here, and there is no per-transaction conversion variant to pick
 * between.
 *
 * Both members are optional because two of those eight carriers state no
 * format qualifier at all: `X12EnrollmentDate` and `X12PremiumDate` surface the
 * qualifier and the verbatim value and nothing else. A carrier with no
 * `formatQualifier` converts to `undefined`, which is the honest answer rather
 * than a guess at which format the sender used.
 *
 * @example
 * ```ts
 * import { toISO, type X12DateValue } from "@cosyte/x12";
 * const day: X12DateValue = { formatQualifier: "D8", value: "20260601" };
 * toISO(day); // "2026-06-01"
 * ```
 */
export interface X12DateValue {
  /** DTP-02 / DTM-03 date/time period format qualifier, when the carrier states one. */
  readonly formatQualifier?: string | undefined;
  /** The verbatim date element, in whatever form `formatQualifier` declares. */
  readonly value?: string | undefined;
}

/**
 * The calendar components a value actually stated, and only those.
 *
 * A component the value did not state is ABSENT: the key is not there at all,
 * rather than present holding `undefined`. So `Object.keys()` of a result is
 * exactly the set of stated components and the value's precision is recoverable
 * from it. `month` is spec-native 1 to 12, never the JavaScript `Date` 0 to 11,
 * and the names are singular.
 *
 * Deleting `offsetMinutes` leaves an object `Temporal.PlainDateTime.from` and
 * luxon's `DateTime.fromObject` both accept with no key rename and no value
 * adjustment. That compatibility is the reason for this shape. Neither library
 * is a dependency of this package and neither is used at run time.
 *
 * The type carries every component the shared shape defines, so the same
 * declaration serves each `@cosyte/*` parser. From an X12 date element this
 * package populates `year`, `month` and `day` and nothing else: the two format
 * qualifiers it decodes are a whole day and a range of whole days, so no value
 * it reads states a time of day, a fraction of a second or a UTC offset.
 *
 * @example
 * ```ts
 * import { toObject, type DateParts } from "@cosyte/x12";
 * const parts: DateParts | undefined = toObject({ formatQualifier: "D8", value: "20260601" });
 * Object.keys(parts ?? {}); // ["year", "month", "day"]
 * parts?.month;             // 6, not 5
 * ```
 */
export interface DateParts {
  readonly year?: number;
  readonly month?: number;
  readonly day?: number;
  readonly hour?: number;
  readonly minute?: number;
  readonly second?: number;
  readonly millisecond?: number;
  readonly offsetMinutes?: number;
}

/**
 * The one option {@link toDate} takes, and the only way a zone reaches it.
 *
 * `assumeOffsetMinutes` is signed minutes east of UTC, so `0` means "treat this
 * calendar day as UTC" and `-300` means UTC-5. It is the caller stating a fact
 * this library does not have; without it there is no instant to return.
 *
 * @example
 * ```ts
 * import { toDate, type ToDateOptions } from "@cosyte/x12";
 * const easternStandard: ToDateOptions = { assumeOffsetMinutes: -300 };
 * toDate({ formatQualifier: "D8", value: "20260601" }, easternStandard);
 * // 2026-06-01T05:00:00.000Z
 * ```
 */
export interface ToDateOptions {
  readonly assumeOffsetMinutes?: number | undefined;
}

/**
 * A decoded `D8` day, held as the verbatim digit runs the element carried.
 *
 * The digits are kept as text rather than as numbers so `toISO` renders exactly
 * what the sender wrote: a four-digit year below 100 stays four digits, and
 * `00500101` renders `0050-01-01` rather than `50-1-1`.
 *
 * @internal
 */
interface DecodedDay {
  readonly yearText: string;
  readonly monthText: string;
  readonly dayText: string;
}

/**
 * Read a carrier as a single calendar day, or answer `undefined`.
 *
 * The single route all three public functions take, so none of them can report
 * a component another omits. `undefined` covers every refusal: an absent
 * carrier, an absent or unhandled format qualifier, a range, a value that does
 * not match the shape its qualifier declares, and a well-shaped value that is
 * not a day on the real calendar.
 *
 * Calendar validity is DELEGATED to `parseDocumentDate` rather than re-derived
 * here. That function is this package's existing answer to "do these eight
 * digits name a day", leap rule included, and asking it makes the two surfaces
 * agree by construction instead of by a second copy of the month lengths that
 * could drift away from the first. Its throw is the answer being read; the
 * value it returns is discarded, because the rendering rule here comes from the
 * shared conversion shape rather than from that function's normalisation.
 *
 * @internal
 */
function decodeDay(value: X12DateValue | null | undefined): DecodedDay | undefined {
  if (value === undefined || value === null) return undefined;
  const { formatQualifier, value: text } = value;
  // `RD8` is recognised and refused for a REASON, not merely by falling off the
  // end of the handled set: an interval has no single instant, and the comment
  // has to survive someone later "fixing" this by returning the low endpoint.
  if (formatQualifier === DATE_RANGE_FORMAT) return undefined;
  if (formatQualifier !== SINGLE_DAY_FORMAT) return undefined;
  if (typeof text !== "string" || !D8_SHAPE.test(text)) return undefined;
  try {
    parseDocumentDate(text);
  } catch {
    return undefined;
  }
  return Object.freeze({
    yearText: text.slice(0, 4),
    monthText: text.slice(4, 6),
    dayText: text.slice(6, 8),
  });
}

/**
 * The calendar components an X12 date carrier stated, or `undefined`.
 *
 * Returns a frozen plain object holding exactly `year`, `month` and `day` for a
 * `D8` value; `month` is 1 to 12. There is no `qualifier`, `formatQualifier`,
 * `precision`, `raw` or `valid` key, and no key holding `undefined`. A range, an
 * unhandled or absent format qualifier, a value that does not match its
 * declared shape, a calendar-invalid day, `null` and `undefined` all answer
 * `undefined`. It never throws.
 *
 * @example
 * ```ts
 * import { toObject } from "@cosyte/x12";
 * toObject({ formatQualifier: "D8", value: "20260601" }); // { year: 2026, month: 6, day: 1 }
 * toObject({ formatQualifier: "D8", value: "20260230" }); // undefined (February 30 is not a day)
 * toObject({ formatQualifier: "RD8", value: "20260601-20260605" }); // undefined (a range)
 * ```
 */
export function toObject(value: X12DateValue | null | undefined): DateParts | undefined {
  const day = decodeDay(value);
  if (day === undefined) return undefined;
  return Object.freeze({
    year: Number(day.yearText),
    month: Number(day.monthText),
    day: Number(day.dayText),
  });
}

/**
 * An X12 date carrier as an ISO-8601 string truncated to the precision it
 * stated, or `undefined`.
 *
 * A `D8` value renders `YYYY-MM-DD` and NOTHING is appended: the element stated
 * no UTC offset, so the string is deliberately zone-less and no `Z` is
 * fabricated. The digits are the sender's, verbatim, so a year below 100 keeps
 * its leading zeroes. It never throws.
 *
 * @example
 * ```ts
 * import { toISO } from "@cosyte/x12";
 * toISO({ formatQualifier: "D8", value: "20260601" }); // "2026-06-01"
 * toISO({ formatQualifier: "D8", value: "00500101" }); // "0050-01-01"
 * toISO({ formatQualifier: "RD8", value: "20260601-20260605" }); // undefined
 * ```
 */
export function toISO(value: X12DateValue | null | undefined): string | undefined {
  const day = decodeDay(value);
  if (day === undefined) return undefined;
  return `${day.yearText}-${day.monthText}-${day.dayText}`;
}

/**
 * An X12 date carrier as an absolute-instant `Date`, ONLY when the caller
 * states the zone.
 *
 * No X12 date element this package decodes carries a UTC offset, so without
 * `options.assumeOffsetMinutes` there is no instant and the answer is
 * `undefined`. The host machine's timezone is never read and UTC is never
 * assumed. With an offset supplied, midnight on that calendar day in that zone
 * is returned: `0` yields UTC midnight and `-300` yields 05:00Z the same day.
 *
 * The time is filled to midnight for INSTANT CONSTRUCTION ONLY. The carrier's
 * own precision is unchanged, and `toObject` and `toISO` on the same value
 * return exactly what they returned before. A four-digit year below 100 stays
 * that year: `0050` is year 50, never 1950. It never throws.
 *
 * @example
 * ```ts
 * import { toDate } from "@cosyte/x12";
 * const day = { formatQualifier: "D8", value: "20260601" };
 * toDate(day);                            // undefined: no zone was stated
 * toDate(day, { assumeOffsetMinutes: 0 });    // 2026-06-01T00:00:00.000Z
 * toDate(day, { assumeOffsetMinutes: -300 }); // 2026-06-01T05:00:00.000Z
 * ```
 */
export function toDate(
  value: X12DateValue | null | undefined,
  options?: ToDateOptions,
): Date | undefined {
  const day = decodeDay(value);
  if (day === undefined) return undefined;
  const assumed = options?.assumeOffsetMinutes;
  // A non-finite offset is not a zone. Answering `undefined` keeps the promise
  // that this returns an instant or nothing, never an Invalid Date.
  if (typeof assumed !== "number" || !Number.isFinite(assumed)) return undefined;
  // Built with `setUTCFullYear` rather than `Date.UTC` or `new Date(y, m, d)`:
  // both of those remap a year below 100 into the 1900s, so year 50 would come
  // back as 1950. `setUTCHours` rather than `setHours` for the same reason the
  // module doc gives - the host zone must not reach the result.
  const midnight = new Date(0);
  midnight.setUTCFullYear(Number(day.yearText), Number(day.monthText) - 1, Number(day.dayText));
  midnight.setUTCHours(0, 0, 0, 0);
  const instant = new Date(midnight.getTime() - assumed * MS_PER_MINUTE);
  return Number.isNaN(instant.getTime()) ? undefined : instant;
}
