/**
 * The text each interchange `parseX12` returned was read from, kept beside the interchange rather
 * than on it, so the model's shape is unchanged and the text goes when the interchange does.
 * `serializeX12(ix, { byteExact: true })` reads it back.
 *
 * @internal
 */

import type { X12Interchange } from "./types.js";

/** What is kept for one parse: its text, and once asked for, the default emit of that text. */
interface Source {
  readonly text: string;
  emit?: string;
}

const SOURCES = new WeakMap<X12Interchange, Source>();

/**
 * Record the text `interchange` was parsed from.
 *
 * @internal
 */
export function rememberSource(interchange: X12Interchange, text: string): void {
  SOURCES.set(interchange, { text });
}

/**
 * The text `interchange` was parsed from, with the default emit of an unedited parse of that text,
 * worked out by `emitOf` on the first call and kept for later ones; `undefined` for an interchange
 * `parseX12` did not return.
 *
 * @internal
 */
export function sourceOf(
  interchange: X12Interchange,
  emitOf: (text: string) => string,
): { readonly text: string; readonly emit: string } | undefined {
  const source = SOURCES.get(interchange);
  if (source === undefined) return undefined;
  source.emit ??= emitOf(source.text);
  return { text: source.text, emit: source.emit };
}
