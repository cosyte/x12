import { describe, expect, it } from "vitest";
import { VERSION } from "../src/index.js";

describe("@cosyte/x12 scaffold", () => {
  it("exports VERSION as a string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION).toBe("0.0.0");
  });
});
