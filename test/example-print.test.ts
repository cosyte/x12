import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  examplePrintFindings,
  readPrintConfig,
  readReadme,
  samplePrintFindings,
} from "@cosyte/script-utils/docs-content";

/**
 * What an example prints. An example never hands a value that identifies a patient or another
 * person (a name, a member or account number, a date of birth, an address, a phone number, a
 * free-text note, a whole interchange or segment) to `console.log` or any other printer, synthetic
 * or not: a reader copies what a page does into code that runs on real interchanges. To show a
 * field, an example reads it or asserts on it, with the synthetic value in a comment beside it.
 *
 * The rule is cosyte/config's `example-print` (decision record 0006, section 14), read here with
 * `@cosyte/script-utils` over every surface an example lives on: the README, every page under
 * `docs-content/` (the generated reference included, which carries the `@example` blocks of the
 * doc comments in `src/`), and every runnable program under `examples/`. The repository's
 * `cosyte-docs-content.config.json` turns it on as required and adds this package's own names,
 * such as `claimId` and `idCode`, to its lists.
 *
 * The rule reads samples as tokens, so it cannot see a value copied into a neutral name, a comment
 * or a template it does not know: review reads for those. The controls below prove the check sees
 * a seeded print before its verdict on the real files is believed.
 */
const root = join(import.meta.dirname, "..");
const DOCS_DIR = join(root, "docs-content");
const EXAMPLES_DIR = join(root, "examples");

const settings = readPrintConfig(root);
const extras = {
  accessors: settings.accessors,
  wholeValues: settings.wholeValues,
  printers: settings.printers,
};

/** Every page under `docs-content/`, by its name without `.md`, the generated `api/` included. */
function docsPages(): { name: string; text: string }[] {
  const pages: { name: string; text: string }[] = [];
  for (const dir of ["", "api"]) {
    for (const file of readdirSync(join(DOCS_DIR, dir)).sort()) {
      if (!file.endsWith(".md")) continue;
      const name = dir === "" ? file.slice(0, -3) : `${dir}/${file.slice(0, -3)}`;
      pages.push({ name, text: readFileSync(join(DOCS_DIR, dir, file), "utf8") });
    }
  }
  return pages;
}

/** Every runnable example: a `.ts` file at the top of `examples/`, as `pnpm examples` runs them. */
function examplePrograms(): { file: string; text: string }[] {
  return readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".ts") && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort()
    .map((name) => ({
      file: `examples/${name}`,
      text: readFileSync(join(EXAMPLES_DIR, name), "utf8"),
    }));
}

describe("no example prints a value that identifies a person", () => {
  it("the rule is required, so a finding fails the docs-content check as well", () => {
    expect(settings.required).toBe(true);
  });

  it("the README and every docs-content page print nothing identifying", () => {
    const findings = examplePrintFindings({ pages: docsPages(), readme: readReadme(root) }, extras);
    expect(findings.map((f) => `${f.file}:${String(f.line)} ${f.message}`)).toEqual([]);
  });

  it("every program under examples/ prints nothing identifying", () => {
    const programs = examplePrograms();
    expect(programs.length).toBeGreaterThan(0);
    const findings = programs.flatMap(({ file, text }) =>
      samplePrintFindings(text, extras).map((f) => `${file}:${String(f.line)} ${f.message}`),
    );
    expect(findings).toEqual([]);
  });

  it("CONTROL: a print of a patient account number is a finding", () => {
    const sample = "console.log(claim.patientControlNumber);\n";
    expect(samplePrintFindings(sample, extras)).toHaveLength(1);
  });

  it("CONTROL: this package's own names are findings, through the config's lists", () => {
    // CLM-01, an NM1-09 member or provider identifier, a trace, and a whole serialized interchange.
    for (const sample of [
      "console.log(claim.claimId);\n",
      "console.log(member.idCode);\n",
      "console.log(`trace ${t.referenceId}`);\n",
      "console.log(wire);\n",
    ]) {
      expect(samplePrintFindings(sample, extras), sample).toHaveLength(1);
      expect(samplePrintFindings(sample), sample).toHaveLength(0);
    }
  });

  it("CONTROL: a code, a count and a boolean print, as the rule allows", () => {
    const sample = [
      "console.log(adjustment.groupCode, adjustment.reasonCode);",
      "console.log(ix.warnings.length, remit.claims.length);",
      "console.log(claim.patientControlNumber.length, accepted);",
    ].join("\n");
    expect(samplePrintFindings(sample, extras)).toEqual([]);
  });
});
