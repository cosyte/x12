/**
 * Acknowledge a received claim batch with a 997, for a trading partner that still expects one in
 * place of a 999, then read the acknowledgment the way the submitter will.
 *
 * `examples/data/837p-claim.edi` is the synthetic batch that arrived. The example reads its envelope
 * (the functional group control number, the guide it declares, each transaction set's control
 * number), builds a 997 accepting it with `build997`, which refuses an inconsistent disposition or
 * count, and reads the result back with `parse997`. The 997 reader fills nothing in: a disposition
 * outside its code list reads as `undefined` beside the code as sent, and warns, so the example
 * checks `disposition === "A"` rather than "not rejected". Building never sends anything.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/acknowledge-with-997.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { WARNING_CODES, build997, parse997, parseX12, serializeX12 } from "@cosyte/x12";

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
// A control number is free-form sender text that can carry an account identifier, so the example
// prints the codes and the count, and never a control number.
console.log(
  `Received a group (${functionalIdCode}, ${versionRelease}),`,
  `${String(transactions.length)} transaction set(s)`,
);

const ack = build997({
  envelope: {
    senderId: "RECEIVER",
    receiverId: "SUBMITTER",
    interchangeDate: "260601",
    interchangeTime: "1205",
    interchangeControlNumber: "000000102",
    groupControlNumber: "102",
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
// The 997 echoes the batch's control numbers, so the example prints its segment ids only.
const segmentIds = wire
  .split("~")
  .filter(Boolean)
  .map((segment) => segment.split("*")[0]);
console.log("997 segments:", segmentIds.join(" "));

// What the submitter reads.
const parsed = parse997(wire);
if (parsed === undefined) throw new Error("no 997 in the acknowledgment");
const accepted = parsed.ak9?.disposition === "A";
console.log(
  `Group disposition ${String(parsed.ak9?.disposition)}: accepted ${String(accepted)},`,
  `${String(parsed.ak9?.numberOfAcceptedTransactionSets)} of ${String(parsed.ak9?.numberOfReceivedTransactionSets)} transaction set(s)`,
);

// A disposition code outside list 717 is carried as sent, never read as an accept or a reject.
const odd = parse997(wire.replace("AK5*A~", "AK5*Q~"));
const oddResponse = odd?.transactionResponses[0];
console.log(
  `An AK5 of "${String(oddResponse?.ak5?.dispositionRaw)}" reads as disposition`,
  `${String(oddResponse?.ak5?.disposition)}, with warning ${String(odd?.warnings[0]?.code)}`,
);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.deepEqual(segmentIds, ["ISA", "GS", "ST", "AK1", "AK2", "AK5", "AK9", "SE", "GE", "IEA"]);
assert.equal(received.warnings.length, 0);
assert.ok(accepted);
assert.equal(parsed.ak1?.groupControlNumber, groupControlNumber);
assert.deepEqual(
  parsed.transactionResponses.map((r) => [
    r.ak2.transactionSetIdCode,
    r.ak2.transactionSetControlNumber,
    r.ak5?.disposition,
  ]),
  [["837", "0001", "A"]],
);
assert.deepEqual(parsed.warnings, []);
assert.equal(oddResponse?.ak5?.disposition, undefined);
assert.equal(oddResponse?.ak5?.dispositionRaw, "Q");
assert.equal(odd?.warnings[0]?.code, WARNING_CODES.X12_997_AK5_DISPOSITION_UNKNOWN);
