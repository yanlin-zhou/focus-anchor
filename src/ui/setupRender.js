export function renderNotSetUpHtml() {
  return `
    <section class="setup-empty" aria-label="Setup">
      <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
      <div class="setup-empty-copy">
        <p class="summary-label">Local first</p>
        <h1>Set up your anchors</h1>
        <p>Start with one to five focus cards. Three is a calm default for the first pass.</p>
      </div>
      <div class="setup-actions">
        <button class="button primary" type="button" data-action="start-setup">Start setup</button>
        <button class="button" type="button" data-action="quick-add-empty">Quick add one thing</button>
      </div>
    </section>
  `;
}

export function renderSetupHtml(viewModel) {
  const firstError = viewModel.errors?.[0] ?? "";

  return `
    <header class="topbar">
      <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
      <div class="top-actions">
        <span>${escapeHtml(viewModel.cardCountLabel)}</span>
        <span>${escapeHtml(viewModel.recommendation)}</span>
      </div>
    </header>
    <main class="setup-shell" aria-label="Setup workspace">
      <section class="setup-panel">
        <div class="setup-heading">
          <p class="summary-label">No-code setup</p>
          <h1>${escapeHtml(viewModel.title)}</h1>
        </div>
        <div class="template-grid" aria-label="Templates">
          ${viewModel.templates.map(renderTemplateOption).join("")}
        </div>
        <div class="setup-card-list" aria-label="Draft cards">
          ${viewModel.cards.length > 0 ? viewModel.cards.map(renderDraftCard).join("") : `<p class="empty-line">Add a template or quick item to begin.</p>`}
        </div>
        ${firstError ? `<p class="form-error">${escapeHtml(firstError)}</p>` : ""}
        <button class="button primary" type="button" data-action="finish-setup"${viewModel.canFinish ? "" : " disabled"}>Finish setup</button>
      </section>
      ${renderPreview(viewModel.preview)}
    </main>
  `;
}

function renderTemplateOption(template) {
  return `
    <button class="template-option" type="button" data-action="add-template-card" data-template-id="${escapeHtml(template.id)}">
      <span>${escapeHtml(template.label)}</span>
      <small>${escapeHtml(template.description)}</small>
    </button>
  `;
}

function renderDraftCard(card) {
  return `
    <article class="draft-card" data-card-id="${escapeHtml(card.id)}">
      <div>
        <h2>${escapeHtml(card.title || "Untitled focus card")}</h2>
        <p>${escapeHtml(labelForType(card.type))}</p>
      </div>
      <div class="draft-card-stats">
        <span>${escapeHtml(card.itemCount)} items</span>
        <span>${escapeHtml(card.linkCount)} links</span>
      </div>
      ${card.items.length > 0 ? `<ul>${card.items.map((item) => `<li>${escapeHtml(item.title)}</li>`).join("")}</ul>` : ""}
    </article>
  `;
}

function renderPreview(preview) {
  return `
    <aside class="setup-preview" aria-label="Live preview">
      <div class="section-head"><span>Live preview</span><span>First 3</span></div>
      <div class="preview-task-list">
        ${preview.topTasks.length > 0 ? preview.topTasks.map((task) => `<div class="item"><span class="checkbox" aria-hidden="true"></span><span>${escapeHtml(task.title)}</span></div>`).join("") : `<p class="empty-line">Today items will appear here.</p>`}
      </div>
      <div class="preview-card-list">
        ${preview.cards.length > 0 ? preview.cards.map(renderPreviewCard).join("") : `<p class="empty-line">Cards will preview as you add them.</p>`}
      </div>
    </aside>
  `;
}

function renderPreviewCard(card) {
  return `
    <article class="mini-card">
      <h2>${escapeHtml(card.title || "Untitled focus card")}</h2>
      <div class="mini-meta">
        <span>${escapeHtml(labelForType(card.type))}</span>
        <span>${escapeHtml(card.itemCount)} items</span>
      </div>
    </article>
  `;
}

function labelForType(type) {
  return ({ project: "Project", routine: "Routine", ad_hoc: "Ad Hoc", deadline: "Deadline" })[type] ?? type;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
