/**
 * **GS-01 - Functional Identifier Code** (ASC X12 data element 479): the code
 * each functional group this package emits travels under, keyed by the ST-01 of
 * the transaction set inside it.
 *
 * GS-01 is the element a receiver routes a functional group by, so a wrong row
 * here is a transaction delivered to the wrong handler rather than a missing
 * description. That is why the value lives in one cited table instead of being
 * restated as a literal in each builder that stamps it.
 *
 * ## Provenance, recorded beside the data rather than in prose kept elsewhere
 *
 * The four parts `./aaa.js` established for a bundled X12 code list:
 *
 * 1. **Source.** {@link ELEMENT_479_REFERENCE} below - a third-party EDI
 *    reference reproducing data element 479, cited with the retrieval date and
 *    the sha256 of the exact bytes read, because a URL alone names a moving
 *    target. It is NOT the paid ASC X12 Technical Report Type 3, which was not
 *    purchased.
 * 2. **Capture date.** `2026-08-28`.
 * 3. **Maintaining organisation.** ASC X12.
 * 4. **Redistribution terms.** As recorded in `./aaa.js`: ASC X12 requires
 *    permission for use of its work products and none has been obtained.
 *
 * **So NO description ships here.** `./aaa.js` refuses to bundle a single
 * description under those terms and this table holds itself to the same bar:
 * the map below carries code VALUES and nothing else. Code values are a
 * different matter from descriptive text, and this package cannot emit a
 * conformant functional group without them - eight of the nine were already
 * shipping as literals in the builders listed below before this file existed.
 *
 * ## Why this table can be trusted, stated as something a test can fail on
 *
 * Eight of the nine rows are corroborated INSIDE this repository. `build-270`,
 * `build-271`, `build-277`, `build-278`, `build-820`, `build-834`, `build-835`
 * and `build-837` each declare their own GS-01, independently of this file and
 * of each other, and every one of the eight agrees with its row here.
 * `test/code-lists-functional-identifier.test.ts` asserts that agreement by
 * reading those declarations back out of `src/`, so a row that drifted from a
 * shipped builder, or a builder that drifted from this table, reds the suite.
 *
 * `HR` (276) is the ninth and the only one no builder had declared. It is
 * transcribed from the same reference as the eight that check out, on the same
 * retrieval, and `build-276.ts` reads it from here rather than restating it.
 *
 * @internal - the builders' shared source for GS-01. Not part of the package's
 * public surface: a consumer reads GS-01 off a parsed `GS` segment, and this
 * table exists so the EMIT side has one carrier for the value instead of nine.
 */

/**
 * The reference data element 479 was read from, cited the way `./aaa.js` cites
 * its element layout: URL, retrieval date, byte count and content digest, so a
 * reader can tell whether the page they fetch is the page this table was keyed
 * on. The digest is of the retrieved document itself; that document is
 * third-party content and is not redistributed here.
 *
 * @internal
 */
export const ELEMENT_479_REFERENCE =
  "Functional identifier codes reproduced by an EDI reference at https://www.stedi.com/edi/x12-005010/element/479 (retrieved 2026-08-28, 144234 bytes, sha256 cc5c43cd780cf5251cebc2cc7e81d839e014919709c29ff64f4761e6b0b74155). It names data element 479 and publishes its code values, each against the transaction set it designates. Descriptions are NOT bundled from it - see the redistribution terms recorded in ./aaa.ts.";

/**
 * The GS-01 each bundled transaction set travels under, keyed by ST-01.
 *
 * Read with a LIBRARY-OWNED literal key only. It is a plain frozen object, so
 * it inherits `Object.prototype` and a key taken off the wire would resolve
 * `constructor` / `valueOf` / `__proto__` to something truthy. Nothing in this
 * package looks a GS-01 up off the wire; the emit side indexes it with the
 * transaction set id it is about to stamp, which is this library's own literal.
 *
 * @example
 * ```ts
 * FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET["276"]; // "HR" - claim status REQUEST
 * FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET["277"]; // "HN" - the RESPONSE half
 * ```
 *
 * @internal
 */
export const FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET = Object.freeze({
  "270": "HS",
  "271": "HB",
  "276": "HR",
  "277": "HN",
  "278": "HI",
  "820": "RA",
  "834": "BE",
  "835": "HP",
  "837": "HC",
} as const);
