import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("view model applies local expansion state without changing the ranking model", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const expandedId = homeModel.focusCards[0].id;
  const viewModel = toViewModel(homeModel, "2026-05-22T09:12:00.000Z", {
    expandedCardIds: new Set([expandedId]),
    backlogExpanded: true
  });

  assert.equal(viewModel.focusCards[0].expanded, true);
  assert.equal(viewModel.focusCards[1].expanded, false);
  assert.equal(viewModel.backlog.collapsed, false);
  assert.equal(homeModel.focusCards[0].expanded, false);
});

test("rendered html includes collapsed cards and a collapsed backlog", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-22T09:12:00.000Z"));

  assert.match(html, /Top 3 Today Items/);
  assert.match(html, /Show backlog/);
  assert.match(html, /Expand/);
});

test("rendered html shows expanded card details and expanded backlog on demand", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const expandedId = homeModel.focusCards[0].id;
  const viewModel = toViewModel(homeModel, "2026-05-22T09:12:00.000Z", {
    expandedCardIds: new Set([expandedId]),
    backlogExpanded: true
  });
  const html = renderAppHtml(viewModel);

  assert.match(html, /data-card-expanded="true"/);
  assert.match(html, /Card links/);
  assert.match(html, /Hide backlog/);
  assert.match(html, /backlog-expanded/);
});

test("rendered html includes dynamic task and card actions", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const viewModel = toViewModel(homeModel, "2026-05-22T09:12:00.000Z");
  const html = renderAppHtml(viewModel);
  const task = viewModel.topTasks[0];
  const card = viewModel.focusCards[0];

  assert.match(html, new RegExp(`data-task-id="${task.id}"`));
  assert.match(html, new RegExp(`data-card-id="${task.goalCardId}"`));
  assert.match(html, new RegExp(`data-action="complete-item" data-item-id="${task.id}"`));
  assert.match(html, new RegExp(`data-action="expand-card" data-card-id="${card.id}"`));
  assert.match(html, new RegExp(`data-action="open-all" data-card-id="${card.id}"`));
  assert.match(html, new RegExp(`data-action="pin-card" data-card-id="${card.id}"`));
  assert.match(html, new RegExp(`data-action="snooze-card" data-card-id="${card.id}"`));
});

test("rendered html escapes dynamic task and card text including unknown type labels", () => {
  const unsafe = `"><script>alert(1)</script>`;
  const html = renderAppHtml({
    dateLabel: "Fri, May 22",
    summary: "Protect the tricky bits",
    metaLine: "1 ready - Backlog collapsed",
    topTasks: [
      {
        id: "item-unsafe",
        goalCardId: "card-unsafe",
        goalTitle: `Goal ${unsafe}`,
        goalType: unsafe,
        title: `Task ${unsafe}`,
        reason: `Reason ${unsafe}`
      }
    ],
    focusCards: [
      {
        id: "card-unsafe",
        title: `Card ${unsafe}`,
        type: unsafe,
        sortReason: `Sort ${unsafe}`,
        openItemCount: 1,
        linkCount: 0,
        expanded: false,
        pinned: false
      }
    ],
    backlog: { collapsed: true, count: 0, cards: [] },
    parkingCount: 0
  });

  assert.doesNotMatch(html, /"><script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Task &quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Card &quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Reason &quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Sort &quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("styles include a deadline goal type tag", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(css, /\.tag-deadline\s*\{/);
});
