import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyAppData } from "../src/domain/emptyData.js";
import { createInitialData } from "../src/domain/sampleData.js";
import { addTodayItem, completeTodayItem, pinCard, quickAddTodayItem, snoozeCard } from "../src/ui/actions.js";

test("completeTodayItem marks item done and records behavior event", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const next = completeTodayItem(data, "item-report-polish", "2026-05-22T10:00:00.000Z");
  const item = next.goalCards[0].todayItems.find((entry) => entry.id === "item-report-polish");

  assert.equal(item.status, "done");
  assert.equal(item.doneAt, "2026-05-22T10:00:00.000Z");
  assert.equal(next.behaviorEvents[0].type, "today_item_completed");
});

test("completeTodayItem leaves an already-done item unchanged", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const completed = completeTodayItem(data, "item-report-polish", "2026-05-22T10:00:00.000Z");
  const next = completeTodayItem(completed, "item-report-polish", "2026-05-22T11:00:00.000Z");
  const item = next.goalCards[0].todayItems.find((entry) => entry.id === "item-report-polish");

  assert.equal(next, completed);
  assert.equal(item.doneAt, "2026-05-22T10:00:00.000Z");
  assert.equal(next.behaviorEvents.length, 1);
});

test("completeTodayItem returns original data when item is missing", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const next = completeTodayItem(data, "item-missing", "2026-05-22T10:00:00.000Z");

  assert.equal(next, data);
});

test("pinCard and snoozeCard update card state", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const pinned = pinCard(data, "card-weekly-planning", "2026-05-22T10:00:00.000Z");
  const snoozed = snoozeCard(pinned, "card-weekly-planning", "2026-05-24", "2026-05-22T10:05:00.000Z");
  const card = snoozed.goalCards.find((entry) => entry.id === "card-weekly-planning");

  assert.equal(card.pinned, true);
  assert.equal(card.snoozedUntil, "2026-05-24");
  assert.equal(snoozed.behaviorEvents.at(-1).type, "card_snoozed");
});

test("addTodayItem creates a manual item on the selected card", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const next = addTodayItem(data, "card-focus-anchor-mvp", "Write first implementation task", "2026-05-22", "2026-05-22T10:10:00.000Z");
  const card = next.goalCards.find((entry) => entry.id === "card-focus-anchor-mvp");
  const item = card.todayItems.at(-1);

  assert.equal(item.title, "Write first implementation task");
  assert.equal(item.source, "manual");
  assert.equal(item.scheduledFor, "2026-05-22");
  assert.equal(next.behaviorEvents.at(-1).type, "manual_today_item_created");
});

test("addTodayItem returns original data for blank titles", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const next = addTodayItem(data, "card-focus-anchor-mvp", "   ", "2026-05-22", "2026-05-22T10:10:00.000Z");

  assert.equal(next, data);
});

test("quickAddTodayItem creates a default active anchor when no target card exists", () => {
  const data = createEmptyAppData("2026-05-22T09:12:00.000Z");
  data.setup.completedAt = "2026-05-22T09:12:00.000Z";
  const result = quickAddTodayItem(data, null, "Capture the empty-state task", "2026-05-22", "2026-05-22T10:10:00.000Z");
  const card = result.data.goalCards[0];
  const item = card.todayItems[0];

  assert.notEqual(result.data, data);
  assert.equal(result.cardId, card.id);
  assert.equal(card.title, "Today");
  assert.equal(card.type, "ad_hoc");
  assert.equal(card.status, "active");
  assert.equal(card.pinned, true);
  assert.equal(item.title, "Capture the empty-state task");
  assert.equal(item.goalCardId, card.id);
  assert.equal(item.status, "open");
  assert.equal(item.source, "manual");
  assert.equal(result.data.behaviorEvents.at(-1).type, "manual_today_item_created");
});
