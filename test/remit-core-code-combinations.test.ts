/**
 * The CORE Code Combinations check on one 835 adjustment.
 *
 * Every table here is SYNTHETIC: the reason codes (`ZZ9..`) and remark codes
 * (`ZZ-R..`) are fabricated so that no row can be mistaken for one copied from
 * a CAQH CORE publication, and the version labels are invented. The four group
 * codes are the X12 CAS-01 values, which are not CORE content. No input carries
 * patient data.
 *
 * Each test names the acceptance criterion it grades. The fail-safe runs
 * through all of them: `unevaluated` is a third answer and never a form of
 * `in-table`, so every unhappy path asserts the outcome it must NOT be as well
 * as the one it is.
 *
 * AC-12 reads the BUILT artifacts in `dist/`. `test/docs-content.test.ts`
 * also builds into `dist/`, test files run in parallel workers, and `tsup`
 * cleans its output directory first, so building straight into `dist/` here
 * would delete files another suite is reading. This suite builds into a
 * staging directory and moves each finished file into `dist/` with a rename,
 * which replaces a file whole or not at all, and it reads the artifacts from a
 * fresh `node` process so no module cache stands between the read and the file.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  CORE_BUSINESS_SCENARIOS,
  CORE_CODE_COMBINATION_ERROR_CODES,
  CORE_CODE_COMBINATION_OUTCOMES,
  CORE_CODE_COMBINATION_UNEVALUATED_REASONS,
  CoreCodeCombinationTableError,
  checkCoreCodeCombination,
  type CoreBusinessScenario,
  type CoreCodeCombinationQuery,
  type CoreCodeCombinationResult,
  type CoreCodeCombinationRow,
  type CoreCodeCombinationTable,
} from "../src/index.js";

const { IN_TABLE, NOT_IN_TABLE, UNEVALUATED } = CORE_CODE_COMBINATION_OUTCOMES;
const REASONS = CORE_CODE_COMBINATION_UNEVALUATED_REASONS;

const S1 = CORE_BUSINESS_SCENARIOS.ADDITIONAL_INFORMATION_DOCUMENTATION;
const S2 = CORE_BUSINESS_SCENARIOS.ADDITIONAL_INFORMATION_CLAIM_DATA;
const S3 = CORE_BUSINESS_SCENARIOS.SERVICE_NOT_COVERED;
const S4 = CORE_BUSINESS_SCENARIOS.NOT_SEPARATELY_PAYABLE;
const ALL_SCENARIOS: readonly CoreBusinessScenario[] = [S1, S2, S3, S4];
const ALL_GROUP_CODES = ["CO", "PR", "OA", "PI"] as const;

const LABEL = "invented-label-QX7";

/**
 * The synthetic table most tests read. Scenario #3 lists `CO`/`ZZ901` alone
 * and with two remarks, and `PR`/`ZZ902` only with a remark. Scenario #4 lists
 * `OA`/`ZZ903`, and a remark on `CO`/`ZZ901` that scenario #3 does not.
 * Scenarios #1 and #2 have no rows.
 */
const ROWS: readonly CoreCodeCombinationRow[] = [
  { scenario: S3, groupCode: "CO", reasonCode: "ZZ901" },
  { scenario: S3, groupCode: "CO", reasonCode: "ZZ901", remarkCode: "ZZ-R1" },
  { scenario: S3, groupCode: "CO", reasonCode: "ZZ901", remarkCode: "ZZ-R2" },
  { scenario: S3, groupCode: "PR", reasonCode: "ZZ902", remarkCode: "ZZ-R3" },
  { scenario: S4, groupCode: "OA", reasonCode: "ZZ903" },
  { scenario: S4, groupCode: "CO", reasonCode: "ZZ901", remarkCode: "ZZ-R9" },
];
const TABLE: CoreCodeCombinationTable = { version: LABEL, rows: ROWS };

/** An `HE` remark, as `get835` decodes one. */
function he(code: string): { readonly system: string; readonly code: string } {
  return { system: "HE", code };
}

/**
 * A query as untyped JavaScript could write it. The check reads its input
 * defensively, so the unhappy paths hand it values a TypeScript caller could
 * not write.
 */
