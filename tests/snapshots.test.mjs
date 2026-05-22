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
  const initialFocusLaneCardIds = model.focusCards.map((card) => card.id);
  const initialBacklogCardIds = model.backlogCards.map((card) => card.id);
  const event = createBehaviorEvent("today_item_completed", "2026-05-22T10:00:00.000Z", {
    goalCardId: "card-biweekly-report",
    todayItemId: "item-report-polish",
    before: { status: "open" },
    after: { status: "done" }
  });

  const withInitial = upsertDailySnapshot(data, "2026-05-22", model, []);
  const updatedData = {
    ...withInitial,
    behaviorEvents: [event],
    goalCards: withInitial.goalCards.map((card) =>
      card.id === "card-weekly-planning" ? { ...card, pinned: true } : card
    )
  };
  const updatedModel = buildHomeModel(updatedData, "2026-05-22");
  const finalFocusLaneCardIds = updatedModel.focusCards.map((card) => card.id);
  const finalBacklogCardIds = updatedModel.backlogCards.map((card) => card.id);
  const withUpdate = upsertDailySnapshot(updatedData, "2026-05-22", updatedModel, ["item-report-polish"]);

  assert.equal(withUpdate.dailySnapshots.length, 1);
  assert.deepEqual(withUpdate.dailySnapshots[0].initialFocusLaneCardIds, initialFocusLaneCardIds);
  assert.deepEqual(withUpdate.dailySnapshots[0].initialBacklogCardIds, initialBacklogCardIds);
  assert.deepEqual(withUpdate.dailySnapshots[0].finalFocusLaneCardIds, finalFocusLaneCardIds);
  assert.deepEqual(withUpdate.dailySnapshots[0].finalBacklogCardIds, finalBacklogCardIds);
  assert.deepEqual(withUpdate.dailySnapshots[0].completedTodayItemIds, ["item-report-polish"]);
  assert.deepEqual(withUpdate.dailySnapshots[0].behaviorEventIds, [event.id]);
});

test("daily snapshot includes only behavior events from the same date", async () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const model = buildHomeModel(data, "2026-05-22");
  const priorDayEvent = createBehaviorEvent("today_item_completed", "2026-05-21T22:00:00.000Z", {
    todayItemId: "item-old"
  });
  const todayEvent = createBehaviorEvent("today_item_completed", "2026-05-22T10:00:00.000Z", {
    todayItemId: "item-report-polish"
  });

  const withSnapshot = upsertDailySnapshot(
    { ...data, behaviorEvents: [priorDayEvent, todayEvent] },
    "2026-05-22",
    model,
    []
  );

  assert.deepEqual(withSnapshot.dailySnapshots[0].behaviorEventIds, [todayEvent.id]);
});

test("daily snapshot filters behavior events by local date", async () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const model = buildHomeModel(data, "2026-05-22");
  const priorLocalDayEvent = createBehaviorEvent("today_item_completed", "2026-05-22T06:30:00.000Z", {
    todayItemId: "item-too-early-local"
  });
  const todayLocalEvent = createBehaviorEvent("today_item_completed", "2026-05-22T16:00:00.000Z", {
    todayItemId: "item-report-polish"
  });

  const withSnapshot = upsertDailySnapshot(
    { ...data, behaviorEvents: [priorLocalDayEvent, todayLocalEvent] },
    "2026-05-22",
    model,
    []
  );

  assert.deepEqual(withSnapshot.dailySnapshots[0].behaviorEventIds, [todayLocalEvent.id]);
});

test("daily snapshot records only currently active snoozes", async () => {
  const data = createInitialData("2026-05-24T09:12:00.000Z");
  const snoozedData = {
    ...data,
    goalCards: data.goalCards.map((card) => {
      if (card.id === "card-biweekly-report") return { ...card, snoozedUntil: "2026-05-23" };
      if (card.id === "card-focus-anchor-mvp") return { ...card, snoozedUntil: "2026-05-25" };
      return card;
    })
  };
  const model = buildHomeModel(snoozedData, "2026-05-24");

  const withSnapshot = upsertDailySnapshot(snoozedData, "2026-05-24", model, []);

  assert.deepEqual(withSnapshot.dailySnapshots[0].snoozedCardIds, ["card-focus-anchor-mvp"]);
});

test("next local date handles daylight-saving fall-back days", async () => {
  const { nextLocalDateKey } = await import("../src/domain/date.js");

  assert.equal(nextLocalDateKey("2026-11-01T07:30:00.000Z"), "2026-11-02");
});

test("memory repository saves and loads data", async () => {
  const repo = createMemoryRepository();
  const data = createInitialData("2026-05-22T09:12:00.000Z");

  await repo.save(data);
  const loaded = await repo.load();

  assert.equal(loaded.goalCards.length, data.goalCards.length);
});

test("memory repository isolates loaded data until save", async () => {
  const repo = createMemoryRepository();
  const data = createInitialData("2026-05-22T09:12:00.000Z");

  await repo.save(data);
  const loaded = await repo.load();
  loaded.goalCards[0].title = "Mutated without save";

  const reloaded = await repo.load();

  assert.equal(reloaded.goalCards[0].title, data.goalCards[0].title);
});

test("memory repository isolates saved input from later mutation", async () => {
  const repo = createMemoryRepository();
  const data = createInitialData("2026-05-22T09:12:00.000Z");

  await repo.save(data);
  data.goalCards[0].title = "Mutated after save";
  const loaded = await repo.load();

  assert.notEqual(loaded.goalCards[0].title, data.goalCards[0].title);
});

test("memory repository isolates save return value from stored state", async () => {
  const repo = createMemoryRepository();
  const data = createInitialData("2026-05-22T09:12:00.000Z");

  const saved = await repo.save(data);
  saved.goalCards[0].title = "Mutated save return value";
  const loaded = await repo.load();

  assert.notEqual(loaded.goalCards[0].title, saved.goalCards[0].title);
});

test("memory repository clones initial data", async () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const repo = createMemoryRepository(data);
  data.goalCards[0].title = "Mutated after repo creation";

  const loaded = await repo.load();

  assert.notEqual(loaded.goalCards[0].title, data.goalCards[0].title);
});
