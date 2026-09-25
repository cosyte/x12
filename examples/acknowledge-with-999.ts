/**
 * Acknowledge a received claim batch with a 999, then read the acknowledgment the way the submitter
 * will.
 *
 * `examples/data/837p-claim.edi` is the synthetic batch that arrived. The example reads its envelope
 * (the functional group control number, the guide it declares, each transaction set's control
 * number), builds a 999 accepting it with `build999`, which refuses an inconsistent disposition
 * or count, and reads the result back with `parse999`. Building never sends anything.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/acknowledge-with-999.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { build999, isAcceptDisposition, parse999, parseX12, serializeX12 } from "@cosyte/x12";

const received = parseX12(readFileSync(new URL("data/837p-claim.edi", import.meta.url), "utf8"));
const group = received.groups[0];
if (group === undefined) throw new Error("no functional group in this interchange");

// GS-01, GS-06 and GS-08; ST-01 and ST-02 for each transaction set.
const [, functionalIdCode = "", , , , , groupControlNumber = "", , versionRelease = ""] =
  group.gs.elements;
const transactions = group.transactions.map((t) => ({
  transactionSetIdCode: t.st.elements[1] ?? "",
  transactionSetControlNumber: t.st.elements[2] ?? "",
  disposition: "A" as const,
}));
console.log(
  `Received group ${groupControlNumber} (${functionalIdCode}, ${versionRelease}),`,
  `${String(transactions.length)} transaction set(s)`,
);

const ack = build999({
  envelope: {
    senderId: "RECEIVER",
    receiverId: "SUBMITTER",
    interchangeDate: "260601",
    interchangeTime: "1205",
    interchangeControlNumber: "000000101",
    groupControlNumber: "101",
    transactionSetControlNumber: "0001",
  },
  functionalGroup: {
    functionalIdCode,
    groupControlNumber,
    versionRelease,
    disposition: "A",
    numberOfTransactionSets: transactions.length,
    numberOfReceivedTransactionSets: transactions.length,
    numberOfAcceptedTransactionSets: transactions.length,
    transactionResponses: transactions,
  },
});
const wire = serializeX12(ack);
console.log("999, one segment per line:");
console.log(wire.split("~").filter(Boolean).join("~\n") + "~");

// What the submitter reads.
const parsed = parse999(wire);
if (parsed === undefined) throw new Error("no 999 in the acknowledgment");
console.log(
  `Group disposition ${parsed.ak9.disposition}: accepted ${String(isAcceptDisposition(parsed.ak9.disposition))},`,
  `${String(parsed.ak9.numberOfAcceptedTransactionSets)} of ${String(parsed.ak9.numberOfReceivedTransactionSets)} transaction set(s)`,
);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.equal(parsed.ak9.disposition, "A");
assert.ok(isAcceptDisposition(parsed.ak9.disposition));
assert.deepEqual(
  parsed.transactionResponses.map((r) => [
    r.ak2.transactionSetIdCode,
    r.ak2.transactionSetControlNumber,
  ]),
  [["837", "0001"]],
);
assert.equal(received.warnings.length, 0);