interface UntypedQuery {
  readonly table?: unknown;
  readonly scenario: unknown;
  readonly adjustment: unknown;
  readonly remarks?: unknown;
}

/** Check against {@link TABLE} unless the query names its own `table` key. */
function check(query: UntypedQuery): CoreCodeCombinationResult {
  const input: unknown = Object.hasOwn(query, "table") ? query : { ...query, table: TABLE };
  return checkCoreCodeCombination(input as CoreCodeCombinationQuery);
}

/** Expect `unevaluated` with `reason`, and expressly not either verdict. */
function expectUnevaluated(
  result: CoreCodeCombinationResult,
  reason: string,
  tableVersion: string | undefined,
): void {
  expect(result.outcome).not.toBe(IN_TABLE);
  expect(result.outcome).not.toBe(NOT_IN_TABLE);
  expect(result).toEqual({ outcome: UNEVALUATED, reason, tableVersion });
}

describe("AC-1: in the table only when the scenario, group and reason row exists and every remark is listed with it", () => {
  it("AC-1: a listed pair with zero remarks is in the table", () => {
    expect(check({ scenario: S3, adjustment: { groupCode: "CO", reasonCode: "ZZ901" } })).toEqual({
      outcome: IN_TABLE,
      tableVersion: LABEL,
    });
    expect(
      check({ scenario: S3, adjustment: { groupCode: "CO", reasonCode: "ZZ901" }, remarks: [] }),
    ).toEqual({ outcome: IN_TABLE, tableVersion: LABEL });
  });

  it("AC-1: with zero remarks, a row for the pair suffices even when that row also names a remark", () => {
    // `PR`/`ZZ902` appears only on a row carrying `ZZ-R3`.
    expect(check({ scenario: S3, adjustment: { groupCode: "PR", reasonCode: "ZZ902" } })).toEqual({
      outcome: IN_TABLE,
      tableVersion: LABEL,
    });
  });

  it("AC-1: one or several remarks, each listed with the pair, are in the table", () => {
    const adjustment = { groupCode: "CO", reasonCode: "ZZ901" };
    expect(check({ scenario: S3, adjustment, remarks: [he("ZZ-R1")] }).outcome).toBe(IN_TABLE);
    expect(check({ scenario: S3, adjustment, remarks: [he("ZZ-R2"), he("ZZ-R1")] }).outcome).toBe(
      IN_TABLE,
    );
    expect(
      check({
        scenario: S3,
        adjustment: { groupCode: "PR", reasonCode: "ZZ902" },
        remarks: [he("ZZ-R3")],
      }).outcome,
    ).toBe(IN_TABLE);
  });
});

describe("AC-2: not in the table when the scenario has rows and the combination is not among them", () => {
  it("AC-2: a pair with no row for the scenario is not in the table", () => {
    expect(check({ scenario: S3, adjustment: { groupCode: "OA", reasonCode: "ZZ904" } })).toEqual({
      outcome: NOT_IN_TABLE,
      tableVersion: LABEL,
    });
  });

  it("AC-2: a group code and a reason code listed only on different rows are not a listed pair", () => {
    // `CO` is listed with `ZZ901` and `ZZ902` is listed with `PR`; never `CO`/`ZZ902`.
    expect(
      check({ scenario: S3, adjustment: { groupCode: "CO", reasonCode: "ZZ902" } }).outcome,
    ).toBe(NOT_IN_TABLE);
    expect(
      check({ scenario: S3, adjustment: { groupCode: "PR", reasonCode: "ZZ901" } }).outcome,
    ).toBe(NOT_IN_TABLE);
  });

  it("AC-2: a listed pair with a remark not listed for it is not in the table", () => {
    const adjustment = { groupCode: "CO", reasonCode: "ZZ901" };
    expect(check({ scenario: S3, adjustment, remarks: [he("ZZ-R7")] })).toEqual({
      outcome: NOT_IN_TABLE,
      tableVersion: LABEL,
    });
    // One unlisted remark among listed ones is enough.
    expect(
      check({ scenario: S3, adjustment, remarks: [he("ZZ-R1"), he("ZZ-R7"), he("ZZ-R2")] }).outcome,
    ).toBe(NOT_IN_TABLE);
    // A remark listed for the scenario under a DIFFERENT pair does not count.
    expect(check({ scenario: S3, adjustment, remarks: [he("ZZ-R3")] }).outcome).toBe(NOT_IN_TABLE);
  });

  it("AC-2: a combination listed only under a different scenario is not in the table for the named one", () => {
    // `OA`/`ZZ903` is listed only under scenario #4.
    expect(
      check({ scenario: S3, adjustment: { groupCode: "OA", reasonCode: "ZZ903" } }).outcome,
    ).toBe(NOT_IN_TABLE);
    expect(
      check({ scenario: S4, adjustment: { groupCode: "OA", reasonCode: "ZZ903" } }).outcome,
    ).toBe(IN_TABLE);
    // `ZZ-R9` is listed with `CO`/`ZZ901` only under scenario #4.
    const adjustment = { groupCode: "CO", reasonCode: "ZZ901" };
    expect(check({ scenario: S3, adjustment, remarks: [he("ZZ-R9")] }).outcome).toBe(NOT_IN_TABLE);
    expect(check({ scenario: S4, adjustment, remarks: [he("ZZ-R9")] }).outcome).toBe(IN_TABLE);
  });
});

