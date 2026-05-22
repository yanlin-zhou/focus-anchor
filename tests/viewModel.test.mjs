import assert from "node:assert/strict";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { buildHomeModel } from "../src/domain/ranking.js";
import { toViewModel } from "../src/ui/viewModel.js";
import { renderAppHtml } from "../src/ui/render.js";

test("view model keeps Top 3 as the first execution surface", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const viewModel = toViewModel(homeModel, "2026-05-22T09:12:00.000Z");

  assert.equal(viewModel.topTasks.length, 3);
  assert.equal(viewModel.focusCards.every((card) => card.expanded === false), true);
  assert.equal(viewModel.backlog.collapsed, true);
});

test("rendered html includes collapsed cards and a collapsed backlog", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-22T09:12:00.000Z"));

  assert.match(html, /Top 3 Today Items/);
  assert.match(html, /Show backlog/);
  assert.match(html, /Expand/);
});
