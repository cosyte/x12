/**
 * The GS-01 provenance gate for `@cosyte/x12`'s builders.
 *
 * ## What this file is for
 *
 * GS-01 (ASC X12 data element 479) is the element a receiver routes a
 * functional group by. A wrong row is not a missing description, it is a
 * transaction delivered to the wrong handler, and the value ships to npm from a
 * public repo, so only an addition can ever correct one.
 *
 * `src/code-lists/functional-identifier.ts` is the single cited carrier for
 * that value. This file is the reason to believe it: it re-derives, out of
 * `src/`, the GS-01 that eight OTHER builders in this package declare
 * independently of that table and of each other, and asserts every one of the
 * eight agrees with its row. Those eight were shipping long before the table
 * existed, so the agreement is a real cross-check and not a restatement.
 *
 * The ninth row, `276`, is the one no builder had declared. Nothing in this
 * repository can corroborate it the way the eight corroborate each other, and
 * this file does not pretend otherwise: what it asserts about `276` is that the
 * value has exactly ONE carrier (the cited table), that `build-276.ts` reads it
 * rather than restating it, and that it is not the 277's. Whether the code
 * itself is right is a question the cited reference answers and a test cannot.
 *
 * ## Why a source scan and not a call
 *
 * The eight sibling constants are module-private `@internal` values. Reaching
 * them through their builders would mean assembling eight valid domain specs,
 * and a builder that refused would look like a disagreement. Reading the
 * declaration is the narrower question and the one that actually matters: does
 * the literal a builder stamps equal the row the cited table carries.
 *
 * The scan is syntactic, keyed on the `const X12_<txn>_FUNCTIONAL_ID = "<code>"`
 * shape all eight use. A builder that computed its GS-01 some other way would
 * not be seen, which is why the count below is pinned: a ninth literal
 * appearing, or one of the eight disappearing, reds this file rather than
 * silently shrinking what it checks.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as functionalIdentifierModule from "../src/code-lists/functional-identifier.js";
import {
  ELEMENT_479_REFERENCE,
  FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET,
} from "../src/code-lists/functional-identifier.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Every `build-*.ts` under `src/`, excluding the type and error side-files. */
function builderModules(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/^build-.*\.ts$/u.test(entry.name) && !/-(types|errors)\.ts$/u.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(SRC);
  return out.sort();
}

/** Source with block and line comments stripped, so prose cannot satisfy a scan. */
function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/[^\n]*/gu, "");
}

/**
 * Every `const X12_<txn>_FUNCTIONAL_ID = "<code>"` LITERAL declared under
 * `src/`, as `{ transactionSet, functionalId, module }`. Comment text is
 * stripped first, so a code named only in prose does not count.
 */
function declaredFunctionalIds(): {
  transactionSet: string;
  functionalId: string;
  module: string;
}[] {
  const out: { transactionSet: string; functionalId: string; module: string }[] = [];
  for (const file of builderModules()) {
    const pattern = /const X12_(\d{3})_FUNCTIONAL_ID\s*=\s*"([A-Z]{2})"/gu;
    for (const match of code(file).matchAll(pattern)) {
      const [, transactionSet, functionalId] = match;
      if (transactionSet === undefined || functionalId === undefined) continue;
      out.push({ transactionSet, functionalId, module: relative(SRC, file) });
    }
  }
  return out.sort((a, b) => a.transactionSet.localeCompare(b.transactionSet));
}

/**
 * The transaction sets that declared their GS-01 as a literal BEFORE the cited
 * table existed. Pinned rather than derived: the point of the check is that
 * these eight independent declarations agree with the table, and a derived list
 * would shrink silently to whatever still happens to agree.
 */
const CORROBORATING_TRANSACTION_SETS = ["270", "271", "277", "278", "820", "834", "835", "837"];

describe("GS-01 provenance: the cited element 479 table", () => {
  it("agrees with every GS-01 the other builders declare, and there are eight of them", () => {
    const declared = declaredFunctionalIds();

    // Non-vacuity FIRST. An empty scan would make every assertion below pass.
    expect(declared.map((d) => d.transactionSet)).toEqual(CORROBORATING_TRANSACTION_SETS);

    for (const { transactionSet, functionalId, module } of declared) {
      const row = Object.hasOwn(FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET, transactionSet)
        ? (FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET as Readonly<Record<string, string>>)[
            transactionSet
          ]
        : undefined;
      expect(
        row,
        `${module} stamps GS-01 ${functionalId} for the ${transactionSet}, and the cited table disagrees`,
      ).toBe(functionalId);
    }
  });

  it("carries a row for the 276 that no builder literal corroborates, and only that one", () => {
    const corroborated = new Set(declaredFunctionalIds().map((d) => d.transactionSet));
    const uncorroborated = Object.keys(FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET)
      .filter((txn) => !corroborated.has(txn))
      .sort();

    // Stated as a fact about this table rather than hidden: exactly one row
    // rests on the cited reference alone, and it is the one this work added.
    expect(uncorroborated).toEqual(["276"]);
  });

  it("gives the 276 request and the 277 response DIFFERENT functional identifiers", () => {
    // The safety property behind the whole table. A request in the response's
    // group is one a receiver routes to its response handler.
    expect(FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET["276"]).not.toBe(
      FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET["277"],
    );
  });

  it("holds only two-letter code values, never descriptive text", () => {
    // The redistribution discipline `src/code-lists/aaa.ts` records and
    // enforces: ASC X12 requires permission for use of its work products and
    // none was obtained, so code VALUES ship and descriptions do not. A row
    // that grew into a sentence would be a description by another name.
    for (const [transactionSet, functionalId] of Object.entries(
      FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET,
    )) {
      expect(transactionSet, "keys are ST-01 transaction set ids").toMatch(/^\d{3}$/u);
      expect(functionalId, "values are bare element 479 code values").toMatch(/^[A-Z]{2}$/u);
    }
  });

  it("exports the citation and the table, and nothing that could carry a description", () => {
    expect(Object.keys(functionalIdentifierModule).sort()).toEqual([
      "ELEMENT_479_REFERENCE",
      "FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET",
    ]);
  });

  it("cites the reference it was read from with a digest, not a bare URL", () => {
    // A URL alone names a moving target. `src/code-lists/aaa.ts` set this shape
    // for the element layout it is keyed on and this table follows it, so a
    // reader can tell whether the page they fetch is the page this was read
    // from.
    expect(ELEMENT_479_REFERENCE).toMatch(/https:\/\/\S+/u);
    expect(ELEMENT_479_REFERENCE).toMatch(/retrieved \d{4}-\d{2}-\d{2}/u);
    expect(ELEMENT_479_REFERENCE).toMatch(/\d+ bytes/u);
    expect(ELEMENT_479_REFERENCE).toMatch(/sha256 [0-9a-f]{64}/u);
  });

  it("is the ONLY carrier of the 276's GS-01: build-276.ts declares no literal", () => {
    // The provenance property criterion 13 of the spec asks for. If the builder
    // restated the code, the table would be decoration and the value would have
    // two carriers that could drift apart.
    const builder = code(join(SRC, "transactions", "status", "build-276.ts"));
    expect(builder).not.toMatch(/const X12_276_FUNCTIONAL_ID\s*=\s*"/u);
    expect(builder).toMatch(/FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET\[/u);

    // And the literal appears nowhere else in the builder either.
    expect(builder).not.toContain(`"${FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET["276"]}"`);
  });
});
