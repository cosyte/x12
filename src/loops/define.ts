/**
 * Public `defineLoopSpec()` factory for the `@cosyte/x12` loop surface.
 * Returns a frozen {@link LoopSpec} after structural validation - no
 * runtime walker (Phase 3+ owns walking). The DOGFOODING gate: every
 * built-in transaction loop spec shipped in Phases 3+ is authored through
 * this same public API consumers use for payer-specific loops, so a
 * regression in the public surface is impossible to hide.
 *
 * Validation is strictly structural at this phase:
 *
 * - `id` and `trigger` are non-empty strings.
 * - `trigger` segment id passes the same `[A-Z][A-Z0-9]{1,2}` shape used
 *   by every X12 segment name (a TR3-valid id is 2-3 uppercase letters /
 *   digits, leading letter). This catches typos like `"clm"` (lowercase)
 *   or `"CL"` (too short for the 3-letter HL group identifier).
 * - `segments` contains at least one entry and its first entry's id MUST
 *   equal `trigger` (the trigger segment opens its own loop body).
 * - Every segment id passes the same shape check.
 * - `children` defaults to `[]`. Each child is itself a `LoopSpec`
 *   (`defineLoopSpec` may be called recursively to build a tree before
 *   passing children into the parent's call).
 *
 * Invalid input throws {@link LoopSpecDefinitionError} (a typed Error
 * subclass) so consumer bugs surface at definition time, not at walk
 * time. The parser is **lenient on parse** but **strict on consumer-
 * authored specs** - bad spec data is a programming error, not a
 * transmission deviation.
 */

import type { LoopSegmentSpec, LoopSpec } from "./types.js";

/**
 * Permissible shape for an X12 segment id. Most segments are 2-3 chars,
 * starting with a letter, remaining chars uppercase letter or digit (the
 * TR3 grammar). Accepts 2 chars (NM, HL, HI, etc.) AND 3 chars (NM1, CLM,
 * BHT, etc.) - the X12 spec permits both lengths.
 *
 * @internal
 */
const SEGMENT_ID_RE = /^[A-Z][A-Z0-9]{1,2}$/u;

/**
 * Thrown by {@link defineLoopSpec} when the supplied spec is structurally
 * invalid. Carries the offending path so a consumer fixing a typo doesn't
 * have to hunt: e.g. `"segments[3].id"` or `"children[0].trigger"`.
 *
 * @example
 * ```ts
 * import { defineLoopSpec, LoopSpecDefinitionError } from "@cosyte/x12";
 * try {
 *   defineLoopSpec({
 *     id: "2300",
 *     trigger: "clm",
 *     segments: [{ id: "clm", usage: "required", max: 1 }],
 *   });
 * } catch (err) {
 *   if (err instanceof LoopSpecDefinitionError) {
 *     // err.path === "trigger"
 *   }
 * }
 * ```
 */
export class LoopSpecDefinitionError extends Error {
  public readonly path: string;
  /**
   * Construct a new `LoopSpecDefinitionError` with the offending path.
   *
   * @internal
   */
  public constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "LoopSpecDefinitionError";
    this.path = path;
  }
}

/**
 * Input shape accepted by `defineLoopSpec`. `children` is optional;
 * `LoopSpec.children` always materializes as a frozen `[]` when omitted
 * so consumer code can iterate without an `?? []` guard.
 *
 * @example
 * ```ts
 * import type { DefineLoopSpecInput } from "@cosyte/x12";
 * const input: DefineLoopSpecInput = {
 *   id: "2110",
 *   trigger: "SVC",
 *   segments: [{ id: "SVC", usage: "required", max: 1 }],
 * };
 * ```
 */
export interface DefineLoopSpecInput {
  readonly id: string;
  readonly trigger: string;
  readonly description?: string;
  readonly segments: readonly LoopSegmentSpec[];
  readonly children?: readonly LoopSpec[];
}

/**
 * Define a TR3 loop specification. Validates structurally, freezes the
 * resulting {@link LoopSpec} (along with its `segments` and `children`
 * arrays), and returns it. Pure - no I/O, no global state.
 *
 * @example
 * ```ts
 * import { defineLoopSpec } from "@cosyte/x12";
 * const Loop2110 = defineLoopSpec({
 *   id: "2110",
 *   description: "835 Service Payment Information",
 *   trigger: "SVC",
 *   segments: [
 *     { id: "SVC", usage: "required",  max: 1 },
 *     { id: "DTM", usage: "situational", max: ">1" },
 *     { id: "CAS", usage: "situational", max: ">1" },
 *     { id: "REF", usage: "situational", max: ">1" },
 *     { id: "AMT", usage: "situational", max: ">1" },
 *     { id: "LQ",  usage: "situational", max: ">1" },
 *   ],
 * });
 * Loop2110.trigger; // "SVC"
 * ```
 */
export function defineLoopSpec(input: DefineLoopSpecInput): LoopSpec {
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new LoopSpecDefinitionError("id", "loop id must be a non-empty string");
  }
  if (typeof input.trigger !== "string" || !SEGMENT_ID_RE.test(input.trigger)) {
    throw new LoopSpecDefinitionError(
      "trigger",
      `trigger "${input.trigger}" must match /^[A-Z][A-Z0-9]{1,2}$/`,
    );
  }
  if (input.segments.length === 0) {
    throw new LoopSpecDefinitionError(
      "segments",
      "loop must declare at least one segment (the trigger)",
    );
  }
  const firstId = input.segments[0]?.id;
  if (firstId !== input.trigger) {
    throw new LoopSpecDefinitionError(
      "segments[0].id",
      `first segment "${String(firstId)}" must equal trigger "${input.trigger}"`,
    );
  }
  const frozenSegments: LoopSegmentSpec[] = [];
  for (let i = 0; i < input.segments.length; i += 1) {
    const s = input.segments[i];
    if (s === undefined) continue;
    if (!SEGMENT_ID_RE.test(s.id)) {
      throw new LoopSpecDefinitionError(
        `segments[${String(i)}].id`,
        `segment id "${s.id}" must match /^[A-Z][A-Z0-9]{1,2}$/`,
      );
    }
    if (s.usage !== "required" && s.usage !== "situational" && s.usage !== "optional") {
      throw new LoopSpecDefinitionError(
        `segments[${String(i)}].usage`,
        `usage "${String(s.usage)}" must be one of "required"|"situational"|"optional"`,
      );
    }
    if (s.max !== ">1" && (typeof s.max !== "number" || s.max < 1 || !Number.isInteger(s.max))) {
      throw new LoopSpecDefinitionError(
        `segments[${String(i)}].max`,
        `max "${String(s.max)}" must be a positive integer or ">1"`,
      );
    }
    const seg: LoopSegmentSpec = Object.freeze({
      id: s.id,
      usage: s.usage,
      max: s.max,
      ...(s.position !== undefined ? { position: s.position } : {}),
      ...(s.description !== undefined ? { description: s.description } : {}),
    });
    frozenSegments.push(seg);
  }
  const children = Object.freeze((input.children ?? []).slice());
  const out: LoopSpec = Object.freeze({
    id: input.id,
    trigger: input.trigger,
    segments: Object.freeze(frozenSegments),
    children,
    ...(input.description !== undefined ? { description: input.description } : {}),
  });
  return out;
}
