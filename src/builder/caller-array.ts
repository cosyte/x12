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
 * Measured on this tree, at base and unchanged at head: `buildInterchange`
 * (`spec.groups`) and `build999` (`functionalGroup.transactionResponses`) have
 * no indexed loop over their top-level arrays at all and throw that untyped
 * `TypeError`, as does every optional leaf array (`claim.dates`,
 * `line.references`, …) in every domain builder.
 * **`test/builder-array-bounds.test.ts` pins that behaviour so it cannot
 * quietly become a hang**, and it is disclosed in `KNOWN-LIMITATIONS.md`
 * rather than fixed here.
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
 * Describe a forged value without echoing it unbounded.
 *
 * Everything that can reach the message goes through
 * {@link renderCallerValue}, including the class name, because
 * `Object.prototype.toString` reads `Symbol.toStringTag` and a caller can set
 * that to a 120,000-character string. Bounding the value and then splicing an
 * unbounded tag beside it would reintroduce the very hole the sibling module
 * closes. Reading `.length` is itself wrapped, because a getter can throw.
 * @internal
 */
function describeShape(value: unknown): string {
  if (value === null) return "null";
  if (typeof value !== "object") {
    return `a ${typeof value} (${renderCallerValue(value as string)})`;
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
 * `undefined` is accepted and answered with a frozen empty array: the optional
 * spec fields are read as `x.dates ?? []` throughout, and turning an absent
 * field into a refusal would be a behaviour change with nothing to do with
 * this defect.
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
  value: readonly T[] | undefined,
  at: string,
  refuse: (message: string) => never,
): readonly T[] {
  if (value === undefined) return NONE;
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
