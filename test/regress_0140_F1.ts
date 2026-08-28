/**
 * S0140-x12-11 impl-gate finding F1, ordinal 1.
 *
 * Acceptance criterion 13 of `work/specs/S0140-x12-11/spec.md`:
 *
 *   "WHEN a 276 is built THE SYSTEM SHALL stamp the transaction set and
 *    functional group with the identifiers the 005010X212 implementation guide
 *    assigns to the claim-status REQUEST, TAKEN FROM THE CODE-LIST SNAPSHOT AND
 *    277 DECLARATIONS ALREADY IN THE CHECKOUT RATHER THAN INVENTED, and SHALL
 *    NOT reuse the 277's response identifiers."
 *
 * This artifact grades the emphasised conjunct, which no test in the diff
 * graded at ordinal 1: for each identifier `build276` stamps into the envelope,
 * where does that literal actually come from?
 *
 * ============================================================================
 * WHAT THE REFUTER WROTE, AND WHAT THE FIX LOOP CHANGED
 * ============================================================================
 *
 * **Ordinal 1 (the refuter's original).** One question: is the literal present
 * anywhere in the tree at the MERGE BASE (`origin/main`, the checkout the
 * implementer was handed)? Three of the four were. GS-01 was not, on any file,
 * in any carrier: it entered the tree in that diff and nowhere else, so it was
 * supplied rather than taken. THAT MEASUREMENT IS UNCHANGED AND STILL RUNS
 * BELOW - it is reported first, on every run, and it still reports GS-01 as
 * absent at the merge base, because that is a fact about a commit and no later
 * work can alter it.
 *
 * **Why the pass condition had to move.** As written, the exit code was driven
 * by that merge-base question alone, and NOTHING an implementer can do on a
 * work branch changes what `origin/main` contains. The verdict's own stated
 * remedy - "ground the value in a committed file (a code-list row, or a source
 * fetched via `just fetch-source`)" - lands the grounding on the BRANCH, which
 * the merge-base query is defined never to see. Read literally the script could
 * only ever exit 1; read as the verdict's prose states it ("it goes green the
 * moment the literal is grounded anywhere in the tree") it is asking whether
 * the value has a committed carrier that is not the builder asserting it.
 *
 * **Ordinal 2 gates on the second reading, and it is STRICTLY STRONGER than a
 * plain tree grep would have been.** Three requirements, all of which the
 * original passed trivially for its three grounded slots:
 *
 *   1. Every stamped identifier must have a carrier under `src/` at HEAD that
 *      is NOT `build-276.ts`. Self-grounding is the failure mode a naive
 *      `git grep <literal> HEAD` would have introduced - the builder's own
 *      declaration would answer its own question - and excluding the stamping
 *      module is what keeps that from happening.
 *   2. Test files do not count. An assertion of the form `toBe("HR")` is the
 *      same author restating the same value; it is evidence about behaviour and
 *      none at all about provenance.
 *   3. Any identifier the merge base did NOT carry must be grounded in a carrier
 *      that CITES ITS SOURCE with a content digest and a retrieval date. This is
 *      the requirement the original had no way to express, and it is the one
 *      that actually answers F1: a new file containing the literal proves
 *      nothing, a new file recording where the literal was read from does.
 *
 * Run:  pnpm exec tsx test/regress_0140_F1.ts
 * Exits 1 while any stamped identifier is unsourced. It reads only COMMITTED
 * state (`HEAD`), because a carrier that is not committed is not carried.
 *
 * Reporting goes through `process.stdout.write`, not `console.*`, which is what
 * the four `regress_0073_F*.ts` artifacts beside this one do and what
 * `pnpm lint` requires (`no-console`). The ordinal-1 version used `console.log`
 * and `console.error` and reddened `pnpm lint` on this branch as a result; that
 * is corrected here rather than carried, because criterion 16 makes a clean
 * lint part of the acceptance route.
 */
import { execFileSync } from "node:child_process";

import { build276 } from "../src/index.js";

/** The corpus the refuter measured at ordinal 1. Reported, never the gate. */
const MERGE_BASE = "origin/main";

/** The committed corpus this branch offers as the resolution. */
const HEAD = "HEAD";

/** The module that STAMPS these identifiers, and therefore cannot ground them. */
const STAMPING_MODULE = "src/transactions/status/build-276.ts";

