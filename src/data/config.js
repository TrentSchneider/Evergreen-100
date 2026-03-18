// src/data/config.js

export const EvergreenConfig = {
  dbName: "evergreen100_v2",
  dbStore: "progress",
  swipeThreshold: 40,

  // -----------------------------------
  // Tissue Types (base cooldown rules)
  // -----------------------------------
  tissueTypes: {
    muscle: { baseDays: 2 },
    tendon: { baseDays: 2 },
    ligament: { baseDays: 3 }
  },

  // -----------------------------------
  // Future‑Proof Anatomical Tissue Registry
  // -----------------------------------
  tissues: [
    // -------------------------
    // UPPER BODY — MUSCLES
    // -------------------------
    { id: "chest", type: "muscle", region: "upper_push" },
    { id: "front_shoulders", type: "muscle", region: "upper_push" },
    { id: "side_shoulders", type: "muscle", region: "upper_push" },
    { id: "rear_shoulders", type: "muscle", region: "upper_pull" },
    { id: "upper_back", type: "muscle", region: "upper_pull" },
    { id: "lats", type: "muscle", region: "upper_pull" },
    { id: "biceps", type: "muscle", region: "upper_pull" },
    { id: "triceps", type: "muscle", region: "upper_push" },

    // -------------------------
    // NECK — MUSCLES
    // -------------------------
    { id: "neck_flexors", type: "muscle", region: "neck" },
    { id: "neck_extensors", type: "muscle", region: "neck" },

    // -------------------------
    // CORE — MUSCLES
    // -------------------------
    { id: "abs", type: "muscle", region: "core_front" },
    { id: "obliques", type: "muscle", region: "core_front" },
    { id: "deep_core", type: "muscle", region: "core_front" },
    { id: "lower_back", type: "muscle", region: "core_back" },

    // -------------------------
    // LOWER BODY — MUSCLES
    // -------------------------
    { id: "quads", type: "muscle", region: "lower_quad" },
    { id: "glutes", type: "muscle", region: "lower_quad" },
    { id: "hamstrings", type: "muscle", region: "lower_hamstring" },
    { id: "calves", type: "muscle", region: "lower_hamstring" },

    // -------------------------
    // GRIP — MUSCLES
    // -------------------------
    { id: "forearm_flexors", type: "muscle", region: "grip" },
    { id: "forearm_extensors", type: "muscle", region: "grip" },

    // -------------------------
    // TENDONS
    // -------------------------
    { id: "rotator_cuff_tendon", type: "tendon", region: "upper_push" },
    { id: "biceps_tendon", type: "tendon", region: "upper_pull" },
    { id: "triceps_tendon", type: "tendon", region: "upper_push" },
    { id: "neck_tendon", type: "tendon", region: "neck" },
    { id: "abdominal_tendon", type: "tendon", region: "core_front" },
    { id: "patellar_tendon", type: "tendon", region: "lower_quad" },
    { id: "hamstring_tendon", type: "tendon", region: "lower_hamstring" },
    { id: "achilles_tendon", type: "tendon", region: "lower_hamstring" },
    { id: "wrist_flexor_tendon", type: "tendon", region: "grip" },
    { id: "wrist_extensor_tendon", type: "tendon", region: "grip" },

    // -------------------------
    // LIGAMENTS
    // -------------------------
    { id: "shoulder_ligaments", type: "ligament", region: "upper_push" },
    { id: "elbow_ligaments", type: "ligament", region: "upper_pull" },
    { id: "wrist_ligaments", type: "ligament", region: "grip" },
    { id: "cervical_ligaments", type: "ligament", region: "neck" },
    { id: "spinal_ligaments", type: "ligament", region: "core_back" },
    { id: "hip_ligaments", type: "ligament", region: "lower_quad" },
    { id: "knee_ligaments", type: "ligament", region: "lower_quad" },
    { id: "ankle_ligaments", type: "ligament", region: "lower_hamstring" }
  ],

  // -----------------------------------
  // Category Registry
  // -----------------------------------
  categories: {
    push: { name: "Push", tier: 1 },
    pull: { name: "Pull", tier: 1 },
    core: { name: "Core", tier: 1 },
    legs: { name: "Legs", tier: 1 },
    grip: { name: "Grip", tier: 2 },
    utility: { name: "Utility", tier: 2 }
  },

  // -----------------------------------
  // Exercises (mapped to new tissues)
  // -----------------------------------
  exercises: {
    // -------------------------
    // PUSH
    // -------------------------
    push: {
      name: "Push-ups",
      category: "push",
      total: 25,
      type: "count",
      tissues: [
        { id: "chest", rank: 4 },
        { id: "front_shoulders", rank: 3 },
        { id: "triceps", rank: 3 },
        { id: "abs", rank: 2 },
        { id: "rotator_cuff_tendon", rank: 2 },
        { id: "triceps_tendon", rank: 2 },
        { id: "shoulder_ligaments", rank: 1 },
        { id: "elbow_ligaments", rank: 1 }
      ]
    },

    // -------------------------
    // PULL
    // -------------------------
    pull: {
      name: "Inverted Table Row",
      category: "pull",
      total: 25,
      type: "count",
      tissues: [
        { id: "upper_back", rank: 4 },
        { id: "lats", rank: 4 },
        { id: "biceps", rank: 3 },
        { id: "lower_back", rank: 2 },
        { id: "forearm_flexors", rank: 2 },
        { id: "biceps_tendon", rank: 2 },
        { id: "shoulder_ligaments", rank: 1 },
        { id: "elbow_ligaments", rank: 1 }
      ]
    },

    // -------------------------
    // CORE
    // -------------------------
    core: {
      name: "Plank With Knee Taps",
      category: "core",
      total: 25,
      type: "count",
      tissues: [
        { id: "abs", rank: 4 },
        { id: "obliques", rank: 3 },
        { id: "deep_core", rank: 3 },
        { id: "front_shoulders", rank: 2 },
        { id: "neck_extensors", rank: 2 },
        { id: "abdominal_tendon", rank: 2 },
        { id: "spinal_ligaments", rank: 1 }
      ]
    },

    // -------------------------
    // LEGS
    // -------------------------
    legs: {
      name: "Slow Squats",
      category: "legs",
      total: 25,
      type: "count",
      tissues: [
        { id: "quads", rank: 4 },
        { id: "glutes", rank: 3 },
        { id: "hamstrings", rank: 3 },
        { id: "calves", rank: 2 },
        { id: "patellar_tendon", rank: 2 },
        { id: "achilles_tendon", rank: 2 },
        { id: "knee_ligaments", rank: 1 },
        { id: "ankle_ligaments", rank: 1 }
      ]
    },

    // -------------------------
    // GRIP
    // -------------------------
    grip: {
      name: "Farmer Carry",
      category: "grip",
      total: 120,
      type: "time",
      tissues: [
        { id: "forearm_flexors", rank: 4 },
        { id: "forearm_extensors", rank: 3 },
        { id: "upper_back", rank: 3 },
        { id: "lower_back", rank: 2 },
        { id: "wrist_flexor_tendon", rank: 3 },
        { id: "wrist_extensor_tendon", rank: 3 },
        { id: "wrist_ligaments", rank: 1 }
      ]
    },

    // -------------------------
    // UTILITY
    // -------------------------
    utility: {
      name: "Scapular Shrug",
      category: "utility",
      total: 25,
      type: "count",
      tissues: [
        { id: "upper_back", rank: 3 },
        { id: "rear_shoulders", rank: 3 },
        { id: "forearm_flexors", rank: 2 }
      ]
    }
  },

  // -----------------------------------
  // Recovery Rank System
  // -----------------------------------
  recoveryRankMax: 10,

  // -----------------------------------
  // Thresholds (tuned for v1.1)
  // -----------------------------------
  thresholds: {
    approaching: 0.85,
    complete: 1.0,
    over: 1.01
  }
};

// Convenience exports
export const EXERCISES = Object.entries(EvergreenConfig.exercises).map(
  ([id, ex]) => ({
    id,
    ...ex,
    tier: EvergreenConfig.categories[ex.category]?.tier ?? 1
  })
);

export const TIERS = [
  { id: 1, name: "Primary Movements", defaultExpanded: true },
  { id: 2, name: "Accessory Work", defaultExpanded: true }
];
