import { describe, expect, it } from "vitest";
import { getAssignmentOrderKey, getAssignmentSeed, orderAssignmentCandidates } from "../lib/assignment-selection";

describe("assignment selection", () => {
  it("creates a stable, user-specific permutation", () => {
    const candidates = Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }));
    const first = orderAssignmentCandidates(candidates, "user-a", "2026-07-20");
    const retry = orderAssignmentCandidates([...candidates].reverse(), "user-a", "2026-07-20");
    const anotherUser = orderAssignmentCandidates(candidates, "user-b", "2026-07-20");

    expect(first.map(({ id }) => id)).toEqual(retry.map(({ id }) => id));
    expect(first.map(({ id }) => id)).not.toEqual(anotherUser.map(({ id }) => id));
    expect(first.map(({ id }) => id)).not.toEqual(candidates.map(({ id }) => id));
  });

  it("uses a different permutation for each assignment cycle", () => {
    const seed = getAssignmentSeed("user-a", "2026-07-20");
    const nextWeekSeed = getAssignmentSeed("user-a", "2026-07-27");
    expect(seed).not.toBe(nextWeekSeed);
    expect(getAssignmentOrderKey(seed, 42)).not.toBe(getAssignmentOrderKey(nextWeekSeed, 42));
  });

  it("does not concentrate a fresh batch on the alphabetically first words", () => {
    const candidates = Array.from({ length: 260 }, (_, index) => ({
      id: index + 1,
      initial: String.fromCharCode(97 + Math.floor(index / 10)),
    }));
    const batch = orderAssignmentCandidates(candidates, "user-a", "2026-07-20").slice(0, 30);
    expect(new Set(batch.map(({ initial }) => initial)).size).toBeGreaterThan(10);
  });
});
