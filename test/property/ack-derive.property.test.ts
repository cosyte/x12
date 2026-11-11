/**
 * Properties of the acknowledgments derived from a parse (`deriveTA1Spec`,
 * `derive999Spec`), on the generators this package exports:
 *
 * 1. **An accepted interchange yields an accept.** For any generated
 *    spec-clean interchange, which the parser reads with no warning, the
 *    derived TA1 accepts with note `000`, the derived 999 for every group
 *    accepts every transaction set, and both specs build and read back as
 *    accepts.
 * 2. **Every warning is accounted for once.** For any generated messy
 *    interchange, each warning the parse raised is reported or unreported by
 *    exactly one derived acknowledgment: the TA1, or the 999 for one group.
 *    The TA1 rejects exactly when it reports a warning, and a transaction set
 *    is rejected exactly when its IK5 carries a code.
 *
 * Each runs 100 cases by default; `COSYTE_PROPERTY_RUNS` sets the depth, and a
 * failure prints the seed and path that replay it (see `./_runner.ts`).
 */

import assert from "node:assert/strict";

import fc from "fast-check";
import { describe, it } from "vitest";

import {
  build999,
  buildTA1,
  derive999Spec,
  deriveTA1Spec,
  parse999,
  parseTA1,
  parseX12,
  serializeX12,
  type Build999EnvelopeSpec,
  type X12ParseWarning,
} from "../../src/index.js";
import { interchange, interchangeText } from "../../src/arbitraries/index.js";

import { assertProperty, propertyTimeout } from "./_runner.js";

/** Each test's budget, scaled to the depth `COSYTE_PROPERTY_RUNS` sets. */
const TIMEOUT = propertyTimeout();

/** The 999's own envelope: a placeholder receiver answering a placeholder sender. */
const ENVELOPE: Build999EnvelopeSpec = {
  senderId: "RECEIVER",
  receiverId: "SUBMITTER",
  interchangeDate: "260601",
  interchangeTime: "1205",
  interchangeControlNumber: "000000101",
  groupControlNumber: "101",
  transactionSetControlNumber: "0101",
};

describe("derived acknowledgments", () => {
  it(
    "accept an interchange the parser accepts",
    () => {
      assertProperty(
        "an accepted interchange yields an accept",
        fc.property(interchange(), (ix) => {
          assert.deepEqual(ix.warnings, []);
          const ta1 = deriveTA1Spec(ix);
          assert.equal(ta1.spec.ackCode, "A");
          assert.equal(ta1.spec.noteCode, "000");
          assert.deepEqual([...ta1.reported, ...ta1.unreported], []);
          const reply = parseX12(
            `ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SUBMITTER      *260601*1205*^*00501*000000101*0*P*:~${buildTA1(ta1.spec).raw}~IEA*0*000000101~`,
          );
          assert.equal(parseTA1(reply)?.ackCode, "A");
          ix.groups.forEach((group, groupIndex) => {
            const derived = derive999Spec(ix, { envelope: ENVELOPE, groupIndex });
            const fg = derived.spec.functionalGroup;
            assert.equal(fg.disposition, "A");
            assert.equal(fg.numberOfReceivedTransactionSets, group.transactions.length);
            assert.equal(fg.numberOfAcceptedTransactionSets, group.transactions.length);
            assert.equal(fg.numberOfTransactionSets, group.transactions.length);
            assert.ok(fg.transactionResponses.every((r) => r.disposition === "A"));
            const ack = parse999(serializeX12(build999(derived.spec)));
            assert.equal(ack?.ak9.disposition, "A");
            assert.deepEqual(ack?.warnings, []);
          });
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "account for every warning of a messy interchange exactly once",
    () => {
      assertProperty(
        "every warning is reported or unreported by one acknowledgment",
        fc.property(interchangeText(), (raw) => {
          const ix = parseX12(raw);
          const ta1 = deriveTA1Spec(ix);
          const seen: X12ParseWarning[] = [...ta1.reported, ...ta1.unreported];
          assert.equal(ta1.spec.ackCode === "A", ta1.reported.length === 0);
          ix.groups.forEach((_group, groupIndex) => {
            const derived = derive999Spec(ix, { envelope: ENVELOPE, groupIndex });
            seen.push(...derived.reported, ...derived.unreported);
            for (const response of derived.spec.functionalGroup.transactionResponses) {
              const rejected = response.disposition === "R";
              assert.equal(rejected, (response.syntaxErrorCodes ?? []).length > 0);
            }
          });
          assert.equal(seen.length, ix.warnings.length);
          for (const w of ix.warnings) {
            assert.equal(seen.filter((s) => s === w).length, 1);
          }
        }),
      );
    },
    TIMEOUT,
  );
});
