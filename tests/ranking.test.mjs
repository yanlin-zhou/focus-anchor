import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { buildHomeModel } from "../src/domain/ranking.js";

test("home model shows top 3 open today items before collapsed cards", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const model = buildHomeModel(data, "2026-05-22");

  assert.equal(model.topTodayItems.length, 3);
  assert.deepEqual(model.topTodayItems.map((item) => item.id), [
    "item-report-metrics-check",
    "item-report-polish",
    "item-rollout-impact"
  ]);
  assert.equal(model.focusCards.length, 3);
  assert.deepEqual(model.focusCards.map((card) => card.id), [
    "card-biweekly-report",
    "card-rollout-follow-up",
    "card-focus-anchor-mvp"
  ]);
  assert.equal(model.backlogCards.length, 1);
  assert.deepEqual(model.backlogCards.map((card) => card.id), ["card-weekly-planning"]);
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

test("top today items exclude done and future scheduled items", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const report = data.goalCards.find((card) => card.id === "card-biweekly-report");
  report.todayItems.push(
    {
      id: "item-report-done",
      goalCardId: "card-biweekly-report",
      title: "AAA already closed report note",
      status: "done",
      source: "manual",
      scheduledFor: "2026-05-22",
      doneAt: "2026-05-22T09:20:00.000Z",
      skippedAt: null,
      note: "",
      createdAt: "2026-05-22T09:12:00.000Z",
      updatedAt: "2026-05-22T09:20:00.000Z"
    },
    {
      id: "item-report-future",
      goalCardId: "card-biweekly-report",
      title: "AAA future report follow-up",
      status: "open",
      source: "manual",
      scheduledFor: "2026-05-23",
      doneAt: null,
      skippedAt: null,
      note: "",
      createdAt: "2026-05-22T09:12:00.000Z",
      updatedAt: "2026-05-22T09:12:00.000Z"
    }
  );

  const model = buildHomeModel(data, "2026-05-22");
  const topIds = model.topTodayItems.map((item) => item.id);

  assert.deepEqual(topIds, [
    "item-report-metrics-check",
    "item-report-polish",
    "item-rollout-impact"
  ]);
  assert.equal(topIds.includes("item-report-done"), false);
  assert.equal(topIds.includes("item-report-future"), false);
});

test("snoozed active cards move out of focus and backlog into parking", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const rollout = data.goalCards.find((card) => card.id === "card-rollout-follow-up");
  rollout.snoozedUntil = "2026-05-23";

  const model = buildHomeModel(data, "2026-05-22");
  const focusAndBacklogIds = [...model.focusCards, ...model.backlogCards].map((card) => card.id);
  const parkedRollout = model.parkingCards.find((card) => card.id === "card-rollout-follow-up");

  assert.equal(focusAndBacklogIds.includes("card-rollout-follow-up"), false);
  assert.ok(parkedRollout);
  assert.match(parkedRollout.sortReason, /Snoozed until 2026-05-23/);
});

test("sort reasons describe score contributors and top item reasons reuse card reasons", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  const model = buildHomeModel(data, "2026-05-22");

  const reportCard = model.focusCards.find((card) => card.id === "card-biweekly-report");
  const rolloutCard = model.focusCards.find((card) => card.id === "card-rollout-follow-up");
  const rolloutItem = model.topTodayItems.find((item) => item.id === "item-rollout-impact");

  assert.match(reportCard.sortReason, /Date-triggered item today/);
  assert.match(rolloutCard.sortReason, /High importance/);
  assert.match(rolloutCard.sortReason, /2 open items/);
  assert.equal(rolloutItem.reason, rolloutCard.sortReason);
});
