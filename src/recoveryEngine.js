// =========================================================
// Evergreen 100 – Recovery Engine v1.1
// Anatomically grounded, nonlinear, future‑proof
// =========================================================

const DEBUG_RECOVERY = false;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const RECOVERY_TYPE_MULTIPLIERS = {
  muscle: 1,
  tendon: 1.75,
  ligament: 2.25
};

function debugLog(...args) {
  if (DEBUG_RECOVERY) console.log(...args);
}

// ---------------------------------------------------------
// Rank Scaling
// ---------------------------------------------------------

/**
 * Linear rank scaling: rank / max
 * Used by recovery curves to proportionally scale cooldown.
 */
function getScaledRank(rank, config) {
  const max = config.recoveryRankMax || 10;
  const clamped = Math.max(1, Math.min(rank || 1, max));
  return clamped / max;
}

/**
 * Legacy helper: returns (rank - 1), clamped to [0, max-1].
 * Exported for backward compatibility.
 */
export function rankAdjustment(rank, config) {
  const max = config.recoveryRankMax || 10;
  if (!rank || !Number.isFinite(rank) || rank < 1) return 0;
  const clamped = Math.max(1, Math.min(rank, max));
  return clamped - 1;
}

// ---------------------------------------------------------
// Base Cooldown Lookup
// ---------------------------------------------------------

export function getBaseCooldownDaysForTissue(tissueId, config) {
  const tissue = config.tissues.find(t => t.id === tissueId);
  if (!tissue) return 0;

  const typeInfo = config.tissueTypes[tissue.type];
  return typeof typeInfo?.baseDays === "number" ? typeInfo.baseDays : 0;
}

// ---------------------------------------------------------
// Recovery Curves (Nonlinear Exponential)
// ---------------------------------------------------------

/**
 * Linear proportional recovery curve:
 *   readiness = daysSince / total
 *
 * Reaches exactly 1.0 once the full cooldown has elapsed.
 */
function linearRecovery(daysSince, total) {
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, daysSince / total));
}

function getTypeRecoveryMultiplier(type) {
  return RECOVERY_TYPE_MULTIPLIERS[type] || 1;
}

function getDaysSince(earlierDate, laterDate) {
  return (laterDate - earlierDate) / MS_PER_DAY;
}

function getScaledCooldownDays(baseDays, rank, tissueType, config) {
  const scaledRank = getScaledRank(rank, config);
  const multiplier = getTypeRecoveryMultiplier(tissueType);

  return {
    scaledRank,
    totalDays: baseDays * scaledRank * multiplier
  };
}

function createLinearCurveForType(tissueType, logPrefix) {
  return (baseDays, events, targetDate, config) => {
    if (!events.length) return 1;

    const last = events[events.length - 1];
    const daysSince = getDaysSince(last.date, targetDate);
    const { scaledRank, totalDays } = getScaledCooldownDays(
      baseDays,
      last.rank,
      tissueType,
      config
    );
    const total = Math.max(0.1, totalDays);

    const readiness = linearRecovery(daysSince, total);

    debugLog(logPrefix, {
      baseDays,
      scaledRank,
      total,
      daysSince,
      readiness
    });

    return readiness;
  };
}

export const defaultRecoveryCurves = {
  muscle: createLinearCurveForType("muscle", "[Recovery][Muscle]"),
  tendon: createLinearCurveForType("tendon", "[Recovery][Tendon]"),
  ligament: createLinearCurveForType("ligament", "[Recovery][Ligament]")
};

// ---------------------------------------------------------
// Tissue Event Aggregation
// ---------------------------------------------------------

/**
 * Aggregates stress events by day, taking the highest rank per day.
 * This prevents double-counting and matches biological behavior.
 */
export function getTissueEventsFromHistory(tissueId, history) {
  if (!history || history.length === 0) {
    return [];
  }

  const rankByDay = new Map();
  let foundAny = false;

  for (const log of history) {
    if (!log?.tissues) continue;

    const hit = log.tissues.find(t => t.id === tissueId);
    if (!hit) continue;

    foundAny = true;

    // --- Canonical date normalization ---
    // Always convert to a Date, then to ISO YYYY-MM-DD
    const dateObj = new Date(log.date);
    if (isNaN(dateObj)) continue; // skip invalid dates

    const dayKey = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD

    const nextRank = Number.isFinite(hit.rank) ? hit.rank : 1;
    const currentRank = rankByDay.get(dayKey) || 0;

    rankByDay.set(dayKey, Math.max(currentRank, nextRank));
  }

  // If this tissue has never appeared in history → fully recovered
  if (!foundAny) {
    return [];
  }

  const events = Array.from(rankByDay.entries()).map(([dayKey, rank]) => ({
    date: new Date(dayKey), // safe: always valid ISO
    rank
  }));

  events.sort((a, b) => a.date - b.date);
  return events;
}

