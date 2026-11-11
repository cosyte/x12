import { readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

import {
  ACK_BUILD_ERROR_CODES,
  ALL_WARNING_MESSAGES,
  ATTACHMENT_275_BUILD_ERROR_CODES,
  AUTH_278_BUILD_ERROR_CODES,
  CLAIM_837_BUILD_ERROR_CODES,
  CLAIM_STATUS_276_BUILD_ERROR_CODES,
  CLAIM_STATUS_277_BUILD_ERROR_CODES,
  CORE_CODE_COMBINATION_ERROR_CODES,
  ELIGIBILITY_270_BUILD_ERROR_CODES,
  ELIGIBILITY_271_BUILD_ERROR_CODES,
  ENROLLMENT_834_BUILD_ERROR_CODES,
  FATAL_CODES,
  PREMIUM_820_BUILD_ERROR_CODES,
  REMIT_835_BUILD_ERROR_CODES,
  RFAI_277_BUILD_ERROR_CODES,
  WARNING_CODES,
  X12_BUILD_ERROR_CODES,
  X12_CODE_LIST_ERROR_CODES,
} from "../../src/index.js";

/**
 * The renderer of `docs-content/warning-and-error-codes.md`. The page is generated, not written:
 * every code and every warning message on it is read from the package source here, and
 * `test/docs-content.test.ts` fails when the committed page differs from what this returns. To
 * refresh the page after a registry changes, run
 * `pnpm exec tsx test/_helpers/codes-page.ts --write` and then `pnpm format` from the repository root.
 */

const ROOT = join(import.meta.dirname, "..", "..");

/** The page this module renders, relative to the repository root. */
export const CODES_PAGE = join("docs-content", "warning-and-error-codes.md");

/**
 * What each fatal code means, in the words the troubleshooting page has always used. The test
 * below the renderer holds this map's keys to `FATAL_CODES`, so a code added there without a
 * meaning here fails rather than rendering blank.
 */
const FATAL_MEANINGS: Readonly<Record<string, string>> = {
  X12_EMPTY_INPUT: "Nothing to parse.",
  X12_NO_ISA_HEADER: "The input does not begin with an ISA, so it is not an X12 interchange.",
  X12_ISA_TOO_SHORT:
    "The ISA is truncated below its fixed 106 bytes, so the delimiters cannot be read.",
  X12_INVALID_DELIMITERS: "The delimiters cannot be recovered from the ISA.",
};

/**
 * What the page says under a warning code's message about which readers raise it and when, where
 * the frozen message alone does not say it. A message is part of the warning contract and its
 * digest is pinned, so the reader behaviour that grew around it is written here instead.
 */
const WARNING_NOTES: Readonly<Record<string, string>> = {
  X12_GUIDE_NOT_IMPLEMENTED: [
    "Which readers raise it, and when: GS-08 is read where ST-03 is absent, empty or whitespace",
    "only. `get275Attachments` and `parse999` raise it wherever the declaration, compared exactly,",
    "is not a guide they implement, and still return their reading. The readers that refuse a",
    "guide they do not implement (`get270Inquiry`, `parse270Inquiries`, `get271Eligibility`,",
    "`get276StatusInquiry`, `parse276StatusInquiries`, `get277Status`, `get278Request`,",
    "`get278Response`, `get820Payments`, `get834Header`, `get834Enrollments`, `get835` and",
    "`get837Claims`) compare the declaration trimmed and upper-cased. Where it then names a guide",
    "they implement, which is a padded or lower-cased 005010 guide, they return the reading and",
    "raise this code on it. Where it still names none, a 4010 guide for one, they return no reading",
    "at all, the same answer they give a transaction set of another ST-01, and raise nothing.",
  ].join("\n"),
  X12_GUIDE_NOT_DECLARED: [
    "GS-08 is read where ST-03 is absent, empty or whitespace only, and a GS-08 that is absent,",
    "empty or whitespace only declares nothing, so a declaration of whitespace only raises this",
    "code rather than `X12_GUIDE_NOT_IMPLEMENTED`. Every reader that raises it still returns its",
    'reading; `get277Status` gives that reading `transactionType: "unrecognized-guide"`.',
  ].join("\n"),
};

/** Each refusal registry, the error class whose `code` it types, and the registry's export name. */
const ERROR_REGISTRIES: readonly {
  readonly name: string;
  readonly errorClass: string;
  readonly codes: Readonly<Record<string, string>>;
}[] = [
  { name: "X12_BUILD_ERROR_CODES", errorClass: "X12BuildError", codes: X12_BUILD_ERROR_CODES },
  {
    name: "ELIGIBILITY_270_BUILD_ERROR_CODES",
    errorClass: "Eligibility270BuildError",
    codes: ELIGIBILITY_270_BUILD_ERROR_CODES,
  },
  {
    name: "ELIGIBILITY_271_BUILD_ERROR_CODES",
    errorClass: "Eligibility271BuildError",
    codes: ELIGIBILITY_271_BUILD_ERROR_CODES,
  },
  {
    name: "CLAIM_STATUS_276_BUILD_ERROR_CODES",
    errorClass: "ClaimStatus276BuildError",
    codes: CLAIM_STATUS_276_BUILD_ERROR_CODES,
  },
  {
    name: "CLAIM_STATUS_277_BUILD_ERROR_CODES",
    errorClass: "ClaimStatus277BuildError",
    codes: CLAIM_STATUS_277_BUILD_ERROR_CODES,
  },
  {
    name: "AUTH_278_BUILD_ERROR_CODES",
    errorClass: "ServicesReview278BuildError",
    codes: AUTH_278_BUILD_ERROR_CODES,
  },
  {
    name: "PREMIUM_820_BUILD_ERROR_CODES",
    errorClass: "Premium820BuildError",
    codes: PREMIUM_820_BUILD_ERROR_CODES,
  },
  {
    name: "ENROLLMENT_834_BUILD_ERROR_CODES",
    errorClass: "Enrollment834BuildError",
    codes: ENROLLMENT_834_BUILD_ERROR_CODES,
  },
  {
    name: "REMIT_835_BUILD_ERROR_CODES",
    errorClass: "Remit835BuildError",
    codes: REMIT_835_BUILD_ERROR_CODES,
  },
  {
    name: "CLAIM_837_BUILD_ERROR_CODES",
    errorClass: "Claim837BuildError",
    codes: CLAIM_837_BUILD_ERROR_CODES,
  },
  { name: "ACK_BUILD_ERROR_CODES", errorClass: "AckBuildError", codes: ACK_BUILD_ERROR_CODES },
  {
    name: "ATTACHMENT_275_BUILD_ERROR_CODES",
    errorClass: "Attachment275BuildError",
    codes: ATTACHMENT_275_BUILD_ERROR_CODES,
  },
  {
    name: "RFAI_277_BUILD_ERROR_CODES",
    errorClass: "Rfai277BuildError",
    codes: RFAI_277_BUILD_ERROR_CODES,
  },
  {
    name: "CORE_CODE_COMBINATION_ERROR_CODES",
    errorClass: "CoreCodeCombinationTableError",
    codes: CORE_CODE_COMBINATION_ERROR_CODES,
  },
  {
    name: "X12_CODE_LIST_ERROR_CODES",
    errorClass: "X12CodeListError",
    codes: X12_CODE_LIST_ERROR_CODES,
  },
];

/** The export names of every refusal registry the page lists. */
export const LISTED_ERROR_REGISTRIES: readonly string[] = ERROR_REGISTRIES.map((r) => r.name);

/** The fatal codes the page explains. */
export const FATAL_MEANING_CODES: readonly string[] = Object.keys(FATAL_MEANINGS);

/**
 * The warning message registry, key by key, read from the source with the compiler rather than
 * by pattern: the registry is not exported, and its keys are what tie a message to its code.
 */
export function warningMessageEntries(): [key: string, message: string][] {
  const path = join(ROOT, "src", "parser", "warnings.ts");
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ESNext);
  let entries: [string, string][] | undefined;
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "WARNING_MESSAGES"
    ) {
      let init = node.initializer;
      while (init !== undefined && ts.isAsExpression(init)) init = init.expression;
      if (init === undefined || !ts.isObjectLiteralExpression(init)) {
        throw new Error("WARNING_MESSAGES is no longer an object literal");
      }
      entries = init.properties.map((property) => {
        if (
          !ts.isPropertyAssignment(property) ||
          !ts.isIdentifier(property.name) ||
          !(
            ts.isStringLiteral(property.initializer) ||
            ts.isNoSubstitutionTemplateLiteral(property.initializer)
          )
        ) {
          throw new Error('a WARNING_MESSAGES entry is not `KEY: "literal"`');
        }
        return [property.name.text, property.initializer.text];
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (entries === undefined) throw new Error("WARNING_MESSAGES was not found");
  return entries;
}

/** The code a registry key belongs to: the longest code the key is, or starts with plus `_`. */
function codeOfKey(key: string, codes: readonly string[]): string {
  const matches = codes.filter((code) => key === code || key.startsWith(`${code}_`));
  const code = matches.sort((a, b) => b.length - a.length)[0];
  if (code === undefined) throw new Error(`warning message key ${key} names no warning code`);
  return code;
}

/**
 * Escape the characters Markdown or MDX would read as syntax, outside code spans: emphasis
 * markers (`NM1*87` twice in one sentence would italicize what lies between), and the brace and
 * angle bracket MDX reads as an expression or a tag.
 */
function prose(text: string): string {
  return text
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/([*_{}<>\\[\]])/g, "\\$1")))
    .join("");
}

