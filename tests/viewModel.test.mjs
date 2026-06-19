import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialData } from "../src/domain/sampleData.js";
import { buildHomeModel } from "../src/domain/ranking.js";
import { toViewModel } from "../src/ui/viewModel.js";
import { renderAppHtml } from "../src/ui/render.js";

test("view model keeps Safe Home first and Top 3 reveal-only", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const viewModel = toViewModel(homeModel, "2026-05-22T09:12:00.000Z");

  assert.equal(viewModel.safeHome.peekItems.length, 3);
  assert.equal(viewModel.focusDrawer.topTasks.length, 3);
  assert.equal(viewModel.focusDrawer.focusCards.every((card) => card.expanded === false), true);
  assert.equal(viewModel.focusDrawer.backlog.collapsed, true);
});

test("view model applies local expansion state without changing the ranking model", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const expandedId = homeModel.focusCards[0].id;
  const viewModel = toViewModel(homeModel, "2026-05-22T09:12:00.000Z", {
    focusRevealed: true,
    expandedCardIds: new Set([expandedId]),
    backlogExpanded: true
  });

  assert.equal(viewModel.focusDrawer.focusCards[0].expanded, true);
  assert.equal(viewModel.focusDrawer.focusCards[1].expanded, false);
  assert.equal(viewModel.focusDrawer.backlog.collapsed, false);
  assert.equal(homeModel.focusCards[0].expanded, false);
});

test("rendered html includes collapsed cards and a collapsed backlog", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-22T09:12:00.000Z", {
    focusRevealed: true
  }));

  assert.match(html, /Top 3 Today Items/);
  assert.match(html, /Show backlog/);
  assert.match(html, /Review focus/);
});

test("rendered home includes a lightweight Manage entry point", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-22T09:12:00.000Z"));

  assert.match(html, /data-action="open-manage"/);
  assert.match(html, />Manage</);
});

test("rendered html shows expanded card details and expanded backlog on demand", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const expandedId = homeModel.focusCards[0].id;
  const viewModel = toViewModel(homeModel, "2026-05-22T09:12:00.000Z", {
    focusRevealed: true,
    expandedCardIds: new Set([expandedId]),
    backlogExpanded: true
  });
  const html = renderAppHtml(viewModel);

  assert.match(html, /data-card-expanded="true"/);
  assert.match(html, /Card links/);
  assert.match(html, /Hide backlog/);
  assert.match(html, /backlog-expanded/);
});

test("expanded focus card keeps hide action before expanded details", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const expandedId = homeModel.focusCards[0].id;
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-22T09:12:00.000Z", {
    focusRevealed: true,
    expandedCardIds: new Set([expandedId])
  }));

  const hideAction = `data-action="expand-card" data-card-id="${expandedId}" aria-expanded="true">Hide</button>`;
  assert.match(html, new RegExp(hideAction));
  assert.ok(html.indexOf(hideAction) < html.indexOf(`class="card-expanded"`));
});

test("rendered html includes dynamic task and card actions", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-22T09:12:00.000Z"), "2026-05-22");
  const viewModel = toViewModel(homeModel, "2026-05-22T09:12:00.000Z", {
    focusRevealed: true
  });
  const html = renderAppHtml(viewModel);
  const task = viewModel.focusDrawer.topTasks[0];
  const card = viewModel.focusDrawer.focusCards[0];

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
    safeHome: {
      privacyLabel: "Private by default",
      headline: "1 anchor ready",
      detail: "1 ready item hidden",
      metaLine: "Focus hidden - Backlog collapsed",
      peekItems: [],
      shortcuts: []
    },
    focusDrawer: {
      revealed: true,
      summary: "Protect the tricky bits",
      autoHideLabel: "Auto-hide in 20s",
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
    }
  });

  assert.doesNotMatch(html, /"><script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Task &quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Card &quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Reason &quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Sort &quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("rendered html skips unsafe card links", () => {
  const html = renderAppHtml({
    dateLabel: "Fri, May 22",
    safeHome: {
      privacyLabel: "Private by default",
      headline: "1 anchor ready",
      detail: "1 ready item hidden",
      metaLine: "Focus hidden - Backlog collapsed",
      peekItems: [],
      shortcuts: []
    },
    focusDrawer: {
      revealed: true,
      summary: "Protect the tricky bits",
      autoHideLabel: "Auto-hide in 20s",
      topTasks: [],
      focusCards: [
        {
          id: "card-links",
          title: "Link card",
          type: "project",
          sortReason: "Manual",
          openItemCount: 0,
          linkCount: 2,
          expanded: true,
          pinned: false,
          items: [],
          links: [
            { label: "Safe", url: "https://example.com" },
            { label: "Unsafe", url: "javascript:alert(1)" }
          ]
        }
      ],
      backlog: { collapsed: true, count: 0, cards: [] },
      parkingCount: 0
    }
  });

  assert.match(html, /https:\/\/example\.com/);
  assert.match(html, /Safe/);
  assert.doesNotMatch(html, /javascript:alert/);
  assert.doesNotMatch(html, /Unsafe/);
});

