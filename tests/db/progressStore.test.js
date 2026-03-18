import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "../helpers/resetDb.js";
import * as openDbModule from "../../src/db/openDb.js";
import {
  getAllValues,
  saveValue,
  loadSettings,
  saveSettings,
  snapshotDay,
  loadHistory,
  loadStressHistory
} from "../../src/db/progressStore.js";

import { DB_NAME } from "../../src/db/schema.js";
import { EvergreenConfig } from "../../src/data/config.js";

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

  it("saveValue preserves lastCompletedDate when resetting value to zero", async () => {
    await saveValue("push", 10, () => "2026-02-22");
    await saveValue("push", 0, () => "2026-02-23");

    await __closeDbInstance?.();
    __resetDbInstance?.();

    const db = await openDb();
    const tx = db.transaction("progress", "readonly");
    const store = tx.objectStore("progress");

    const record = await new Promise(resolve => {
      const req = store.get("push");
      req.onsuccess = () => resolve(req.result);
    });

    expect(record.value).toBe(0);
    expect(record.lastCompletedDate).toBe("2026-02-22");
  });

  it("saveValue creates a record when one does not already exist", async () => {
    await saveValue("new-exercise", 7, () => "2026-02-24");

    await __closeDbInstance?.();
    __resetDbInstance?.();

    const db = await openDb();
    const tx = db.transaction(DB_NAME === "evergreen100" ? "progress" : "progress", "readonly");
    const store = tx.objectStore("progress");

    const record = await new Promise(resolve => {
      const req = store.get("new-exercise");
      req.onsuccess = () => resolve(req.result);
    });

    expect(record).toEqual({
      id: "new-exercise",
      value: 7,
      lastCompletedDate: "2026-02-24"
    });
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

  it("snapshotDay stores stress logs and loadStressHistory flattens them oldest first", async () => {
    await new Promise(resolve =>
      snapshotDay(
        "2026-02-22",
        { push: 10, grip: 30, utility: 0 },
        () => 55,
        EvergreenConfig,
        resolve
      )
    );

    await new Promise(resolve =>
      snapshotDay(
        "2026-02-21",
        { legs: 25 },
        () => 25,
        EvergreenConfig,
        resolve
      )
    );

    await new Promise(resolve => {
      loadHistory(logs => {
        expect(logs).toHaveLength(2);
        expect(logs[0].date).toBe("2026-02-22");
        expect(logs[0].stressLogs.map(log => log.exId)).toEqual([
          "push",
          "grip"
        ]);
        expect(logs[1].stressLogs.map(log => log.exId)).toEqual(["legs"]);
        resolve();
      });
    });

    await new Promise(resolve => {
      loadStressHistory(history => {
        expect(history).toHaveLength(3);
        expect(history[0].exId).toBe("legs");
        expect(history[0].date).toBe("2026-02-21");
        expect(history.slice(1).map(entry => entry.date)).toEqual([
          "2026-02-22",
          "2026-02-22"
        ]);
        expect(history.slice(1).map(entry => entry.exId)).toEqual([
          "push",
          "grip"
        ]);
        resolve();
      });
    });
  });

  it("loadStressHistory derives entries from legacy logs without stressLogs", async () => {
    await new Promise(resolve =>
      snapshotDay("2026-02-23", { grip: 45, utility: 10 }, () => 65, resolve)
    );

    await new Promise(resolve => {
      loadStressHistory(history => {
        expect(history.map(entry => entry.exId)).toEqual(["grip", "utility"]);
        expect(history.map(entry => entry.date)).toEqual([
          "2026-02-23",
          "2026-02-23"
        ]);
        resolve();
      });
    });
  });
});