describe("AC-3: no table supplied is unevaluated, with no version label", () => {
  it("AC-3: for every scenario and every group code, whether the table is absent, undefined or null", () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const groupCode of ALL_GROUP_CODES) {
        const adjustment = { groupCode, reasonCode: "ZZ901" };
        for (const result of [
          check({ scenario, adjustment, table: undefined }),
          check({ scenario, adjustment, remarks: [he("ZZ-R1")], table: undefined }),
          check({ scenario, adjustment, table: null }),
          checkCoreCodeCombination({ scenario, adjustment }),
        ]) {
          expectUnevaluated(result, REASONS.NO_TABLE, undefined);
          expect(result.tableVersion).toBeUndefined();
        }
      }
    }
  });
});

describe("AC-4: a table with no row for the named scenario is unevaluated", () => {
  it("AC-4: scenarios the table has no rows for answer unevaluated, never either verdict", () => {
    for (const scenario of [S1, S2]) {
      expectUnevaluated(
        check({ scenario, adjustment: { groupCode: "CO", reasonCode: "ZZ901" } }),
        REASONS.NO_ROWS_FOR_SCENARIO,
        LABEL,
      );
    }
  });

  it("AC-4: a table with no rows at all answers unevaluated for every scenario", () => {
    for (const scenario of ALL_SCENARIOS) {
      expectUnevaluated(
        check({
          scenario,
          adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
          table: { version: LABEL, rows: [] },
        }),
        REASONS.NO_ROWS_FOR_SCENARIO,
        LABEL,
      );
    }
  });
});

describe("AC-5: the supplied table's version label comes back beside every answer, exactly as supplied", () => {
  it("AC-5: an arbitrary invented label returns unchanged on every answer given against the table", () => {
    const label = "  Invented label: v0.0-QX7 (tab\there) ";
    const table = { version: label, rows: ROWS };
    const adjustment = { groupCode: "CO", reasonCode: "ZZ901" };
    const results = [
      check({ table, scenario: S3, adjustment }), // in the table
      check({ table, scenario: S3, adjustment, remarks: [he("ZZ-R7")] }), // not in the table
      check({ table, scenario: S1, adjustment }), // unevaluated under AC-4
      check({ table, scenario: "scenario-5", adjustment }), // AC-6
      check({ table, scenario: S3, adjustment: { groupCode: "", reasonCode: "ZZ901" } }), // AC-7
    ];
    expect(results.map((r) => r.outcome)).toEqual([
      IN_TABLE,
      NOT_IN_TABLE,
      UNEVALUATED,
      UNEVALUATED,
      UNEVALUATED,
    ]);
    for (const result of results) expect(result.tableVersion).toBe(label);
  });
});

