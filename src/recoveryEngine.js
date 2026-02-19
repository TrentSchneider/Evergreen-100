// recoveryEngine.js

// Assumes EvergreenConfig, todayString, parseLocalDate exist in scope
// If you want this fully standalone, you can inject config + helpers instead.

export function rankAdjustment(rank, maxRank = EvergreenConfig.recoveryRankMax) {
    if (typeof rank !== "number" || rank < 1) return 0;
    if (rank > maxRank) rank = maxRank;
    return rank - 1; // rank 1 → 0, rank 5 → 4
  }
  
  export function getRecoveryEntries(ex) {
    // Default: treat as light muscle if no recovery metadata
    if (!ex.recovery || ex.recovery.length === 0) {
      return [{ type: "muscle", rank: 1 }];
    }
    return ex.recovery;
  }
  
  export function getCooldownDaysForEntry(entry) {
    const { type, rank } = entry;
    const typeConfig = EvergreenConfig.recoveryTypes[type];
  
    if (!typeConfig) {
      // Unknown type → treat as muscle rank 1
      return EvergreenConfig.recoveryTypes.muscle.baseDays;
    }
  
    const base = typeConfig.baseDays || 0;
    const extra = rankAdjustment(rank);
    return base + extra;
  }
  
  export function getCooldownDaysForExercise(ex) {
    const entries = getRecoveryEntries(ex);
    if (!entries.length) return 0;
  
    let maxCooldown = 0;
    for (const entry of entries) {
      const cd = getCooldownDaysForEntry(entry);
      if (cd > maxCooldown) maxCooldown = cd;
    }
    return maxCooldown;
  }
  
  /**
   * lastCompletedDate: string "YYYY-MM-DD" or null
   * returns: Date | null (next available date) 
   *   - null means "no restriction yet" (never completed)
   */
  export function computeNextAvailableDate(lastCompletedDate, ex) {
    const cooldown = getCooldownDaysForExercise(ex);
    if (!lastCompletedDate || cooldown === 0) return null;
  
    const last = parseLocalDate(lastCompletedDate);
    last.setDate(last.getDate() + cooldown);
    return last;
  }
  
  /**
   * todayStr: optional "YYYY-MM-DD" for testing; defaults to todayString()
   */
  export function isExerciseAvailableOnDate(lastCompletedDate, ex, todayStr) {
    const next = computeNextAvailableDate(lastCompletedDate, ex);
    if (!next) return true; // never completed or no cooldown
  
    const today = parseLocalDate(todayStr || todayString());
    return today >= next;
  }
  
  /**
   * Returns integer days remaining until available.
   * 0 means "available today".
   */
  export function getDaysRemaining(lastCompletedDate, ex, todayStr) {
    const next = computeNextAvailableDate(lastCompletedDate, ex);
    if (!next) return 0;
  
    const today = parseLocalDate(todayStr || todayString());
    const diffMs = next - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }