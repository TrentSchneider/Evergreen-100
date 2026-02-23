// =========================================================
// Recovery Engine (Config-Driven Version)
// =========================================================

// Rank adjustment based on recovery rank
export function rankAdjustment(rank, config) {
  if (!rank || rank < 1) return 0;
  const max = config.recoveryRankMax || 5;
  const clamped = Math.min(rank, max);
  return clamped - 1;
}

// Cooldown for a single entry
export function getCooldownDaysForEntry(entry, config) {
  const typeInfo = config.recoveryTypes[entry.type];
  const base = typeInfo
    ? typeInfo.baseDays
    : config.recoveryTypes.muscle.baseDays;
  return base + rankAdjustment(entry.rank, config);
}

// Cooldown for an exercise across all history entries
export function getCooldownDaysForExercise(exId, history, config) {
  const entries = history.filter(h => h.exId === exId);
  if (entries.length === 0) return 0;

  return Math.max(
    ...entries.map(entry => getCooldownDaysForEntry(entry, config))
  );
}

// Compute next available date
export function computeNextAvailableDate(exId, dateString, history, config) {
  if (!history || history.length === 0) return null;

  const cooldown = getCooldownDaysForExercise(exId, history, config);
  if (cooldown === 0) return null;

  const last = history
    .filter(h => h.exId === exId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const lastDate = new Date(last.date);
  const next = new Date(lastDate);
  next.setDate(lastDate.getDate() + cooldown);

  return next;
}

// Is exercise available on a given date?
export function isExerciseAvailableOnDate(exId, dateString, history, config) {
  const next = computeNextAvailableDate(exId, dateString, history, config);
  if (!next) return true;

  const target = new Date(dateString);
  return target >= next;
}

// Days remaining until available
export function getDaysRemaining(exId, dateString, history, config) {
  const next = computeNextAvailableDate(exId, dateString, history, config);
  if (!next) return 0;

  const target = new Date(dateString);
  const diff = Math.ceil((next - target) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}
