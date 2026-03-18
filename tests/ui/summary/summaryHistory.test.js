import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";

const loadHistoryMock = vi.fn();

vi.mock("../../../src/state/storage.js", () => ({
  loadStore: () =>
    Promise.resolve({
      loadHistory: loadHistoryMock
    })
}));

let renderHistory;
let appState;

beforeAll(async () => {
  vi.resetModules();
  ({ state: appState } = await import("../../../src/state/state.js"));
  ({ renderHistory } = await import("../../../src/ui/summary.js"));
});

describe("summary history rendering", () => {
  beforeEach(() => {
    loadHistoryMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T12:00:00Z"));

    document.body.innerHTML = `
      <div data-history="streak"></div>
      <div data-history="yesterday"></div>
      <div data-history="list"></div>
    `;

    appState.settings = {
      theme: "auto",
      layout: {
        settingsExpanded: false,
        tierExpanded: {},
        rowExpanded: {}
      },
      streak: 5,
      longestStreak: 10
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("populates streak, yesterday, and recent history", async () => {
    const logs = [
      { date: "2024-02-10", completion: 92 },
      { date: "2024-02-09", completion: 74 },
      { date: "2024-02-08", completion: 40 }
    ];

    loadHistoryMock.mockImplementation(cb => cb(logs));

    await renderHistory();

    expect(document.querySelector('[data-history="streak"]').textContent).toBe(
      "5 days"
    );
    expect(document.querySelector('[data-history="yesterday"]').textContent).toBe(
      "74%"
    );

    const list = document.querySelector('[data-history="list"]');
    expect(list.children.length).toBe(3);
    expect(list.firstElementChild?.querySelector(".history-percent").textContent).toBe(
      "92%"
    );
  });
});
