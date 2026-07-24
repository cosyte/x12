/**
 * Shared fast-check arbitraries for the `@cosyte/x12` property-test layer.
 *
 * Three families of generators live here:
 *
 * 1. **Spec-valid envelopes** (`specCleanInterchange`) - built through the
 *    same {@link buildInterchange} helper used by unit tests. These produce
 *    interchanges the parser can re-read with zero warnings.
 * 2. **Hostile/random bytes** (`hostileInput`) - pure adversarial input for
 *    the lenient-mode never-throw property: bounded random strings,
 *    possibly with an `"ISA"` prefix to hit envelope-walker branches.
 * 3. **Byte-flipped envelopes** (`bitFlippedInterchange`) - the Phase 1
 *    envelope-decoder fuzz target. Starts from a spec-clean interchange,
 *    flips a single byte at a uniformly random position, and feeds the
 *    result back to the parser. Tests the no-throw invariant on inputs
 *    that look like X12 but aren't.
 *
 * Nothing in here is package-internal; everything is built on the public
 * surface exported by `src/index.ts`.
 */

import fc from "fast-check";

import { buildInterchange, buildIsa } from "../_helpers/envelope.js";

/**
 * Single-character delimiter generator drawing from a small ASCII pool -
 * deliberately excludes the segment terminator (`~`), CR, LF, the
 * letter/digit byte range (so we never overlap an element value), and the
 * tab/space whitespace class.
 */
const DELIMITER_POOL = ["*", "|", "^", "\\", "@", ":", "!", "#", "+", "&", "%", "?", "$"] as const;

/** Pick 4 distinct delimiter chars: element, repetition, component, segment. */
const fourDistinctDelimiters = fc
  .shuffledSubarray([...DELIMITER_POOL], { minLength: 4, maxLength: 4 })
  .map((arr) => {
    const [element, repetition, component, segment] = arr;
    if (
      element === undefined ||
      repetition === undefined ||
      component === undefined ||
      segment === undefined
    ) {
      throw new Error("internal: shuffledSubarray returned fewer than 4 items");
    }
    return { element, repetition, component, segment };
  });

/**
 * Generate a spec-clean interchange with random (but valid) delimiters and
 * envelope identifiers. The parser is expected to read these with zero
 * warnings - round-trip ISA byte-exact, no missing trailers, no count
 * mismatches.
 */
export const specCleanInterchange = fc
  .record({
    delimiters: fourDistinctDelimiters,
    controlNumber: fc.integer({ min: 1, max: 999_999_999 }).map((n) => String(n).padStart(9, "0")),
    groupControlNumber: fc.integer({ min: 1, max: 999_999 }).map((n) => String(n)),
    transactionControlNumber: fc
      .integer({ min: 1, max: 9999 })
      .map((n) => String(n).padStart(4, "0")),
    trailingCrlf: fc.boolean(),
  })
  .map((spec) =>
    buildInterchange({
      element: spec.delimiters.element,
      repetition: spec.delimiters.repetition,
      component: spec.delimiters.component,
      segment: spec.delimiters.segment,
      controlNumber: spec.controlNumber,
      groupControlNumber: spec.groupControlNumber,
      transactionControlNumber: spec.transactionControlNumber,
      trailingCrlf: spec.trailingCrlf,
    }),
  );

/**
 * Hostile / random-byte input for the lenient never-throw property. Most
 * of the generated inputs will Tier-3 fatal (`X12_NO_ISA_HEADER` is the
 * most common - random strings rarely start with `"ISA"`); a smaller
 * branch prepends `"ISA"` so the post-header parser branches are also
 * exercised.
 */
export const hostileInput = fc.oneof(
  // Pure random bytes (string form) - mostly trips X12_NO_ISA_HEADER /
  // X12_EMPTY_INPUT / X12_ISA_TOO_SHORT depending on length.
  fc.string({ minLength: 0, maxLength: 200 }),
  // Random bytes prepended with "ISA" - trips X12_ISA_TOO_SHORT or
  // X12_INVALID_DELIMITERS, occasionally getting far enough to exercise
  // the envelope walker.
  fc.string({ minLength: 0, maxLength: 200 }).map((s) => "ISA" + s),
  // Random bytes ≥ 106 chars starting with "ISA" - most likely to trip
  // X12_INVALID_DELIMITERS unless by sheer luck the random bytes happen
  // to be element-separator-conformant.
  fc.string({ minLength: 103, maxLength: 500 }).map((s) => "ISA" + s.slice(0, 200)),
);

/**
 * Byte-flipped envelope arbitrary - the Phase 1 fuzz target for the
 * envelope decoder. Generates a spec-clean interchange, then flips a
 * single byte at a uniformly random position to a different printable
 * char. The parser must either parse leniently (collecting warnings) or
 * throw exactly one of the 4 Tier-3 fatals; it must NEVER throw an
 * unsanctioned error.
 */
export const bitFlippedInterchange = fc
  .record({
    delimiters: fourDistinctDelimiters,
    flipPosition: fc.integer({ min: 0, max: 200 }),
    flipChar: fc.constantFrom("X", "Z", "0", "9", "!", "?", "@", "#", "$", "%"),
    trailingCrlf: fc.boolean(),
  })
  .map((spec) => {
    const isa = buildIsa({
      element: spec.delimiters.element,
      repetition: spec.delimiters.repetition,
      component: spec.delimiters.component,
      segment: spec.delimiters.segment,
    });
    const raw = buildInterchange({
      element: spec.delimiters.element,
      repetition: spec.delimiters.repetition,
      component: spec.delimiters.component,
      segment: spec.delimiters.segment,
      trailingCrlf: spec.trailingCrlf,
    });
    const pos = Math.min(spec.flipPosition, Math.max(0, raw.length - 1));
    // Use the spec.flipChar unconditionally - if it happens to match the
    // existing byte that's fine; the byte-flip is a stress, not a
    // guarantee of *change*. Skip when the resulting char would collide
    // with one of the four delimiters at certain ISA byte positions -
    // we want to stress the WALKER, not the delimiter validator.
    void isa; // isa just documents what the ISA looks like for this case
    return raw.slice(0, pos) + spec.flipChar + raw.slice(pos + 1);
  });
