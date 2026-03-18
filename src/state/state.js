// ---------------------------------------------------------
// Global Evergreen 100 State
// ---------------------------------------------------------

export const state = {
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

// ---------------------------------------------------------
// Value Mutations
// ---------------------------------------------------------

export function setExerciseValue(exId, value) {
  state.values[exId] = value;
}

export function setAllExerciseValues(map) {
  state.values = { ...map };
}

// ---------------------------------------------------------
// Layout Mutations
// ---------------------------------------------------------

export function setRowExpanded(exId, expanded) {
  state.settings.layout.rowExpanded[exId] = expanded;
}

export function setTierExpanded(tierId, expanded) {
  state.settings.layout.tierExpanded[tierId] = expanded;
}

export function setSettingsExpanded(expanded) {
  state.settings.layout.settingsExpanded = expanded;
}

// ---------------------------------------------------------
// Theme
// ---------------------------------------------------------

export function setTheme(mode) {
  state.settings.theme = mode;
}

// ---------------------------------------------------------
// Streak & Date Tracking
// ---------------------------------------------------------

export function setLastLogDate(date) {
  state.settings.lastLogDate = date;
}

export function incrementStreak() {
  state.settings.streak += 1;
  if (state.settings.streak > state.settings.longestStreak) {
    state.settings.longestStreak = state.settings.streak;
  }
}

export function resetStreak() {
  state.settings.streak = 0;
}
