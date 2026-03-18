import { describe, it, expect } from "vitest";
import {
  formatValue,
  parseValue,
  formatTotal,
  remaining,
  completionClass,
  completionRatio
} from "../../src/utils/formatting.js";
import { EXERCISES } from "../../src/data/config.js";

describe("formatting utilities", () => {
  const ex = EXERCISES[0]; // any exercise works
  const timeEx = EXERCISES.find(item => item.type === "time");

  it("formats values correctly", () => {
    expect(formatValue(ex, 5)).toBe("5");
    expect(formatValue(ex, 0)).toBe("0");
  });

  it("parses values correctly", () => {
    expect(parseValue(ex, "7")).toBe(7);
    expect(parseValue(ex, "0")).toBe(0);
    expect(parseValue(ex, "")).toBe(0);
  });

  it("formats total correctly", () => {
    expect(formatTotal(ex)).toBe(String(ex.total));
  });

  it("computes remaining correctly", () => {
    expect(remaining(ex, 0)).toBe(`${ex.total} remaining`);
    expect(remaining(ex, ex.total)).toBe("Complete");
    expect(remaining(ex, ex.total + 5)).toBe("Over");
  });

  it("computes completion class correctly", () => {
    expect(completionClass(ex, 0)).toBe("neutral");
    expect(completionClass(ex, ex.total - 1)).toBe("approaching");
    expect(completionClass(ex, ex.total)).toBe("complete");
    expect(completionClass(ex, ex.total + 1)).toBe("over");
  });

  it("computes completion ratio correctly", () => {
    expect(completionRatio(ex, 0)).toBe(0);
    expect(completionRatio(ex, ex.total)).toBe(1);
    expect(completionRatio(ex, ex.total * 2)).toBeGreaterThan(1);
  });

  it("formats and parses time values", () => {
    expect(formatValue(timeEx, 65)).toBe("1:05");
    expect(parseValue(timeEx, "1:05")).toBe(65);
    expect(parseValue(timeEx, "12:30")).toBe(750);
  });
});
