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
 * ## Every caller value in a refusal here is bounded
 *
 * An earlier release closed this hole on the `build*` side and filed it open
 * here; a later one closed it. Measured on this tree before the
 * fix, the worst `X12ProfileError.message` was **360,181 characters**, at the
 * `fixture` refusal, which names THREE caller values (the profile name, the
 * quirk id, and the `JSON.stringify`d fixture path); the `effect` and
 * `expectedWarnings` refusals name three as well and measured 360,085 and
 * 360,090. It grew linearly with whatever the caller passed. Every caller value
 * now goes through `renderCallerValue` or `renderCallerJson`, so each fragment
 * is capped at `BUILD_REFUSAL_VALUE_MAX_RENDERED` and the same `fixture`
 * refusal measures **431**.
 *
 * **Say what that buys and no more.** The caller passed these values in and
 * still holds them, so bounding them redacts nothing and this is NOT
 * `PHI-WARNING-MESSAGE-LEAK`, where the value was the document's. What it buys
 * is a fixed ceiling on anything reaching a log line, a crash report or a JSON
 * error envelope. The surviving characters are **not escaped**, and the bound
 * is on UTF-16 **code units, not bytes**.
 *
 * @internal
 */

import { renderCallerJson, renderCallerValue } from "../builder/caller-value.js";
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
 * Stable, kebab-case-ish quirk id shape: lowercase-alphanumeric runs joined by
 * single internal hyphens. Keeps ids machine-friendly and free of arbitrary
 * bytes.
 *
 * **This pattern carries NO length bound, and the comment here claimed "2-64
 * chars" until a later release measured it.** A one-character id
 * is accepted and so is a 120,000-character one; a 120,000-digit id was in fact
 * the path to the largest `X12ProfileError` message on the tree. The grammar was
 * deliberately left alone - tightening it would reject profiles that define
 * cleanly today, which is a separate decision from bounding a message - so the
 * comment was corrected to the code rather than the other way round.
 *
 * @internal
 */
const QUIRK_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/**
 * Fixture path shape: a relative `dir/file.edi` path under `test/fixtures/`.
 * Rejects absolute paths and parent-directory escapes so the cited fixture
 * stays inside the corpus. Like {@link QUIRK_ID_RE} it bounds the SHAPE and not
 * the length; the refusal that reports a bad one is bounded instead.
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
      `defineProfile: options is required and must be an object. Received: ${renderCallerJson(opts)}.`,
    );
  }
  if (typeof opts.name !== "string") {
    throw new X12ProfileError(
      "defineProfile: 'name' is required and must be a non-empty string. " +
        `Received: ${renderCallerJson((opts as { name?: unknown }).name)}.`,
    );
  }
  if (opts.name.trim().length === 0) {
    throw new X12ProfileError(
      "defineProfile: 'name' is required and must be a non-empty string. " +
        `Received: ${renderCallerJson(opts.name)}.`,
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
      `Profile ${renderCallerValue(opts.name)} has unknown option key ${renderCallerValue(key)}. ` +
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
    if (q === undefined || q === null || typeof q !== "object") {
      throw new X12ProfileError(
        `Profile ${renderCallerValue(profileName)} quirks[${String(i)}] must be an object.`,
        profileName,
      );
    }
    if (typeof q.id !== "string" || !QUIRK_ID_RE.test(q.id)) {
      throw new X12ProfileError(
        `Profile ${renderCallerValue(profileName)} quirks[${String(i)}].id must be a kebab-case string ` +
          `(e.g. "payer-loop-ref-2u"). Received: ${renderCallerJson(q.id)}.`,
        profileName,
      );
    }
    if (seenIds.has(q.id)) {
      throw new X12ProfileError(
        `Profile ${renderCallerValue(profileName)} declares duplicate quirk id ${renderCallerValue(q.id)}. ` +
          "Each quirk id must be unique within a profile.",
        profileName,
      );
    }
    seenIds.add(q.id);
    if (typeof q.effect !== "string" || !KNOWN_EFFECTS.includes(q.effect)) {
      throw new X12ProfileError(
        `Profile ${renderCallerValue(profileName)} quirk ${renderCallerValue(q.id)} has invalid effect ` +
          `${renderCallerJson(q.effect)} - must be one of ${KNOWN_EFFECTS.join(" / ")}.`,
        profileName,
      );
    }
    if (typeof q.summary !== "string" || q.summary.trim().length === 0) {
      throw new X12ProfileError(
        `Profile ${renderCallerValue(profileName)} quirk ${renderCallerValue(q.id)} must have a non-empty summary.`,
        profileName,
      );
    }
    // The locked hard rule: no quirk without a demonstrating fixture.
    if (typeof q.fixture !== "string" || !FIXTURE_PATH_RE.test(q.fixture)) {
      throw new X12ProfileError(
        `Profile ${renderCallerValue(profileName)} quirk ${renderCallerValue(q.id)} must cite a 'fixture' - ` +
          'a relative path under test/fixtures/ (e.g. "remit/835-availity-quirk.edi") demonstrating the ' +
          `deviation. No invented quirks. Received: ${renderCallerJson(q.fixture)}.`,
        profileName,
      );
    }
    if (typeof q.sourceCategory !== "string" || q.sourceCategory.trim().length === 0) {
      throw new X12ProfileError(
        `Profile ${renderCallerValue(profileName)} quirk ${renderCallerValue(q.id)} must have a non-empty ` +
          "sourceCategory (where the deviation was observed).",
        profileName,
      );
    }
    if (q.expectedWarnings !== undefined) {
      for (const code of q.expectedWarnings) {
        if (!WARNING_CODE_SET.has(code)) {
          throw new X12ProfileError(
            `Profile ${renderCallerValue(profileName)} quirk ${renderCallerValue(q.id)} lists unknown ` +
              `expected warning ${renderCallerJson(code)} - must be a member of WARNING_CODES.`,
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