describe("AC-6: a scenario outside the four is unevaluated", () => {
  it("AC-6: an unknown scenario at run time answers unevaluated, even where every scenario lists the pair", () => {
    const everyScenario = {
      version: LABEL,
      rows: ALL_SCENARIOS.map((scenario) => ({ scenario, groupCode: "CO", reasonCode: "ZZ901" })),
    };
    const unknown: readonly unknown[] = [
      "scenario-5",
      "plan-defined-QX7",
      "SCENARIO-3",
      " scenario-3",
      "",
      "3",
      3,
      null,
      undefined,
      ...Object.getOwnPropertyNames(Object.prototype),
    ];
    for (const scenario of unknown) {
      expectUnevaluated(
        check({
          table: everyScenario,
          scenario,
          adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
        }),
        REASONS.UNKNOWN_SCENARIO,
        LABEL,
      );
    }
  });
});

describe("AC-7: an empty group or reason code, or a remark that is not an HE remark code, is unevaluated", () => {
  it("AC-7: an empty or unreadable group code or reason code answers unevaluated", () => {
    for (const groupCode of ["", 7, undefined, null]) {
      expectUnevaluated(
        check({ scenario: S3, adjustment: { groupCode, reasonCode: "ZZ901" } }),
        REASONS.GROUP_CODE_UNREADABLE,
        LABEL,
      );
    }
    for (const reasonCode of ["", 7, undefined, null]) {
      expectUnevaluated(
        check({ scenario: S3, adjustment: { groupCode: "CO", reasonCode } }),
        REASONS.REASON_CODE_UNREADABLE,
        LABEL,
      );
    }
    // An adjustment that is not an object has no group code to read.
    expectUnevaluated(
      check({ scenario: S3, adjustment: undefined }),
      REASONS.GROUP_CODE_UNREADABLE,
      LABEL,
    );
  });

  it("AC-7: a remark carrying a code system other than HE answers unevaluated, even beside listed HE remarks", () => {
    // A table that lists `ZZ-R1` as a remark code, so that reading the system
    // away would answer in the table.
    const adjustment = { groupCode: "CO", reasonCode: "ZZ901" };
    for (const system of ["RX", "he", "HE ", "", "RX:HE"]) {
      expectUnevaluated(
        check({ scenario: S3, adjustment, remarks: [{ system, code: "ZZ-R1" }] }),
        REASONS.REMARK_NOT_RARC,
        LABEL,
      );
      expectUnevaluated(
        check({ scenario: S3, adjustment, remarks: [he("ZZ-R1"), { system, code: "ZZ-R1" }] }),
        REASONS.REMARK_NOT_RARC,
        LABEL,
      );
    }
  });

  it("AC-7: remarks that cannot be read as HE remark codes answer unevaluated", () => {
    const adjustment = { groupCode: "CO", reasonCode: "ZZ901" };
    for (const remarks of [
      "ZZ-R1",
      null,
      { 0: he("ZZ-R1"), length: 1 },
      [null],
      [{ system: "HE" }],
    ]) {
      expectUnevaluated(
        check({ scenario: S3, adjustment, remarks }),
        REASONS.REMARK_UNREADABLE,
        LABEL,
      );
    }
  });
});

describe("AC-8: codes match exactly, and Object.prototype names are ordinary codes", () => {
  it("AC-8: no case folding and no trimming on the group, reason or remark code", () => {
    for (const groupCode of ["co", "Co", "CO ", " CO", "C O"]) {
      expect(check({ scenario: S3, adjustment: { groupCode, reasonCode: "ZZ901" } }).outcome).toBe(
        NOT_IN_TABLE,
      );
    }
    for (const reasonCode of ["zz901", "ZZ901 ", " ZZ901", "ZZ9010"]) {
      expect(check({ scenario: S3, adjustment: { groupCode: "CO", reasonCode } }).outcome).toBe(
        NOT_IN_TABLE,
      );
    }
    for (const code of ["zz-r1", "ZZ-R1 ", " ZZ-R1", "ZZ-R"]) {
      expect(
        check({
          scenario: S3,
          adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
          remarks: [he(code)],
        }).outcome,
      ).toBe(NOT_IN_TABLE);
    }
  });

  it("AC-8: a code named after an Object.prototype property is not in the table unless a row names it", () => {
    const names = Object.getOwnPropertyNames(Object.prototype);
    // Non-vacuity: the sweep is over the running engine's own set.
    expect(names).toContain("constructor");
    expect(names).toContain("__proto__");
    expect(names).toContain("toString");
    for (const name of names) {
      expect(
        check({ scenario: S3, adjustment: { groupCode: name, reasonCode: "ZZ901" } }).outcome,
      ).toBe(NOT_IN_TABLE);
      expect(
        check({ scenario: S3, adjustment: { groupCode: "CO", reasonCode: name } }).outcome,
      ).toBe(NOT_IN_TABLE);
      expect(
        check({
          scenario: S3,
          adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
          remarks: [he(name)],
        }).outcome,
      ).toBe(NOT_IN_TABLE);

      const naming = {
        version: LABEL,
        rows: [{ scenario: S3, groupCode: name, reasonCode: name, remarkCode: name }],
      };
      expect(
        check({
          table: naming,
          scenario: S3,
          adjustment: { groupCode: name, reasonCode: name },
          remarks: [he(name)],
        }),
      ).toEqual({ outcome: IN_TABLE, tableVersion: LABEL });
    }
  });
});

