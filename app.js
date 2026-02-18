// =========================================================
// Evergreen Config
// =========================================================

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
  }
};

const EXERCISES = EvergreenConfig.exercises;
const TIERS = EvergreenConfig.tiers;

// =========================================================
// IndexedDB Setup
// =========================================================

let db;
const DB_NAME = EvergreenConfig.dbName;
const DB_STORE = EvergreenConfig.dbStore;

function initDB() {
  const request = indexedDB.open(DB_NAME, 3);

  request.onupgradeneeded = event => {
    db = event.target.result;
    let store;

    // Main progress store
    if (!db.objectStoreNames.contains(DB_STORE)) {
      store = db.createObjectStore(DB_STORE, { keyPath: "id" });
    } else {
      store = event.target.transaction.objectStore(DB_STORE);
    }

    // Seed exercise values
    EXERCISES.forEach(ex => {
      store.get(ex.id).onsuccess = e => {
        if (!e.target.result) {
          store.add({ id: ex.id, value: 0 });
        }
      };
    });

    // Seed settings with new fields
    store.get("settings").onsuccess = e => {
      if (!e.target.result) {
        store.add({
          id: "settings",
          value: {
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
        });
      }
    };

    // New daily_logs store
    if (!db.objectStoreNames.contains("daily_logs")) {
      db.createObjectStore("daily_logs", { keyPath: "date" });
    }
  };

  request.onsuccess = event => {
    db = event.target.result;
    renderAll();
  };
}

function getAllValues(callback) {
  const tx = db.transaction(DB_STORE, "readonly");
  const store = tx.objectStore(DB_STORE);
  const results = {};
  let remaining = EXERCISES.length;

  EXERCISES.forEach(ex => {
    store.get(ex.id).onsuccess = e => {
      results[ex.id] = e.target.result?.value ?? 0;
      remaining--;
      if (remaining === 0) callback(results);
    };
  });
}

function saveValue(id, value, callback) {
  const tx = db.transaction(DB_STORE, "readwrite");
  const store = tx.objectStore(DB_STORE);
  store.put({ id, value });

  tx.oncomplete = () => {
    // If we're editing a day that is not "today",
    // update that day's snapshot (date stays the same).
    const today = todayString();
    const last = state.settings.lastLogDate;

    if (last && last !== today) {
      snapshotDay(last);
    }

    callback && callback();
  };
}

// =========================================================
// Settings & Layout Persistence
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

function loadSettings(callback) {
  const tx = db.transaction(DB_STORE, "readonly");
  const store = tx.objectStore(DB_STORE);
  const req = store.get("settings");

  req.onsuccess = e => {
    const val = e.target.result?.value;
    if (val) {
      state.settings.theme = val.theme ?? "auto";
      state.settings.layout = {
        settingsExpanded: val.layout?.settingsExpanded ?? false,
        tierExpanded: val.layout?.tierExpanded ?? {},
        rowExpanded: val.layout?.rowExpanded ?? {}
      };
      state.settings.lastLogDate = val.lastLogDate ?? null;
      state.settings.streak = val.streak ?? 0;
      state.settings.longestStreak = val.longestStreak ?? 0;
    }

    TIERS.forEach(t => {
      if (state.settings.layout.tierExpanded[t.id] === undefined) {
        state.settings.layout.tierExpanded[t.id] = !!t.defaultExpanded;
      }
    });

    callback && callback();
  };
}

function saveSettings() {
  const tx = db.transaction(DB_STORE, "readwrite");
  const store = tx.objectStore(DB_STORE);
  store.put({
    id: "settings",
    value: state.settings
  });
}

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
  const totalRequired = EXERCISES.reduce((sum, ex) => sum + ex.total, 0);
  const totalDone = EXERCISES.reduce(
    (sum, ex) => sum + (state.values[ex.id] || 0),
    0
  );
  if (totalRequired === 0) return 0;
  return Math.max(0, Math.min(1, totalDone / totalRequired)) * 100;
}

function snapshotDay(dateStr, callback) {
  const completion = computeCompletionPercent();

  const log = {
    date: dateStr, // date is fixed at inception
    values: { ...state.values }, // final values for that day
    completion // can be < 100, = 0, > 100
  };

  const tx = db.transaction("daily_logs", "readwrite");
  const store = tx.objectStore("daily_logs");

  // Overwrite snapshot for THIS date only (content can change, date cannot)
  store.put(log);

  tx.oncomplete = () => callback && callback(completion);
}

