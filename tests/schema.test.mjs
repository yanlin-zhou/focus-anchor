import assert from "node:assert/strict";
import test from "node:test";
import { toLocalDateKey } from "../src/domain/date.js";
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

test("first-run today items are scheduled for the local date of first open", () => {
  const nowIso = "2026-05-21T16:00:00.000Z";
  const data = createInitialData(nowIso);
  const expectedDate = toLocalDateKey(nowIso);
  const scheduledDates = data.goalCards.flatMap((card) =>
    card.todayItems.map((item) => item.scheduledFor)
  );

  assert.equal(scheduledDates.length > 0, true);
  assert.equal(scheduledDates.every((date) => date === expectedDate), true);
});

test("schema rejects unsafe link URL schemes", () => {
  const data = createInitialData("2026-05-22T09:12:00.000Z");
  data.goalCards[0] = {
    ...data.goalCards[0],
    links: [
      {
        ...data.goalCards[0].links[0],
        url: "javascript:alert(1)"
      }
    ]
  };

  const result = validateAppData(data);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /invalid url/);
});

test("app data requires valid shortcuts", () => {
  const data = createInitialData("2026-05-30T09:12:00.000Z");
  data.shortcuts = [
    { id: "shortcut-safe", label: "Safe", url: "https://example.com", pinned: true, position: 1 },
    { id: "shortcut-unsafe", label: "Unsafe", url: "javascript:alert(1)", pinned: true, position: 2 }
  ];

  const result = validateAppData(data);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /shortcut shortcut-unsafe has invalid url/);
});

test("app data rejects malformed non-string shortcut fields", () => {
  const data = createInitialData("2026-05-30T09:12:00.000Z");
  data.shortcuts = [
    { id: 123, label: "Numeric id", url: "https://example.com", pinned: true, position: 1 },
    { id: "shortcut-malformed", label: 456, url: 789, pinned: true, position: 2 }
  ];

  const result = validateAppData(data);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /shortcut id must be a string/);
  assert.match(result.errors.join(" "), /shortcut shortcut-malformed label must be a string/);
  assert.match(result.errors.join(" "), /shortcut shortcut-malformed url must be a string/);
});
