import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { buildHomeModel } from "../src/domain/ranking.js";
import { createBehaviorEvent } from "../src/domain/events.js";
import { upsertDailySnapshot } from "../src/domain/snapshots.js";
import { createMemoryRepository } from "../src/storage/repository.js";

test("daily snapshot is created once and updated during the day", async () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const model = buildHomeModel(data, "2026-05-22");
  const event = createBehaviorEvent("today_item_completed", "2026-05-22T10:00:00.000Z", {
    goalCardId: "card-biweekly-report",
    todayItemId: "item-report-polish",
    before: { status: "open" },
    after: { status: "done" }
  });

  const withInitial = upsertDailySnapshot(data, "2026-05-22", model, []);
  const withUpdate = upsertDailySnapshot({ ...withInitial, behaviorEvents: [event] }, "2026-05-22", model, ["item-report-polish"]);

  assert.equal(withUpdate.dailySnapshots.length, 1);
  assert.deepEqual(withUpdate.dailySnapshots[0].completedTodayItemIds, ["item-report-polish"]);
  assert.deepEqual(withUpdate.dailySnapshots[0].behaviorEventIds, [event.id]);
});

test("memory repository saves and loads data", async () => {
  const repo = createMemoryRepository();
  const data = createInitialData("2026-05-22T09:12:00.000Z");

  await repo.save(data);
  const loaded = await repo.load();

  assert.equal(loaded.goalCards.length, data.goalCards.length);
});
