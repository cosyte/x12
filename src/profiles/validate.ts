/**
 * Validation helpers for `defineProfile()`. Every validator returns `void`
 * on success and throws {@link "./errors.js".X12ProfileError} on failure.
 *
 * The name validator is split out so `defineProfile()` can call it FIRST and
 * pass `opts.name` to every subsequent throw site (fail-fast: a caller who
 * hits a quirk error should see their own profile flagged by name).
 *
 * Zero runtime deps - inlined Levenshtein (~15 LoC) for "did you mean?"
 * hints on unknown option keys.
 *
 * @internal
 */

import { WARNING_CODES } from "../parser/warnings.js";
import type { X12WarningCode } from "../parser/warnings.js";

import { X12ProfileError } from "./errors.js";
import type { X12ProfileQuirk, X12ProfileSpec } from "./types.js";

/**
 * Known top-level option keys accepted by `defineProfile()`. Any key outside
 * this list throws with an optional Levenshtein "did you mean?" hint.
 *
 * @internal
 */
const KNOWN_OPTION_KEYS: readonly string[] = ["name", "description", "quirks", "extends"];

/**
 * Valid quirk `effect` buckets. A quirk with any other effect is rejected.
 *
 * @internal
 */
const KNOWN_EFFECTS: readonly string[] = ["relaxes", "adds", "requires"];

/**
 * Stable, kebab-case-ish quirk id shape: 2-64 lowercase-alphanumeric chars
 * with internal hyphens. Keeps ids machine-friendly and free of arbitrary
 * bytes.
 *
 * @internal
 */
const QUIRK_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/**
 * Fixture path shape: a relative `dir/file.edi` path under `test/fixtures/`.
 * Rejects absolute paths and parent-directory escapes so the cited fixture
 * stays inside the corpus.
 *
 * @internal
 */
const FIXTURE_PATH_RE = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+$/u;

/**
 * The frozen set of valid Tier-2 warning codes, used to validate a quirk's
 * `expectedWarnings`. Built once from the registry.
 *
 * @internal
 */
const WARNING_CODE_SET: ReadonlySet<string> = new Set(Object.values(WARNING_CODES));

/**
 * Iterative DP Levenshtein distance. Used by {@link validateOptionKeys} for
 * "did you mean?" hints. Zero deps; ≤ 15 LoC excluding the signature.
 *
 * @internal
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev: number[] = [];
  for (let j = 0; j <= b.length; j++) prev.push(j);
  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr.push(Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost));
    }
    prev = curr;
  }
  return prev[b.length] ?? 0;
}

/**
 * Validate the profile NAME (fail-fast). Throws on null/undefined opts,
 * non-string name, or empty/whitespace-only name.
 *
 * @internal
 */
export function validateProfileName(opts: X12ProfileSpec): void {
  if (opts === null || opts === undefined) {
    throw new X12ProfileError(
      `defineProfile: options is required and must be an object. Received: ${String(opts)}.`,
    );
  }
  if (typeof opts.name !== "string") {
    throw new X12ProfileError(
      "defineProfile: 'name' is required and must be a non-empty string. " +
        `Received: ${JSON.stringify((opts as { name?: unknown }).name)}.`,
    );
  }
  if (opts.name.trim().length === 0) {
    throw new X12ProfileError(
      "defineProfile: 'name' is required and must be a non-empty string. " +
        `Received: ${JSON.stringify(opts.name)}.`,
      opts.name,
    );
  }
}

/**
 * Validate TOP-LEVEL option keys. Throws on any unknown key with a
 * Levenshtein "did you mean?" hint when distance ≤ 2 from a known key.
 *
 * @internal
 */
export function validateOptionKeys(opts: X12ProfileSpec): void {
  for (const key of Object.keys(opts)) {
    if (KNOWN_OPTION_KEYS.includes(key)) continue;
    let hint: string | undefined;
    for (const known of KNOWN_OPTION_KEYS) {
      if (levenshtein(key, known) <= 2) {
        hint = known;
        break;
      }
    }
    throw new X12ProfileError(
      `Profile '${opts.name}' has unknown option key '${key}'. ` +
        (hint !== undefined ? `Did you mean '${hint}'? ` : "") +
        `Known keys: ${KNOWN_OPTION_KEYS.join(", ")}.`,
      opts.name,
    );
  }
}

