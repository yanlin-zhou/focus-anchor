import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderNotSetUpHtml, renderSetupHtml } from "../src/ui/setupRender.js";
import { toSetupViewModel } from "../src/ui/setupViewModel.js";

const NOW = "2026-05-22T09:00:00.000Z";

test("renderNotSetUpHtml shows setup actions without demo cards", () => {
  const html = renderNotSetUpHtml();

  assert.match(html, /Start setup/);
  assert.match(html, /Quick add one thing/);
  assert.doesNotMatch(html, /Biweekly report/);
});

test("toSetupViewModel recommends three cards while allowing one to five", () => {
  const viewModel = toSetupViewModel({
    cards: [
      {
        id: "draft-quarter-plan",
        templateId: "project_progress",
        title: "Quarter plan",
        type: "project",
        items: [],
        links: []
      }
    ]
  }, NOW);

  assert.equal(viewModel.cardCountLabel, "1 of 5 cards");
  assert.equal(viewModel.recommendation, "3 cards recommended");
});

test("renderSetupHtml disables completion until draft has one today item", () => {
  const viewModel = toSetupViewModel({
    cards: [
      {
        id: "draft-quarter-plan",
        templateId: "project_progress",
        title: "Quarter plan",
        type: "project",
        items: [],
        links: []
      }
    ]
  }, NOW);
  const html = renderSetupHtml(viewModel);

  assert.match(html, /Add at least one today item/);
  assert.match(html, /data-action="finish-setup" disabled/);
});

test("renderSetupHtml shows live preview when draft has content", () => {
  const viewModel = toSetupViewModel({
    cards: [
      {
        id: "draft-quarter-plan",
        templateId: "project_progress",
        title: "Quarter plan",
        type: "project",
        items: [{ title: "Write launch outline" }],
        links: []
      }
    ]
  }, NOW);
  const html = renderSetupHtml(viewModel);

  assert.match(html, /Quarter plan/);
  assert.match(html, /Write launch outline/);
  assert.match(html, /data-action="finish-setup"/);
  assert.doesNotMatch(html, /data-action="finish-setup" disabled/);
});

test("renderSetupHtml escapes dynamic count fields", () => {
  const unsafe = `"><script>alert(1)</script>`;
  const html = renderSetupHtml({
    nowIso: NOW,
    title: "Shape your focus anchors",
    cardCountLabel: "1 of 5 cards",
    recommendation: "3 cards recommended",
    canFinish: true,
    errors: [],
    templates: [],
    cards: [
      {
        id: "draft-unsafe",
        title: "Unsafe counts",
        type: "project",
        itemCount: unsafe,
        linkCount: unsafe,
        items: [],
        links: []
      }
    ],
    preview: {
      topTasks: [],
      cards: [
        {
          id: "draft-preview-unsafe",
          title: "Preview unsafe counts",
          type: "project",
          itemCount: unsafe,
          linkCount: 0,
          items: [],
          links: []
        }
      ]
    }
  });

  assert.doesNotMatch(html, /"><script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt; items/);
  assert.match(html, /&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt; links/);
});

test("styles include required setup selectors and responsive shell", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const selectors = [
    ".setup-empty",
    ".setup-shell",
    ".setup-preview",
    ".setup-panel",
    ".template-grid",
    ".template-option",
    ".setup-card-list",
    ".draft-card",
    ".form-error"
  ];

  for (const selector of selectors) {
    assert.match(css, new RegExp(`${selector.replace(".", "\\.")}\\s*\\{`));
  }
  assert.match(css, /button:disabled\s*\{/);
  assert.match(css, /@media \(max-width: 1120px\)[\s\S]*\.setup-shell\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
});