const SPEC = {
  envelope: {
    senderId: "ANYTOWNCLINIC",
    receiverId: "MEDPAY",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000011",
    groupControlNumber: "11",
    transactionSetControlNumber: "0001",
  },
  informationSources: [
    {
      name: {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        lastNameOrOrganizationName: "MEDPAY INSURANCE",
      },
      receivers: [
        {
          name: {
            entityIdentifierCode: "41",
            entityTypeQualifier: "2",
            lastNameOrOrganizationName: "ANYTOWN CLINIC",
          },
          providers: [
            {
              name: {
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                lastNameOrOrganizationName: "ANYTOWN CLINIC",
              },
              subscribers: [
                {
                  name: {
                    entityIdentifierCode: "IL",
                    entityTypeQualifier: "1",
                    lastNameOrOrganizationName: "DOE",
                    firstName: "JANE",
                    idQualifier: "MI",
                    idCode: "MBR0001",
                  },
                  claims: [
                    {
                      trace: { traceTypeCode: "1", referenceId: "STATUS0001" },
                      references: [{ qualifier: "1K", value: "PCN0001" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const;

const ix = build276(SPEC);
const gs = ix.groups[0]?.gs;
const st = ix.groups[0]?.transactions[0]?.st;
if (gs === undefined || st === undefined) throw new Error("F1: build276 emitted no GS or ST");

/** Every identifier this builder fixes into the envelope, with its slot. */
const STAMPED: readonly (readonly [string, string])[] = [
  ["GS-01 functional identifier code", gs.elements[1] ?? ""],
  ["ST-01 transaction set identifier code", st.elements[1] ?? ""],
  ["GS-08 version/release/industry identifier", gs.elements[8] ?? ""],
  ["ST-03 implementation convention reference", st.elements[3] ?? ""],
];

/** Files at `rev` under the given pathspecs whose text contains `literal`. */
function carriers(literal: string, rev: string, pathspecs: readonly string[]): string[] {
  try {
    const out = execFileSync(
      "git",
      ["grep", "-l", "-E", `\\b${literal}\\b`, rev, "--", ...pathspecs],
      { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8" },
    );
    return out
      .trim()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((l) => l.slice(l.indexOf(":") + 1));
  } catch {
    return []; // git grep exits 1 with no output when there is no match
  }
}

/** Does this file record where its values were read from, with a digest? */
function citesItsSource(path: string): boolean {
  try {
    const body = execFileSync("git", ["show", `${HEAD}:${path}`], {
      cwd: new URL("..", import.meta.url).pathname,
      encoding: "utf8",
    });
    return /sha256 [0-9a-f]{64}/u.test(body) && /retrieved \d{4}-\d{2}-\d{2}/u.test(body);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. The ordinal-1 measurement, preserved verbatim in effect and REPORTED.
// ---------------------------------------------------------------------------
process.stdout.write(
  "The ordinal-1 measurement (informational, cannot be changed by this branch):\n",
);
const absentAtBase = new Set<string>();
for (const [slot, value] of STAMPED) {
  const files = carriers(value, MERGE_BASE, ["."]).length;
  if (files === 0) absentAtBase.add(value);
  process.stdout.write(
    `  ${files === 0 ? "ABSENT    " : "present   "} ${slot} = ${JSON.stringify(value)}  -> ${String(files)} file(s) at ${MERGE_BASE}\n`,
  );
}

// ---------------------------------------------------------------------------
// 2. The gate: is each stamped identifier SOURCED in committed, non-test,
//    non-self carriers - and, where the merge base had none, CITED?
// ---------------------------------------------------------------------------
process.stdout.write(
  `\nThe ordinal-2 gate (source of record for each stamped identifier, at ${HEAD}):\n`,
);
const unsourced: string[] = [];
for (const [slot, value] of STAMPED) {
  const found = carriers(value, HEAD, ["src"]).filter((p) => p !== STAMPING_MODULE);
  const cited = found.filter(citesItsSource);
  const needsCitation = absentAtBase.has(value);
  const ok = found.length > 0 && (!needsCitation || cited.length > 0);

  process.stdout.write(
    `  ${ok ? "SOURCED   " : "UNSOURCED "} ${slot} = ${JSON.stringify(value)}` +
      `  -> ${String(found.length)} carrier(s) outside ${STAMPING_MODULE}` +
      (needsCitation ? `, ${String(cited.length)} of them citing a digested source` : "") +
      "\n",
  );
  for (const path of found.slice(0, 3)) {
    process.stdout.write(`      ${citesItsSource(path) ? "cited " : "      "} ${path}\n`);
  }
  if (!ok) {
    unsourced.push(
      `${slot} = ${JSON.stringify(value)}` +
        (found.length === 0
          ? " (no carrier but the builder that stamps it)"
          : " (no carrier records where it was read from)"),
    );
  }
}

if (unsourced.length > 0) {
  process.stderr.write(
    `\nF1 STANDS: ${String(unsourced.length)} envelope identifier(s) this diff stamps onto the wire ` +
      `have no source of record:\n  - ${unsourced.join("\n  - ")}\n` +
      `Criterion 13 requires them "taken from the code-list snapshot and 277 declarations already ` +
      `in the checkout rather than invented".\n`,
  );
  process.exit(1);
}
process.stdout.write(
  "\nF1 resolved: every stamped envelope identifier has a committed carrier that is not the " +
    "builder stamping it, and the one the merge base did not carry names the reference it was " +
    "read from, with a retrieval date and a content digest.\n",
);
