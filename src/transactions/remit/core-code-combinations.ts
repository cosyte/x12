/**
 * CORE Code Combinations check for one 835 adjustment.
 *
 * CAQH CORE Operating Rule 360 (section 4.1.3) conveys the detail of an
 * adjustment by the combined use of a specified Claim Adjustment Group Code
 * (the 835's `groupCode`, CAS-01), a specified Claim Adjustment Reason Code
 * (its `reasonCode`) and optionally one or more Remittance Advice Remark Codes
 * (remarks with code system `HE`), and it publishes the combinations it lists
 * for each of four CORE-defined business scenarios as the CORE Code
 * Combinations table. {@link checkCoreCodeCombination} answers whether one
 * adjustment's combination is in that table for a scenario the caller names.
 *
 * **The caller supplies the table and names its version.** No copy, excerpt or
 * default of the CORE Code Combinations table ships in this package: CAQH
 * CORE publishes it under its own notice and revises it several times a year,
 * so the version a posting system checks against is the posting system's own
 * choice, and the label it gives that version comes back beside every answer.
 *
 * **Three answers, and unevaluated is never permitted.** `in-table`,
 * `not-in-table` and `unevaluated` are three distinct values. `unevaluated`
 * means this check could not decide, and it names why; it is never a softer
 * form of `in-table`, so a gate written as "post unless not-in-table" is the
 * wrong gate.
 *
 * Pure: no I/O, no warning emitted, nothing read or written beyond the
 * arguments, and none of them mutated. It changes nothing `get835` decodes.
 */

import { wireLookup } from "../../parser/lookup.js";

import { invalidCombinationTable } from "./core-code-combination-errors.js";
import type { X12RemitAdjustment, X12RemitRemark } from "./types.js";

/**
 * Identifiers for the four CORE-defined business scenarios of CORE 360
 * Table 4.1.1-1, a closed set of four. The value is the scenario's number in
 * that table, so a table transcribed from a CAQH CORE publication maps its
 * scenario column onto these values one to one.
 *
 * - `ADDITIONAL_INFORMATION_DOCUMENTATION` (`"scenario-1"`) - additional
 *   information required: documentation missing, invalid or incomplete.
 * - `ADDITIONAL_INFORMATION_CLAIM_DATA` (`"scenario-2"`) - additional
 *   information required: data from the submitted claim missing, invalid or
 *   incomplete.
 * - `SERVICE_NOT_COVERED` (`"scenario-3"`) - the billed service is not
 *   covered by the health plan.
 * - `NOT_SEPARATELY_PAYABLE` (`"scenario-4"`) - the benefit for the billed
 *   service is not separately payable.
 *
 * Business scenarios a health plan defines for itself (CORE 360 permits them)
 * are not in this set, and a check naming one answers `unevaluated`.
 *
 * @example
 * ```ts
 * import { CORE_BUSINESS_SCENARIOS } from "@cosyte/x12";
 * CORE_BUSINESS_SCENARIOS.SERVICE_NOT_COVERED; // "scenario-3"
 * ```
 */
export const CORE_BUSINESS_SCENARIOS = {
  ADDITIONAL_INFORMATION_DOCUMENTATION: "scenario-1",
  ADDITIONAL_INFORMATION_CLAIM_DATA: "scenario-2",
  SERVICE_NOT_COVERED: "scenario-3",
  NOT_SEPARATELY_PAYABLE: "scenario-4",
} as const;

/**
 * One of the four CORE-defined business scenario identifiers in
 * {@link CORE_BUSINESS_SCENARIOS}.
 *
 * @example
 * ```ts
 * import type { CoreBusinessScenario } from "@cosyte/x12";
 * const scenario: CoreBusinessScenario = "scenario-4";
 * ```
 */
export type CoreBusinessScenario =
  (typeof CORE_BUSINESS_SCENARIOS)[keyof typeof CORE_BUSINESS_SCENARIOS];

