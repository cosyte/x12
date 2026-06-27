/**
 * Barrel for the bundled X12 code-list snapshots. Every snapshot follows
 * the same {@link CodeListSnapshot} contract (`meta` provenance +
 * `codes` map) and pairs with a typed `lookup*` helper.
 *
 * Pre-launch v0.0.x policy: snapshots ship as **initial subsets** sized
 * to the parser's Tier-1 + Tier-2 fixtures. The Phase 10 `pnpm
 * refresh:code-lists` script will regen the full WPC-published lists for
 * the first real publish.
 */

export { CARC, lookupCarc } from "./carc.js";
export { CLP_STATUS, lookupClpStatus } from "./clp-status.js";
export {
  CLAIM_ADJUSTMENT_GROUP_CODES,
  isClaimAdjustmentGroupCode,
  type ClaimAdjustmentGroupCode,
} from "./cagc.js";
export { RARC, lookupRarc } from "./rarc.js";
export type { CodeListEntry, CodeListMeta, CodeListSnapshot } from "./meta.js";