test("safe home view model excludes sensitive task and card titles", () => {
  const data = createInitialData("2026-05-30T09:12:00.000Z");
  data.shortcuts.push({
    id: "shortcut-calendar",
    label: "Calendar",
    url: "https://calendar.google.com/",
    pinned: true,
    position: 4,
    createdAt: "2026-05-30T09:12:00.000Z",
    updatedAt: "2026-05-30T09:12:00.000Z"
  });
  const homeModel = buildHomeModel(data, "2026-05-30");
  const viewModel = toViewModel(homeModel, "2026-05-30T09:12:00.000Z");
  const serializedSafeHome = JSON.stringify(viewModel.safeHome);

  assert.equal(viewModel.focusDrawer.revealed, false);
  assert.doesNotMatch(serializedSafeHome, /Polish narrative and risks section/);
  assert.doesNotMatch(serializedSafeHome, /Biweekly report/);
  assert.match(serializedSafeHome, /anchors ready/);
  assert.equal(viewModel.safeHome.peekItems.length, 3);
  assert.equal(viewModel.safeHome.shortcuts.length, 3);
  assert.deepEqual(viewModel.safeHome.shortcuts.map((shortcut) => shortcut.label), ["Maps", "Gmail", "Drive"]);
});

test("safe home renders Google Maps, Gmail, and Drive shortcuts", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-30T09:12:00.000Z"), "2026-05-30");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-30T09:12:00.000Z"));

  assert.match(html, /data-action="open-shortcut"/);
  assert.match(html, />Maps<\/button>/);
  assert.match(html, />Gmail<\/button>/);
  assert.match(html, />Drive<\/button>/);
  assert.doesNotMatch(html, />Search<\/button>/);
});

test("default safe home does not leak title-derived peek ids", () => {
  const nowIso = "2026-05-30T09:12:00.000Z";
  const todayKey = "2026-05-30";
  const data = createInitialData(nowIso);
  data.goalCards.push({
    id: "card-prepare-layoffs-memo",
    title: "Leadership memo",
    type: "project",
    importance: 5,
    status: "active",
    pinned: true,
    snoozedUntil: null,
    sortReason: "",
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    todayItems: [
      {
        id: "item-prepare-layoffs-memo",
        goalCardId: "card-prepare-layoffs-memo",
        title: "Prepare layoffs memo",
        status: "open",
        source: "manual",
        scheduledFor: todayKey,
        doneAt: null,
        skippedAt: null,
        note: "",
        createdAt: nowIso,
        updatedAt: nowIso
      }
    ],
    links: [],
    rules: []
  });
  const homeModel = buildHomeModel(data, todayKey);
  const viewModel = toViewModel(homeModel, nowIso);
  const serializedSafeHome = JSON.stringify(viewModel.safeHome);
  const html = renderAppHtml(viewModel);

  assert.doesNotMatch(serializedSafeHome, /Prepare layoffs memo/);
  assert.doesNotMatch(serializedSafeHome, /prepare-layoffs-memo/);
  assert.doesNotMatch(html, /Prepare layoffs memo/);
  assert.doesNotMatch(html, /prepare-layoffs-memo/);
});

test("default rendered home does not include sensitive focus text", () => {
  const data = createInitialData("2026-05-30T09:12:00.000Z");
  data.shortcuts[0] = {
    ...data.shortcuts[0],
    id: "shortcut-internal-doc",
    label: "Work Doc",
    url: "https://internal.example.com/private/priority-plan"
  };
  const homeModel = buildHomeModel(data, "2026-05-30");
  const viewModel = toViewModel(homeModel, "2026-05-30T09:12:00.000Z");
  const html = renderAppHtml(viewModel);
  const serializedSafeHome = JSON.stringify(viewModel.safeHome);

  assert.match(html, /Reveal focus/);
  assert.match(html, /Work Doc/);
  assert.match(html, /Gmail/);
  assert.match(html, /Drive/);
  assert.match(html, /data-action="open-shortcut" data-shortcut-slot="1"/);
  assert.match(html, /data-action="open-shortcut" data-shortcut-slot="2"/);
  assert.match(html, /data-action="open-shortcut" data-shortcut-slot="3"/);
  assert.doesNotMatch(serializedSafeHome, /internal\.example\.com/);
  assert.doesNotMatch(serializedSafeHome, /shortcut-internal-doc/);
  assert.doesNotMatch(html, /internal\.example\.com/);
  assert.doesNotMatch(html, /shortcut-internal-doc/);
  assert.doesNotMatch(html, /Calendar/);
  assert.doesNotMatch(html, /Search/);
  assert.doesNotMatch(html, /Lark/);
  assert.doesNotMatch(html, /data-shortcut-url=/);
  assert.doesNotMatch(html, /<a class="shortcut"/);
  assert.doesNotMatch(html, /href="https:\/\//);
  assert.doesNotMatch(html, /Polish narrative and risks section/);
  assert.doesNotMatch(html, /Biweekly report/);
  assert.doesNotMatch(html, /Top 3 Today Items/);
});

test("revealed drawer includes sensitive top task details", () => {
  const homeModel = buildHomeModel(createInitialData("2026-05-30T09:12:00.000Z"), "2026-05-30");
  const html = renderAppHtml(toViewModel(homeModel, "2026-05-30T09:12:00.000Z", {
    focusRevealed: true,
    expandedCardIds: new Set(),
    backlogExpanded: false
  }));

  assert.match(html, /Top 3 Today Items/);
  assert.match(html, /Polish narrative and risks section/);
  assert.match(html, /Biweekly report/);
  assert.match(html, /Auto-hide/);
});

test("styles include a deadline goal type tag", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(css, /\.tag-deadline\s*\{/);
});
