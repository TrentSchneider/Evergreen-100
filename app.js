// ------------------------------
// Evergreen Config
// ------------------------------
const EvergreenConfig = {
    dbName: "evergreen100_v2",
    dbStore: "progress",
    swipeThreshold: 40,
    tiers: [
        { id: 1, name: "Primary Movements", defaultExpanded: true },
        { id: 2, name: "Accessory Work",   defaultExpanded: true }
    ],
    exercises: [
        { id: "push",    name: "Push-ups",             total: 25,  type: "count", tier: 1 },
        { id: "pull",    name: "Inverted Table Row",   total: 25,  type: "count", tier: 1 },
        { id: "core",    name: "Plank With Knee Taps", total: 25,  type: "count", tier: 1 },
        { id: "legs",    name: "Slow Squats",          total: 25,  type: "count", tier: 1 },
        { id: "grip",    name: "Farmer Carry",         total: 120, type: "time",  tier: 2 },
        { id: "utility", name: "Scapular Shrug",       total: 25,  type: "count", tier: 2 }
    ],
    thresholds: {
        approaching: 0.8,
        complete: 1.0,
        over: 1.01
    }
};

const EXERCISES = EvergreenConfig.exercises;
const TIERS = EvergreenConfig.tiers;

// ------------------------------
// IndexedDB Setup
// ------------------------------
let db;
const DB_NAME = EvergreenConfig.dbName;
const DB_STORE = EvergreenConfig.dbStore;

