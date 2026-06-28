/**
 * Barrel for the Phase 8 spec-clean serializer surface. Re-exports
 * {@link serializeX12} (the emit half of the parser) and its options.
 */

export { serializeX12 } from "./serialize.js";
export type { SerializeOptions } from "./serialize.js";
