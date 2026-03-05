import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("app bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes database and renders UI on same-day load", async () => {
    const initDb = vi.fn().mockResolvedValue(undefined);
    const openDb = vi.fn().mockResolvedValue({});

    const getAllValues = vi.fn().mockResolvedValue({ push: 12 });
    const loadSettings = vi.fn((state, tiers, callback) => callback());
    const saveSettings = vi.fn();
    const snapshotDay = vi.fn();
    const saveValue = vi.fn();

    const setAllExerciseValues = vi.fn();
    const setLastLogDate = vi.fn();
    const incrementStreak = vi.fn();
    const resetStreak = vi.fn();

    const applyTheme = vi.fn();
    const initSummaryUI = vi.fn();
    const initScrollShadows = vi.fn();
    const recomputeAndRenderSummary = vi.fn();
    const renderHistory = vi.fn();
    const renderTiers = vi.fn();
    const wireSettingsCard = vi.fn();
    const wireResetButton = vi.fn();

    const appState = {
      values: {},
      settings: {
        lastLogDate: "2026-03-04",
        streak: 0,
        longestStreak: 0,
        theme: "auto",
        layout: {
          settingsExpanded: false,
          tierExpanded: {},
          rowExpanded: {}
        }
      }
    };

    vi.doMock("../../../src/state/storage.js", () => ({
      initDb,
      loadStore: vi.fn().mockResolvedValue({
        getAllValues,
        loadSettings,
        saveSettings,
        snapshotDay,
        saveValue
      })
    }));

    vi.doMock("../../../src/db/openDb.js", () => ({ openDb }));

    vi.doMock("../../../src/state/state.js", () => ({
      state: appState,
      setLastLogDate,
      incrementStreak,
      resetStreak,
      setAllExerciseValues
    }));

    vi.doMock("../../../src/data/config.js", () => ({
      EXERCISES: [{ id: "push", name: "Push" }],
      TIERS: [{ id: 1, defaultExpanded: true }]
    }));

    vi.doMock("../../../src/utils/dates.js", () => ({
      todayString: vi.fn(() => "2026-03-04")
    }));

    vi.doMock("../../../src/state/completion.js", () => ({
      computeGlobalPercent: vi.fn(() => 100)
    }));

    vi.doMock("../../../src/ui/theme.js", () => ({ applyTheme }));
    vi.doMock("../../../src/ui/summary.js", () => ({
      initSummaryUI,
      recomputeAndRenderSummary,
      renderHistory
    }));
    vi.doMock("../../../src/ui/tiers.js", () => ({ renderTiers }));
    vi.doMock("../../../src/ui/settings.js", () => ({ wireSettingsCard }));
    vi.doMock("../../../src/ui/reset.js", () => ({ wireResetButton }));
    vi.doMock("../../../src/ui/scrollShadows.js", () => ({ initScrollShadows }));

    let domContentLoadedHandler = null;
    const nativeAddEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "DOMContentLoaded") {
        domContentLoadedHandler = listener;
        return;
      }
      return nativeAddEventListener(type, listener, options);
    });

    await import("../../../src/app.js");

    expect(domContentLoadedHandler).toBeTypeOf("function");
    await domContentLoadedHandler();
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(initDb).toHaveBeenCalledTimes(1);
    expect(openDb).toHaveBeenCalledTimes(1);
    expect(initSummaryUI).toHaveBeenCalledTimes(1);
    expect(initScrollShadows).toHaveBeenCalledTimes(1);

    expect(getAllValues).toHaveBeenCalledTimes(1);
    expect(setAllExerciseValues).toHaveBeenCalledWith({ push: 12 });
    expect(loadSettings).toHaveBeenCalledTimes(1);

    expect(applyTheme).toHaveBeenCalledTimes(1);
    expect(renderTiers).toHaveBeenCalledTimes(1);
    expect(wireSettingsCard).toHaveBeenCalledTimes(1);
    expect(wireResetButton).toHaveBeenCalledTimes(1);
    expect(recomputeAndRenderSummary).toHaveBeenCalledTimes(1);
    expect(renderHistory).toHaveBeenCalledTimes(1);

    expect(saveSettings).not.toHaveBeenCalled();
    expect(snapshotDay).not.toHaveBeenCalled();
    expect(saveValue).not.toHaveBeenCalled();
    expect(setLastLogDate).not.toHaveBeenCalled();
    expect(incrementStreak).not.toHaveBeenCalled();
    expect(resetStreak).not.toHaveBeenCalled();
  });

  it("snapshots and resets values on a new day when completion was 100%", async () => {
    const initDb = vi.fn().mockResolvedValue(undefined);
    const openDb = vi.fn().mockResolvedValue({});

    const getAllValues = vi.fn().mockResolvedValue({ push: 12, pull: 8 });
    const saveSettings = vi.fn().mockResolvedValue(undefined);
    const saveValue = vi.fn().mockResolvedValue(undefined);
    const snapshotDay = vi.fn((date, values, compute, callback) => callback(100));
    const loadSettings = vi.fn((state, tiers, callback) => callback());

    const setAllExerciseValues = vi.fn();
    const setLastLogDate = vi.fn();
    const incrementStreak = vi.fn();
    const resetStreak = vi.fn();

    const applyTheme = vi.fn();
    const initSummaryUI = vi.fn();
    const initScrollShadows = vi.fn();
    const recomputeAndRenderSummary = vi.fn();
    const renderHistory = vi.fn();
    const renderTiers = vi.fn();
    const wireSettingsCard = vi.fn();
    const wireResetButton = vi.fn();

    const appState = {
      values: { push: 12, pull: 8 },
      settings: {
        lastLogDate: "2026-03-03",
        streak: 0,
        longestStreak: 0,
        theme: "auto",
        layout: {
          settingsExpanded: false,
          tierExpanded: {},
          rowExpanded: {}
        }
      }
    };

    vi.doMock("../../../src/state/storage.js", () => ({
      initDb,
      loadStore: vi.fn().mockResolvedValue({
        getAllValues,
        loadSettings,
        saveSettings,
        snapshotDay,
        saveValue
      })
    }));

    vi.doMock("../../../src/db/openDb.js", () => ({ openDb }));

    vi.doMock("../../../src/state/state.js", () => ({
      state: appState,
      setLastLogDate,
      incrementStreak,
      resetStreak,
      setAllExerciseValues
    }));

    vi.doMock("../../../src/data/config.js", () => ({
      EXERCISES: [
        { id: "push", name: "Push" },
        { id: "pull", name: "Pull" }
      ],
      TIERS: [{ id: 1, defaultExpanded: true }]
    }));

    vi.doMock("../../../src/utils/dates.js", () => ({
      todayString: vi.fn(() => "2026-03-04")
    }));

    vi.doMock("../../../src/state/completion.js", () => ({
      computeGlobalPercent: vi.fn(() => 100)
    }));

    vi.doMock("../../../src/ui/theme.js", () => ({ applyTheme }));
    vi.doMock("../../../src/ui/summary.js", () => ({
      initSummaryUI,
      recomputeAndRenderSummary,
      renderHistory
    }));
    vi.doMock("../../../src/ui/tiers.js", () => ({ renderTiers }));
    vi.doMock("../../../src/ui/settings.js", () => ({ wireSettingsCard }));
    vi.doMock("../../../src/ui/reset.js", () => ({ wireResetButton }));
    vi.doMock("../../../src/ui/scrollShadows.js", () => ({ initScrollShadows }));

    let domContentLoadedHandler = null;
    const nativeAddEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "DOMContentLoaded") {
        domContentLoadedHandler = listener;
        return;
      }
      return nativeAddEventListener(type, listener, options);
    });

    await import("../../../src/app.js");

    expect(domContentLoadedHandler).toBeTypeOf("function");
    await domContentLoadedHandler();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(snapshotDay).toHaveBeenCalledTimes(1);
    expect(snapshotDay).toHaveBeenCalledWith(
      "2026-03-03",
      appState.values,
      expect.any(Function),
      expect.any(Function)
    );

    expect(incrementStreak).toHaveBeenCalledTimes(1);
    expect(resetStreak).not.toHaveBeenCalled();

    expect(saveValue).toHaveBeenCalledTimes(2);
    expect(saveValue).toHaveBeenCalledWith("push", 0, expect.any(Function));
    expect(saveValue).toHaveBeenCalledWith("pull", 0, expect.any(Function));

    expect(setLastLogDate).toHaveBeenCalledWith("2026-03-04");
    expect(saveSettings).toHaveBeenCalled();

    expect(applyTheme).toHaveBeenCalledTimes(1);
    expect(renderTiers).toHaveBeenCalledTimes(1);
    expect(wireSettingsCard).toHaveBeenCalledTimes(1);
    expect(wireResetButton).toHaveBeenCalledTimes(1);
    expect(recomputeAndRenderSummary).toHaveBeenCalledTimes(1);
    expect(renderHistory).toHaveBeenCalledTimes(1);
  });

  it("sets first-run date and persists settings when no last log exists", async () => {
    const initDb = vi.fn().mockResolvedValue(undefined);
    const openDb = vi.fn().mockResolvedValue({});

    const getAllValues = vi.fn().mockResolvedValue({ push: 0 });
    const saveSettings = vi.fn().mockResolvedValue(undefined);
    const saveValue = vi.fn();
    const snapshotDay = vi.fn();
    const loadSettings = vi.fn((state, tiers, callback) => callback());

    const setAllExerciseValues = vi.fn();
    const setLastLogDate = vi.fn();
    const incrementStreak = vi.fn();
    const resetStreak = vi.fn();

    const applyTheme = vi.fn();
    const initSummaryUI = vi.fn();
    const initScrollShadows = vi.fn();
    const recomputeAndRenderSummary = vi.fn();
    const renderHistory = vi.fn();
    const renderTiers = vi.fn();
    const wireSettingsCard = vi.fn();
    const wireResetButton = vi.fn();

    const appState = {
      values: {},
      settings: {
        lastLogDate: null,
        streak: 0,
        longestStreak: 0,
        theme: "auto",
        layout: {
          settingsExpanded: false,
          tierExpanded: {},
          rowExpanded: {}
        }
      }
    };

    vi.doMock("../../../src/state/storage.js", () => ({
      initDb,
      loadStore: vi.fn().mockResolvedValue({
        getAllValues,
        loadSettings,
        saveSettings,
        snapshotDay,
        saveValue
      })
    }));

    vi.doMock("../../../src/db/openDb.js", () => ({ openDb }));

    vi.doMock("../../../src/state/state.js", () => ({
      state: appState,
      setLastLogDate,
      incrementStreak,
      resetStreak,
      setAllExerciseValues
    }));

    vi.doMock("../../../src/data/config.js", () => ({
      EXERCISES: [{ id: "push", name: "Push" }],
      TIERS: [{ id: 1, defaultExpanded: true }]
    }));

    vi.doMock("../../../src/utils/dates.js", () => ({
      todayString: vi.fn(() => "2026-03-04")
    }));

    vi.doMock("../../../src/state/completion.js", () => ({
      computeGlobalPercent: vi.fn(() => 100)
    }));

    vi.doMock("../../../src/ui/theme.js", () => ({ applyTheme }));
    vi.doMock("../../../src/ui/summary.js", () => ({
      initSummaryUI,
      recomputeAndRenderSummary,
      renderHistory
    }));
    vi.doMock("../../../src/ui/tiers.js", () => ({ renderTiers }));
    vi.doMock("../../../src/ui/settings.js", () => ({ wireSettingsCard }));
    vi.doMock("../../../src/ui/reset.js", () => ({ wireResetButton }));
    vi.doMock("../../../src/ui/scrollShadows.js", () => ({ initScrollShadows }));

    let domContentLoadedHandler = null;
    const nativeAddEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "DOMContentLoaded") {
        domContentLoadedHandler = listener;
        return;
      }
      return nativeAddEventListener(type, listener, options);
    });

    await import("../../../src/app.js");

    expect(domContentLoadedHandler).toBeTypeOf("function");
    await domContentLoadedHandler();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(setLastLogDate).toHaveBeenCalledWith("2026-03-04");
    expect(saveSettings).toHaveBeenCalledTimes(1);

    expect(snapshotDay).not.toHaveBeenCalled();
    expect(saveValue).not.toHaveBeenCalled();
    expect(incrementStreak).not.toHaveBeenCalled();
    expect(resetStreak).not.toHaveBeenCalled();

    expect(applyTheme).toHaveBeenCalledTimes(1);
    expect(renderTiers).toHaveBeenCalledTimes(1);
    expect(wireSettingsCard).toHaveBeenCalledTimes(1);
    expect(wireResetButton).toHaveBeenCalledTimes(1);
    expect(recomputeAndRenderSummary).toHaveBeenCalledTimes(1);
    expect(renderHistory).toHaveBeenCalledTimes(1);
  });

  it("resets streak on a new day when completion is below 100%", async () => {
    const initDb = vi.fn().mockResolvedValue(undefined);
    const openDb = vi.fn().mockResolvedValue({});

    const getAllValues = vi.fn().mockResolvedValue({ push: 2, pull: 1 });
    const saveSettings = vi.fn().mockResolvedValue(undefined);
    const saveValue = vi.fn().mockResolvedValue(undefined);
    const snapshotDay = vi.fn((date, values, compute, callback) => callback(65));
    const loadSettings = vi.fn((state, tiers, callback) => callback());

    const setAllExerciseValues = vi.fn();
    const setLastLogDate = vi.fn();
    const incrementStreak = vi.fn();
    const resetStreak = vi.fn();

    const applyTheme = vi.fn();
    const initSummaryUI = vi.fn();
    const initScrollShadows = vi.fn();
    const recomputeAndRenderSummary = vi.fn();
    const renderHistory = vi.fn();
    const renderTiers = vi.fn();
    const wireSettingsCard = vi.fn();
    const wireResetButton = vi.fn();

    const appState = {
      values: { push: 2, pull: 1 },
      settings: {
        lastLogDate: "2026-03-03",
        streak: 4,
        longestStreak: 8,
        theme: "auto",
        layout: {
          settingsExpanded: false,
          tierExpanded: {},
          rowExpanded: {}
        }
      }
    };

    vi.doMock("../../../src/state/storage.js", () => ({
      initDb,
      loadStore: vi.fn().mockResolvedValue({
        getAllValues,
        loadSettings,
        saveSettings,
        snapshotDay,
        saveValue
      })
    }));

    vi.doMock("../../../src/db/openDb.js", () => ({ openDb }));

    vi.doMock("../../../src/state/state.js", () => ({
      state: appState,
      setLastLogDate,
      incrementStreak,
      resetStreak,
      setAllExerciseValues
    }));

    vi.doMock("../../../src/data/config.js", () => ({
      EXERCISES: [
        { id: "push", name: "Push" },
        { id: "pull", name: "Pull" }
      ],
      TIERS: [{ id: 1, defaultExpanded: true }]
    }));

    vi.doMock("../../../src/utils/dates.js", () => ({
      todayString: vi.fn(() => "2026-03-04")
    }));

    vi.doMock("../../../src/state/completion.js", () => ({
      computeGlobalPercent: vi.fn(() => 65)
    }));

    vi.doMock("../../../src/ui/theme.js", () => ({ applyTheme }));
    vi.doMock("../../../src/ui/summary.js", () => ({
      initSummaryUI,
      recomputeAndRenderSummary,
      renderHistory
    }));
    vi.doMock("../../../src/ui/tiers.js", () => ({ renderTiers }));
    vi.doMock("../../../src/ui/settings.js", () => ({ wireSettingsCard }));
    vi.doMock("../../../src/ui/reset.js", () => ({ wireResetButton }));
    vi.doMock("../../../src/ui/scrollShadows.js", () => ({ initScrollShadows }));

    let domContentLoadedHandler = null;
    const nativeAddEventListener = window.addEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "DOMContentLoaded") {
        domContentLoadedHandler = listener;
        return;
      }
      return nativeAddEventListener(type, listener, options);
    });

    await import("../../../src/app.js");

    expect(domContentLoadedHandler).toBeTypeOf("function");
    await domContentLoadedHandler();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(snapshotDay).toHaveBeenCalledTimes(1);
    expect(incrementStreak).not.toHaveBeenCalled();
    expect(resetStreak).toHaveBeenCalledTimes(1);

    expect(saveValue).toHaveBeenCalledTimes(2);
    expect(setLastLogDate).toHaveBeenCalledWith("2026-03-04");
    expect(saveSettings).toHaveBeenCalled();

    expect(applyTheme).toHaveBeenCalledTimes(1);
    expect(renderTiers).toHaveBeenCalledTimes(1);
    expect(wireSettingsCard).toHaveBeenCalledTimes(1);
    expect(wireResetButton).toHaveBeenCalledTimes(1);
    expect(recomputeAndRenderSummary).toHaveBeenCalledTimes(1);
    expect(renderHistory).toHaveBeenCalledTimes(1);
  });
});
