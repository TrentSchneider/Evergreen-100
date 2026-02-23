// =========================================================
// Evergreen Config
// =========================================================

// Lazy-load DB store functions
async function loadStore() {
  return await import("./db/progressStore.js");
}

// Lazy-load DB initialization
export async function initDb() {
  const { openDb } = await import("./db/openDb.js");
  return openDb();
}

const EvergreenConfig = {
  dbName: "evergreen100_v2",
  dbStore: "progress",
  swipeThreshold: 40,
  tiers: [
    { id: 1, name: "Primary Movements", defaultExpanded: true },
    { id: 2, name: "Accessory Work", defaultExpanded: true }
  ],
  exercises: [
    { id: "push", name: "Push-ups", total: 25, type: "count", tier: 1 },
    {
      id: "pull",
      name: "Inverted Table Row",
      total: 25,
      type: "count",
      tier: 1
    },
    {
      id: "core",
      name: "Plank With Knee Taps",
      total: 25,
      type: "count",
      tier: 1
    },
    { id: "legs", name: "Slow Squats", total: 25, type: "count", tier: 1 },
    { id: "grip", name: "Farmer Carry", total: 120, type: "time", tier: 2 },
    { id: "utility", name: "Scapular Shrug", total: 25, type: "count", tier: 2 }
  ],
  thresholds: {
    approaching: 0.8,
    complete: 1.0,
    over: 1.01
  },
  recoveryTypes: {
    muscle: { baseDays: 0 },
    tendon: { baseDays: 1 },
    ligament: { baseDays: 2 }
  },
  recoveryRankMax: 5
};

const EXERCISES = EvergreenConfig.exercises;
const TIERS = EvergreenConfig.tiers;

// =========================================================
// State
// =========================================================

let state = {
  values: {},
  settings: {
    theme: "auto",
    layout: {
      settingsExpanded: false,
      tierExpanded: {},
      rowExpanded: {}
    },
    lastLogDate: null,
    streak: 0,
    longestStreak: 0
  }
};

// =========================================================
// Helpers
// =========================================================

