/**
 * Process-scoped default profile management. A single mutable module-scoped
 * `let` - the only mutable state in the library - so `parseX12(raw)` (with no
 * explicit profile) can consult a registered default.
 *
 * `setDefaultProfile` EXISTS but is DISCOURAGED: it is scoped to the current
 * Node process, NOT shared across workers, and NOT reset between test files.
 * Tests that touch it MUST clean up in `afterEach` (`setDefaultProfile(null)`)
 * to prevent cross-test bleed.
 *
 * Zero runtime deps.
 */

import type { X12Profile } from "./types.js";

/**
 * Process-scoped default. `undefined` means "unset". `setDefaultProfile(null)`
 * resets to `undefined`.
 *
 * @internal
 */
let _defaultProfile: X12Profile | undefined = undefined;

/**
 * Register a process-scoped default profile. `parseX12(raw)` (no explicit
 * profile arg) consults `getDefaultProfile()` and attaches the returned
 * profile to the result. Pass `null` (or `undefined`) to clear.
 *
 * Explicit args ALWAYS win - `parseX12(raw, { profile: myProfile })` uses
 * `myProfile` regardless of the default; `parseX12(raw, { profile: null })`
 * opts out of the default for a single call without changing the registered
 * default.
 *
 * **Test hygiene:** the only mutable module-scoped state in the library.
 * Tests that call this MUST clean up in `afterEach` (`setDefaultProfile(null)`).
 *
 * @example
 * ```ts
 * import { setDefaultProfile, getDefaultProfile, profiles, parseX12 } from "@cosyte/x12";
 * setDefaultProfile(profiles.availity);
 * const ix = parseX12(raw);
 * ix.profile?.name; // "availity"
 * setDefaultProfile(null); // clear (or in test teardown)
 * ```
 */
export function setDefaultProfile(profile: X12Profile | null): void {
  // Accept `undefined` defensively for JS callers - treat it like null.
  _defaultProfile = profile ?? undefined;
}

/**
 * Return the current default profile, or `undefined` if none is registered.
 *
 * @example
 * ```ts
 * import { getDefaultProfile } from "@cosyte/x12";
 * const p = getDefaultProfile();
 * if (p !== undefined) console.log("default profile:", p.name);
 * ```
 */
export function getDefaultProfile(): X12Profile | undefined {
  return _defaultProfile;
}