function initDB() {
    const request = indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        let store;
        if (!db.objectStoreNames.contains(DB_STORE)) {
            store = db.createObjectStore(DB_STORE, { keyPath: "id" });
        } else {
            store = event.target.transaction.objectStore(DB_STORE);
        }

        EXERCISES.forEach(ex => {
            store.get(ex.id).onsuccess = (e) => {
                if (!e.target.result) {
                    store.add({ id: ex.id, value: 0 });
                }
            };
        });

        store.get("settings").onsuccess = (e) => {
            if (!e.target.result) {
                store.add({
                    id: "settings",
                    value: {
                        theme: "auto",
                        layout: {
                            summaryExpanded: false,
                            settingsExpanded: false,
                            tierExpanded: {},
                            rowExpanded: {}
                        }
                    }
                });
            }
        };
    };

    request.onsuccess = (event) => {
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
        store.get(ex.id).onsuccess = (e) => {
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
    tx.oncomplete = () => callback && callback();
}

// ------------------------------
// Settings & Layout Persistence
// ------------------------------
let state = {
    values: {},
    settings: {
        theme: "auto",
        layout: {
            summaryExpanded: false,
            settingsExpanded: false,
            tierExpanded: {},
            rowExpanded: {}
        }
    }
};

function loadSettings(callback) {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const req = store.get("settings");
    req.onsuccess = (e) => {
        const val = e.target.result?.value;
        if (val) {
            state.settings.theme = val.theme ?? "auto";
            state.settings.layout = {
                summaryExpanded: val.layout?.summaryExpanded ?? false,
                settingsExpanded: val.layout?.settingsExpanded ?? false,
                tierExpanded: val.layout?.tierExpanded ?? {},
                rowExpanded: val.layout?.rowExpanded ?? {}
            };
        }

        // Ensure tier defaults exist
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

// ------------------------------
// Helpers: Time & Formatting
// ------------------------------
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

// ------------------------------
// Haptics
// ------------------------------
function hapticLight() {
    if (navigator.vibrate) navigator.vibrate(10);
}

function hapticDouble() {
    if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
}

// ------------------------------
// Theme
// ------------------------------
function applyTheme() {
    const mode = state.settings.theme;
    const body = document.body;

    body.classList.remove("theme-light", "theme-dark");

    if (mode === "light") {
        body.classList.add("theme-light");
    } else if (mode === "dark") {
        body.classList.add("theme-dark");
    } else {
        const prefersDark = window.matchMedia &&
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
    let index = 0; // auto
    if (mode === "light") index = 1;
    if (mode === "dark") index = 2;

    highlight.style.transform = `translateX(${index * 100}%)`;
}

// ------------------------------
// Global Progress
// ------------------------------
function updateGlobalProgress() {
    const totalRequired = EXERCISES.reduce((sum, ex) => sum + ex.total, 0);
    const totalDone = EXERCISES.reduce((sum, ex) => sum + (state.values[ex.id] || 0), 0);
    const ratio = Math.max(0, Math.min(1, totalDone / totalRequired));
    const fill = document.querySelector(".global-progress-fill");
    if (fill) {
        fill.style.width = `${ratio * 100}%`;
    }
}

// ------------------------------
// Expanded Summary
// ------------------------------
function renderSummaryExpanded() {
    const container = document.getElementById("summary-expanded");
    container.innerHTML = "";

    EXERCISES.forEach(ex => {
        const value = state.values[ex.id] || 0;
        const row = document.createElement("div");
        row.className = "summary-row fade-in";

        const miniBar = document.createElement("div");
        miniBar.className = "mini-bar";

        const fill = document.createElement("div");
        fill.className = "mini-bar-fill";
        const ratio = completionRatio(ex, value);
        fill.style.width = `${ratio * 100}%`;

        const cls = completionClass(ex, value);
        if (cls === "approaching") fill.style.background = "#ffcc00";
        else if (cls === "complete") fill.style.background = "#4caf50";
        else if (cls === "over") fill.style.background = "#3f51b5";
        else fill.style.background = "#9e9e9e";

        miniBar.appendChild(fill);

        const name = document.createElement("div");
        name.className = "summary-name";
        name.textContent = ex.name;

        const rem = document.createElement("div");
        rem.textContent = remaining(ex, value);

        row.appendChild(miniBar);
        row.appendChild(name);
        row.appendChild(rem);
        container.appendChild(row);
    });

    const rowsHeight = container.scrollHeight;
    container.style.maxHeight = state.settings.layout.summaryExpanded ? `${rowsHeight}px` : "0px";
}

function toggleSummary() {
    const expanded = document.getElementById("summary-expanded");
    const toggle = document.getElementById("summary-toggle");

    state.settings.layout.summaryExpanded = !state.settings.layout.summaryExpanded;
    hapticLight();
    saveSettings();

    if (state.settings.layout.summaryExpanded) {
        expanded.classList.remove("hidden");
        renderSummaryExpanded();
        const targetHeight = expanded.scrollHeight;
        expanded.style.maxHeight = `${targetHeight}px`;
        if (toggle) toggle.textContent = "▲";
    } else {
        const targetHeight = expanded.scrollHeight;
        expanded.style.maxHeight = `${targetHeight}px`;
        requestAnimationFrame(() => {
            expanded.style.maxHeight = "0px";
        });
        if (toggle) toggle.textContent = "▼";
        setTimeout(() => {
            if (!state.settings.layout.summaryExpanded) expanded.classList.add("hidden");
        }, 300);
    }
}

// ------------------------------
// Tiers & Rows
// ------------------------------
function renderTiers() {
    const container = document.getElementById("tiers-container");
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
        tierBody.style.maxHeight = state.settings.layout.tierExpanded[tier.id] ? "1000px" : "0px";
        tierBody.style.transition = "max-height 0.3s ease";

        EXERCISES.filter(ex => ex.tier === tier.id).forEach(ex => {
            const row = document.createElement("div");
            row.className = `exercise-row ${completionClass(ex, state.values[ex.id] || 0)}`;
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
            expanded.style.display = state.settings.layout.rowExpanded[ex.id] ? "block" : "none";

            const saveIcon = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
            <path d="M0 1.5A1.5 1.5 0 0 1 1.5 0H3v5.5A1.5 1.5 0 0 0 4.5 7h7A1.5 1.5 0 0 0 13 5.5V0h.086a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5H14v-5.5A1.5 1.5 0 0 0 12.5 9h-9A1.5 1.5 0 0 0 2 10.5V16h-.5A1.5 1.5 0 0 1 0 14.5z"/>
            <path d="M3 16h10v-5.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5zm9-16H4v5.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5zM9 1h2v4H9z"/>
            </svg>`
            expanded.innerHTML = `
                <div class="controls">
                    <button id="save-${ex.id}" class="save-btn">${saveIcon}</button>
                    <input id="input-${ex.id}" type="text" />
                    <button class="arrow-btn" id="inc-${ex.id}">▲</button>
                    <button class="arrow-btn" id="dec-${ex.id}">▼</button>
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
}

function toggleTier(tierId) {
    state.settings.layout.tierExpanded[tierId] = !state.settings.layout.tierExpanded[tierId];
    hapticLight();
    saveSettings();

    const body = document.getElementById(`tier-body-${tierId}`);
    const toggle = document.querySelector(`.tier-toggle[data-tier="${tierId}"]`);
    if (state.settings.layout.tierExpanded[tierId]) {
        body.style.maxHeight = "1000px";
        if (toggle) toggle.textContent = "▲";
    } else {
        body.style.maxHeight = "0px";
        if (toggle) toggle.textContent = "▼";
    }
}

function toggleRowExpanded(id) {
    state.settings.layout.rowExpanded[id] = !state.settings.layout.rowExpanded[id];
    hapticLight();
    saveSettings();

    const expanded = document.getElementById(`expanded-${id}`);
    if (!expanded) return;
    expanded.style.display = state.settings.layout.rowExpanded[id] ? "block" : "none";
}

// ------------------------------
// Swipe Gestures
// ------------------------------
function attachSwipe(element, ex) {
    let startX = 0;
    let endX = 0;

    element.addEventListener("touchstart", (e) => {
        startX = e.changedTouches[0].clientX;
    });

    element.addEventListener("touchend", (e) => {
        endX = e.changedTouches[0].clientX;
        const delta = endX - startX;
        const threshold = EvergreenConfig.swipeThreshold;
        if (Math.abs(delta) > threshold && !state.settings.layout.rowExpanded[ex.id]) {
            if (delta > 0) {
                adjust(ex, +1);
            } else {
                adjust(ex, -1);
            }
        }
    });
}

// ------------------------------
// Adjust Values
// ------------------------------
function adjust(ex, delta) {
    const current = state.values[ex.id] || 0;
    let value = current + delta;
    if (value < 0) value = 0;

    state.values[ex.id] = value;
    hapticLight();

    saveValue(ex.id, value, () => {
        updateRow(ex);
        updateGlobalProgress();
        if (state.settings.layout.summaryExpanded) renderSummaryExpanded();
    });
}

function updateRow(ex) {
    const value = state.values[ex.id] || 0;

    const compact = document.getElementById(`compact-${ex.id}`);
    if (compact) {
        compact.textContent = `${formatValue(ex, value)} / ${formatTotal(ex)}`;
    }

    const input = document.getElementById(`input-${ex.id}`);
    if (input) {
        input.value = formatValue(ex, value);
    }

    const rem = document.getElementById(`remaining-${ex.id}`);
    if (rem) {
        rem.textContent = remaining(ex, value);
    }

    const row = document.getElementById(`row-${ex.id}`);
    if (row) {
        row.className = `exercise-row ${completionClass(ex, value)}`;
    }
}

// ------------------------------
// Reset All
// ------------------------------
function resetAll() {
    if (!confirm("Reset all exercise counts?")) return;

    const btn = document.getElementById("reset-btn");
    btn.classList.add("shake");
    hapticDouble();

    setTimeout(() => btn.classList.remove("shake"), 400);

    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);

    EXERCISES.forEach(ex => {
        store.put({ id: ex.id, value: 0 });
        state.values[ex.id] = 0;
    });

    tx.oncomplete = () => {
        EXERCISES.forEach(ex => updateRow(ex));
        updateGlobalProgress();
        if (state.settings.layout.summaryExpanded) renderSummaryExpanded();
    };
}

// ------------------------------
// Settings Card Wiring
// ------------------------------
function wireSettings() {
    const settingsHeader = document.getElementById("settings-header");
    const settingsBody = document.getElementById("settings-body");
    const settingsChevron = document.getElementById("settings-chevron");

    if (settingsHeader && settingsBody && settingsChevron) {
        if (state.settings.layout.settingsExpanded) {
            settingsBody.classList.remove("hidden");
            settingsChevron.textContent = "▲";
        } else {
            settingsBody.classList.add("hidden");
            settingsChevron.textContent = "▼";
        }

        settingsHeader.addEventListener("click", () => {
            state.settings.layout.settingsExpanded = !state.settings.layout.settingsExpanded;
            if (state.settings.layout.settingsExpanded) {
                settingsBody.classList.remove("hidden");
                settingsChevron.textContent = "▲";
            } else {
                settingsBody.classList.add("hidden");
                settingsChevron.textContent = "▼";
            }
            saveSettings();
        });
    }

    const themeButtons = document.querySelectorAll(".theme-option");
    themeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.getAttribute("data-theme");
            state.settings.theme = mode;
            saveSettings();
            applyTheme();
        });
    });

    positionThemeHighlight();
}

// ------------------------------
// Main Wiring
// ------------------------------
function wireControls() {
    EXERCISES.forEach(ex => {
        const input = document.getElementById(`input-${ex.id}`);
        const saveBtn = document.getElementById(`save-${ex.id}`);
        const inc = document.getElementById(`inc-${ex.id}`);
        const dec = document.getElementById(`dec-${ex.id}`);

        if (input && saveBtn) {
            input.addEventListener("input", () => {
                saveBtn.style.display = "inline-block";
            });

            saveBtn.addEventListener("click", () => {
                const value = parseValue(ex, input.value);
                state.values[ex.id] = value;
                saveValue(ex.id, value, () => {
                    input.value = formatValue(ex, value);
                    saveBtn.style.display = "none";
                    updateRow(ex);
                    updateGlobalProgress();
                    if (state.settings.layout.summaryExpanded) renderSummaryExpanded();
                    hapticLight();
                });
            });
        }

        if (inc) {
            inc.addEventListener("click", () => adjust(ex, +1));
        }
        if (dec) {
            dec.addEventListener("click", () => adjust(ex, -1));
        }
    });

    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) resetBtn.addEventListener("click", resetAll);

    const summaryBar = document.getElementById("summary-bar");
    if (summaryBar) summaryBar.addEventListener("click", toggleSummary);
}

// ------------------------------
// Render All
// ------------------------------
function renderAll() {
    getAllValues(values => {
        state.values = values;

        loadSettings(() => {
            // Summary card initial state
            const expanded = document.getElementById("summary-expanded");
            const toggle = document.getElementById("summary-toggle");
            if (state.settings.layout.summaryExpanded) {
                expanded.classList.remove("hidden");
                renderSummaryExpanded();
                expanded.style.maxHeight = `${expanded.scrollHeight}px`;
                if (toggle) toggle.textContent = "▲";
            } else {
                expanded.classList.add("hidden");
                expanded.style.maxHeight = "0px";
                if (toggle) toggle.textContent = "▼";
            }

            renderTiers();
            EXERCISES.forEach(ex => updateRow(ex));
            updateGlobalProgress();
            wireControls();
            wireSettings();
            applyTheme();
        });
    });
}

// ------------------------------
// Init
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initDB();
});