/** The heading slug the docs site gives an export's heading on the generated reference page. */
function apiAnchor(name: string): string {
  return name.toLowerCase();
}

/** Render the whole page. */
export function renderCodesPage(): string {
  const warningCodes = Object.values(WARNING_CODES) as string[];
  for (const code of Object.keys(WARNING_NOTES)) {
    if (!warningCodes.includes(code))
      throw new Error(`a note is written for ${code}, no warning code`);
  }
  const byCode = new Map<string, [string, string][]>();
  for (const [key, message] of warningMessageEntries()) {
    const code = codeOfKey(key, warningCodes);
    byCode.set(code, [...(byCode.get(code) ?? []), [key, message]]);
  }

  const lines: string[] = [
    "---",
    "id: warning-and-error-codes",
    "title: Warning and error codes",
    "sidebar_label: Warning and error codes",
    'description: "Every fatal parse code, every warning code with the messages it carries, and every refusal code the builders throw."',
    "---",
    "",
    "# Warning and error codes",
    "",
    "Every code `@cosyte/x12` can hand you, in three groups:",
    "",
    `- **Fatal codes** (${String(Object.keys(FATAL_CODES).length)}): \`parseX12\` throws an \`X12ParseError\` carrying one when the input is not`,
    "  recoverable as X12 at all.",
    `- **Warning codes** (${String(warningCodes.length)}): a deviation a reader tolerated, recorded on the model's \`warnings\``,
    "  array with a position, while the value stays on the model.",
    `- **Refusal codes** (${String(ERROR_REGISTRIES.length)} registries): a builder or a checker refused what it was given and threw`,
    "  a typed error carrying one.",
    "",
    "Branch on the code, never on the message: the codes are the stable contract. This page is",
    "generated from the package source, and the docs test fails when the two differ.",
    "[Tolerance tiers and warning codes](./spec-notes-tolerance.md) explains how the tiers work, and",
    "[Handle warnings](./handle-warnings.md) shows how to triage them.",
    "",
    "## Fatal codes",
    "",
    "Thrown as `X12ParseError`, whatever `strict` says. Exported as",
    `[\`FATAL_CODES\`](./api/src.md#${apiAnchor("FATAL_CODES")}).`,
    "",
    "| Code | Meaning |",
    "| --- | --- |",
  ];
  for (const code of Object.values(FATAL_CODES)) {
    const meaning = FATAL_MEANINGS[code];
    if (meaning === undefined) throw new Error(`no meaning written for fatal code ${code}`);
    lines.push(`| \`${code}\` | ${meaning} |`);
  }
  lines.push(
    "",
    "## Warning codes",
    "",
    `Exported as [\`WARNING_CODES\`](./api/src.md#${apiAnchor("WARNING_CODES")}), in the order the registry lists them.`,
    "Each warning's `message` is one of the strings below, taken from a frozen registry and never",
    "built from the document, so a message holds no value from it; `position` says where to look.",
    "Where one code carries several messages, each is listed with the registry entry it comes from.",
    `[\`ALL_WARNING_MESSAGES\`](./api/src.md#${apiAnchor("ALL_WARNING_MESSAGES")}) holds every one of them.`,
  );
  for (const code of warningCodes) {
    const entries = byCode.get(code);
    if (entries === undefined) throw new Error(`warning code ${code} has no message`);
    lines.push("", `### ${code}`, "");
    if (entries.length === 1) {
      lines.push(prose(entries[0]?.[1] ?? ""));
    } else {
      for (const [key, message] of entries) {
        lines.push(`- \`${key}\`: ${prose(message)}`);
      }
    }
    const note = WARNING_NOTES[code];
    if (note !== undefined) lines.push("", note);
  }
  lines.push(
    "",
    "## Refusal codes",
    "",
    "Each registry types the `code` of one error class. The generated reference documents each",
    "registry and its class; follow the links.",
    "",
    "| Registry | Error class | Codes |",
    "| --- | --- | --- |",
  );
  for (const registry of ERROR_REGISTRIES) {
    const codes = Object.values(registry.codes)
      .map((c) => `\`${c}\``)
      .join(", ");
    lines.push(
      `| [\`${registry.name}\`](./api/src.md#${apiAnchor(registry.name)}) | [\`${registry.errorClass}\`](./api/src.md#${apiAnchor(registry.errorClass)}) | ${codes} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * The page with each table row's cells trimmed and each delimiter cell written `---`, so the
 * comparison holds the content and leaves column alignment to the formatter (`pnpm format` pads
 * the cells of a Markdown table; the renderer does not).
 */
export function withoutTableAlignment(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line.startsWith("|")
        ? line
            .split(/(?<!\\)\|/)
            .map((cell) => cell.trim().replace(/^-{3,}$/, "---"))
            .join("|")
        : line,
    )
    .join("\n");
}

/** Every message the rendered page carries, for the test to hold against `ALL_WARNING_MESSAGES`. */
export function renderedMessages(): Set<string> {
  return new Set(warningMessageEntries().map(([, message]) => message));
}

/** Re-exported for the test, so both read the one registry. */
export { ALL_WARNING_MESSAGES };

if (process.argv.includes("--write")) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(ROOT, CODES_PAGE), renderCodesPage());
}