function loadHistory(callback) {
  const tx = db.transaction("daily_logs", "readonly");
  const store = tx.objectStore("daily_logs");
  const req = store.getAll();

  req.onsuccess = () => {
    const logs = req.result || [];
    // Sort newest → oldest
    logs.sort((a, b) => (a.date < b.date ? 1 : -1));
    callback(logs);
  };
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day); // month is zero-indexed
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

function attachHapticOnPointerDown(selector, hapticFn = hapticLight) {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener("pointerdown", () => {
      hapticFn();
    });
  });
}

// =========================================================
// Haptics
// =========================================================

function hapticLight() {
  if (navigator.vibrate) navigator.vibrate(10);
}

function hapticDouble() {
  if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
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

function renderHistory() {
  loadHistory(logs => {
    const streakEl = document.querySelector('[data-history="streak"]');
    const yesterdayEl = document.querySelector('[data-history="yesterday"]');
    const listEl = document.querySelector('[data-history="list"]');

    if (!streakEl || !yesterdayEl || !listEl) return;

    // 1. Streak
    streakEl.textContent = `${state.settings.streak} day${state.settings.streak === 1 ? "" : "s"}`;

    // 2. Yesterday
    const today = todayString();
    const yesterday = logs.find(l => l.date !== today);
    if (yesterday) {
      yesterdayEl.textContent = `${Math.round(yesterday.completion)}%`;
    } else {
      yesterdayEl.textContent = "—";
    }

    // 3. Recent days (limit to last 7)
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
  const globalPercent = computeGlobalPercent();

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

const drawerScroll = document.querySelector(".drawer-scroll");
const shadowTop = document.querySelector(".scroll-shadow.top");
const shadowBottom = document.querySelector(".scroll-shadow.bottom");

function updateScrollShadows() {
  const { scrollTop, scrollHeight, clientHeight } = drawerScroll;

  // Show top shadow if not at top
  if (scrollTop > 0) {
    shadowTop.classList.add("visible");
  } else {
    shadowTop.classList.remove("visible");
  }

  // Show bottom shadow if not at bottom
  if (scrollTop + clientHeight < scrollHeight - 1) {
    shadowBottom.classList.add("visible");
  } else {
    shadowBottom.classList.remove("visible");
  }
}

// Update on scroll
drawerScroll.addEventListener("scroll", updateScrollShadows);

// Update when drawer opens (content height changes)
const observer = new ResizeObserver(updateScrollShadows);
observer.observe(drawerScroll);

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
      <span class="tier-toggle" data-tier="${tier.id} data-haptic">
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
      row.className = `exercise-row ${completionClass(ex, state.values[ex.id] || 0)}`;
      row.id = `row-${ex.id}`;

      const compact = document.createElement("div");
      compact.className = "compact-row";
      compact.setAttribute("data-haptic", "")
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
          <button id="save-${ex.id}" class="save-btn" data-haptic-double>${saveIcon}</button>
          <input id="input-${ex.id}" type="text" />
          <button class="arrow-btn" id="inc-${ex.id} data-haptic">▲</button>
          <button class="arrow-btn" id="dec-${ex.id} data-haptic">▼</button>
        </div>
        <div class="expanded-row-footer">
          <span id="remaining-${ex.id}"></span>
        </div>
      `;

      row.appendChild(compact);
      row.appendChild(expanded);
      tierBody.appendChild(row);
    });

    tierCard.appendChild(tierBody);
    container.appendChild(tierCard);
  });

  wireRowControls();
}

function toggleTier(tierId) {
  state.settings.layout.tierExpanded[tierId] =
    !state.settings.layout.tierExpanded[tierId];
  hapticLight();
  saveSettings();

  const body = document.getElementById(`tier-body-${tierId}`);
  const toggle = document.querySelector(`.tier-toggle[data-tier="${tierId}"]`);
  if (!body || !toggle) return;

  if (state.settings.layout.tierExpanded[tierId]) {
    body.style.maxHeight = "1000px";
    toggle.textContent = "▲";
  } else {
    body.style.maxHeight = "0px";
    toggle.textContent = "▼";
  }
}

function toggleRowExpanded(id) {
  state.settings.layout.rowExpanded[id] =
    !state.settings.layout.rowExpanded[id];
  hapticLight();
  saveSettings();

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
      if (delta > 0) adjust(ex, +1);
      else adjust(ex, -1);
    }
  });
}

// =========================================================
// Adjust Values & Row Wiring
// =========================================================

function adjust(ex, delta) {
  const current = state.values[ex.id] || 0;
  let value = current + delta;
  if (value < 0) value = 0;

  state.values[ex.id] = value;
  hapticLight();

  saveValue(ex.id, value, () => {
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

function wireRowControls() {
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
      adjust(ex, +1);
      clearDirty();
    });

    decBtn.addEventListener("click", () => {
      adjust(ex, -1);
      clearDirty();
    });

    inputEl.addEventListener("input", () => {
      markDirty();
    });

    saveBtn.addEventListener("click", () => {
      const parsed = parseValue(ex, inputEl.value);
      state.values[ex.id] = parsed;
      hapticDouble();
      saveValue(ex.id, parsed, () => {
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

function wireSettingsCard() {
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

    saveSettings();
  });

  document.querySelectorAll(".theme-option").forEach(btn => {
    btn.addEventListener("click", () => {
      state.settings.theme = btn.dataset.theme;
      saveSettings();
      applyTheme();
    });
  });
}

// =========================================================
// Reset Button
// =========================================================

function wireResetButton() {
  const trigger = document.querySelector('[data-reset="trigger"]');
  const overlay = document.querySelector('[data-reset="overlay"]');
  const cancelBtn = document.querySelector('[data-reset="cancel"]');
  const confirmBtn = document.querySelector('[data-reset="confirm"]');

  if (!trigger || !overlay || !cancelBtn || !confirmBtn) return;

  // Open modal
  trigger.addEventListener("click", () => {
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
  });

  // Cancel
  cancelBtn.addEventListener("click", () => {
    overlay.classList.remove("visible");
    setTimeout(() => overlay.classList.add("hidden"), 250);
  });

  // Confirm reset
  confirmBtn.addEventListener("click", () => {
    hapticDouble();

    // Trigger shake animation on the original reset button
    const trigger = document.querySelector('[data-reset="trigger"]');
    if (trigger) {
      trigger.classList.add("shake");
      setTimeout(() => trigger.classList.remove("shake"), 400);
    }

    // Reset all values
    EXERCISES.forEach(ex => {
      state.values[ex.id] = 0;
      saveValue(ex.id, 0);
      updateRowUI(ex);
    });

    recomputeAndRenderSummary();
    renderHistory();

    // Close modal
    overlay.classList.remove("visible");
    setTimeout(() => overlay.classList.add("hidden"), 250);
  });
}

// =========================================================
// Render All — Master Initialization Pipeline
// =========================================================

function renderAll() {
  getAllValues(values => {
    state.values = values;

    loadSettings(() => {
      const today = todayString();
      const last = state.settings.lastLogDate;

      // First run: no lastLogDate yet
      if (!last) {
        state.settings.lastLogDate = today;
        saveSettings();
      } else if (last !== today) {
        // New day detected: snapshot yesterday, reset today
        snapshotDay(last, completion => {
          // Update streak based on yesterday's completion
          if (completion >= 100) {
            state.settings.streak += 1;
            if (state.settings.streak > state.settings.longestStreak) {
              state.settings.longestStreak = state.settings.streak;
            }
          } else {
            state.settings.streak = 0;
          }

          // Reset values for new day
          EXERCISES.forEach(ex => {
            state.values[ex.id] = 0;
            saveValue(ex.id, 0);
          });

          state.settings.lastLogDate = today;
          saveSettings();

          applyTheme();
          renderTiers();
          wireSettingsCard();
          wireResetButton();
          recomputeAndRenderSummary();
          renderHistory();
        });

        return; // prevent double render
      }

      // Normal same-day render
      applyTheme();
      renderTiers();
      wireSettingsCard();
      wireResetButton();
      recomputeAndRenderSummary();
      renderHistory();
    });
  });
}

// =========================================================
// App Initialization
// =========================================================

window.addEventListener("DOMContentLoaded", () => {
  // Initialize Database
  initDB();

  // Attach haptics globally
  attachHapticOnPointerDown("[data-haptic]", hapticLight);
  attachHapticOnPointerDown("[data-haptic-double]", hapticDouble);
});
