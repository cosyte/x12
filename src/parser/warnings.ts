/**
 * Tier-2 warning registry and factories for the `@cosyte/x12` parser
 * pipeline. Consumers compare `warning.code === WARNING_CODES.<CODE>` to
 * narrow and react; the parser uses the factories here to construct every
 * warning it emits so messages, payload shape, and positional context stay
 * consistent across stages.
 *
 * The Phase 1 set is intentionally small (8 codes) — every additional code
 * is a public-surface addition that needs a snapshot bump
 * (see `test/warning-codes.snapshot.test.ts`). Phase 2+ extends, never
 * renames.
 *
 * Warning messages NEVER echo field VALUES (matches the hl7 H-PHI invariant
 * locked in 2026-06). They carry positional context plus bounded metadata
 * (e.g. counts, expected-vs-actual control numbers) — never the raw bytes
 * the warning describes. The `snippet` on a fatal {@link
 * "./errors.js".X12ParseError} is the documented consumer-redaction
 * boundary; warnings have no snippet.
 */

import type { X12Position } from "./types.js";

/**
 * Stable string codes for every Tier-2 warning the parser may emit. The
 * registry is frozen via `as const` so TypeScript infers the exact string
 * literal union for {@link X12WarningCode} — zero runtime cost, no magic-
 * string comparisons for consumers.
 *
 * @example
 * ```ts
 * import { parseX12, WARNING_CODES } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * if (ix.warnings.some((w) => w.code === WARNING_CODES.X12_PRE_005010)) {
 *   // sender is on a pre-005010 version family
 * }
 * ```
 */
export const WARNING_CODES = {
  X12_CONTROL_NUMBER_MISMATCH: "X12_CONTROL_NUMBER_MISMATCH",
  X12_PRE_005010: "X12_PRE_005010",
  X12_GROUP_COUNT_MISMATCH: "X12_GROUP_COUNT_MISMATCH",
  X12_TRANSACTION_COUNT_MISMATCH: "X12_TRANSACTION_COUNT_MISMATCH",
  X12_TRAILING_GARBAGE: "X12_TRAILING_GARBAGE",
  X12_MISSING_IEA: "X12_MISSING_IEA",
  X12_MISSING_GE: "X12_MISSING_GE",
  X12_MISSING_SE: "X12_MISSING_SE",
} as const;

/**
 * Discriminant type for `X12ParseWarning.code`. Narrowing a warning by this
 * code lets consumers write exhaustive `switch` blocks and guarantees a
 * typo-free comparison against the `WARNING_CODES` registry.
 *
 * @example
 * ```ts
 * import type { X12ParseWarning, X12WarningCode } from "@cosyte/x12";
 * function describe(w: X12ParseWarning): string {
 *   const code: X12WarningCode = w.code;
 *   switch (code) {
 *     case "X12_PRE_005010":
 *       return "pre-005010 sender";
 *     default:
 *       return `warning: ${code}`;
 *   }
 * }
 * ```
 */
export type X12WarningCode = (typeof WARNING_CODES)[keyof typeof WARNING_CODES];

/**
 * Data shape for every Tier-2 warning emitted by the parser. Warnings are
 * plain data (distinct from `X12ParseError`, which is a thrown `Error`
 * subclass) so they can be safely accumulated on `X12Interchange.warnings`
 * and passed to `onWarning` callbacks.
 *
 * @example
 * ```ts
 * import type { X12ParseWarning } from "@cosyte/x12";
 * const w: X12ParseWarning = {
 *   code: "X12_PRE_005010",
 *   message: "ISA-12 declares pre-005010 version.",
 *   position: { segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 },
 * };
 * ```
 */
export interface X12ParseWarning {
  readonly code: X12WarningCode;
  readonly message: string;
  readonly position: X12Position;
}

/**
 * Build an `X12_CONTROL_NUMBER_MISMATCH` warning. Emitted when an
 * envelope-trailer control number does not match its matching header —
 * ISA-13 ↔ IEA-02, GS-06 ↔ GE-02, or ST-02 ↔ SE-02. Message carries the
 * field pair label and the expected-vs-actual values bounded to the 9-char
 * (interchange) / variable (group/transaction) numeric forms — these are
 * control numbers, not PHI.
 *
 * @example
 * ```ts
 * import { controlNumberMismatch } from "@cosyte/x12";
 * const w = controlNumberMismatch(
 *   { segmentIndex: 1, interchangeIndex: 0, elementIndex: 2 },
 *   "ISA-13/IEA-02",
 *   "000000001",
 *   "000000002",
 * );
 * ```
 */
export function controlNumberMismatch(
  position: X12Position,
  pair: string,
  header: string,
  trailer: string,
): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
    message: `Control number mismatch (${pair}): header="${header}", trailer="${trailer}".`,
    position,
  };
}

