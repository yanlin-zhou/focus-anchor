import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
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
