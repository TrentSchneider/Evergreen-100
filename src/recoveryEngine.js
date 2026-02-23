// =========================================================
// Evergreen 100 — Recovery Engine
// =========================================================

// ---------------------------------------------------------
// Rank Adjustment
// ---------------------------------------------------------
export function rankAdjustment(rank) {
  if (!rank || rank < 1) return 0;
  const max = EvergreenConfig.recoveryRankMax || 5;
  const clamped = Math.min(rank, max);
  return clamped - 1;
}

// ---------------------------------------------------------
// Recovery Entries
// ---------------------------------------------------------
export function getRecoveryEntries(ex) {
  if (Array.isArray(ex.recovery) && ex.recovery.length > 0) {
    return ex.recovery;
  }
  return [{ type: "muscle", rank: 1 }];
}

// ---------------------------------------------------------
// Cooldown for a Single Entry
// ---------------------------------------------------------
export function getCooldownDaysForEntry(entry) {
  const typeInfo = EvergreenConfig.recoveryTypes[entry.type];
  const base = typeInfo ? typeInfo.baseDays : EvergreenConfig.recoveryTypes.muscle.baseDays;
  return base + rankAdjustment(entry.rank);
}

// ---------------------------------------------------------
// Cooldown for an Exercise (max across entries)
// ---------------------------------------------------------
export function getCooldownDaysForExercise(ex) {
  const entries = getRecoveryEntries(ex);
  return Math.max(...entries.map(getCooldownDaysForEntry));
}

// ---------------------------------------------------------
// Compute Next Available Date
// ---------------------------------------------------------
export function computeNextAvailableDate(lastCompletedDate, ex) {
  if (!lastCompletedDate) return null;

  const cooldown = getCooldownDaysForExercise(ex);
  if (cooldown === 0) return null;

  const base = parseLocalDate(lastCompletedDate);
  const next = new Date(base);
  next.setDate(base.getDate() + cooldown);
  return next;
}

// ---------------------------------------------------------
// Availability Check
// ---------------------------------------------------------
export function isExerciseAvailableOnDate(lastCompletedDate, ex, dateString) {
  if (!lastCompletedDate) return true;

  const next = computeNextAvailableDate(lastCompletedDate, ex);
  if (!next) return true;

  const target = parseLocalDate(dateString);
  return target >= next;
}

// ---------------------------------------------------------
// Days Remaining
// ---------------------------------------------------------
export function getDaysRemaining(lastCompletedDate, ex, dateString) {
  if (!lastCompletedDate) return 0;

  const next = computeNextAvailableDate(lastCompletedDate, ex);
  if (!next) return 0;

  const target = parseLocalDate(dateString);
  const diff = Math.ceil((next - target) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}
