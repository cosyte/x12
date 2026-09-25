/**
 * The typed refusal raised by {@link "./core-code-combinations.js".checkCoreCodeCombination}
 * when the combination table the caller supplied cannot be read.
 *
 * Why a throw rather than a fourth answer. The check already answers
 * `unevaluated` for facts about the ADJUSTMENT it cannot judge (an unknown
 * scenario, an empty code, a remark from another code system). A table that
 * cannot be read is a different thing: it is the caller's own configuration,
 * and answering against it would be a confident answer from a table nobody can
 * vouch for. A refusal keeps that bug at the call site that owns it.
 *
 * The message carries a structural locator only: the name of the offending
 * field, the index of the offending row, and the JavaScript type of what was
 * found. It never renders a value the table holds, because a table is caller
 * data and a message is the surface that reaches a log.
 */

/**
 * Stable string codes for every {@link CoreCodeCombinationTableError}. Locked
 * here so consumers can narrow on `err.code` exhaustively; additions-only
 * thereafter (renaming any code is a breaking change).
 *
 * - `X12_CORE_COMBINATION_TABLE_INVALID` - the supplied combination table is
 *   malformed: its version label is missing, not a string or empty; its rows
 *   are not an array; a row is not an object; a row names a scenario outside
 *   the four CORE-defined business scenarios; a row's group code or reason
 *   code is missing, not a string or empty; or a row's remark code is present
 *   and not a string.
 *
 * @example
 * ```ts
 * import {
 *   CORE_CODE_COMBINATION_ERROR_CODES,
 *   CoreCodeCombinationTableError,
 *   checkCoreCodeCombination,
 * } from "@cosyte/x12";
 * try {
 *   checkCoreCodeCombination({ table, scenario, adjustment });
 * } catch (err) {
 *   if (
 *     err instanceof CoreCodeCombinationTableError &&
 *     err.code === CORE_CODE_COMBINATION_ERROR_CODES.X12_CORE_COMBINATION_TABLE_INVALID
 *   ) {
 *     // configuration bug: fix the table you load, do not post against it
 *   }
 * }
 * ```
 */
export const CORE_CODE_COMBINATION_ERROR_CODES = {
  X12_CORE_COMBINATION_TABLE_INVALID: "X12_CORE_COMBINATION_TABLE_INVALID",
} as const;

/**
 * String-literal union over {@link CORE_CODE_COMBINATION_ERROR_CODES}. Used as
 * {@link CoreCodeCombinationTableError}.`code`.
 *
 * @example
 * ```ts
 * import type { CoreCodeCombinationErrorCode } from "@cosyte/x12";
 * const code: CoreCodeCombinationErrorCode = "X12_CORE_COMBINATION_TABLE_INVALID";
 * ```
 */
export type CoreCodeCombinationErrorCode =
  (typeof CORE_CODE_COMBINATION_ERROR_CODES)[keyof typeof CORE_CODE_COMBINATION_ERROR_CODES];

/**
 * Which part of a combination table a {@link CoreCodeCombinationTableError}
 * refused. `table` is the argument itself (not an object), `version` its
 * label, `rows` its row list, `row` one entry of that list (not an object),
 * and the last four are fields of one row.
 *
 * @example
 * ```ts
 * import type { CoreCodeCombinationTableField } from "@cosyte/x12";
 * const field: CoreCodeCombinationTableField = "reasonCode";
 * ```
 */
export type CoreCodeCombinationTableField =
  | "table"
  | "version"
  | "rows"
  | "row"
  | "scenario"
  | "groupCode"
  | "reasonCode"
  | "remarkCode";

/**
 * Thrown by {@link "./core-code-combinations.js".checkCoreCodeCombination} when
 * the supplied combination table is malformed. Carries a stable `code` for
 * programmatic narrowing, the `field` it refused and, for a row-level fault,
 * the zero-based `rowIndex`. Unlike {@link "../../code-lists/errors.js".X12CodeListError}
 * it carries no rendering of the refused value, on `message` or anywhere else.
 *
 * Deliberately does NOT extend `X12ParseError` or `X12BuildError`: nothing here
 * parses a document or builds one, and the three stay tellable apart at the
 * type level.
 *
 * @example
 * ```ts
 * import { CoreCodeCombinationTableError, checkCoreCodeCombination } from "@cosyte/x12";
 * try {
 *   checkCoreCodeCombination({ table, scenario, adjustment });
 * } catch (err) {
 *   if (err instanceof CoreCodeCombinationTableError) {
 *     err.field; // e.g. "groupCode"
 *     err.rowIndex; // e.g. 3, or undefined for a table-level fault
 *   }
 * }
 * ```
 */
export class CoreCodeCombinationTableError extends Error {
  public readonly code: CoreCodeCombinationErrorCode;

  /** The part of the table that was refused. */
  public readonly field: CoreCodeCombinationTableField;

  /**
   * Zero-based index into `table.rows` of the refused row, or `undefined` when
   * the fault is in the table itself rather than in one row.
   */
  public readonly rowIndex: number | undefined;

  /** @internal */
  public constructor(
    code: CoreCodeCombinationErrorCode,
    message: string,
    field: CoreCodeCombinationTableField,
    rowIndex: number | undefined,
  ) {
    super(message);
    this.name = "CoreCodeCombinationTableError";
    this.code = code;
    this.field = field;
    this.rowIndex = rowIndex;
  }
}

/**
 * Build the refusal for a malformed table. The single construction site for
 * {@link CoreCodeCombinationTableError}, so the message can only ever be built
 * from the library-owned field name, the row index this module counted, and a
 * library-owned description of what was wrong.
 *
 * @param field - The refused part of the table.
 * @param rowIndex - The refused row's index, or `undefined` for a table-level fault.
 * @param problem - A library-owned phrase naming what was wrong (never a caller value).
 * @internal
 */
export function invalidCombinationTable(
  field: CoreCodeCombinationTableField,
  rowIndex: number | undefined,
  problem: string,
): CoreCodeCombinationTableError {
  const where = rowIndex === undefined ? "" : ` at row index ${String(rowIndex)}`;
  return new CoreCodeCombinationTableError(
    CORE_CODE_COMBINATION_ERROR_CODES.X12_CORE_COMBINATION_TABLE_INVALID,
    `CORE code combination table is malformed: ${field}${where} ${problem}.`,
    field,
    rowIndex,
  );
}