describe("AC-9: a malformed table is refused with a typed error that echoes nothing from it", () => {
  const SENTINEL = "SENTINEL-QX7-9Z";
  const good = { scenario: S3, groupCode: "CO", reasonCode: "ZZ901" };
  const withSentinel = { reasonCode: SENTINEL, note: SENTINEL };

  const cases: readonly {
    readonly name: string;
    readonly table: unknown;
    readonly field: string;
    readonly rowIndex: number | undefined;
  }[] = [
    {
      name: "version missing",
      table: { rows: [{ ...good, note: SENTINEL }] },
      field: "version",
      rowIndex: undefined,
    },
    {
      name: "version not a string",
      table: { version: [SENTINEL], rows: [{ ...good, note: SENTINEL }] },
      field: "version",
      rowIndex: undefined,
    },
    {
      name: "version null",
      table: { version: null, rows: [{ ...good, note: SENTINEL }] },
      field: "version",
      rowIndex: undefined,
    },
    {
      name: "version empty",
      table: { version: "", rows: [{ ...good, note: SENTINEL }] },
      field: "version",
      rowIndex: undefined,
    },
    { name: "table not an object", table: SENTINEL, field: "table", rowIndex: undefined },
    {
      name: "rows not an array",
      table: { version: SENTINEL, rows: SENTINEL },
      field: "rows",
      rowIndex: undefined,
    },
    {
      name: "row not an object",
      table: { version: SENTINEL, rows: [good, SENTINEL] },
      field: "row",
      rowIndex: 1,
    },
    {
      name: "scenario outside the four",
      table: { version: SENTINEL, rows: [good, { ...good, scenario: SENTINEL }] },
      field: "scenario",
      rowIndex: 1,
    },
    {
      name: "scenario scenario-5",
      table: { version: SENTINEL, rows: [{ ...good, scenario: "scenario-5", note: SENTINEL }] },
      field: "scenario",
      rowIndex: 0,
    },
    {
      name: "scenario __proto__",
      table: { version: SENTINEL, rows: [{ ...good, scenario: "__proto__", note: SENTINEL }] },
      field: "scenario",
      rowIndex: 0,
    },
    {
      name: "group code missing",
      table: { version: SENTINEL, rows: [good, { scenario: S3, ...withSentinel }] },
      field: "groupCode",
      rowIndex: 1,
    },
    {
      name: "group code not a string",
      table: {
        version: SENTINEL,
        rows: [good, { scenario: S3, groupCode: [SENTINEL], ...withSentinel }],
      },
      field: "groupCode",
      rowIndex: 1,
    },
    {
      name: "group code empty",
      table: { version: SENTINEL, rows: [good, { scenario: S3, groupCode: "", ...withSentinel }] },
      field: "groupCode",
      rowIndex: 1,
    },
    {
      name: "reason code missing",
      table: { version: SENTINEL, rows: [good, { scenario: S3, groupCode: SENTINEL }] },
      field: "reasonCode",
      rowIndex: 1,
    },
    {
      name: "reason code not a string",
      table: {
        version: SENTINEL,
        rows: [good, { scenario: S3, groupCode: SENTINEL, reasonCode: [SENTINEL] }],
      },
      field: "reasonCode",
      rowIndex: 1,
    },
    {
      name: "reason code empty",
      table: {
        version: SENTINEL,
        rows: [good, { scenario: S3, groupCode: SENTINEL, reasonCode: "" }],
      },
      field: "reasonCode",
      rowIndex: 1,
    },
    {
      name: "remark code not a string",
      table: {
        version: SENTINEL,
        rows: [good, { ...good, groupCode: SENTINEL, remarkCode: [SENTINEL] }],
      },
      field: "remarkCode",
      rowIndex: 1,
    },
    {
      name: "remark code null",
      table: {
        version: SENTINEL,
        rows: [good, { ...good, groupCode: SENTINEL, remarkCode: null }],
      },
      field: "remarkCode",
      rowIndex: 1,
    },
  ];

  for (const { name, table, field, rowIndex } of cases) {
    it(`AC-9: refuses a table whose ${name}, and the message carries no value from it`, () => {
      // The table's first row, where it has one, answers in the table for this
      // query, so a check that stopped reading at a match would answer.
      let caught: unknown;
      let returned: CoreCodeCombinationResult | undefined;
      try {
        returned = check({
          table,
          scenario: S3,
          adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
        });
      } catch (err) {
        caught = err;
      }
      expect(returned).toBeUndefined();
      expect(caught).toBeInstanceOf(CoreCodeCombinationTableError);
      if (!(caught instanceof CoreCodeCombinationTableError)) return;
      expect(caught.code).toBe(
        CORE_CODE_COMBINATION_ERROR_CODES.X12_CORE_COMBINATION_TABLE_INVALID,
      );
      expect(caught.field).toBe(field);
      expect(caught.rowIndex).toBe(rowIndex);
      expect(JSON.stringify(table)).toContain(SENTINEL);
      expect(caught.message).not.toContain(SENTINEL);
      expect(caught.message).not.toContain("QX7");
    });
  }

  it("AC-9: a well-formed row that omits its remark code, or carries it as undefined, is not refused", () => {
    const table = { version: LABEL, rows: [{ ...good, remarkCode: undefined }] };
    expect(
      check({ table, scenario: S3, adjustment: { groupCode: "CO", reasonCode: "ZZ901" } }).outcome,
    ).toBe(IN_TABLE);
  });
});

