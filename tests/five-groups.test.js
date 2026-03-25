import { describe, it, expect } from "vitest";
import {
  mapFoodGroupToFiveId,
  computeMealFiveGroups,
  mergeFiveGroupsForDay,
  countFiveGroupDaysInWeek,
  normalizeRecommendationLines,
  countFiveHit,
} from "../backend/app/static/js/five-groups.js";

describe("mapFoodGroupToFiveId", () => {
  it("maps Gemini-style labels", () => {
    expect(mapFoodGroupToFiveId("Protein")).toBe("protein");
    expect(mapFoodGroupToFiveId("Carbs")).toBe("grain");
    expect(mapFoodGroupToFiveId("Vegetable")).toBe("veg");
    expect(mapFoodGroupToFiveId("Fruit")).toBe("fruit");
    expect(mapFoodGroupToFiveId("milk")).toBe("dairy");
  });

  it("returns null for unknown fat-only oil", () => {
    expect(mapFoodGroupToFiveId("Fat")).toBe(null);
  });
});

describe("mergeFiveGroupsForDay", () => {
  it("ORs multiple meals", () => {
    const day = mergeFiveGroupsForDay([
      { fiveGroups: { grain: true, protein: false, veg: false, fruit: false, dairy: false } },
      { fiveGroups: { grain: false, protein: true, veg: true, fruit: false, dairy: false } },
    ]);
    expect(countFiveHit(day)).toBe(3);
  });
});

describe("countFiveGroupDaysInWeek", () => {
  it("counts days per group", () => {
    const logs = {
      "2026-03-23": [
        { fiveGroups: { grain: true, protein: true, veg: false, fruit: false, dairy: false } },
      ],
    };
    const dk = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const counts = countFiveGroupDaysInWeek("2026-03-23", (k) => logs[k] || [], dk);
    expect(counts.grain).toBe(1);
    expect(counts.fruit).toBe(0);
  });
});

describe("normalizeRecommendationLines", () => {
  it("dedupes and trims", () => {
    expect(normalizeRecommendationLines([" a ", "a", "b"])).toEqual(["a", "b"]);
  });
});
