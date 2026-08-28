/**
 * Reading a caller's document date for the date-aware code-list queries.
 *
 * **A document date is a calendar DAY, never an instant.** Two forms are
 * accepted, and both name a day unambiguously: ISO-8601 `YYYY-MM-DD`, which is
 * the form every date this package exposes is already written in, and the X12
 * wire form `CCYYMMDD`, which is what a document's own date element carries.
 *
 * A JavaScript `Date` is an instant, and turning one into a calendar day
 * requires a timezone. This library must not guess one: the same instant is two
 * different days either side of midnight somewhere, and picking the host's zone
 * would make the answer depend on where the code ran. So a `Date` is refused
 * along with every other value that is not one of the two accepted forms.
 *
 * Nothing here constructs a `Date` either. Both forms normalise to
 * `YYYY-MM-DD`, whose lexicographic order IS calendar order, so every
 * comparison downstream is a string comparison and no timezone can reach it.
 */

import { invalidDocumentDate } from "./errors.js";

/** ISO-8601 calendar day, the form every date this package exposes uses. */
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** The X12 wire form for a date element: century, year, month, day. */
const WIRE_DAY = /^(\d{4})(\d{2})(\d{2})$/u;

/**
 * True when `year` is a leap year in the proleptic Gregorian calendar.
 *
 * @internal
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * How many days `month` (1 to 12) has in `year`. Written as branches rather
 * than a table lookup so every arm is reachable and none needs a fallback for
 * an index the caller has already bounded.
 *
 * @internal
 */
function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

/**
 * Read a caller-supplied document date as a calendar day, normalised to
 * `YYYY-MM-DD`, or THROW {@link "./errors.js".X12CodeListError}.
 *
 * The shape check is not enough on its own: `20260631` and `2026-02-30` are
 * both well-shaped and neither is a day that exists, so the month and the day
 * are checked against the real calendar, leap years included. A value refused
 * here yields no validity answer at all.
 *
 * The parameter is `unknown` rather than `string` deliberately. The public
 * queries declare `string`, so a TypeScript caller cannot reach the type check
 * below; a JavaScript or JSON-driven caller can, and handing them an unrelated
 * `TypeError` from deep inside a regular expression instead of this library's
 * own typed, code-tagged refusal is the failure this guard exists to prevent.
 *
 * @internal
 */
export function parseDocumentDate(documentDate: unknown): string {
  if (typeof documentDate !== "string") throw invalidDocumentDate(documentDate);
  // Both shapes are fixed-width, so the fields are read by offset rather than
  // out of the match: a capture group is typed as possibly absent and testing
  // for that would add a branch no input can reach.
  if (ISO_DAY.test(documentDate)) {
    return requireCalendarDay(
      documentDate,
      documentDate.slice(0, 4),
      documentDate.slice(5, 7),
      documentDate.slice(8, 10),
    );
  }
  if (WIRE_DAY.test(documentDate)) {
    return requireCalendarDay(
      documentDate,
      documentDate.slice(0, 4),
      documentDate.slice(4, 6),
      documentDate.slice(6, 8),
    );
  }
  throw invalidDocumentDate(documentDate);
}

/**
 * Check a well-shaped date's fields against the real calendar and return it in
 * `YYYY-MM-DD` form, or throw. `20260631` and `2026-02-30` are both well-shaped
 * and neither is a day that exists.
 *
 * @internal
 */
function requireCalendarDay(
  documentDate: string,
  yearText: string,
  monthText: string,
  dayText: string,
): string {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12) throw invalidDocumentDate(documentDate);
  if (day < 1 || day > daysInMonth(year, month)) throw invalidDocumentDate(documentDate);
  return `${yearText}-${monthText}-${dayText}`;
}