/** Freeze `value` and everything reachable from it. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

describe("AC-10: the check leaves its inputs unmodified", () => {
  it("AC-10: deep-frozen inputs are accepted and come back unchanged", () => {
    const table = deepFreeze(structuredClone({ version: LABEL, rows: [...ROWS] }));
    const adjustment = deepFreeze({ groupCode: "CO", reasonCode: "ZZ901" });
    const listed = deepFreeze([he("ZZ-R1"), he("ZZ-R2")]);
    const unlisted = deepFreeze([he("ZZ-R7")]);
    const foreign = deepFreeze([{ system: "RX", code: "ZZ-R1" }]);
    const before = structuredClone({ table, adjustment, listed, unlisted, foreign });

    expect(
      checkCoreCodeCombination({ table, scenario: S3, adjustment, remarks: listed }).outcome,
    ).toBe(IN_TABLE);
    expect(
      checkCoreCodeCombination({ table, scenario: S3, adjustment, remarks: unlisted }).outcome,
    ).toBe(NOT_IN_TABLE);
    expect(
      checkCoreCodeCombination({ table, scenario: S3, adjustment, remarks: foreign }).outcome,
    ).toBe(UNEVALUATED);
    expect(checkCoreCodeCombination({ table, scenario: S1, adjustment }).outcome).toBe(UNEVALUATED);
    expect(checkCoreCodeCombination({ scenario: S3, adjustment, remarks: listed }).outcome).toBe(
      UNEVALUATED,
    );

    expect({ table, adjustment, listed, unlisted, foreign }).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// AC-12: the root export, from source and from both built entry points.
// ---------------------------------------------------------------------------

const root = join(import.meta.dirname, "..");
const DIST = join(root, "dist");
/**
 * Where this suite's build lands before each file is moved into `dist/`. Inside
 * the checkout, so the move is a rename on one filesystem, and git-ignored.
 */
const STAGING = join(root, ".vitest-cache", "remit-core-code-combinations-dist");

/**
 * The `tsup` command-line entry this package's `build` script runs, resolved
 * from the installed package and run with this `node`, so the build does not
 * depend on which package-manager binary a test process finds first.
 */
