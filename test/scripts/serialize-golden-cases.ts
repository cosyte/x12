/**
 * The canonical-fixture → golden-name map shared by the golden generator
 * ({@link "./gen-serialize-goldens.ts"}) and the serializer round-trip test
 * (`test/serialize.test.ts`). One entry per v1 transaction type so the
 * round-trip goldens cover the full surface (278 carries both a request and a
 * response). Every listed fixture is Tier-1 clean (CRLF-free body, no count or
 * control-number deviations) so the byte-faithful emit is also the spec-clean
 * emit.
 *
 * @internal
 */
export interface SerializeGoldenCase {
  /** Golden file stem under `test/fixtures/golden/`. */
  readonly name: string;
  /** Source fixture path relative to `test/fixtures/`. */
  readonly fixture: string;
}

export const SERIALIZE_GOLDEN_CASES: readonly SerializeGoldenCase[] = [
  { name: "835", fixture: "remit/835-medicare-canonical.edi" },
  { name: "837p", fixture: "claim/837p-canonical.edi" },
  { name: "837i", fixture: "claim/837i-canonical.edi" },
  { name: "837d", fixture: "claim/837d-canonical.edi" },
  { name: "271", fixture: "eligibility/271-canonical.edi" },
  { name: "277", fixture: "status/277-canonical.edi" },
  { name: "277ca", fixture: "status/277ca-canonical.edi" },
  { name: "278-request", fixture: "auth/278-request.edi" },
  { name: "278-response", fixture: "auth/278-response.edi" },
  { name: "820", fixture: "premium/820-canonical.edi" },
  { name: "834", fixture: "enrollment/834-canonical.edi" },
  { name: "999", fixture: "ack/999-accept.edi" },
  { name: "ta1", fixture: "ack/ta1-accept.edi" },
];