/**
 * The three answers {@link checkCoreCodeCombination} gives.
 *
 * - `IN_TABLE` (`"in-table"`) - the table lists this group code and reason
 *   code for the scenario, and lists every supplied remark code with them.
 * - `NOT_IN_TABLE` (`"not-in-table"`) - the table has rows for the scenario,
 *   and the combination is not among them.
 * - `UNEVALUATED` (`"unevaluated"`) - the check could not decide. This is
 *   NOT permitted, and the result names the reason.
 *
 * @example
 * ```ts
 * import { CORE_CODE_COMBINATION_OUTCOMES, checkCoreCodeCombination } from "@cosyte/x12";
 * const result = checkCoreCodeCombination({ table, scenario, adjustment, remarks });
 * if (result.outcome !== CORE_CODE_COMBINATION_OUTCOMES.IN_TABLE) {
 *   // route to a human: not in the table, or not decidable
 * }
 * ```
 */
export const CORE_CODE_COMBINATION_OUTCOMES = {
  IN_TABLE: "in-table",
  NOT_IN_TABLE: "not-in-table",
  UNEVALUATED: "unevaluated",
} as const;

/**
 * String-literal union over {@link CORE_CODE_COMBINATION_OUTCOMES}.
 *
 * @example
 * ```ts
 * import type { CoreCodeCombinationOutcome } from "@cosyte/x12";
 * const outcome: CoreCodeCombinationOutcome = "unevaluated";
 * ```
 */
export type CoreCodeCombinationOutcome =
  (typeof CORE_CODE_COMBINATION_OUTCOMES)[keyof typeof CORE_CODE_COMBINATION_OUTCOMES];

/**
 * Why a check answered `unevaluated`. Each names what could not be judged and
 * none carries a value from the inputs.
 *
 * - `NO_TABLE` - no table was supplied.
 * - `UNKNOWN_SCENARIO` - the scenario named is not one of the four
 *   CORE-defined business scenarios.
 * - `NO_ROWS_FOR_SCENARIO` - the table has no row for the named scenario.
 * - `GROUP_CODE_UNREADABLE` - the adjustment's group code is empty or not a
 *   string.
 * - `REASON_CODE_UNREADABLE` - the adjustment's reason code is empty or not a
 *   string.
 * - `REMARK_NOT_RARC` - a supplied remark carries a code system other than
 *   `HE` (for example an `RX` reject reason read from LQ-01).
 * - `REMARK_UNREADABLE` - the remarks are not a list, or one of them is not an
 *   object or carries a code that is not a string.
 *
 * @example
 * ```ts
 * import { CORE_CODE_COMBINATION_UNEVALUATED_REASONS } from "@cosyte/x12";
 * CORE_CODE_COMBINATION_UNEVALUATED_REASONS.NO_TABLE; // "no-table"
 * ```
 */
export const CORE_CODE_COMBINATION_UNEVALUATED_REASONS = {
  NO_TABLE: "no-table",
  UNKNOWN_SCENARIO: "unknown-scenario",
  NO_ROWS_FOR_SCENARIO: "no-rows-for-scenario",
  GROUP_CODE_UNREADABLE: "group-code-unreadable",
  REASON_CODE_UNREADABLE: "reason-code-unreadable",
  REMARK_NOT_RARC: "remark-not-rarc",
  REMARK_UNREADABLE: "remark-unreadable",
} as const;

/**
 * String-literal union over {@link CORE_CODE_COMBINATION_UNEVALUATED_REASONS}.
 *
 * @example
 * ```ts
 * import type { CoreCodeCombinationUnevaluatedReason } from "@cosyte/x12";
 * const reason: CoreCodeCombinationUnevaluatedReason = "no-rows-for-scenario";
 * ```
 */
export type CoreCodeCombinationUnevaluatedReason =
  (typeof CORE_CODE_COMBINATION_UNEVALUATED_REASONS)[keyof typeof CORE_CODE_COMBINATION_UNEVALUATED_REASONS];

/**
 * One row of a {@link CoreCodeCombinationTable}: one scenario, one group
 * code, one reason code and at most one remark code. A row with no
 * `remarkCode` lists the group and reason pair alone; the table lists a pair
 * with several remark codes as several rows. Every code is compared exactly
 * as written here: no case folding and no trimming.
 *
 * @example
 * ```ts
 * import type { CoreCodeCombinationRow } from "@cosyte/x12";
 * const row: CoreCodeCombinationRow = {
 *   scenario: "scenario-3",
 *   groupCode: "CO",
 *   reasonCode: "ZZ901",
 *   remarkCode: "ZZ-R1",
 * };
 * ```
 */
