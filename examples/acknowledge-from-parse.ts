/**
 * Acknowledge a received claim batch with the TA1 and the 999 derived from what the parser found,
 * then read both back the way the submitter will.
 *
 * The synthetic batch from `examples/data/837p-claim.edi` arrives twice: once as sent, and once
 * with an SE-02 that does not match its ST-02. `deriveTA1Spec` answers the envelope and
 * `derive999Spec` the functional group, each from `parseX12`'s warnings, and `buildTA1` and
 * `build999` write what they derived. Nothing is sent anywhere.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/acknowledge-from-parse.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  build999,
  buildTA1,
  derive999Spec,
  deriveTA1Spec,
  parse999,
  parseTA1,
  parseX12,
  serializeX12,
  WARNING_CODES,
  type Build999EnvelopeSpec,
} from "@cosyte/x12";

const batch = readFileSync(new URL("data/837p-claim.edi", import.meta.url), "utf8");

/** The 999's own envelope: the receiver answering the submitter. */
const envelope: Build999EnvelopeSpec = {
  senderId: "RECEIVER",
  receiverId: "SUBMITTER",
  interchangeDate: "260601",
  interchangeTime: "1205",
  interchangeControlNumber: "000000101",
  groupControlNumber: "101",
  transactionSetControlNumber: "0101",
};

/** Wrap a TA1 in an interchange of its own, from the receiver back to the submitter. */
function ta1Reply(ta1Raw: string): string {
  return [
    "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SUBMITTER      *260601*1205*^*00501*000000102*0*P*:~",
    `${ta1Raw}~`,
    "IEA*0*000000102~",
  ].join("");
}

// As sent: the envelope holds together and the claim's transaction set is accepted.
const clean = parseX12(batch);
const cleanTa1 = deriveTA1Spec(clean);
const cleanAck = derive999Spec(clean, { envelope });
console.log("TA1:", buildTA1(cleanTa1.spec).raw);
console.log("999 group disposition:", cleanAck.spec.functionalGroup.disposition);

// Tampered: SE-02 no longer matches ST-02, so the 999 rejects that transaction set.
const seAt = batch.search(/SE\*\d+\*0001~/);
assert.notEqual(seAt, -1, "the example's input no longer carries the SE it edits");
const tampered = batch.slice(0, seAt) + batch.slice(seAt).replace("*0001~", "*0009~");
const received = parseX12(tampered);
const ack = derive999Spec(received, { envelope });
const response = ack.spec.functionalGroup.transactionResponses[0];
console.log(
  `999 for transaction set ${response?.transactionSetControlNumber ?? ""}:`,
  response?.disposition,
  response?.syntaxErrorCodes,
);

const read999 = parse999(serializeX12(build999(ack.spec)));
const readTa1 = parseTA1(parseX12(ta1Reply(buildTA1(deriveTA1Spec(received).spec).raw)));
console.log("The submitter reads: TA1", readTa1?.ackCode, "and 999", read999?.ak9.disposition);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.equal(cleanTa1.spec.ackCode, "A");
assert.equal(cleanTa1.spec.noteCode, "000");
assert.deepEqual(cleanTa1.reported, []);
assert.equal(cleanAck.spec.functionalGroup.disposition, "A");
assert.deepEqual(cleanAck.reported, []);
assert.equal(response?.disposition, "R");
assert.deepEqual(response?.syntaxErrorCodes, ["3"]);
assert.equal(ack.reported[0]?.code, WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
assert.equal(ack.spec.functionalGroup.disposition, "R");
assert.equal(readTa1?.ackCode, "A");
assert.equal(read999?.ak9.disposition, "R");
assert.equal(read999?.transactionResponses[0]?.ik5.disposition, "R");
assert.deepEqual(read999?.warnings, []);
