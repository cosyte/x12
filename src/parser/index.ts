/**
 * Public entry point for the `@cosyte/x12` parser — composes the Phase 1
 * delimiter-detection + envelope-decode stages and routes every Tier-2
 * warning through a single emission chokepoint. The four Tier-3 fatal codes
 * (`X12_EMPTY_INPUT`, `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`,
 * `X12_INVALID_DELIMITERS`) are thrown even in lenient mode; every other
 * recoverable deviation is a warning unless `{ strict: true }` is passed.
 *
 * Pipeline order: Buffer decode (latin1, byte-1:1) → EMPTY_INPUT check →
 * detectDelimiters (Tier-3 only) → decodeEnvelope (lenient) → emit
 * warnings (with optional strict-mode escalation) → return X12Interchange.
 */

import type { Buffer } from "node:buffer";

import { detectDelimiters } from "./delimiters.js";
import { FATAL_CODES, X12ParseError, snippet } from "./errors.js";
import { decodeEnvelope } from "./envelope.js";
import type { X12Interchange, X12ParseOptions } from "./types.js";

/**
 * Parse a raw X12 healthcare interchange (string or `Buffer`) into an
 * {@link X12Interchange}. The parser is lenient by default: recoverable
 * deviations from 005010 are reported via `ix.warnings` and (optionally)
 * `options.onWarning`, never thrown. Four unrecoverable structural errors
 * throw {@link X12ParseError}: `X12_EMPTY_INPUT`, `X12_NO_ISA_HEADER`,
 * `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`. Opt into strict mode with
 * `{ strict: true }` to escalate every Tier-2 warning into an
 * `X12ParseError` carrying the warning's code.
 *
 * Phase 1 decodes the envelope (ISA / GS / ST / SE / GE / IEA) and
 * detects the four delimiters from fixed ISA byte positions. Transaction-
 * set bodies inside each ST..SE are kept **opaque** at this phase —
 * `tx.segments` carries the raw segment strings (terminator stripped).
 * Phase 2 adds segment/element/composite/repetition decode on top.
 *
 * @example
 * ```ts
 * import { parseX12, WARNING_CODES } from "@cosyte/x12";
 *
 * const raw = "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~GS*HC*S*R*20250101*1200*1*X*005010X222A2~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~";
 * const ix = parseX12(raw);
 * ix.delimiters.element;    // "*"
 * ix.delimiters.component;  // ":"
 * ix.delimiters.segment;    // "~"
 * ix.groups[0]?.gs.elements[1]; // "HC"
 * for (const w of ix.warnings) {
 *   if (w.code === WARNING_CODES.X12_PRE_005010) {
 *     // sender on pre-005010 version family
 *   }
 * }
 * ```
 */
export function parseX12(raw: string | Buffer): X12Interchange;
export function parseX12(raw: string | Buffer, options: X12ParseOptions): X12Interchange;
/** @internal — implementation signature; overload signatures above carry the public JSDoc + @example. */
export function parseX12(raw: string | Buffer, options: X12ParseOptions = {}): X12Interchange {
  // Step 1: Buffer → string (latin1 preserves bytes 1:1; ISA envelope is
  // ASCII-only by spec, so this is byte-faithful through the parser).
  const text = typeof raw === "string" ? raw : raw.toString("latin1");

  // Step 2: EMPTY_INPUT fatal check at the top of the pipeline.
  if (text.length === 0) {
    throw new X12ParseError(
      FATAL_CODES.X12_EMPTY_INPUT,
      "Input is empty.",
      { segmentIndex: 0, interchangeIndex: 0 },
      "",
    );
  }

  // Step 3: detect delimiters from fixed ISA positions (throws Tier-3
  // X12_NO_ISA_HEADER / X12_ISA_TOO_SHORT / X12_INVALID_DELIMITERS).
  const delimiters = detectDelimiters(text);

  // Step 4: decode the envelope (lenient; collects warnings, never
  // throws).
  const decoded = decodeEnvelope(text, delimiters);

  // Step 5: in strict mode, escalate the first warning into a thrown
  // X12ParseError carrying the warning code. Lenient mode forwards every
  // warning to the optional callback inline and returns the result.
  if (options.strict === true) {
    const first = decoded.warnings[0];
    if (first !== undefined) {
      // Justification for `as unknown as X12FatalCode`: strict mode
      // escalates Tier-2 warnings into thrown errors. The thrown error
      // reuses the existing X12ParseError shape so consumers have one
      // catch surface. `code` is typed as `X12FatalCode` (the 4 Tier-3
      // codes) at compile time; at runtime under strict mode it also
      // carries any `X12WarningCode`. Lenient-mode callers still get
      // exhaustive-switch checks on `X12FatalCode`; strict-mode
      // consumers narrow on the runtime string. Mirrors the hl7
      // strict-escalation pattern (Plan 06 decision (b)).
      throw new X12ParseError(
        first.code as unknown as (typeof FATAL_CODES)[keyof typeof FATAL_CODES],
        first.message,
        first.position,
        snippet(text),
      );
    }
  }

  if (options.onWarning !== undefined) {
    const cb = options.onWarning;
    for (const w of decoded.warnings) {
      try {
        cb(w);
      } catch {
        /* noisy handlers must not break the parser — silent swallow,
           mirroring hl7's onWarning contract. */
      }
    }
  }

  // exactOptionalPropertyTypes: conditionally include `trailingBytes`.
  const result: X12Interchange = {
    isa: decoded.isa,
    iea: decoded.iea,
    delimiters,
    groups: decoded.groups,
    warnings: decoded.warnings,
    ...(decoded.trailingBytes !== undefined ? { trailingBytes: decoded.trailingBytes } : {}),
  };
  return Object.freeze(result);
}