export interface CoreCodeCombinationRow {
  readonly scenario: CoreBusinessScenario;
  /** The Claim Adjustment Group Code (CAS-01): a non-empty string. */
  readonly groupCode: string;
  /** The Claim Adjustment Reason Code: a non-empty string. */
  readonly reasonCode: string;
  /** One Remittance Advice Remark Code, or absent for the pair alone. */
  readonly remarkCode?: string | undefined;
}

/**
 * A combination table the CALLER supplies, typically transcribed from the
 * CORE Code Combinations version its posting system follows. `version` is a
 * label of the caller's own choosing (such as the published version it
 * transcribed) and comes back unchanged beside every answer given against
 * this table. A table with no version label is refused.
 *
 * @example
 * ```ts
 * import type { CoreCodeCombinationTable } from "@cosyte/x12";
 * const table: CoreCodeCombinationTable = {
 *   version: "my-transcription-2026-02",
 *   rows: [
 *     { scenario: "scenario-3", groupCode: "CO", reasonCode: "ZZ901" },
 *     { scenario: "scenario-3", groupCode: "CO", reasonCode: "ZZ901", remarkCode: "ZZ-R1" },
 *   ],
 * };
 * ```
 */
export interface CoreCodeCombinationTable {
  /** The caller's label for this table's version: a non-empty string. */
  readonly version: string;
  readonly rows: readonly CoreCodeCombinationRow[];
}

/**
 * The input to {@link checkCoreCodeCombination}. `adjustment` and `remarks`
 * take the decoded `X12RemitAdjustment` and `X12RemitRemark` as `get835`
 * returns them, or any object carrying the same fields.
 *
 * The 835 carries remarks per claim and per service line rather than per
 * adjustment, so which remarks accompany an adjustment is the caller's
 * choice; pass none to judge the group and reason pair alone.
 *
 * @example
 * ```ts
 * import type { CoreCodeCombinationQuery } from "@cosyte/x12";
 * const query: CoreCodeCombinationQuery = {
 *   table,
 *   scenario: "scenario-3",
 *   adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
 *   remarks: [{ system: "HE", code: "ZZ-R1" }],
 * };
 * ```
 */
export interface CoreCodeCombinationQuery {
  /** The caller's table. Absent means no table: the answer is `unevaluated`. */
  readonly table?: CoreCodeCombinationTable | undefined;
  readonly scenario: CoreBusinessScenario;
  readonly adjustment: Pick<X12RemitAdjustment, "groupCode" | "reasonCode">;
  /** The remarks that accompany the adjustment. Absent means none. */
  readonly remarks?: readonly Pick<X12RemitRemark, "system" | "code">[] | undefined;
}

/**
 * The answer from {@link checkCoreCodeCombination}. Switch on `outcome`.
 * `tableVersion` is the supplied table's `version`, exactly as supplied; it
 * is `undefined` only when no table was supplied. An `unevaluated` answer
 * also names its `reason`.
 *
 * @example
 * ```ts
 * import type { CoreCodeCombinationResult } from "@cosyte/x12";
 * declare const result: CoreCodeCombinationResult;
 * switch (result.outcome) {
 *   case "in-table":
 *     result.tableVersion; // the label you supplied
 *     break;
 *   case "not-in-table":
 *     break;
 *   case "unevaluated":
 *     result.reason; // e.g. "no-table"
 *     break;
 * }
 * ```
 */
export type CoreCodeCombinationResult =
  | {
      readonly outcome: typeof CORE_CODE_COMBINATION_OUTCOMES.IN_TABLE;
      readonly tableVersion: string;
    }
  | {
      readonly outcome: typeof CORE_CODE_COMBINATION_OUTCOMES.NOT_IN_TABLE;
      readonly tableVersion: string;
    }
  | {
      readonly outcome: typeof CORE_CODE_COMBINATION_OUTCOMES.UNEVALUATED;
      readonly reason: CoreCodeCombinationUnevaluatedReason;
      readonly tableVersion: string | undefined;
    };

