import { EXERCISES } from "../data/config.js";
import { state } from "../state/state.js";
import { computeCompletionPercent } from "../state/completion.js";
import { completionRatio } from "../utils/formatting.js";
import { formatHistoryDate } from "../utils/dates.js";
import { loadStore } from "../state/storage.js";

// ---------------------------------------------------------
// DOM References
// ---------------------------------------------------------

let summaryContainer = null;
let summaryPill = null;
let summaryDrawer = null;
let summaryDrawerContent = null;
let pillProgressFill = null;
let pillPercentEl = null;

let drawerOpen = false;

// ---------------------------------------------------------
// Initialization
// ---------------------------------------------------------

export function initSummaryUI() {
  summaryContainer = document.getElementById("summary-container");
  summaryPill = document.getElementById("summary-pill");
  summaryDrawer = document.getElementById("summary-drawer");
  summaryDrawerContent = document.getElementById("summary-drawer-content");
  pillProgressFill = document.querySelector(".pill-progress-fill");
  pillPercentEl = document.querySelector(".pill-percent");

  if (summaryPill) {
    summaryPill.addEventListener("click", toggleSummaryDrawer);
  }
}

// ---------------------------------------------------------
// Drawer Toggle
// ---------------------------------------------------------

function toggleSummaryDrawer() {
  drawerOpen = !drawerOpen;

  if (drawerOpen) {
    summaryContainer.classList.add("pre-expand");
    void summaryContainer.offsetWidth; // force reflow
    summaryContainer.classList.add("expanded");

    const contentHeight = summaryDrawerContent.scrollHeight;
    summaryDrawer.style.maxHeight = contentHeight + "px";

    document.body.style.overflow = "hidden";
  } else {
    summaryContainer.classList.remove("expanded");
    summaryDrawer.style.maxHeight = "0";
    document.body.style.overflow = "";
  }
}

// ---------------------------------------------------------
// History Rendering
// ---------------------------------------------------------

export async function renderHistory() {
  const { loadHistory } = await loadStore();

  loadHistory(logs => {
    const streakEl = document.querySelector('[data-history="streak"]');
    const yesterdayEl = document.querySelector('[data-history="yesterday"]');
    const listEl = document.querySelector('[data-history="list"]');

    if (!streakEl || !yesterdayEl || !listEl) return;

    // Streak
    streakEl.textContent = `${state.settings.streak} day${
      state.settings.streak === 1 ? "" : "s"
    }`;

    // Yesterday's completion
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = logs.find(l => l.date !== today);
    yesterdayEl.textContent = yesterday
      ? `${Math.round(yesterday.completion)}%`
      : "—";

    // Recent history list
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

// ---------------------------------------------------------
// Summary Rendering
// ---------------------------------------------------------

export function recomputeAndRenderSummary() {
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
