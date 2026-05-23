import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { renderManageHtml } from "../src/ui/manageRender.js";
import { toManageViewModel } from "../src/ui/manageViewModel.js";

const NOW = "2026-05-22T09:00:00.000Z";

test("toManageViewModel exposes cards, rules, summary, and sections", () => {
  const viewModel = toManageViewModel(createInitialData(NOW));

  assert.equal(viewModel.cards.length, 4);
  assert.equal(viewModel.rules.length, 1);
  assert.equal(viewModel.summary.cards, 4);
  assert.equal(viewModel.summary.links, 7);
  assert.equal(viewModel.sections.map((section) => section.id).join(","), "cards,rules,data");
});

test("toManageViewModel handles null app data", () => {
  const viewModel = toManageViewModel(null);

  assert.deepEqual(viewModel.cards, []);
  assert.deepEqual(viewModel.rules, []);
  assert.equal(viewModel.selectedCard, null);
  assert.equal(viewModel.summary.cards, 0);
  assert.equal(viewModel.summary.links, 0);
  assert.equal(viewModel.sections.map((section) => section.id).join(","), "cards,rules,data");
});

test("toManageViewModel handles empty app data", () => {
  const viewModel = toManageViewModel({ goalCards: [], behaviorEvents: [], dailySnapshots: [] });

  assert.deepEqual(viewModel.cards, []);
  assert.deepEqual(viewModel.rules, []);
  assert.equal(viewModel.selectedCard, null);
  assert.equal(viewModel.summary.cards, 0);
});

test("renderManageHtml renders manage shell sections and data actions", () => {
  const html = renderManageHtml(toManageViewModel(createInitialData(NOW)));

  assert.match(html, /Manage Focus Anchor/);
  assert.match(html, /data-section="cards"/);
  assert.match(html, /data-section="rules"/);
  assert.match(html, /data-section="data"/);
  assert.match(html, /Export JSON/);
  assert.match(html, /Import JSON/);
  assert.match(html, /type="file"/);
  assert.match(html, /data-action="confirm-import"/);
  assert.match(html, /Import summary/);
  assert.match(html, /type RESET/);
  assert.match(html, /data-action="open-reset-confirmation"/);
  assert.match(html, /data-action="confirm-reset-data" disabled/);
});

test("renderManageHtml escapes card text", () => {
  const data = createInitialData(NOW);
  data.goalCards[0] = {
    ...data.goalCards[0],
    title: "\"><script>alert(1)</script>"
  };

  const html = renderManageHtml(toManageViewModel(data));

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
