/**
 * The single place that decides which address SEGMENTS an 837 address is
 * worth writing, shared by the emit side and the read side so the two can
 * never drift apart.
 *
 * `build-837.ts`'s `emitAddress` asks these predicates which of `N3` / `N4`
 * to write. `get-837.ts`'s pay-to accumulator asks the same predicates
 * whether a repeated `NM1*87` states an address at all, because on the
 * pay-to slot an emptied value is NOT a neutral absence: `build837P/I/D`
 * gates Loop 2010AB on `payToAddress !== undefined`, so a slot cleared or
 * blanked by a repeat that stated nothing re-emits as no pay-to loop, or as
 * a bare `NM1*87` carrying neither `N3` nor `N4`. Both are positive
 * statements about where a payment goes, and neither is a statement the
 * sender made.
 *
 * Sharing one module is the same discipline the 835 uses, where the emit
 * guard reuses the read side's own balance validators so a warning and a
 * refusal cannot disagree. Change a condition here and both sides move
 * together; there is no second copy to forget.
 *
 * @internal
 */

/**
 * Structural view of an address, satisfied by both the read side's
 * `X12ClaimAddress` (whose optional fields are `string | undefined`) and the
 * build side's `Build837AddressSpec` (whose are `?: string`). Deliberately
 * structural rather than a shared nominal type: the two surfaces are public
 * and independently versioned, and unifying them would be a breaking change
 * to both for no consumer benefit.
 *
 * @internal
 */
export interface X12ClaimAddressShape {
  readonly lines: readonly string[];
  readonly city?: string | undefined;
  readonly state?: string | undefined;
  readonly postalCode?: string | undefined;
  readonly countryCode?: string | undefined;
}

/**
 * True exactly when `emitAddress` would write an `N3` for this address.
 *
 * @internal
 */
export function emitsStreetLines(address: X12ClaimAddressShape): boolean {
  return address.lines.length > 0;
}

/**
 * True exactly when `emitAddress` would write an `N4` for this address.
 *
 * @internal
 */
export function emitsGeographicFields(address: X12ClaimAddressShape): boolean {
  return (
    address.city !== undefined ||
    address.state !== undefined ||
    address.postalCode !== undefined ||
    address.countryCode !== undefined
  );
}

/**
 * True exactly when `emitAddress` would write at least one segment for this
 * address, i.e. when the address states something a receiver could act on.
 *
 * Read it as a property of the EMIT, not as a judgement about the document:
 * an `N3~` with no elements and an `N4****~` with four empty ones are both
 * segments the sender really sent, and both leave an address this returns
 * `false` for. What the reader does with that answer is stated where it asks
 * the question, never here.
 *
 * @internal
 */
export function statesAnAddress(address: X12ClaimAddressShape): boolean {
  return emitsStreetLines(address) || emitsGeographicFields(address);
}
