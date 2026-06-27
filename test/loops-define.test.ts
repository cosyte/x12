/**
 * Unit tests for `defineLoopSpec()` — Phase 2's public loop-authoring API.
 * The DOGFOODING gate: built-in transaction loop specs in Phases 3+ are
 * authored through this same API. Misbehaving validation here surfaces as
 * Phase 3+ work being unable to declare its own loops, so the surface is
 * exercised end-to-end (well-formed + adversarial) at the bottom of the
 * stack before any consumer touches it.
 */

import { describe, expect, it } from "vitest";

import { LoopSpecDefinitionError, defineLoopSpec } from "../src/loops/define.js";

describe("defineLoopSpec — happy path", () => {
  it("freezes and returns a structurally-valid LoopSpec", () => {
    const Loop2110 = defineLoopSpec({
      id: "2110",
      description: "835 Service Payment Information",
      trigger: "SVC",
      segments: [
        { id: "SVC", usage: "required", max: 1 },
        { id: "DTM", usage: "situational", max: ">1" },
        { id: "CAS", usage: "situational", max: ">1" },
      ],
    });
    expect(Loop2110.id).toBe("2110");
    expect(Loop2110.trigger).toBe("SVC");
    expect(Loop2110.description).toBe("835 Service Payment Information");
    expect(Loop2110.segments).toHaveLength(3);
    expect(Loop2110.children).toEqual([]);
    expect(Object.isFrozen(Loop2110)).toBe(true);
    expect(Object.isFrozen(Loop2110.segments)).toBe(true);
    expect(Object.isFrozen(Loop2110.children)).toBe(true);
    expect(Object.isFrozen(Loop2110.segments[0])).toBe(true);
  });
  it("composes with nested children (recursive defineLoopSpec calls)", () => {
    const inner = defineLoopSpec({
      id: "2110",
      trigger: "SVC",
      segments: [{ id: "SVC", usage: "required", max: 1 }],
    });
    const outer = defineLoopSpec({
      id: "2100",
      trigger: "CLP",
      segments: [{ id: "CLP", usage: "required", max: 1 }],
      children: [inner],
    });
    expect(outer.children).toHaveLength(1);
    expect(outer.children[0]?.trigger).toBe("SVC");
  });
  it("defaults description to absent (no `description` key on the returned object)", () => {
    const loop = defineLoopSpec({
      id: "L",
      trigger: "STX",
      segments: [{ id: "STX", usage: "required", max: 1 }],
    });
    expect("description" in loop).toBe(false);
  });
});

describe("defineLoopSpec — structural validation refuses consumer bugs", () => {
  it("rejects an empty id", () => {
    expect(() =>
      defineLoopSpec({
        id: "",
        trigger: "STX",
        segments: [{ id: "STX", usage: "required", max: 1 }],
      }),
    ).toThrow(LoopSpecDefinitionError);
  });
  it("rejects a lowercase trigger (TR3 segment ids are uppercase)", () => {
    expect(() =>
      defineLoopSpec({
        id: "L",
        trigger: "clm",
        segments: [{ id: "clm", usage: "required", max: 1 }],
      }),
    ).toThrow(LoopSpecDefinitionError);
  });
  it("rejects a trigger that does not equal the first segment id", () => {
    expect(() =>
      defineLoopSpec({
        id: "L",
        trigger: "CLM",
        segments: [{ id: "DTP", usage: "required", max: 1 }],
      }),
    ).toThrow(LoopSpecDefinitionError);
  });
  it("rejects an empty segments array", () => {
    expect(() =>
      defineLoopSpec({
        id: "L",
        trigger: "CLM",
        segments: [],
      }),
    ).toThrow(LoopSpecDefinitionError);
  });
  it("rejects a segment with an invalid usage", () => {
    expect(() =>
      defineLoopSpec({
        id: "L",
        trigger: "CLM",
        segments: [{ id: "CLM", usage: "wat" as unknown as "required", max: 1 }],
      }),
    ).toThrow(LoopSpecDefinitionError);
  });
  it("rejects a segment with a non-positive / non-integer max", () => {
    expect(() =>
      defineLoopSpec({
        id: "L",
        trigger: "CLM",
        segments: [{ id: "CLM", usage: "required", max: 0 }],
      }),
    ).toThrow(LoopSpecDefinitionError);
    expect(() =>
      defineLoopSpec({
        id: "L",
        trigger: "CLM",
        segments: [{ id: "CLM", usage: "required", max: 1.5 }],
      }),
    ).toThrow(LoopSpecDefinitionError);
  });
  it("accepts `>1` as max", () => {
    const loop = defineLoopSpec({
      id: "L",
      trigger: "CLM",
      segments: [{ id: "CLM", usage: "required", max: ">1" }],
    });
    expect(loop.segments[0]?.max).toBe(">1");
  });
  it("LoopSpecDefinitionError carries the offending path", () => {
    try {
      defineLoopSpec({
        id: "L",
        trigger: "CLM",
        segments: [
          { id: "CLM", usage: "required", max: 1 },
          { id: "bad", usage: "required", max: 1 },
        ],
      });
      throw new Error("expected throw");
    } catch (err) {
      if (!(err instanceof LoopSpecDefinitionError)) throw err;
      expect(err.path).toBe("segments[1].id");
    }
  });
});
