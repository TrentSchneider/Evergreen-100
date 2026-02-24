// src/data/config.js

// Evergreen 100 — Static Configuration & Exercise Data

export const EvergreenConfig = {
  dbName: "evergreen100_v2",
  dbStore: "progress",
  swipeThreshold: 40,

  tiers: [
    { id: 1, name: "Primary Movements", defaultExpanded: true },
    { id: 2, name: "Accessory Work", defaultExpanded: true }
  ],

  exercises: [
    { id: "push", name: "Push-ups", total: 25, type: "count", tier: 1 },
    { id: "pull", name: "Inverted Table Row", total: 25, type: "count", tier: 1 },
    { id: "core", name: "Plank With Knee Taps", total: 25, type: "count", tier: 1 },
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

// Convenience exports
export const EXERCISES = EvergreenConfig.exercises;
export const TIERS = EvergreenConfig.tiers;