/**
 * The four scenario identifiers as a null-prototype set. A scenario arrives
 * from the caller, possibly from untyped JavaScript, so membership is read
 * with `Object.hasOwn` on a table with no prototype: a scenario named after an
 * own property of `Object.prototype` is not a member.
 */
const KNOWN_SCENARIOS: Readonly<Record<string, true>> = wireLookup(
  Object.fromEntries(Object.values(CORE_BUSINESS_SCENARIOS).map((s) => [s, true] as const)),
);

/** The code system of a Remittance Advice Remark Code on an 835 remark. */
const RARC_CODE_SYSTEM = "HE";

/**
 * Whether `value` is one of the four scenario identifiers.
 *
 * @param value - Anything the caller passed as a scenario.
 * @returns `true` only for a member of {@link CORE_BUSINESS_SCENARIOS}.
 */
function isCoreBusinessScenario(value: unknown): value is CoreBusinessScenario {
  return typeof value === "string" && Object.hasOwn(KNOWN_SCENARIOS, value);
}

/**
 * Whether `value` is an object whose properties can be read.
 *
 * @param value - Anything.
 * @returns `true` for a non-null object.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

/**
 * A library-owned phrase for a value that should have been a non-empty
 * string. Names the JavaScript type only, never the value.
 *
 * @param value - The value that was found.
 * @returns The phrase for the refusal message.
 */
function nonEmptyStringProblem(value: unknown): string {
  if (value === undefined) return "is missing";
  if (value === "") return "is an empty string";
  return `must be a string (found ${value === null ? "null" : typeof value})`;
}

/** What one pass over the table found for the query. */
interface TableScan {
  /** The table has at least one row for the named scenario. */
  readonly scenarioHasRows: boolean;
  /** The table has a row for the named scenario, group code and reason code. */
  readonly pairListed: boolean;
  /** Every remark code the rows for that scenario, group and reason list. */
  readonly remarkCodes: Readonly<Record<string, true>>;
}

/**
 * Validate the whole table and, in the same pass, collect what the rows say
 * about one scenario, group code and reason code. Every row is validated,
 * whether or not it bears on the query, so a malformed table is refused
 * however it is asked.
 *
 * @param table - The caller's table, not yet trusted.
 * @param scenario - The scenario to collect for, or `undefined` for none.
 * @param groupCode - The group code to collect for, or `undefined` for none.
 * @param reasonCode - The reason code to collect for, or `undefined` for none.
 * @returns The table's version label and what its rows say.
 * @throws {CoreCodeCombinationTableError} When the table is malformed.
 */
function scanTable(
  table: unknown,
  scenario: CoreBusinessScenario | undefined,
  groupCode: string | undefined,
  reasonCode: string | undefined,
): { readonly version: string; readonly scan: TableScan } {
  if (!isRecord(table)) {
    throw invalidCombinationTable("table", undefined, "must be an object");
  }
  const version = table["version"];
  if (typeof version !== "string" || version === "") {
    throw invalidCombinationTable("version", undefined, nonEmptyStringProblem(version));
  }
  const rows = table["rows"];
  if (!Array.isArray(rows)) {
    throw invalidCombinationTable("rows", undefined, "must be an array");
  }

  let scenarioHasRows = false;
  let pairListed = false;
  // Keyed by remark codes the caller wrote, so it has no prototype and is read
  // with `Object.hasOwn`: a code named after an own property of
  // `Object.prototype` is listed only when a row lists it.
  // `Object.create(null)` is typed `any`; the assertion names the one shape
  // this module writes into it.
  const remarkCodes = Object.create(null) as Record<string, true>;

  for (const [index, row] of rows.entries()) {
    if (!isRecord(row)) {
      throw invalidCombinationTable("row", index, "must be an object");
    }
    const rowScenario = row["scenario"];
    if (!isCoreBusinessScenario(rowScenario)) {
      throw invalidCombinationTable(
        "scenario",
        index,
        "must be one of the four CORE-defined business scenario identifiers",
      );
    }
    const rowGroup = row["groupCode"];
    if (typeof rowGroup !== "string" || rowGroup === "") {
      throw invalidCombinationTable("groupCode", index, nonEmptyStringProblem(rowGroup));
    }
    const rowReason = row["reasonCode"];
    if (typeof rowReason !== "string" || rowReason === "") {
      throw invalidCombinationTable("reasonCode", index, nonEmptyStringProblem(rowReason));
    }
    const rowRemark = row["remarkCode"];
    if (rowRemark !== undefined && typeof rowRemark !== "string") {
      throw invalidCombinationTable(
        "remarkCode",
        index,
        `must be a string when present (found ${rowRemark === null ? "null" : typeof rowRemark})`,
      );
    }

    if (rowScenario !== scenario) continue;
    scenarioHasRows = true;
    if (rowGroup !== groupCode || rowReason !== reasonCode) continue;
    pairListed = true;
    if (rowRemark !== undefined) remarkCodes[rowRemark] = true;
  }

  return { version, scan: { scenarioHasRows, pairListed, remarkCodes } };
}

