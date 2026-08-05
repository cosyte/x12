/**
 * `wireLookup` - build a frozen, NULL-PROTOTYPE lookup table for tables
 * whose key is read out of an EDI document.
 *
 * A bare object literal inherits `Object.prototype`, so indexing one with a
 * value that came off the wire resolves TRUTHY for **every own property of
 * `Object.prototype`**. State it exactly that way and never as a list: the
 * set is engine- and version-dependent, and a draft of this comment
 * enumerated eight when the running engine had twelve. `Object.freeze` does
 * not help: freezing seals the own properties and changes nothing about
 * what the prototype chain contributes to a read. A table built here has no
 * prototype at all, so a key the table does not declare answers `undefined`
 * - which is what every caller's "not in the table" branch is already
 * written against.
 *
 * The fix is applied at the TABLE rather than at each read site on purpose:
 * a guard at the read site protects only the read sites that exist today,
 * and this defect reached production precisely because a lookup looked
 * safe. `Object.hasOwn` at the call site is the equivalent remedy where a
 * table cannot be re-declared; `src/transactions/shared/hl.ts` uses that
 * form on a caller-supplied map.
 *
 * Nothing here validates the VALUES. This is a lookup-shape guard, not a
 * code-list check: an unrecognized key still means "unrecognized", and what
 * the caller does about that is the caller's business.
 *
 * @internal
 */

/**
 * Copy `entries` onto a null-prototype object and freeze it. Own
 * enumerable string keys only, which is exactly what an object literal
 * declares.
 *
 * @internal
 */
export function wireLookup<V>(entries: Readonly<Record<string, V>>): Readonly<Record<string, V>> {
  // `Object.create(null)` rather than a spread or `{ ...entries }`: the
  // point is the absent prototype, and every object-literal form has one.
  const table = Object.create(null) as Record<string, V>;
  // `for...of` over `Object.entries`, never an indexed loop over a
  // `.length` this module did not compute (see `test/builder-array-bounds`).
  for (const [key, value] of Object.entries(entries)) {
    table[key] = value;
  }
  return Object.freeze(table);
}