/**
 * Build an `X12_PRE_005010` warning. Emitted when ISA-12 declares a version
 * earlier than `00501` — the HIPAA-mandated baseline. The parser still
 * accepts the input (Postel's Law: lenient on parse) but flags the
 * mismatch so consumers know the input may diverge from 005010 semantics.
 *
 * @example
 * ```ts
 * import { pre005010 } from "@cosyte/x12";
 * const w = pre005010({ segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 }, "00401");
 * ```
 */
export function pre005010(position: X12Position, declared: string): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_PRE_005010,
    message: `ISA-12 declares version "${declared}", not the HIPAA baseline "00501".`,
    position,
  };
}

/**
 * Build an `X12_GROUP_COUNT_MISMATCH` warning. Emitted when IEA-01 does not
 * equal the actual number of GS..GE groups present in the interchange.
 * Trading partners use this to detect transmission truncation; the parser
 * surfaces both values verbatim and never silently corrects them.
 *
 * @example
 * ```ts
 * import { groupCountMismatch } from "@cosyte/x12";
 * const w = groupCountMismatch(
 *   { segmentIndex: 5, interchangeIndex: 0, elementIndex: 1 },
 *   "2",
 *   1,
 * );
 * ```
 */
export function groupCountMismatch(
  position: X12Position,
  declared: string,
  actual: number,
): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
    message: `IEA-01 declares ${declared} group(s); ${String(actual)} were present.`,
    position,
  };
}

/**
 * Build an `X12_TRANSACTION_COUNT_MISMATCH` warning. Emitted when GE-01
 * does not equal the actual number of ST..SE transaction sets present in
 * the group. As with group counts, the parser surfaces both values
 * verbatim and never silently corrects them.
 *
 * @example
 * ```ts
 * import { transactionCountMismatch } from "@cosyte/x12";
 * const w = transactionCountMismatch(
 *   { segmentIndex: 4, interchangeIndex: 0, groupIndex: 0, elementIndex: 1 },
 *   "3",
 *   2,
 * );
 * ```
 */
export function transactionCountMismatch(
  position: X12Position,
  declared: string,
  actual: number,
): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_TRANSACTION_COUNT_MISMATCH,
    message: `GE-01 declares ${declared} transaction(s); ${String(actual)} were present.`,
    position,
  };
}

/**
 * Build an `X12_TRAILING_GARBAGE` warning. Emitted when non-empty bytes
 * appear after the IEA segment terminator and any optional CRLF. The bytes
 * are preserved verbatim on {@link
 * "./types.js".X12Interchange}.`trailingBytes` so consumers can inspect or
 * re-emit them. Common cause: a second interchange concatenated into the
 * same file (multi-ISA — out of v1 scope; only the first interchange is
 * decoded).
 *
 * @example
 * ```ts
 * import { trailingGarbage } from "@cosyte/x12";
 * const w = trailingGarbage(
 *   { segmentIndex: 6, interchangeIndex: 0 },
 *   42,
 * );
 * ```
 */
export function trailingGarbage(position: X12Position, byteCount: number): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_TRAILING_GARBAGE,
    message: `${String(byteCount)} byte(s) followed the IEA terminator — preserved verbatim on \`trailingBytes\`.`,
    position,
  };
}

/**
 * Build an `X12_MISSING_IEA` warning. Emitted when the input opened a
 * valid ISA but EOF arrived before any IEA segment. The parser returns the
 * groups it managed to decode with `iea: undefined`; the warning surfaces
 * the structural break so consumers know the interchange is truncated.
 *
 * @example
 * ```ts
 * import { missingIea } from "@cosyte/x12";
 * const w = missingIea({ segmentIndex: 4, interchangeIndex: 0 });
 * ```
 */
export function missingIea(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_MISSING_IEA,
    message: "Interchange has no IEA trailer — input is truncated.",
    position,
  };
}

/**
 * Build an `X12_MISSING_GE` warning. Emitted when a GS opened a functional
 * group but no matching GE appeared before the next GS or IEA. The parser
 * returns the group with `ge: undefined` and the transactions it managed
 * to collect.
 *
 * @example
 * ```ts
 * import { missingGe } from "@cosyte/x12";
 * const w = missingGe({ segmentIndex: 3, interchangeIndex: 0, groupIndex: 0 });
 * ```
 */
export function missingGe(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_MISSING_GE,
    message: "Functional group has no GE trailer — group is truncated.",
    position,
  };
}

/**
 * Build an `X12_MISSING_SE` warning. Emitted when an ST opened a
 * transaction set but no matching SE appeared before the next ST, GE, or
 * IEA. The parser returns the transaction with `se: undefined` and the
 * segments it managed to collect.
 *
 * @example
 * ```ts
 * import { missingSe } from "@cosyte/x12";
 * const w = missingSe({
 *   segmentIndex: 2,
 *   interchangeIndex: 0,
 *   groupIndex: 0,
 *   transactionIndex: 0,
 * });
 * ```
 */
export function missingSe(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_MISSING_SE,
    message: "Transaction set has no SE trailer — transaction is truncated.",
    position,
  };
}
