import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { buildHomeModel } from "../src/domain/ranking.js";

test("home model shows top 3 open today items before collapsed cards", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const model = buildHomeModel(data, "2026-05-22");

  assert.equal(model.topTodayItems.length, 3);
  assert.equal(model.focusCards.length, 3);
  assert.equal(model.backlogCards.length, 1);
  assert.equal(model.focusCards[0].expanded, false);
  assert.equal(model.backlogCollapsed, true);
});

test("pinned cards outrank unpinned cards", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const weekly = data.goalCards.find((card) => card.id === "card-weekly-planning");
  weekly.pinned = true;
  weekly.todayItems.push({
    id: "item-weekly-plan",
    goalCardId: "card-weekly-planning",
    title: "Draft next week plan",
    status: "open",
    source: "manual",
    scheduledFor: "2026-05-22",
    doneAt: null,
    skippedAt: null,
    note: "",
    createdAt: "2026-05-22T09:12:00.000Z",
    updatedAt: "2026-05-22T09:12:00.000Z"
  });

  const model = buildHomeModel(data, "2026-05-22");

  assert.equal(model.focusCards[0].id, "card-weekly-planning");
  assert.match(model.focusCards[0].sortReason, /Pinned/);
});