/**
 * Read the supplied remarks into their codes, or name why they cannot be
 * judged.
 *
 * @param remarks - The caller's remarks, not yet trusted.
 * @returns The remark codes, or the reason the combination is unevaluated.
 */
function readRemarkCodes(
  remarks: unknown,
):
  | { readonly readable: true; readonly codes: readonly string[] }
  | { readonly readable: false; readonly reason: CoreCodeCombinationUnevaluatedReason } {
  const unreadable = {
    readable: false,
    reason: CORE_CODE_COMBINATION_UNEVALUATED_REASONS.REMARK_UNREADABLE,
  } as const;
  if (remarks === undefined) return { readable: true, codes: [] };
  if (!Array.isArray(remarks)) return unreadable;
  const codes: string[] = [];
  for (const remark of remarks) {
    if (!isRecord(remark)) return unreadable;
    if (remark["system"] !== RARC_CODE_SYSTEM) {
      return { readable: false, reason: CORE_CODE_COMBINATION_UNEVALUATED_REASONS.REMARK_NOT_RARC };
    }
    const code = remark["code"];
    if (typeof code !== "string") return unreadable;
    codes.push(code);
  }
  return { readable: true, codes };
}

/**
 * The adjustment's group and reason codes, where each is a non-empty string.
 *
 * @param adjustment - The caller's adjustment, not yet trusted.
 * @returns Each code, or `undefined` where it cannot be read.
 */
function readAdjustmentCodes(adjustment: unknown): {
  readonly groupCode: string | undefined;
  readonly reasonCode: string | undefined;
} {
  if (!isRecord(adjustment)) return { groupCode: undefined, reasonCode: undefined };
  const group = adjustment["groupCode"];
  const reason = adjustment["reasonCode"];
  return {
    groupCode: typeof group === "string" && group !== "" ? group : undefined,
    reasonCode: typeof reason === "string" && reason !== "" ? reason : undefined,
  };
}

/**
 * The `unevaluated` answer, frozen.
 *
 * @param reason - Why the check could not decide.
 * @param tableVersion - The supplied table's label, or `undefined` for no table.
 * @returns The result.
 */
function unevaluated(
  reason: CoreCodeCombinationUnevaluatedReason,
  tableVersion: string | undefined,
): CoreCodeCombinationResult {
  return Object.freeze({
    outcome: CORE_CODE_COMBINATION_OUTCOMES.UNEVALUATED,
    reason,
    tableVersion,
  });
}

