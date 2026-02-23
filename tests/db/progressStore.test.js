import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "../helpers/resetDb.js";
import * as openDbModule from "../../src/db/openDb.js";
import {
  getAllValues,
  saveValue,
  loadSettings,
  saveSettings,
  snapshotDay,
  loadHistory
} from "../../src/db/progressStore.js";

import { DB_NAME } from "../../src/db/schema.js";

const { openDb, __closeDbInstance, __resetDbInstance } = openDbModule;

const EXERCISES = [
  { id: "push" },
  { id: "pull" },
  { id: "core" },
  { id: "legs" },
  { id: "grip" },
  { id: "utility" }
];

describe("progressStore", () => {
  beforeEach(resetDb);

  it("getAllValues returns seeded defaults", async () => {
    const values = await getAllValues(EXERCISES);
    expect(values.push).toBe(0);
    expect(values.pull).toBe(0);
  });

  it("saveValue updates value", async () => {
    const today = () => "2026-02-22";
    await saveValue("push", 10, today);
    const values = await getAllValues(EXERCISES);
    expect(values.push).toBe(10);
  });

  it("loadSettings returns seeded defaults", async () => {
    const state = { settings: { layout: {} } };
    const tiers = [{ id: 1, defaultExpanded: true }];

    await new Promise(resolve => loadSettings(state, tiers, resolve));

    expect(state.settings.theme).toBe("auto");
    expect(state.settings.layout.tierExpanded[1]).toBe(true);
  });

  it("saveSettings persists changes", async () => {
    const state = {
      settings: {
        theme: "dark",
        layout: { settingsExpanded: true, tierExpanded: {}, rowExpanded: {} },
        lastLogDate: null,
        streak: 0,
        longestStreak: 0
      }
    };

    await saveSettings(state);

    const loaded = { settings: { layout: {} } };
    const tiers = [];

    await new Promise(resolve => loadSettings(loaded, tiers, resolve));

    expect(loaded.settings.theme).toBe("dark");
  });

  it("snapshotDay writes a daily log", async () => {
    const values = { push: 10 };
    const compute = () => 40;

    await new Promise(resolve =>
      snapshotDay("2026-02-21", values, compute, resolve)
    );

    await new Promise(resolve => {
      loadHistory(logs => {
        expect(logs.length).toBe(1);
        expect(logs[0].completion).toBe(40);
        resolve();
      });
    });
  });
});
