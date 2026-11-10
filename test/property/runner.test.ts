/**
 * The property runner in `./_runner.ts`: the depth it reads from `COSYTE_PROPERTY_RUNS`, the
 * values it refuses, and a failure that prints the seed and path which replay it exactly.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_NUM_RUNS,
  assertProperty,
  propertyTimeout,
  resolvePropertyRun,
} from "./_runner.js";

describe("resolvePropertyRun", () => {
  it("runs 100 cases by default, a test's own numRuns otherwise, and the environment over both", () => {
    expect(DEFAULT_NUM_RUNS).toBe(100);
    expect(resolvePropertyRun({}, {})).toEqual({ numRuns: 100 });
    expect(resolvePropertyRun({ numRuns: 7 }, {})).toEqual({ numRuns: 7 });
    expect(resolvePropertyRun({ numRuns: 7 }, { COSYTE_PROPERTY_RUNS: "10000" })).toEqual({
      numRuns: 10000,
    });
    expect(resolvePropertyRun({}, { COSYTE_PROPERTY_RUNS: "" })).toEqual({ numRuns: 100 });
  });

  it("takes a seed and a path from the environment or the options", () => {
    expect(
      resolvePropertyRun({}, { COSYTE_PROPERTY_SEED: "-42", COSYTE_PROPERTY_PATH: "3:0:1" }),
    ).toEqual({ numRuns: 100, seed: -42, path: "3:0:1" });
    expect(resolvePropertyRun({ seed: 5, path: "1" }, {})).toEqual({
      numRuns: 100,
      seed: 5,
      path: "1",
    });
  });

  it("refuses a malformed value rather than running the default", () => {
    expect(() => resolvePropertyRun({}, { COSYTE_PROPERTY_RUNS: "10k" })).toThrow(RangeError);
    expect(() => resolvePropertyRun({}, { COSYTE_PROPERTY_RUNS: "0" })).toThrow(RangeError);
    expect(() => resolvePropertyRun({}, { COSYTE_PROPERTY_SEED: "x" })).toThrow(RangeError);
    expect(() => resolvePropertyRun({ seed: 1 }, { COSYTE_PROPERTY_PATH: "a:b" })).toThrow(
      RangeError,
    );
    expect(() => resolvePropertyRun({ numRuns: 0 }, {})).toThrow(RangeError);
    expect(() => resolvePropertyRun({}, { COSYTE_PROPERTY_PATH: "1:2" })).toThrow(
      /needs its seed/u,
    );
  });

  it("scales a test's budget with the depth", () => {
    expect(propertyTimeout({})).toBe(10_000);
    expect(propertyTimeout({ COSYTE_PROPERTY_RUNS: "10000" })).toBe(100_000);
  });
});

describe("assertProperty", () => {
  const failing = fc.property(fc.nat(), (n) => n < 50);

  it("passes quietly when the property holds", () => {
    expect(() =>
      assertProperty(
        "holds",
        fc.property(fc.nat(), (n) => n >= 0),
        {},
        {},
      ),
    ).not.toThrow();
  });

  it("names the property and prints the seed and path that replay the failure", () => {
    let message = "";
    try {
      assertProperty("below fifty", failing, { seed: 1 }, {});
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(
      /^below fifty: property failed after \d+ case\(s\), shrunk \d+ time\(s\)\./u,
    );
    const replay = /COSYTE_PROPERTY_SEED=(-?\d+) COSYTE_PROPERTY_PATH=([\d:]+)/u.exec(message);
    expect(replay).not.toBeNull();
    expect(message).toContain("Counterexample: [50]");

    // Replaying from the printed seed and path runs the shrunk case straight away.
    let replayed = "";
    try {
      assertProperty(
        "below fifty",
        failing,
        {},
        {
          COSYTE_PROPERTY_SEED: replay?.[1],
          COSYTE_PROPERTY_PATH: replay?.[2],
        },
      );
    } catch (err) {
      replayed = (err as Error).message;
    }
    expect(replayed).toMatch(/property failed after 1 case\(s\)/u);
    expect(replayed).toContain("Counterexample: [50]");
  });
});