/**
 * Validate a quirk set. Enforces the locked hard rule (every quirk MUST cite
 * a `fixture`) plus structural correctness: unique kebab ids, a known
 * `effect`, non-empty `summary` / `sourceCategory`, a well-formed relative
 * `fixture` path, and `expectedWarnings` drawn only from the Tier-2
 * registry. Run both pre-merge (self quirks, so errors name the offending
 * profile) and post-merge (the composed set).
 *
 * @internal
 */
export function validateQuirks(quirks: readonly X12ProfileQuirk[], profileName: string): void {
  const seenIds = new Set<string>();
  for (let i = 0; i < quirks.length; i++) {
    const q = quirks[i];
    const at = `quirks[${String(i)}]`;
    if (q === undefined || q === null || typeof q !== "object") {
      throw new X12ProfileError(`Profile '${profileName}' ${at} must be an object.`, profileName);
    }
    if (typeof q.id !== "string" || !QUIRK_ID_RE.test(q.id)) {
      throw new X12ProfileError(
        `Profile '${profileName}' ${at}.id must be a kebab-case string (e.g. "payer-loop-ref-2u"). ` +
          `Received: ${JSON.stringify(q.id)}.`,
        profileName,
      );
    }
    if (seenIds.has(q.id)) {
      throw new X12ProfileError(
        `Profile '${profileName}' declares duplicate quirk id '${q.id}'. Each quirk id must be unique within a profile.`,
        profileName,
      );
    }
    seenIds.add(q.id);
    if (typeof q.effect !== "string" || !KNOWN_EFFECTS.includes(q.effect)) {
      throw new X12ProfileError(
        `Profile '${profileName}' quirk '${q.id}' has invalid effect ${JSON.stringify(q.effect)} - ` +
          `must be one of ${KNOWN_EFFECTS.join(" / ")}.`,
        profileName,
      );
    }
    if (typeof q.summary !== "string" || q.summary.trim().length === 0) {
      throw new X12ProfileError(
        `Profile '${profileName}' quirk '${q.id}' must have a non-empty summary.`,
        profileName,
      );
    }
    // The locked hard rule: no quirk without a demonstrating fixture.
    if (typeof q.fixture !== "string" || !FIXTURE_PATH_RE.test(q.fixture)) {
      throw new X12ProfileError(
        `Profile '${profileName}' quirk '${q.id}' must cite a 'fixture' - a relative path under test/fixtures/ ` +
          `(e.g. "remit/835-availity-quirk.edi") demonstrating the deviation. No invented quirks. ` +
          `Received: ${JSON.stringify(q.fixture)}.`,
        profileName,
      );
    }
    if (typeof q.sourceCategory !== "string" || q.sourceCategory.trim().length === 0) {
      throw new X12ProfileError(
        `Profile '${profileName}' quirk '${q.id}' must have a non-empty sourceCategory ` +
          `(where the deviation was observed).`,
        profileName,
      );
    }
    if (q.expectedWarnings !== undefined) {
      for (const code of q.expectedWarnings) {
        if (!WARNING_CODE_SET.has(code)) {
          throw new X12ProfileError(
            `Profile '${profileName}' quirk '${q.id}' lists unknown expected warning ${JSON.stringify(code)} - ` +
              `must be a member of WARNING_CODES.`,
            profileName,
          );
        }
      }
    }
  }
}

/**
 * Collect the sorted, de-duplicated union of every quirk's
 * `expectedWarnings`. Used by `describe()` and `partitionWarnings`.
 *
 * @internal
 */
export function collectExpectedWarnings(
  quirks: readonly X12ProfileQuirk[],
): readonly X12WarningCode[] {
  const seen = new Set<X12WarningCode>();
  for (const q of quirks) {
    for (const code of q.expectedWarnings ?? []) seen.add(code);
  }
  return Object.freeze([...seen].sort((a, b) => a.localeCompare(b)));
}
