/**
 * The single route a caller-supplied ARRAY takes into a builder loop.
 *
 * ## The defect this exists to stop, which is liveness and not disclosure
 *
 * `src/builder/caller-value.ts` bounds what a refusal message *says*. This
 * module bounds whether a refusal happens *at all*.
 *
 * Every domain builder took its loop bound straight off a caller-supplied
 * `.length`:
 *
 * ```ts
 * for (let m = 0; m < spec.members.length; m += 1) { … }
 * ```
 *
 * The types say `readonly Build834MemberSpec[]`, and a TypeScript caller
 * cannot reach this. A JavaScript or JSON-driven caller can, and
 * `@cosyte/cli` is such a caller. Hand that loop a forged
 * `{ length: "9".repeat(120_000) }` and `m < spec.members.length` compares a
 * number against a 120,000-digit string: JavaScript coerces the string to
 * `Infinity`, every element read is `undefined`, every guard `continue`s, and
 * **the builder spins forever instead of refusing.**
 *
 * **A hang is a worse failure than a refusal**, which is the whole reason this
 * is not merely a tidier version of the message bound. A refusal returns
 * control to the caller with a typed, code-tagged error they can branch on. A
 * hang takes the worker with it: no error, no code, no log line, and in a
 * server that is one wedged request handler per forged payload. It is a
 * *liveness* defect, and liveness defects do not show up in a `catch`.
 *
 * **Scope it honestly, though: this is a forged non-array input, not a
 * mis-read clinical value.** Nothing here decodes a document, nothing here
 * changes what a correct spec emits, and no dose, allergy, code system or
 * patient identifier is read differently because of it. The reachable harm is
 * availability, not a wrong clinical fact, and this module should not be
 * described as if it were the latter.
 *
 * ## What it does NOT cover, measured rather than assumed
 *
 * A builder also reads caller arrays with `for…of`, and `for…of` over a forged
 * `{ length }` does not hang: it throws `TypeError: … is not iterable`
 * immediately. That is **not** a typed, code-tagged refusal - it carries no
 * `code`, so a consumer branching on `err.code` sees `undefined` - but it
 * terminates, so it is a different defect from the one this module closes.
 * The builders' `for…of` reads go through {@link requireCallerEntries}, which
 * runs this guard first and then checks every slot for a hole or a `null`, so
 * `buildInterchange` (`spec.groups`), `build999`
 * (`functionalGroup.transactionResponses`) and the leaf lists of the domain
 * builders (`claim.dates`, `line.references`, …) refuse with their typed error
 * too. `test/builder-array-bounds.test.ts` pins the forged shape on those, and
 * `test/builder-list-entry-holes.test.ts` the holes.
 *
 * `build270` and `build276` route their lists through this chokepoint with
 * a hole check of their own, which predates {@link requireCallerEntries} and
 * names the slot with a full structural path.
 *
 * @see `test/builder-array-bounds.test.ts` - the source gate that requires
 * every indexed loop in a builder module to take its bound from a real array.
 */

import { renderCallerValue } from "./caller-value.js";

/**
 * The empty array handed back for an absent optional field, so a caller's
 * `undefined` costs no allocation and cannot be mutated by anything
 * downstream. @internal
 */
const NONE: readonly never[] = Object.freeze([]);

/**
 * Describe a forged value without echoing what the caller put in the slot.
 *
 * Two different things reach this message and they are treated differently on
 * purpose, which `REFUSAL-MESSAGE-PHI-ECHO` settled:
 *
 * - **The primitive arm is redacted to its type**, matching the three sibling
 *   guards. A caller who puts a scalar where a list belongs has put *slot data*
 *   there - `dates: "20260601"`, `members: 700998877` - and a slot-generic
 *   guard cannot tell a date of service or a member id from anything else. The
 *   type is the whole diagnosis: you passed a scalar, a list is required.
 * - **The `length` and the class tag are NOT slot data and are kept**, bounded
 *   through {@link renderCallerValue}. They describe the SHAPE the caller
 *   forged rather than the content of a document element, and they are the only
 *   reason this refusal is actionable at all
 *   (`{ length: "9".repeat(120000) }` is the input that used to hang the
 *   builder). The tag is bounded because `Object.prototype.toString` reads
 *   `Symbol.toStringTag` and a caller can set that to a 120,000-character
 *   string. Reading `.length` is itself wrapped, because a getter can throw.
 * @internal
 */
function describeShape(value: unknown): string {
  // `null` never reaches here: `requireCallerArray` answers it as absent,
  // exactly as the `?? []` it replaced did. A `if (value === null)` arm would
  // be unreachable, and an unreachable arm in a guard is a small lie about
  // what the guard does.
  if (typeof value !== "object") {
    return `a ${typeof value}`;
  }
  let length: unknown;
  try {
    length = (value as { length?: unknown }).length;
  } catch {
    return "an object whose 'length' getter threw";
  }
  if (length !== undefined) {
    return `an array-like object with length ${renderCallerValue(length as string)}`;
  }
  let tag: string;
  try {
    tag = Object.prototype.toString.call(value);
  } catch {
    tag = "[object Unknown]";
  }
  return `a non-array ${renderCallerValue(tag)}`;
}

