import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { validateAppData, GOAL_TYPES, GOAL_STATUSES, ITEM_STATUSES } from "../src/domain/schema.js";

test("schema exposes supported values", () => {
  assert.deepEqual(GOAL_TYPES, ["project", "routine", "ad_hoc", "deadline"]);
  assert.deepEqual(GOAL_STATUSES, ["active", "paused", "done"]);
  assert.deepEqual(ITEM_STATUSES, ["open", "done", "skipped"]);
});

test("first-run data is valid and contains realistic MVP content", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const result = validateAppData(data);

  assert.equal(result.ok, true);
  assert.equal(data.goalCards.length >= 4, true);
  assert.equal(data.goalCards.some((card) => card.type === "routine"), true);
  assert.equal(data.goalCards.some((card) => card.type === "ad_hoc"), true);
  assert.equal(data.goalCards.some((card) => card.type === "project"), true);
});