// ---------------------------------------------------------
// Tissue Readiness
// ---------------------------------------------------------

export function computeTissueReadiness(
  tissueId,
  dateString,
  history,
  config,
  curves
) {
  const tissue = config.tissues.find(t => t.id === tissueId);
  if (!tissue) return 1;

  const baseDays = getBaseCooldownDaysForTissue(tissueId, config);
  const events = getTissueEventsFromHistory(tissueId, history);
  const targetDate = new Date(dateString);

  const allCurves = curves || defaultRecoveryCurves;
  const curve = allCurves[tissue.type] || allCurves.muscle;

  const readiness = curve(baseDays, events, targetDate, config);

  debugLog("[Recovery][Readiness]", { tissueId, baseDays, events, readiness });
  return readiness;
}

// ---------------------------------------------------------
// Exercise Availability
// ---------------------------------------------------------

export function isExerciseAvailableOnDate(
  exerciseId,
  dateString,
  history,
  config,
  curves,
  readinessThreshold = 1
) {
  const exercise = config.exercises[exerciseId];
  if (!exercise) return true;

  for (const tissueRef of exercise.tissues || []) {
    const readiness = computeTissueReadiness(
      tissueRef.id,
      dateString,
      history,
      config,
      curves
    );

    debugLog("[Recovery][ExerciseCheck]", {
      exerciseId,
      tissue: tissueRef.id,
      readiness,
      threshold: readinessThreshold
    });

    if (readiness < readinessThreshold) return false;
  }

  return true;
}

// ---------------------------------------------------------
// Days Remaining (Optional Helper)
// ---------------------------------------------------------

export function getDaysRemaining(
  exerciseId,
  dateString,
  history,
  config,
  curves,
  readinessThreshold = 1
) {
  const exercise = config.exercises[exerciseId];
  if (!exercise) return 0;

  let maxDays = 0;

  for (const tissueRef of exercise.tissues || []) {
    const events = getTissueEventsFromHistory(tissueRef.id, history);
    if (!events.length) continue;

    const last = events[events.length - 1];
    const baseDays = getBaseCooldownDaysForTissue(tissueRef.id, config);
    const type = config.tissues.find(t => t.id === tissueRef.id)?.type;

    const { totalDays: total } = getScaledCooldownDays(
      baseDays,
      last.rank,
      type,
      config
    );

    const daysSince = getDaysSince(last.date, new Date(dateString));
    const remaining = Math.max(0, total - daysSince);

    maxDays = Math.max(maxDays, remaining);
  }

  return Math.ceil(maxDays);
}

// ---------------------------------------------------------
// Blocked Tissues (UI Helper)
// ---------------------------------------------------------

export function getBlockedTissues(
  exerciseId,
  dateString,
  history,
  config,
  curves,
  readinessThreshold = 1
) {
  const exercise = config.exercises[exerciseId];
  if (!exercise) return [];

  const blocked = [];

  for (const tissueRef of exercise.tissues || []) {
    const readiness = computeTissueReadiness(
      tissueRef.id,
      dateString,
      history,
      config,
      curves
    );

    if (readiness < readinessThreshold) {
      blocked.push({
        id: tissueRef.id,
        readiness
      });
    }
  }

  return blocked;
}

// ---------------------------------------------------------
// Region Readiness (Future UI)
// ---------------------------------------------------------

export function computeRegionReadiness(dateString, history, config, curves) {
  const regions = {};

  for (const tissue of config.tissues) {
    const readiness = computeTissueReadiness(
      tissue.id,
      dateString,
      history,
      config,
      curves
    );

    if (!regions[tissue.region]) regions[tissue.region] = [];
    regions[tissue.region].push(readiness);
  }

  const result = {};
  for (const region of Object.keys(regions)) {
    const arr = regions[region];
    result[region] = arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  return result;
}
