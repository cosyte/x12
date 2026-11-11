/**
 * Ask for a services review with a 278 request, answer it with a 278 response, and read the
 * certification decision back.
 *
 * `build278Request` and `build278Response` take one spec shape and compute the HL spine
 * (organization, requester, subscriber, review). The decision belongs to the response alone: the
 * request builder refuses a review that carries one. The response echoes the request's trace, so
 * the requester matches the decision to what it asked. Every value is synthetic, and nothing is
 * sent anywhere.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/review-278-services.ts
 */

import assert from "node:assert/strict";

import {
  build278Request,
  build278Response,
  get278Request,
  get278Response,
  parseX12,
  serializeX12,
  ServicesReview278BuildError,
  type Build278ReviewSpec,
  type Build278Spec,
} from "@cosyte/x12";

/** The review the provider asks for: an admission review, with its trace and diagnosis. */
const review: Build278ReviewSpec = {
  requestCategoryCode: "HS",
  certificationTypeCode: "I",
  serviceTypeCode: "1",
  traces: [{ traceTypeCode: "1", referenceId: "AUTHREQ-0001", originatingCompanyId: "9SUBMITTER" }],
  diagnoses: [{ qualifier: "ABK", code: "E1165" }],
};

const request: Build278Spec = {
  envelope: {
    senderId: "SUBMITTER",
    receiverId: "UMOPAYER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  header: { structurePurposeCode: "0078", purposeCode: "13", referenceId: "AUTHREQ-202606" },
  utilizationManagementOrganization: {
    entityIdentifierCode: "X3",
    entityTypeQualifier: "2",
    name: "UTILIZATION REVIEW CO",
    idQualifier: "PI",
    idCode: "UMO001",
  },
  requester: {
    entityIdentifierCode: "1P",
    entityTypeQualifier: "2",
    name: "ANYTOWN CLINIC",
    idQualifier: "XX",
    idCode: "1234567890",
  },
  subscriber: {
    member: {
      entityIdentifierCode: "IL",
      entityTypeQualifier: "1",
      lastName: "DOE",
      firstName: "JANE",
      idQualifier: "MI",
      idCode: "MBR0001",
    },
    reviews: [review],
  },
};

// The reviewer reads the request off the wire.
const sent = parseX12(serializeX12(build278Request(request)));
const sentTx = sent.groups[0]?.transactions[0];
const asked = sentTx ? get278Request(sent.delimiters, sentTx) : undefined;
if (asked === undefined) throw new Error("not a 278 request");
const askedTrace = asked.reviews[0]?.traces[0]?.referenceId;
console.log(`278 request ${String(asked.direction)}: trace ${String(askedTrace)}, no decision yet`);

// The response reuses the parties and the trace, and adds the decision: certified in total (A1).
const response: Build278Spec = {
  ...request,
  envelope: { ...request.envelope, senderId: "UMOPAYER", receiverId: "SUBMITTER" },
  header: { ...request.header, purposeCode: "11", referenceId: "AUTHRESP-202606" },
  subscriber: {
    ...request.subscriber,
    reviews: [
      { ...review, decision: { actionCode: "A1", reviewIdentificationNumber: "AUTH123456" } },
    ],
  },
};
const answered = parseX12(serializeX12(build278Response(response)));
const answeredTx = answered.groups[0]?.transactions[0];
const decided = answeredTx ? get278Response(answered.delimiters, answeredTx) : undefined;
if (decided === undefined) throw new Error("not a 278 response");
const decision = decided.reviews[0]?.decision;
console.log(
  `278 response for trace ${String(decided.reviews[0]?.traces[0]?.referenceId)}:`,
  `action ${String(decision?.actionCode)}, authorization ${String(decision?.reviewIdentificationNumber)}`,
);

// A decision on a request is refused rather than written.
let refused: string | undefined;
try {
  build278Request(response);
} catch (err) {
  if (err instanceof ServicesReview278BuildError) refused = err.code;
}
console.log("A request carrying a decision is refused:", refused);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.equal(asked.direction, "request");
assert.equal(asked.reviews[0]?.decision, undefined);
assert.equal(askedTrace, "AUTHREQ-0001");
assert.equal(decided.direction, "response");
assert.equal(decided.reviews[0]?.traces[0]?.referenceId, askedTrace);
assert.equal(decision?.actionCode, "A1");
assert.equal(decision.reviewIdentificationNumber, "AUTH123456");
assert.equal(refused, "X12_278_BUILD_INVALID_SPEC");
assert.equal(asked.warnings.length + decided.warnings.length, 0);
