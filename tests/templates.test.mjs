import assert from "node:assert/strict";
import test from "node:test";
import { createDraft, createDraftCardFromTemplate, completeSetupDraft, SETUP_TEMPLATES, validateSetupDraft } from "../src/domain/templates.js";
import { validateAppData } from "../src/domain/schema.js";

const NOW = "2026-05-22T09:00:00.000Z";
const TODAY = "2026-05-22";

test("setup exposes four no-code templates", () => {
  assert.deepEqual(SETUP_TEMPLATES.map((template) => template.id), [
    "project_progress",
    "routine_work",
    "ad_hoc_issue",
    "date_check"
  ]);
});

test("templates create expected default card types and importance", () => {
  assert.equal(createDraftCardFromTemplate("project_progress", NOW).type, "project");
  assert.equal(createDraftCardFromTemplate("project_progress", NOW).importance, 4);
  assert.equal(createDraftCardFromTemplate("routine_work", NOW).type, "routine");
  assert.equal(createDraftCardFromTemplate("ad_hoc_issue", NOW).importance, 5);
  assert.equal(createDraftCardFromTemplate("date_check", NOW).type, "deadline");
});

test("setup draft requires at least one card and one today item", () => {
  assert.deepEqual(validateSetupDraft(createDraft()).errors, [
    "Add at least one focus card.",
    "Add at least one today item."
  ]);

  const cardOnly = createDraft({
    cards: [createDraftCardFromTemplate("project_progress", NOW)]
  });

  assert.deepEqual(validateSetupDraft(cardOnly).errors, ["Add at least one today item."]);
});

test("setup draft rejects cards with blank titles", () => {
  const card = {
    ...createDraftCardFromTemplate("project_progress", NOW),
    title: " ",
    items: [{ title: "Ship no-code setup", scheduledFor: TODAY }]
  };

  assert.deepEqual(validateSetupDraft(createDraft({ cards: [card] })).errors, ["Add a title for each focus card."]);
  assert.throws(
    () => completeSetupDraft(createDraft({ cards: [card] }), NOW, TODAY),
    /Add a title for each focus card\./
  );
});

test("setup draft rejects cards with invalid types", () => {
  const card = {
    ...createDraftCardFromTemplate("project_progress", NOW),
    type: "wishlist",
    items: [{ title: "Ship no-code setup", scheduledFor: TODAY }]
  };

  assert.deepEqual(validateSetupDraft(createDraft({ cards: [card] })).errors, ["Choose a valid type for each focus card."]);
  assert.throws(
    () => completeSetupDraft(createDraft({ cards: [card] }), NOW, TODAY),
    /Choose a valid type for each focus card\./
  );
});

test("routine template creates weekly and biweekly rules", () => {
  const weeklyCard = {
    ...createDraftCardFromTemplate("routine_work", NOW),
    title: "Weekly planning",
    items: [{ title: "Plan week", scheduledFor: TODAY }],
    routine: { title: "Plan week", cadence: "weekly", weekdays: [1], startDate: TODAY }
  };
  const card = {
    ...createDraftCardFromTemplate("routine_work", NOW),
    title: "Biweekly report",
    items: [{ title: "Polish report", scheduledFor: TODAY }],
    routine: { title: "Polish report", cadence: "biweekly", weekdays: [4], startDate: TODAY }
  };

  const data = completeSetupDraft(createDraft({ cards: [weeklyCard, card] }), NOW, TODAY);
  const weeklyRule = data.goalCards[0].rules[0];
  const rule = data.goalCards[1].rules[0];

  assert.equal(weeklyRule.type, "routine");
  assert.equal(weeklyRule.titleTemplate, "Plan week");
  assert.deepEqual(weeklyRule.schedule, { cadence: "weekly", weekdays: [1], startDate: TODAY });
  assert.equal(rule.type, "routine");
  assert.equal(rule.titleTemplate, "Polish report");
  assert.deepEqual(rule.schedule, { cadence: "biweekly", weekdays: [4], startDate: TODAY });
});

test("date check template creates a date-triggered reminder", () => {
  const card = {
    ...createDraftCardFromTemplate("date_check", NOW),
    title: "Launch follow-up",
    items: [{ title: "Prepare launch note", scheduledFor: TODAY }],
    dateReminder: { title: "Check whether launch shipped", date: "2026-05-30" }
  };

  const data = completeSetupDraft(createDraft({ cards: [card] }), NOW, TODAY);
  const rule = data.goalCards[0].rules[0];

  assert.equal(rule.type, "date_triggered_check");
  assert.equal(rule.titleTemplate, "Check whether launch shipped");
  assert.deepEqual(rule.schedule, { date: "2026-05-30" });
});

test("setup conversion creates unique child ids across cards", () => {
  const firstCard = {
    ...createDraftCardFromTemplate("routine_work", NOW),
    title: "Ops review",
    items: [{ title: "Review", scheduledFor: TODAY }],
    links: [{ label: "Dashboard", url: "https://example.com/ops" }],
    routine: { title: "Review", cadence: "weekly", weekdays: [5], startDate: TODAY }
  };
  const secondCard = {
    ...createDraftCardFromTemplate("routine_work", NOW),
    title: "Launch review",
    items: [{ title: "Review", scheduledFor: TODAY }],
    links: [{ label: "Dashboard", url: "https://example.com/launch" }],
    routine: { title: "Review", cadence: "weekly", weekdays: [5], startDate: TODAY }
  };

  const data = completeSetupDraft(createDraft({ cards: [firstCard, secondCard] }), NOW, TODAY);
  const itemIds = data.goalCards.flatMap((card) => card.todayItems.map((item) => item.id));
  const linkIds = data.goalCards.flatMap((card) => card.links.map((link) => link.id));
  const ruleIds = data.goalCards.flatMap((card) => card.rules.map((rule) => rule.id));

  assert.equal(new Set(itemIds).size, itemIds.length);
  assert.equal(new Set(linkIds).size, linkIds.length);
  assert.equal(new Set(ruleIds).size, ruleIds.length);
  assert.equal(validateAppData(data).ok, true);
});

test("completed setup draft creates valid app data", () => {
  const card = {
    ...createDraftCardFromTemplate("project_progress", NOW),
    title: "Focus Anchor",
    items: [{ title: "Ship no-code setup", scheduledFor: TODAY }],
    links: [{ label: "Spec", url: "https://example.com/spec", kind: "doc", includeInOpenAll: true }]
  };

  const data = completeSetupDraft(createDraft({ cards: [card] }), NOW, TODAY);

  assert.equal(data.setup.completedAt, NOW);
  assert.equal(data.setup.draft, null);
  assert.equal(data.goalCards[0].todayItems[0].title, "Ship no-code setup");
  assert.equal(data.goalCards[0].links[0].label, "Spec");
  assert.equal(validateAppData(data).ok, true);
});