/**
 * Answer whether one 835 adjustment's group code, reason code and
 * accompanying remark codes are a combination the caller's CORE Code
 * Combinations table lists for a named CORE-defined business scenario.
 *
 * - **`in-table`** when the table has a row for that scenario with that group
 *   code and that reason code, and every supplied remark code appears in some
 *   row for that same scenario, group code and reason code. With no remarks,
 *   the pair's own row suffices. A permitted pair does not license an
 *   arbitrary remark.
 * - **`not-in-table`** when the table has rows for the scenario and the
 *   combination is not among them, including a combination the table lists
 *   only under a different scenario.
 * - **`unevaluated`**, with a `reason`, when there is no table, the scenario
 *   is not one of the four, the table has no row for the scenario, the group
 *   code or reason code is empty, or a remark is not an `HE` remark code.
 *   **Never read `unevaluated` as permitted.**
 *
 * Codes are matched exactly as supplied: no case folding and no trimming, so
 * `co` and `CO ` are not `CO`. The table's `version` comes back beside every
 * answer given against it, exactly as supplied. Nothing supplied is mutated.
 *
 * What it does not do: decide which scenario an adjustment belongs to, walk a
 * whole remittance, bind a remark to an adjustment, say which remark code
 * failed, check a code's effective dates, or evaluate a scenario a health
 * plan defines for itself. No CORE table ships with this package.
 *
 * @param query - The table, the scenario, the adjustment and its remarks.
 * @returns The answer, with the table's version label.
 * @throws {CoreCodeCombinationTableError} When a supplied table is malformed
 *   (`X12_CORE_COMBINATION_TABLE_INVALID`). The message names the field and
 *   row index only, never a value from the table.
 *
 * @example
 * ```ts
 * import { checkCoreCodeCombination, CORE_BUSINESS_SCENARIOS } from "@cosyte/x12";
 * const table = {
 *   version: "my-transcription-2026-02",
 *   rows: [{ scenario: "scenario-3", groupCode: "CO", reasonCode: "ZZ901" }] as const,
 * };
 * checkCoreCodeCombination({
 *   table,
 *   scenario: CORE_BUSINESS_SCENARIOS.SERVICE_NOT_COVERED,
 *   adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
 * });
 * // { outcome: "in-table", tableVersion: "my-transcription-2026-02" }
 * checkCoreCodeCombination({
 *   scenario: CORE_BUSINESS_SCENARIOS.SERVICE_NOT_COVERED,
 *   adjustment: { groupCode: "CO", reasonCode: "ZZ901" },
 * });
 * // { outcome: "unevaluated", reason: "no-table", tableVersion: undefined }
 * ```
 */
export function checkCoreCodeCombination(
  query: CoreCodeCombinationQuery,
): CoreCodeCombinationResult {
  // Read defensively: a caller in untyped JavaScript can pass anything here,
  // and every route out of this function either answers or refuses the table.
  const input: Readonly<Record<string, unknown>> = isRecord(query) ? query : {};
  const table = input["table"];
  if (table === undefined || table === null) {
    return unevaluated(CORE_CODE_COMBINATION_UNEVALUATED_REASONS.NO_TABLE, undefined);
  }

  const scenario = input["scenario"];
  const known = isCoreBusinessScenario(scenario) ? scenario : undefined;
  const { groupCode, reasonCode } = readAdjustmentCodes(input["adjustment"]);
  const { version, scan } = scanTable(table, known, groupCode, reasonCode);

  if (known === undefined) {
    return unevaluated(CORE_CODE_COMBINATION_UNEVALUATED_REASONS.UNKNOWN_SCENARIO, version);
  }
  if (!scan.scenarioHasRows) {
    return unevaluated(CORE_CODE_COMBINATION_UNEVALUATED_REASONS.NO_ROWS_FOR_SCENARIO, version);
  }
  if (groupCode === undefined) {
    return unevaluated(CORE_CODE_COMBINATION_UNEVALUATED_REASONS.GROUP_CODE_UNREADABLE, version);
  }
  if (reasonCode === undefined) {
    return unevaluated(CORE_CODE_COMBINATION_UNEVALUATED_REASONS.REASON_CODE_UNREADABLE, version);
  }
  const remarks = readRemarkCodes(input["remarks"]);
  if (!remarks.readable) return unevaluated(remarks.reason, version);

  const listed =
    scan.pairListed && remarks.codes.every((code) => Object.hasOwn(scan.remarkCodes, code));
  return Object.freeze({
    outcome: listed
      ? CORE_CODE_COMBINATION_OUTCOMES.IN_TABLE
      : CORE_CODE_COMBINATION_OUTCOMES.NOT_IN_TABLE,
    tableVersion: version,
  });
}
