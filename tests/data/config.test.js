import { describe, it, expect } from "vitest";

import { EvergreenConfig, EXERCISES, TIERS } from "../../src/data/config.js";

describe("config compatibility", () => {
  it("ensures all exercise tissue references exist in tissue registry", () => {
    const tissueIds = new Set(EvergreenConfig.tissues.map(tissue => tissue.id));

    for (const exercise of Object.values(EvergreenConfig.exercises)) {
      for (const tissueRef of exercise.tissues || []) {
        expect(tissueIds.has(tissueRef.id)).toBe(true);
      }
    }
  });

  it("uses the updated tissue base cooldown values", () => {
    expect(EvergreenConfig.tissueTypes.muscle.baseDays).toBe(2);
    expect(EvergreenConfig.tissueTypes.tendon.baseDays).toBe(2);
    expect(EvergreenConfig.tissueTypes.ligament.baseDays).toBe(3);
  });

  it("derives UI tiers from exercise categories", () => {
    EXERCISES.forEach(exercise => {
      expect(exercise.tier).toBe(
        EvergreenConfig.categories[exercise.category]?.tier
      );
    });
  });

  it("preserves legacy exercise ids and UI compatibility settings", () => {
    expect(EXERCISES.map(exercise => exercise.id)).toEqual([
      "push",
      "pull",
      "core",
      "legs",
      "grip",
      "utility"
    ]);
    expect(TIERS.map(tier => tier.id)).toEqual([1, 2]);
    expect(EvergreenConfig.swipeThreshold).toBe(40);
  });
});