function formatValue(ex, value) {
  if (ex.type === "time") {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return value;
}

function parseValue(ex, text) {
  if (ex.type === "time") {
    const [m, s] = text.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  const n = Number(text);
  return isNaN(n) ? 0 : n;
}

function formatTotal(ex) {
  if (ex.type !== "time") return ex.total;
  const minutes = Math.floor(ex.total / 60);
  const seconds = ex.total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function remaining(ex, value) {
  const rem = ex.total - value;
  if (ex.type === "time") {
    const r = Math.max(rem, 0);
    const minutes = Math.floor(r / 60);
    const seconds = r % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")} remaining`;
  }
  return `${Math.max(rem, 0)} remaining`;
}

function completionRatio(ex, value) {
  return Math.max(0, Math.min(1, value / ex.total));
}

function completionClass(ex, value) {
  const ratio = value / ex.total;
  const t = EvergreenConfig.thresholds;
  if (ratio >= t.over) return "over";
  if (ratio >= t.complete) return "complete";
  if (ratio >= t.approaching) return "approaching";
  return "neutral";
}

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeCompletionPercent() {
  const ratios = EXERCISES.map(ex => {
    const value = state.values[ex.id] || 0;
    return Math.min(1, value / ex.total);
  });

  const avg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  return avg * 100;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatHistoryDate(dateString) {
  const date = parseLocalDate(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  const sameYear = date.getFullYear() === today.getFullYear();
  const options = sameYear
    ? { weekday: "short", month: "short", day: "numeric" }
    : { year: "numeric", month: "short", day: "numeric" };

  return date.toLocaleDateString(undefined, options);
}

// =========================================================
// Theme
// =========================================================

function applyTheme() {
  const mode = state.settings.theme;
  const body = document.body;

  body.classList.remove("theme-light", "theme-dark");

  if (mode === "light") {
    body.classList.add("theme-light");
  } else if (mode === "dark") {
    body.classList.add("theme-dark");
  } else {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) body.classList.add("theme-dark");
    else body.classList.add("theme-light");
  }

  positionThemeHighlight();
}

function positionThemeHighlight() {
  const highlight = document.getElementById("theme-highlight");
  if (!highlight) return;

  const mode = state.settings.theme;
  let index = 0;
  if (mode === "light") index = 1;
  if (mode === "dark") index = 2;

  highlight.style.transform = `translateX(${index * 100}%)`;
}

// =========================================================
// Summary Pill — Nested Drawer Version
// =========================================================

const summaryContainer = document.getElementById("summary-container");
const summaryPill = document.getElementById("summary-pill");
const summaryDrawer = document.getElementById("summary-drawer");
const summaryDrawerContent = document.getElementById("summary-drawer-content");
const pillProgressFill = document.querySelector(".pill-progress-fill");
const pillPercentEl = document.querySelector(".pill-percent");

let drawerOpen = false;

function computeGlobalPercent() {
  const totalRequired = EXERCISES.reduce((sum, ex) => sum + ex.total, 0);
  const totalDone = EXERCISES.reduce(
    (sum, ex) => sum + (state.values[ex.id] || 0),
    0
  );
  return Math.max(0, Math.min(1, totalDone / totalRequired)) * 100;
}

async function renderHistory() {
  const { loadHistory } = await loadStore();

  loadHistory(logs => {
    const streakEl = document.querySelector('[data-history="streak"]');
    const yesterdayEl = document.querySelector('[data-history="yesterday"]');
    const listEl = document.querySelector('[data-history="list"]');

    if (!streakEl || !yesterdayEl || !listEl) return;

    streakEl.textContent = `${state.settings.streak} day${
      state.settings.streak === 1 ? "" : "s"
    }`;

    const today = todayString();
    const yesterday = logs.find(l => l.date !== today);
    if (yesterday) {
      yesterdayEl.textContent = `${Math.round(yesterday.completion)}%`;
    } else {
      yesterdayEl.textContent = "—";
    }

    listEl.innerHTML = "";
    logs.slice(0, 7).forEach(log => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <span class="history-date">${formatHistoryDate(log.date)}</span>
        <span class="history-percent">${Math.round(log.completion)}%</span>
      `;
      listEl.appendChild(div);
    });
  });
}

function recomputeAndRenderSummary() {
  const globalPercent = computeCompletionPercent();

  const exercisesSummary = EXERCISES.map(ex => ({
    name: ex.name,
    percent: completionRatio(ex, state.values[ex.id] || 0) * 100
  }));

  updateSummary(globalPercent, exercisesSummary);
}

function updateSummary(globalPercent, exercisesSummary) {
  const clamped = Math.max(0, Math.min(100, globalPercent));

  if (pillProgressFill) {
    pillProgressFill.style.width = clamped + "%";
  }
  if (pillPercentEl) {
    pillPercentEl.textContent = Math.round(clamped) + "%";
  }

  summaryDrawerContent.innerHTML = "";

  exercisesSummary.forEach(item => {
    const row = document.createElement("div");
    row.className = "summary-row";

    const name = document.createElement("div");
    name.className = "summary-name";
    name.textContent = item.name;

    const miniBar = document.createElement("div");
    miniBar.className = "mini-bar";

    const miniFill = document.createElement("div");
    miniFill.className = "mini-bar-fill";

    const pct = Math.max(0, Math.min(100, item.percent || 0));
    miniFill.style.width = pct + "%";

    if (pct === 0) {
      miniFill.style.background = "var(--mini-fill-neutral)";
    } else if (pct < 100) {
      miniFill.style.background = "var(--mini-fill-approaching)";
    } else if (pct === 100) {
      miniFill.style.background = "var(--mini-fill-complete)";
    } else if (pct > 100) {
      miniFill.style.background = "var(--mini-fill-over)";
    }

    miniBar.appendChild(miniFill);
    row.appendChild(name);
    row.appendChild(miniBar);
    summaryDrawerContent.appendChild(row);
  });

  if (drawerOpen) {
    const contentHeight = summaryDrawerContent.scrollHeight;
    summaryDrawer.style.maxHeight = contentHeight + "px";
  }
}

if (summaryPill) {
  summaryPill.addEventListener("click", () => {
    drawerOpen = !drawerOpen;

    if (drawerOpen) {
      summaryContainer.classList.add("pre-expand");
      void summaryContainer.offsetWidth;
      summaryContainer.classList.add("expanded");
      const contentHeight = summaryDrawerContent.scrollHeight;
      summaryDrawer.style.maxHeight = contentHeight + "px";
      document.body.style.overflow = "hidden";
    } else {
      summaryContainer.classList.remove("expanded");
      summaryDrawer.style.maxHeight = "0";
      document.body.style.overflow = "";
    }
  });
}

// =========================================================
// Scroll Shadows
// =========================================================

const drawerScroll = document.querySelector(".drawer-scroll");
const shadowTop = document.querySelector(".scroll-shadow.top");
const shadowBottom = document.querySelector(".scroll-shadow.bottom");

function updateScrollShadows() {
  const { scrollTop, scrollHeight, clientHeight } = drawerScroll;

  if (scrollTop > 0) {
    shadowTop.classList.add("visible");
  } else {
    shadowTop.classList.remove("visible");
  }

  if (scrollTop + clientHeight < scrollHeight - 1) {
    shadowBottom.classList.add("visible");
  } else {
    shadowBottom.classList.remove("visible");
  }
}

drawerScroll.addEventListener("scroll", updateScrollShadows);

const observer = new ResizeObserver(updateScrollShadows);
observer.observe(drawerScroll);

// =========================================================
// Recovery Engine Integration
// =========================================================

async function isAvailable(ex) {
  const { loadHistory } = await loadStore();
  const { isExerciseAvailableOnDate } = await import("./recoveryEngine.js");

  return new Promise(resolve => {
    loadHistory(history => {
      const today = todayString();

      // Filter out today's log — recovery is based on *previous* completions
      const filtered = history.filter(h => h.date !== today);

      const available = isExerciseAvailableOnDate(
        ex.id,
        today,
        filtered,
        EvergreenConfig
      );

      resolve(available);
    });
  });
}

async function daysRemaining(ex) {
  const { loadHistory } = await loadStore();
  const { getDaysRemaining } = await import("./recoveryEngine.js");

  return new Promise(resolve => {
    loadHistory(history => {
      const today = todayString();
      const filtered = history.filter(h => h.date !== today);

      const days = getDaysRemaining(ex.id, today, filtered, EvergreenConfig);

      resolve(days);
    });
  });
}

// =========================================================
// Tiers & Rows
// =========================================================

function renderTiers() {
  const container = document.getElementById("tiers-container");
  if (!container) return;
  container.innerHTML = "";

  TIERS.forEach(tier => {
    const tierCard = document.createElement("div");
    tierCard.className = "card tier-card";

    const header = document.createElement("div");
    header.className = "tier-header";
    header.innerHTML = `
      <span>${tier.name}</span>
      <span class="tier-toggle" data-tier="${tier.id}">
        ${state.settings.layout.tierExpanded[tier.id] ? "▲" : "▼"}
      </span>
    `;
    header.addEventListener("click", () => toggleTier(tier.id));
    tierCard.appendChild(header);

    const tierBody = document.createElement("div");
    tierBody.id = `tier-body-${tier.id}`;
    tierBody.style.overflow = "hidden";
    tierBody.style.maxHeight = state.settings.layout.tierExpanded[tier.id]
      ? "1000px"
      : "0px";
    tierBody.style.transition = "max-height 0.3s ease";

    EXERCISES.filter(ex => ex.tier === tier.id).forEach(ex => {
      const row = document.createElement("div");
      row.className = "exercise-row loading";
      row.id = `row-${ex.id}`;

      const compact = document.createElement("div");
      compact.className = "compact-row";
      compact.innerHTML = `
        <div>${ex.name}</div>
        <div id="compact-${ex.id}">
          ${formatValue(ex, state.values[ex.id] || 0)} / ${formatTotal(ex)}
        </div>
      `;
      compact.addEventListener("click", () => toggleRowExpanded(ex.id));
      attachSwipe(compact, ex);

      const expanded = document.createElement("div");
      expanded.className = "expanded-row";
      expanded.id = `expanded-${ex.id}`;
      expanded.style.display = state.settings.layout.rowExpanded[ex.id]
        ? "block"
        : "none";

      const saveIcon = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path d="M0 1.5A1.5 1.5 0 0 1 1.5 0H3v5.5A1.5 1.5 0 0 0 4.5 7h7A1.5 1.5 0 0 0 13 5.5V0h.086a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5H14v-5.5A1.5 1.5 0 0 0 12.5 9h-9A1.5 1.5 0 0 0 2 10.5V16h-.5A1.5 1.5 0 0 1 0 14.5z"/>
        <path d="M3 16h10v-5.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5zm9-16H4v5.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5zM9 1h2v4H9z"/>
      </svg>`;

      expanded.innerHTML = `
        <div class="controls">
          <button id="save-${ex.id}" class="save-btn no-zoom">${saveIcon}</button>
          <input id="input-${ex.id}" type="text" />
          <button class="arrow-btn no-zoom" id="inc-${ex.id}">▲</button>
          <button class="arrow-btn no-zoom" id="dec-${ex.id}">▼</button>
        </div>
        <div class="expanded-row-footer">
          <span id="remaining-${ex.id}"></span>
        </div>
      `;

      row.appendChild(compact);
      row.appendChild(expanded);
      tierBody.appendChild(row);

      // Apply recovery availability state asynchronously
      setTimeout(async () => {
        const available = await isAvailable(ex);
        const value = state.values[ex.id] || 0;

        row.classList.remove("loading");

        if (!available) {
          row.classList.add("resting");
        } else {
          row.classList.remove("resting");
        }

        row.classList.add(completionClass(ex, value));
      }, 0);
    });

    tierCard.appendChild(tierBody);
    container.appendChild(tierCard);
  });

  wireRowControls();
}

async function toggleRowExpanded(id) {
  const { saveSettings } = await loadStore();

  state.settings.layout.rowExpanded[id] =
    !state.settings.layout.rowExpanded[id];

  saveSettings(state);

  const expanded = document.getElementById(`expanded-${id}`);
  if (!expanded) return;
  expanded.style.display = state.settings.layout.rowExpanded[id]
    ? "block"
    : "none";
}

// =========================================================
// Swipe Gestures
// =========================================================

function attachSwipe(element, ex) {
  let startX = 0;
  let endX = 0;

  element.addEventListener("touchstart", e => {
    startX = e.changedTouches[0].clientX;
  });

  element.addEventListener("touchend", e => {
    endX = e.changedTouches[0].clientX;
    const delta = endX - startX;
    const threshold = EvergreenConfig.swipeThreshold;

    if (
      Math.abs(delta) > threshold &&
      !state.settings.layout.rowExpanded[ex.id]
    ) {
      isAvailable(ex).then(available => {
        if (!available) return;
        if (delta > 0) adjust(ex, +1);
        else adjust(ex, -1);
      });
    }
  });
}

// =========================================================
// Adjust Values & Row Wiring
// =========================================================

async function adjust(ex, delta) {
  const { saveValue } = await loadStore();

  const current = state.values[ex.id] || 0;
  let value = current + delta;
  if (value < 0) value = 0;

  state.values[ex.id] = value;

  saveValue(ex.id, value, todayString, () => {
    updateRowUI(ex);
    recomputeAndRenderSummary();
    renderHistory();
  });
}

function updateRowUI(ex) {
  const value = state.values[ex.id] || 0;

  const compactEl = document.getElementById(`compact-${ex.id}`);
  if (compactEl) {
    compactEl.textContent = `${formatValue(ex, value)} / ${formatTotal(ex)}`;
  }

  const remainingEl = document.getElementById(`remaining-${ex.id}`);
  if (remainingEl) {
    remainingEl.textContent = remaining(ex, value);
  }

  const rowEl = document.getElementById(`row-${ex.id}`);
  if (rowEl) {
    rowEl.className = `exercise-row ${completionClass(ex, value)}`;
  }

  const inputEl = document.getElementById(`input-${ex.id}`);
  if (inputEl) {
    inputEl.value = formatValue(ex, value);
  }
}

// =========================================================
// Wire Row Controls
// =========================================================

async function wireRowControls() {
  const { saveValue } = await loadStore();

  EXERCISES.forEach(ex => {
    const inputEl = document.getElementById(`input-${ex.id}`);
    const incBtn = document.getElementById(`inc-${ex.id}`);
    const decBtn = document.getElementById(`dec-${ex.id}`);
    const saveBtn = document.getElementById(`save-${ex.id}`);

    if (!inputEl || !incBtn || !decBtn || !saveBtn) return;

    inputEl.value = formatValue(ex, state.values[ex.id] || 0);

    const remainingEl = document.getElementById(`remaining-${ex.id}`);
    if (remainingEl) {
      remainingEl.textContent = remaining(ex, state.values[ex.id] || 0);
    }

    let dirty = false;

    function markDirty() {
      dirty = true;
      saveBtn.style.display = "inline-flex";
    }

    function clearDirty() {
      dirty = false;
      saveBtn.style.display = "none";
    }

    incBtn.addEventListener("click", () => {
      isAvailable(ex).then(available => {
        if (!available) return;
        adjust(ex, +1);
        clearDirty();
      });
    });

    decBtn.addEventListener("click", () => {
      isAvailable(ex).then(available => {
        if (!available) return;
        adjust(ex, -1);
        clearDirty();
      });
    });

    inputEl.addEventListener("input", () => {
      markDirty();
    });

    saveBtn.addEventListener("click", async () => {
      const available = await isAvailable(ex);
      if (!available) return;

      const parsed = parseValue(ex, inputEl.value);
      state.values[ex.id] = parsed;

      saveValue(ex.id, parsed, todayString, () => {
        updateRowUI(ex);
        recomputeAndRenderSummary();
        renderHistory();
        clearDirty();
      });
    });
  });
}

// =========================================================
// Settings Card & Theme Toggle
// =========================================================

async function wireSettingsCard() {
  const { saveSettings } = await loadStore();

  const settingsHeader = document.querySelector(".settings-header");
  const settingsBody = document.getElementById("settings-body");
  const settingsToggle = document.getElementById("settings-toggle");

  if (!settingsHeader || !settingsBody || !settingsToggle) return;

  if (state.settings.layout.settingsExpanded) {
    settingsBody.classList.remove("hidden");
    settingsToggle.textContent = "▲";
  } else {
    settingsBody.classList.add("hidden");
    settingsToggle.textContent = "▼";
  }

  settingsHeader.addEventListener("click", () => {
    const expanded = !state.settings.layout.settingsExpanded;
    state.settings.layout.settingsExpanded = expanded;

    if (expanded) {
      settingsBody.classList.remove("hidden");
      settingsToggle.textContent = "▲";
    } else {
      settingsBody.classList.add("hidden");
      settingsToggle.textContent = "▼";
    }

    saveSettings(state);
  });

  document.querySelectorAll(".theme-option").forEach(btn => {
    btn.addEventListener("click", () => {
      state.settings.theme = btn.dataset.theme;
      saveSettings(state);
      applyTheme();
    });
  });
}

// =========================================================
// Reset Button
// =========================================================

async function wireResetButton() {
  const { saveValue } = await loadStore();

  const trigger = document.querySelector('[data-reset="trigger"]');
  const overlay = document.querySelector('[data-reset="overlay"]');
  const cancelBtn = document.querySelector('[data-reset="cancel"]');
  const confirmBtn = document.querySelector('[data-reset="confirm"]');

  if (!trigger || !overlay || !cancelBtn || !confirmBtn) return;

  trigger.addEventListener("click", () => {
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
  });

  cancelBtn.addEventListener("click", () => {
    overlay.classList.remove("visible");
    setTimeout(() => overlay.classList.add("hidden"), 250);
  });

  confirmBtn.addEventListener("click", () => {
    const trigger = document.querySelector('[data-reset="trigger"]');
    if (trigger) {
      trigger.classList.add("shake");
      setTimeout(() => trigger.classList.remove("shake"), 400);
    }

    EXERCISES.forEach(ex => {
      state.values[ex.id] = 0;
      saveValue(ex.id, 0, todayString);
      updateRowUI(ex);
    });

    recomputeAndRenderSummary();
    renderHistory();

    overlay.classList.remove("visible");
    setTimeout(() => overlay.classList.add("hidden"), 250);
  });
}

// =========================================================
// Render All
// =========================================================

async function renderAll() {
  const { getAllValues, loadSettings, saveSettings, snapshotDay, saveValue } =
    await loadStore();

  const values = await getAllValues(EXERCISES);
  state.values = values;

  loadSettings(state, TIERS, async () => {
    const today = todayString();
    const last = state.settings.lastLogDate;

    if (!last) {
      state.settings.lastLogDate = today;
      await saveSettings(state);
    } else if (last !== today) {
      snapshotDay(
        last,
        state.values,
        computeCompletionPercent,
        async completion => {
          if (completion >= 100) {
            state.settings.streak += 1;
            if (state.settings.streak > state.settings.longestStreak) {
              state.settings.longestStreak = state.settings.streak;
            }
          } else {
            state.settings.streak = 0;
          }

          for (const ex of EXERCISES) {
            state.values[ex.id] = 0;
            await saveValue(ex.id, 0, todayString);
          }

          state.settings.lastLogDate = today;
          await saveSettings(state);

          applyTheme();
          renderTiers();
          wireSettingsCard();
          wireResetButton();
          recomputeAndRenderSummary();
          renderHistory();
        }
      );

      return;
    }

    applyTheme();
    renderTiers();
    wireSettingsCard();
    wireResetButton();
    recomputeAndRenderSummary();
    renderHistory();
  });
}

// =========================================================
// App Initialization
// =========================================================

window.addEventListener("DOMContentLoaded", async () => {
  await initDb();
  renderAll();
});
