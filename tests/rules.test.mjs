import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { generateDueTodayItems } from "../src/domain/rules.js";

test("date-triggered rule creates exactly one check item for the scheduled date", () => {
  const now = "2026-06-10T09:00:00.000Z";
  const data = createInitialData(now);
  data.goalCards[2].rules.push({
    id: "rule-ship-check",
    goalCardId: "card-focus-anchor-mvp",
    type: "date_triggered_check",
    titleTemplate: "Check whether MVP shipped",
    schedule: { date: "2026-06-10" },
    active: true,
    lastGeneratedFor: null,
    createdAt: now,
    updatedAt: now
  });

  const once = generateDueTodayItems(data, "2026-06-10", now);
  const twice = generateDueTodayItems(once.data, "2026-06-10", now);
  const generated = twice.data.goalCards[2].todayItems.filter((item) => item.id === "item-rule-ship-check-2026-06-10");

  assert.equal(generated.length, 1);
  assert.equal(generated[0].source, "date_triggered");
  assert.equal(twice.generatedItemIds.length, 0);
});

test("biweekly routine rule generates on matching weekday and cadence", () => {
  const now = "2026-05-20T09:00:00.000Z";
  const data = createInitialData(now);
  data.goalCards[0].todayItems = [];

  const result = generateDueTodayItems(data, "2026-05-20", now);
  const generated = result.data.goalCards[0].todayItems.find((item) => item.id === "item-rule-report-biweekly-polish-2026-05-20");

  assert.equal(generated.title, "Polish narrative and risks section");
  assert.equal(generated.source, "routine");
  assert.equal(result.generatedItemIds.includes(generated.id), true);
});
