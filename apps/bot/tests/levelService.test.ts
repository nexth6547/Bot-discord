import assert from "node:assert/strict";
import test from "node:test";
import { LevelService } from "../src/services/levelService";

test("getXpForLevel returns zero for non-positive levels", () => {
  assert.equal(LevelService.getXpForLevel(0), 0);
  assert.equal(LevelService.getXpForLevel(-1), 0);
});

test("getXpForLevel calculates cumulative XP thresholds", () => {
  assert.equal(LevelService.getXpForLevel(1), 155);
  assert.equal(LevelService.getXpForLevel(2), 375);
  assert.equal(LevelService.getXpForLevel(3), 670);
});

test("getLevelFromXp changes level exactly at each XP threshold", () => {
  for (let level = 1; level <= 100; level++) {
    const threshold = LevelService.getXpForLevel(level);

    assert.equal(LevelService.getLevelFromXp(threshold - 1), level - 1);
    assert.equal(LevelService.getLevelFromXp(threshold), level);
  }
});

test("isOnCooldown stays active before the threshold and expires at the threshold", () => {
  const lastXpAt = new Date("2026-10-12T12:00:00.000Z");

  assert.equal(
    LevelService.isOnCooldown(lastXpAt, new Date("2026-10-12T12:00:59.999Z"), 60),
    true
  );
  assert.equal(
    LevelService.isOnCooldown(lastXpAt, new Date("2026-10-12T12:01:00.000Z"), 60),
    false
  );
  assert.equal(
    LevelService.isOnCooldown(lastXpAt, new Date("2026-10-12T12:00:00.000Z"), 0),
    false
  );
});
