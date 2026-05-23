import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { validateAppData } from "../src/domain/schema.js";
import { addGoalCard, addLinkToCard, addRuleToCard, updateGoalCard } from "../src/domain/manageActions.js";

const NOW = "2026-05-22T09:00:00.000Z";
const LATER = "2026-05-22T10:00:00.000Z";

test("addGoalCard and updateGoalCard can add and edit valid goal cards", () => {
  const data = createInitialData(NOW);
  const added = addGoalCard(data, {
    title: "Launch checklist",
    type: "deadline",
    status: "active",
    importance: 4
  }, LATER);
  const card = added.goalCards.at(-1);
  const updated = updateGoalCard(added, card.id, {
    title: "Launch checklist review",
    status: "paused",
    importance: 3
  }, "2026-05-22T11:00:00.000Z");
  const updatedCard = updated.goalCards.find((entry) => entry.id === card.id);

  assert.equal(data.goalCards.length, 4);
  assert.equal(added.goalCards.length, 5);
  assert.equal(card.title, "Launch checklist");
  assert.equal(card.type, "deadline");
  assert.equal(updatedCard.title, "Launch checklist review");
  assert.equal(updatedCard.status, "paused");
  assert.equal(updatedCard.importance, 3);
  assert.equal(validateAppData(updated).ok, true);
});

test("addLinkToCard adds a valid link to a goal card", () => {
  const data = createInitialData(NOW);
  const next = addLinkToCard(data, "card-focus-anchor-mvp", {
    label: "Design notes",
    url: "https://example.com/design",
    kind: "doc",
    includeInOpenAll: true
  }, LATER);
  const card = next.goalCards.find((entry) => entry.id === "card-focus-anchor-mvp");
  const link = card.links.at(-1);

  assert.equal(link.label, "Design notes");
  assert.equal(link.url, "https://example.com/design");
  assert.equal(link.kind, "doc");
  assert.equal(link.goalCardId, "card-focus-anchor-mvp");
  assert.equal(validateAppData(next).ok, true);
});

test("addLinkToCard rejects invalid and disallowed URL schemes", () => {
  const data = createInitialData(NOW);

  for (const url of ["javascript:alert(1)", "data:text/html,hello", "not a url"]) {
    const next = addLinkToCard(data, "card-focus-anchor-mvp", {
      label: "Unsafe",
      url,
      kind: "doc"
    }, LATER);

    assert.equal(next, data);
  }
});

test("addRuleToCard adds weekly routine and date-triggered check rules", () => {
  const data = createInitialData(NOW);
  const withRoutine = addRuleToCard(data, "card-weekly-planning", {
    type: "routine",
    titleTemplate: "Plan next week",
    schedule: { cadence: "weekly", weekdays: [1], startDate: "2026-05-25" }
  }, LATER);
  const withDateCheck = addRuleToCard(withRoutine, "card-weekly-planning", {
    type: "date_triggered_check",
    titleTemplate: "Review launch readiness",
    schedule: { date: "2026-06-01" }
  }, "2026-05-22T11:00:00.000Z");
  const card = withDateCheck.goalCards.find((entry) => entry.id === "card-weekly-planning");

  assert.equal(card.rules.at(-2).type, "routine");
  assert.deepEqual(card.rules.at(-2).schedule, { cadence: "weekly", weekdays: [1], startDate: "2026-05-25" });
  assert.equal(card.rules.at(-1).type, "date_triggered_check");
  assert.deepEqual(card.rules.at(-1).schedule, { date: "2026-06-01" });
  assert.equal(validateAppData(withDateCheck).ok, true);
});

test("addRuleToCard rejects routine rules without weekdays", () => {
  const data = createInitialData(NOW);
  const next = addRuleToCard(data, "card-weekly-planning", {
    type: "routine",
    titleTemplate: "Plan next week",
    schedule: { cadence: "weekly", weekdays: [], startDate: "2026-05-25" }
  }, LATER);

  assert.equal(next, data);
});

test("manage action ids do not collide for repeated submissions with same input and time", () => {
  const data = createInitialData(NOW);
  const firstCard = addGoalCard(data, { title: "Launch checklist" }, LATER).goalCards.at(-1);
  const secondCard = addGoalCard(data, { title: "Launch checklist" }, LATER).goalCards.at(-1);
  const firstLink = addLinkToCard(data, "card-focus-anchor-mvp", {
    label: "Design notes",
    url: "https://example.com/design"
  }, LATER).goalCards.find((card) => card.id === "card-focus-anchor-mvp").links.at(-1);
  const secondLink = addLinkToCard(data, "card-focus-anchor-mvp", {
    label: "Design notes",
    url: "https://example.com/design"
  }, LATER).goalCards.find((card) => card.id === "card-focus-anchor-mvp").links.at(-1);
  const ruleInput = {
    type: "routine",
    titleTemplate: "Plan next week",
    schedule: { cadence: "weekly", weekdays: [1], startDate: "2026-05-25" }
  };
  const firstRule = addRuleToCard(data, "card-weekly-planning", ruleInput, LATER)
    .goalCards.find((card) => card.id === "card-weekly-planning").rules.at(-1);
  const secondRule = addRuleToCard(data, "card-weekly-planning", ruleInput, LATER)
    .goalCards.find((card) => card.id === "card-weekly-planning").rules.at(-1);

  assert.notEqual(firstCard.id, secondCard.id);
  assert.notEqual(firstLink.id, secondLink.id);
  assert.notEqual(firstRule.id, secondRule.id);
});

test("manage action fallback ids do not collide without crypto randomUUID", () => {
  withFallbackIdGeneration(() => {
    const data = createInitialData(NOW);
    const firstCard = addGoalCard(data, { title: "Launch checklist" }, LATER).goalCards.at(-1);
    const secondCard = addGoalCard(data, { title: "Launch checklist" }, LATER).goalCards.at(-1);
    const firstLink = addLinkToCard(data, "card-focus-anchor-mvp", {
      label: "Design notes",
      url: "https://example.com/design"
    }, LATER).goalCards.find((card) => card.id === "card-focus-anchor-mvp").links.at(-1);
    const secondLink = addLinkToCard(data, "card-focus-anchor-mvp", {
      label: "Design notes",
      url: "https://example.com/design"
    }, LATER).goalCards.find((card) => card.id === "card-focus-anchor-mvp").links.at(-1);
    const ruleInput = {
      type: "routine",
      titleTemplate: "Plan next week",
      schedule: { cadence: "weekly", weekdays: [1], startDate: "2026-05-25" }
    };
    const firstRule = addRuleToCard(data, "card-weekly-planning", ruleInput, LATER)
      .goalCards.find((card) => card.id === "card-weekly-planning").rules.at(-1);
    const secondRule = addRuleToCard(data, "card-weekly-planning", ruleInput, LATER)
      .goalCards.find((card) => card.id === "card-weekly-planning").rules.at(-1);

    assert.notEqual(firstCard.id, secondCard.id);
    assert.notEqual(firstLink.id, secondLink.id);
    assert.notEqual(firstRule.id, secondRule.id);
  });
});

function withFallbackIdGeneration(run) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {}
  });

  try {
    run();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "crypto", descriptor);
    } else {
      delete globalThis.crypto;
    }
  }
}
