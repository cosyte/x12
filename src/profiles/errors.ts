/**
 * Error taxonomy for the `@cosyte/x12` profile subsystem (Phase 9).
 *
 * `X12ProfileError` is thrown by `defineProfile()` when a profile definition
 * is structurally invalid - a bad/missing name, an unknown option key, or a
 * quirk that violates the locked hard rule (missing `fixture`, unknown
 * `effect`, an `expectedWarnings` code outside the Tier-2 registry). It is a
 * definition-time error (developer mistake), distinct from the Tier-3
 * runtime `X12ParseError` thrown on corrupt input.
 */

/**
 * Thrown by `defineProfile()` and profile-validation code when a profile
 * definition is structurally invalid. Carries the offending profile name
 * (when known) so consumers can pinpoint which definition failed.
 *
 * @example
 * ```ts
 * import { defineProfile, X12ProfileError } from "@cosyte/x12";
 * try {
 *   defineProfile({ name: "" });
 * } catch (err) {
 *   if (err instanceof X12ProfileError) {
 *     console.error(err.message, err.profileName);
 *   }
 * }
 * ```
 */
export class X12ProfileError extends Error {
  public readonly profileName: string | undefined;

  /**
   * Construct a new `X12ProfileError`. `profileName` is optional so the
   * name validator can throw before a usable name is available.
   *
   * @internal
   */
  public constructor(message: string, profileName?: string) {
    super(message);
    this.name = "X12ProfileError";
    this.profileName = profileName;
  }
}
