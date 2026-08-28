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
 * grades: for each identifier `build276` stamps into the envelope, is that
 * literal present anywhere in the tree at the MERGE BASE (`origin/main`, the
 * checkout the implementer was handed)?
 *
 * Three of the four are. GS-01 is not, on any file, in any carrier: it entered
 * the tree in this diff and nowhere else, so it was supplied rather than taken.
 *
 * Run:  pnpm exec tsx test/regress_0140_F1.ts
 * Exits 1 while the finding stands. It is EVIDENCE, not a fix; the remedy is
 * upstream's (ground the value in a committed file, or file the blocked report
 * the umbrella's ASK rule calls for when the manifest is insufficient).
 */
import { execFileSync } from "node:child_process";

import { build276 } from "../src/index.js";

const BASE = "origin/main";

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
      name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE" },
      receivers: [
        {
          name: { entityIdentifierCode: "41", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC" },
          providers: [
            {
              name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC" },
              subscribers: [
                {
                  name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
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

/** Does this literal occur anywhere in the tree at the merge base? */
function groundedAtBase(literal: string): number {
  try {
    const out = execFileSync(
      "git",
      ["grep", "-c", "-E", `\\b${literal}\\b`, BASE],
      { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8" },
    );
    return out.trim().split("\n").filter((l) => l.length > 0).length;
  } catch {
    return 0; // git grep exits 1 with no output when there is no match
  }
}

const ungrounded: string[] = [];
for (const [slot, value] of STAMPED) {
  const files = groundedAtBase(value);
  console.log(
    `${files === 0 ? "UNGROUNDED" : "grounded  "}  ${slot} = ${JSON.stringify(value)}  -> ${String(files)} file(s) at ${BASE}`,
  );
  if (files === 0) ungrounded.push(`${slot} = ${JSON.stringify(value)}`);
}

if (ungrounded.length > 0) {
  console.error(
    `\nF1 STANDS: ${String(ungrounded.length)} envelope identifier(s) this diff stamps onto the wire ` +
      `occur nowhere in the checkout the implementer was handed:\n  - ${ungrounded.join("\n  - ")}\n` +
      `Criterion 13 requires them "taken from the code-list snapshot and 277 declarations already ` +
      `in the checkout rather than invented".`,
  );
  process.exit(1);
}
console.log("\nF1 resolved: every stamped envelope identifier is grounded in the checkout.");
