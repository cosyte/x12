/**
 * Reject an interchange whose envelope does not hold together with a TA1, then read the TA1 back the
 * way the sender will.
 *
 * A 999 acknowledges a functional group; a TA1 acknowledges the interchange itself. Here the
 * synthetic claim batch from `examples/data/837p-claim.edi` arrives with an IEA-02 that does not
 * match its ISA-13. `parseX12` reads it anyway and says so with `X12_CONTROL_NUMBER_MISMATCH`; the
 * receiver answers with `buildTA1`, rejecting it with note code 001 and echoing the inbound ISA-13,
 * ISA-09 and ISA-10, which are how the sender matches the answer to the file it sent. `buildTA1`
 * returns the segment, so the example wraps it in an envelope of its own. Nothing is sent anywhere.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/reject-interchange-with-ta1.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildTA1,
  isAcceptDisposition,
  parseTA1,
  parseX12,
  TA1_ACK_CODES,
  TA1_NOTE_CODES,
  WARNING_CODES,
} from "@cosyte/x12";

const batch = readFileSync(new URL("data/837p-claim.edi", import.meta.url), "utf8");
// The trailer names a control number its header does not.
const tampered = batch.replace("IEA*1*000000001~", "IEA*1*000000009~");
assert.notEqual(tampered, batch, "the example's input no longer carries the IEA it edits");

const received = parseX12(tampered);
const mismatch = received.warnings.some(
  (w) => w.code === WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
);
// ISA-13 is a control number, free-form sender text, so the example prints whether the two agree
// and never the number itself.
console.log("Received an interchange: control numbers agree?", !mismatch);

const ta1 = buildTA1({
  interchangeControlNumber: received.isa.elements[13] ?? "",
  interchangeDate: received.isa.elements[9] ?? "",
  interchangeTime: received.isa.elements[10] ?? "",
  ackCode: mismatch ? TA1_ACK_CODES.R : TA1_ACK_CODES.A,
  // 001: the interchange control numbers in the header and the trailer do not match.
  noteCode: mismatch ? TA1_NOTE_CODES["001"] : TA1_NOTE_CODES["000"],
});
// The TA1 segment echoes the inbound control number, so the example prints its codes only.
const [segmentId, , , , ackCode, noteCode] = ta1.elements;
console.log(`${String(segmentId)} built: ${String(ackCode)} (note ${String(noteCode)})`);

// The TA1 travels in an interchange of its own, from the receiver back to the sender, with no
// functional group in it.
const reply = [
  "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SUBMITTER      *260601*1205*^*00501*000000101*0*P*:~",
  `${ta1.raw}~`,
  "IEA*0*000000101~",
].join("");

const answer = parseX12(reply);
const read = parseTA1(answer);
if (read === undefined) throw new Error("no TA1 in the reply");
console.log(
  `The sender reads: ${read.ackCode} (note ${read.noteCodeRaw}),`,
  `accepted ${String(isAcceptDisposition(read.ackCode))}`,
);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.ok(mismatch);
assert.deepEqual([segmentId, ackCode, noteCode], ["TA1", "R", "001"]);
assert.equal(answer.groups.length, 0);
// The echoed control number, date and time, all synthetic.
assert.equal(read.interchangeControlNumber, "000000001");
assert.equal(read.interchangeDate, "260601");
assert.equal(read.interchangeTime, "1200");
assert.equal(read.ackCode, TA1_ACK_CODES.R);
assert.equal(read.noteCode, TA1_NOTE_CODES["001"]);
assert.equal(isAcceptDisposition(read.ackCode), false);
assert.equal(answer.warnings.length, 0);