function tsupCli(): string {
  const manifestPath = createRequire(import.meta.url).resolve("tsup/package.json");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  const bin = isRecordValue(manifest) ? manifest["bin"] : undefined;
  const entry = isRecordValue(bin) ? bin["tsup"] : undefined;
  if (typeof entry !== "string") throw new Error("tsup declares no `tsup` bin entry");
  return join(dirname(manifestPath), entry);
}

/** Whether `value` is an object whose properties can be read. */
function isRecordValue(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
/** How long a read waits for `dist/` while another suite's build rewrites it. */
const READ_DEADLINE_MS = 60_000;

/**
 * The probe each built entry point runs in its own `node` process: the check's
 * type, the error-code constant's value, and the code the check's refusal of a
 * malformed table actually carries.
 */
const PROBE = `
let refusal;
try {
  m.checkCoreCodeCombination({
    table: { version: "", rows: [] },
    scenario: "scenario-1",
    adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
  });
} catch (err) {
  refusal = { code: err.code, typed: err instanceof m.CoreCodeCombinationTableError };
}
process.stdout.write(JSON.stringify({
  check: typeof m.checkCoreCodeCombination,
  errorCode: m.CORE_CODE_COMBINATION_ERROR_CODES?.X12_CORE_COMBINATION_TABLE_INVALID,
  refusal,
}));
`;

/** Block the worker for `ms`: the build and the reads here are synchronous. */
function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Run `step` until it succeeds or the deadline passes, then rethrow its last error. */
function untilDeadline<T>(step: () => T): T {
  const deadline = Date.now() + READ_DEADLINE_MS;
  for (;;) {
    try {
      return step();
    } catch (err) {
      if (Date.now() > deadline) throw err;
      pause(250);
    }
  }
}

/** Run {@link PROBE} against one built entry point in a fresh `node` process. */
function probe(entry: "index.mjs" | "index.cjs"): unknown {
  const file = join(DIST, entry);
  const script =
    entry === "index.mjs"
      ? `const m = await import(${JSON.stringify(pathToFileURL(file).href)});${PROBE}`
      : `const m = require(${JSON.stringify(file)});${PROBE}`;
  const args = entry === "index.mjs" ? ["--input-type=module", "-e", script] : ["-e", script];
  return untilDeadline(
    () => JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8" })) as unknown,
  );
}

describe("AC-12: exported from the package root, in source and in both built entry points", () => {
  beforeAll(() => {
    rmSync(STAGING, { recursive: true, force: true });
    execFileSync(process.execPath, [tsupCli(), "--out-dir", STAGING], {
      cwd: root,
      stdio: "inherit",
    });
    for (const name of readdirSync(STAGING)) {
      untilDeadline(() => {
        mkdirSync(DIST, { recursive: true });
        renameSync(join(STAGING, name), join(DIST, name));
      });
    }
    rmSync(STAGING, { recursive: true, force: true });
  }, 180_000);

  it("AC-12: the source root exports the check and the error-code constant carrying the refusal's code", () => {
    expect(typeof checkCoreCodeCombination).toBe("function");
    expect(CORE_CODE_COMBINATION_ERROR_CODES.X12_CORE_COMBINATION_TABLE_INVALID).toBe(
      "X12_CORE_COMBINATION_TABLE_INVALID",
    );
    let caught: unknown;
    try {
      check({
        table: { version: "", rows: [] },
        scenario: S1,
        adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(CoreCodeCombinationTableError);
    expect(caught instanceof CoreCodeCombinationTableError ? caught.code : undefined).toBe(
      CORE_CODE_COMBINATION_ERROR_CODES.X12_CORE_COMBINATION_TABLE_INVALID,
    );
  });

  for (const entry of ["index.mjs", "index.cjs"] as const) {
    it(
      `AC-12: the built dist/${entry} exports the check and the error-code constant carrying the refusal's code`,
      () => {
        expect(probe(entry)).toEqual({
          check: "function",
          errorCode: "X12_CORE_COMBINATION_TABLE_INVALID",
          refusal: { code: "X12_CORE_COMBINATION_TABLE_INVALID", typed: true },
        });
      },
      READ_DEADLINE_MS + 10_000,
    );
  }
});
