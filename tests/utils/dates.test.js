import { describe, it, expect } from "vitest";
import {
  todayString,
  parseLocalDate,
  formatShort
} from "../../src/utils/dates.js";

describe("date utilities", () => {
  it("returns today as YYYY-MM-DD", () => {
    const today = new Date();
    const expected =
      `${today.getFullYear()}-` +
      `${String(today.getMonth() + 1).padStart(2, "0")}-` +
      `${String(today.getDate()).padStart(2, "0")}`;
    expect(todayString()).toBe(expected);
  });

  it("parses local date correctly", () => {
    const d = parseLocalDate("2024-01-15");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it("formats history dates correctly", () => {
    expect(formatShort("2024-01-15")).toBe("Jan 15");
    expect(formatShort("2024-12-01")).toBe("Dec 1");
  });
});