/**
 * Require a caller-supplied field to be a real array before anything loops
 * over it, and refuse with the calling builder's own typed error if it is not.
 *
 * `refuse` is passed in rather than thrown from here on purpose: each builder
 * owns a distinct error class and error code that consumers branch on
 * (`Enrollment834BuildError` / `X12_834_BUILD_INVALID_SPEC` and its eight
 * siblings), and a shared helper throwing a shared error would quietly widen
 * every one of those contracts. Its return type is `never`, so a caller that
 * forgets to throw is a type error rather than a fall-through.
 *
 * **`null` is absent, not forged, and getting that wrong was a real regression
 * in the first draft of this module.** Every site this replaced read its
 * optional field as `x.dates ?? []`, and `??` treats `null` and `undefined`
 * alike. Refusing only `undefined` therefore quietly broke specs that built
 * cleanly before: measured, `build834({ members: [{ …, healthCoverages: null }] })`
 * emitted a valid 834 at `55ebc66` and drew `X12_834_BUILD_INVALID_SPEC` at the
 * first head. Worse, it was *inconsistent* - the same spec still accepted
 * `references: null`, because that field is read with `for…of` and never moved
 * onto this chokepoint. `null` is the shape a `JSON.parse`d payload most often
 * carries for an absent list, from the exact caller class this module exists
 * for, so both are answered with the frozen empty array and the behaviour is
 * unchanged from base.
 *
 * On a REQUIRED array that turns `null` into the site's own "at least one X is
 * required" refusal rather than the untyped `TypeError` base threw, for five of
 * the six required lists: `build834`'s `members`, `build820`'s `remittances`,
 * `build837`'s `billingProviders`, and `build271`'s / `build277`'s
 * `informationSources`. **`build835`'s `claims` is the measured exception** and
 * still throws an untyped `TypeError`, because `enforceBalance` reads
 * `spec.claims.map` directly rather than the checked binding. No worse than
 * base, which threw a `TypeError` there too, and pinned by a test so the
 * exception is on the record rather than a gap in a claim.
 *
 * @param value the caller-supplied field, typed as an array and not trusted to
 * be one
 * @param at a library-owned locator naming the field, e.g.
 * `"build834: spec.members"`. Never caller text.
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
export function requireCallerArray<T>(
  value: readonly T[] | null | undefined,
  at: string,
  refuse: (message: string) => never,
): readonly T[] {
  if (value === undefined || value === null) return NONE;
  if (!isRealArray(value)) {
    refuse(`${at} must be an array. Received ${describeShape(value)}.`);
  }
  return value;
}

/**
 * `Array.isArray` narrowed back to the declared element type.
 *
 * The built-in narrows to `any[]`, which would widen the return above and lose
 * `T` for every caller. This keeps the runtime check identical and the type
 * honest, rather than reaching for an `as`. @internal
 */
function isRealArray<T>(value: readonly T[]): value is readonly T[] {
  return Array.isArray(value);
}

/**
 * Require a caller-supplied list to be a real array with no hole and no `null`
 * in it, and refuse with the calling builder's own typed error if it is not.
 *
 * {@link requireCallerArray} answers whether the LIST is a list. It says
 * nothing about the entries, and a real array with a gap in it clears it:
 * `[, entry]` from a sparse literal, or `[null]` from a JSON payload that
 * dropped a record. Left unguarded, that slot reached an emitter, which
 * dereferenced it and threw an untyped `TypeError` with no `code` a consumer
 * can branch on. An absent LIST is still absent (`null` or `undefined` answers
 * the frozen empty array, exactly as {@link requireCallerArray} does), but a
 * list that exists and has a gap in it is a spec its author did not mean to
 * send, and no builder invents an entry to fill one.
 *
 * Entries are read with `entries()`, which visits a hole as `undefined`, so a
 * hole and an explicit `undefined` refuse alike. The loop is bounded by the
 * length of a checked real array.
 *
 * @param value the caller-supplied field, typed as an array and not trusted to
 * be one
 * @param at a library-owned structural locator naming the list, e.g.
 * `"build271: subscriber.benefits"`. Never caller text.
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
export function requireCallerEntries<T>(
  value: readonly T[] | null | undefined,
  at: string,
  refuse: (message: string) => never,
): readonly T[] {
  const items = requireCallerArray(value, at, refuse);
  for (const [i, item] of items.entries()) {
    if (item === undefined || item === null) {
      refuse(
        `${at}[${String(i)}] is an empty list slot. Received ${item === null ? "null" : "undefined"}, ` +
          `and this builder invents nothing to fill a hole in a list.`,
      );
    }
  }
  return items;
}
