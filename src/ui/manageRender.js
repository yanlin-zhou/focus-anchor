const GOAL_TYPES = ["project", "routine", "ad_hoc", "deadline"];
const GOAL_STATUSES = ["active", "paused", "done"];

export function renderManageHtml(viewModel) {
  return `
    <main class="manage-shell" aria-label="Manage Focus Anchor">
      <aside class="manage-sidebar" aria-label="Manage sections">
        <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
        <nav class="manage-nav" aria-label="Sections">
          ${viewModel.sections.map(renderSectionButton).join("")}
        </nav>
      </aside>
      <section class="manage-main">
        <div class="manage-heading">
          <p class="summary-label">Local data</p>
          <h1>Manage Focus Anchor</h1>
        </div>
        <div class="manage-grid">
          <section class="manage-list" data-section="cards" aria-label="Cards">
            <div class="section-head"><span>Cards</span><span>${escapeHtml(viewModel.cards.length)} saved</span></div>
            ${viewModel.cards.length > 0 ? viewModel.cards.map((card) => renderCardRow(card, viewModel.selectedCard?.id)).join("") : `<p class="empty-line">No cards saved yet.</p>`}
          </section>
          ${renderSelectedCard(viewModel.selectedCard)}
          <section class="manage-rules" data-section="rules" aria-label="Rules">
            <div class="section-head"><span>Rules</span><span>${escapeHtml(viewModel.rules.length)} active checks</span></div>
            ${viewModel.rules.length > 0 ? viewModel.rules.map(renderRule).join("") : `<p class="empty-line">No rules saved yet.</p>`}
          </section>
          ${renderDataSection(viewModel.summary)}
        </div>
      </section>
    </main>
  `;
}

function renderSectionButton(section) {
  return `
    <button class="button text" type="button" data-section="${escapeHtml(section.id)}">
      ${escapeHtml(section.label)}
    </button>
  `;
}

function renderCardRow(card, selectedCardId) {
  const selected = card.id === selectedCardId;

  return `
    <button class="card-row${selected ? " is-selected" : ""}" type="button" data-action="select-card" data-card-id="${escapeHtml(card.id)}">
      <span>
        <strong>${escapeHtml(card.title)}</strong>
        <small>${escapeHtml(labelForType(card.type))} · ${escapeHtml(card.status)} · importance ${escapeHtml(card.importance)}</small>
      </span>
      <span>${escapeHtml(card.itemCount)} items · ${escapeHtml(card.linkCount)} links · ${escapeHtml(card.ruleCount)} rules</span>
    </button>
  `;
}

function renderSelectedCard(card) {
  if (!card) {
    return `
      <section class="manage-detail" aria-label="Selected card">
        <p class="empty-line">Select a card to edit its details.</p>
      </section>
    `;
  }

  return `
    <section class="manage-detail" aria-label="Selected card">
      <div class="section-head"><span>Selected card</span><span>${escapeHtml(card.id)}</span></div>
      <form class="card-editor" data-action="save-card" data-card-id="${escapeHtml(card.id)}">
        <label>
          <span>Title</span>
          <input name="title" value="${escapeHtml(card.title)}" autocomplete="off">
        </label>
        <div class="form-row">
          <label>
            <span>Type</span>
            <select name="type">
              ${GOAL_TYPES.map((type) => `<option value="${escapeHtml(type)}"${type === card.type ? " selected" : ""}>${escapeHtml(labelForType(type))}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select name="status">
              ${GOAL_STATUSES.map((status) => `<option value="${escapeHtml(status)}"${status === card.status ? " selected" : ""}>${escapeHtml(labelForStatus(status))}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="form-row">
          <label>
            <span>Importance</span>
            <input name="importance" type="number" min="1" max="5" value="${escapeHtml(card.importance)}">
          </label>
          <label>
            <span>Snoozed until</span>
            <input name="snoozedUntil" type="date" value="${escapeHtml(card.snoozedUntil ?? "")}">
          </label>
        </div>
        <label class="checkbox-field">
          <input name="pinned" type="checkbox"${card.pinned ? " checked" : ""}>
          <span>Pinned</span>
        </label>
        <label>
          <span>Sort reason</span>
          <textarea name="sortReason" rows="3">${escapeHtml(card.sortReason ?? "")}</textarea>
        </label>
        <button class="button primary" type="submit">Save card</button>
      </form>
    </section>
  `;
}

function renderRule(rule) {
  return `
    <article class="rule-row">
      <div>
        <strong>${escapeHtml(rule.titleTemplate)}</strong>
        <small>${escapeHtml(rule.goalTitle)} · ${escapeHtml(labelForRuleType(rule.type))}</small>
      </div>
      <span>${escapeHtml(rule.active ? "Active" : "Paused")}</span>
    </article>
  `;
}

function renderDataSection(summary) {
  return `
    <section class="manage-data" data-section="data" aria-label="Data">
      <div class="section-head"><span>Data</span><span>Local only</span></div>
      <div class="data-actions">
        <button class="button primary" type="button" data-action="export-json">Export JSON</button>
        <button class="button" type="button" data-action="import-json">Import JSON</button>
      </div>
      <dl class="summary-grid">
        ${Object.entries(summary).map(([key, value]) => `
          <div>
            <dt>${escapeHtml(labelForSummary(key))}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `).join("")}
      </dl>
      <div class="danger-zone">
        <div>
          <strong>Reset local data</strong>
          <p>To reset this browser, type RESET.</p>
        </div>
        <label>
          <span>Confirmation</span>
          <input name="reset-confirmation" autocomplete="off" placeholder="type RESET">
        </label>
        <button class="button" type="button" name="reset-confirmation" data-action="reset-data" disabled>Reset data</button>
      </div>
    </section>
  `;
}

function labelForType(type) {
  return ({ project: "Project", routine: "Routine", ad_hoc: "Ad Hoc", deadline: "Deadline" })[type] ?? type;
}

function labelForStatus(status) {
  return ({ active: "Active", paused: "Paused", done: "Done" })[status] ?? status;
}

function labelForRuleType(type) {
  return ({ routine: "Routine", date_triggered_check: "Date check" })[type] ?? type;
}

function labelForSummary(key) {
  return ({
    cards: "Cards",
    links: "Links",
    rules: "Rules",
    openItems: "Open items",
    doneItems: "Done items",
    events: "Events",
    snapshots: "Snapshots"
  })[key] ?? key;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
