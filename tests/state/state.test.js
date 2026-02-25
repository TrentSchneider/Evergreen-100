import { describe, it, expect, beforeEach } from "vitest";
import {
  state,
  setExerciseValue,
  setRowExpanded,
  setSettingsExpanded,
  setTheme,
  setLastLogDate,
  incrementStreak,
  resetStreak,
  setAllExerciseValues
} from "../../src/state/state.js";

describe("state module", () => {
  beforeEach(() => {
    // Reset state to a clean baseline
    state.values = {};
    state.settings = {
      theme: "auto",
      lastLogDate: null,
      streak: 0,
      layout: {
        rowExpanded: {},
        tierExpanded: {},
        settingsExpanded: false
      }
    };
  });

  it("sets exercise values", () => {
    setExerciseValue("pushups", 12);
    expect(state.values["pushups"]).toBe(12);
  });

  it("sets multiple exercise values", () => {
    setAllExerciseValues({ a: 1, b: 2 });
    expect(state.values).toEqual({ a: 1, b: 2 });
  });

  it("sets row expanded state", () => {
    setRowExpanded("pushups", true);
    expect(state.settings.layout.rowExpanded["pushups"]).toBe(true);
  });

  it("sets settings expanded state", () => {
    setSettingsExpanded(true);
    expect(state.settings.layout.settingsExpanded).toBe(true);
  });

  it("sets theme", () => {
    setTheme("dark");
    expect(state.settings.theme).toBe("dark");
  });

  it("sets last log date", () => {
    setLastLogDate("2024-01-15");
    expect(state.settings.lastLogDate).toBe("2024-01-15");
  });

  it("increments streak", () => {
    incrementStreak();
    incrementStreak();
    expect(state.settings.streak).toBe(2);
  });

  it("resets streak", () => {
    state.settings.streak = 5;
    resetStreak();
    expect(state.settings.streak).toBe(0);
  });
});
