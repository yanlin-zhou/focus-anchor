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
          ${renderShortcutsSection(viewModel.shortcuts)}
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

function renderShortcutsSection(shortcuts = []) {
  return `
    <section class="manage-shortcuts" data-section="shortcuts" aria-label="Shortcuts">
      <div class="section-head"><span>Shortcuts</span><span>${escapeHtml(shortcuts.length)} saved</span></div>
      <div class="shortcut-editor-list">
        ${shortcuts.length > 0 ? shortcuts.map(renderShortcutEditor).join("") : `<p class="empty-line">No shortcuts saved yet.</p>`}
      </div>
      <button class="button" type="button" data-action="reset-shortcuts">Reset shortcuts</button>
    </section>
  `;
}

function renderShortcutEditor(shortcut) {
  return `
    <form class="shortcut-editor" data-action="save-shortcut" data-shortcut-id="${escapeHtml(shortcut.id)}">
      <div class="section-head"><span>${escapeHtml(shortcut.label)}</span><span>${escapeHtml(shortcut.id)}</span></div>
      <label>
        <span>Label</span>
        <input name="label" value="${escapeHtml(shortcut.label)}" autocomplete="off">
      </label>
      <label>
        <span>URL</span>
        <input name="url" type="url" value="${escapeHtml(shortcut.url)}" autocomplete="off">
      </label>
      <div class="form-row">
        <label>
          <span>Position</span>
          <input name="position" type="number" min="1" value="${escapeHtml(shortcut.position)}">
        </label>
        <label class="checkbox-field">
          <input name="pinned" type="checkbox"${shortcut.pinned ? " checked" : ""}>
          <span>Pinned</span>
        </label>
      </div>
      <button class="button primary" type="submit">Save shortcut</button>
    </form>
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
        <label class="button file-button">
          <span>Import JSON</span>
          <input class="visually-hidden" type="file" accept="application/json" data-action="import-json-file">
        </label>
      </div>
      <div class="import-panel" hidden>
        <h2>Import summary</h2>
        <p data-role="import-summary">Choose an exported Focus Anchor JSON file to review it before replacing local data.</p>
        <button class="button primary" type="button" data-action="confirm-import" disabled>Confirm import</button>
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
          <p>Open confirmation before clearing this browser.</p>
        </div>
        <button class="button" type="button" data-action="open-reset-confirmation">Reset data</button>
        <div class="reset-confirmation" hidden>
          <p>This permanently clears local Focus Anchor data in this browser. To reset this browser, type RESET.</p>
          <label>
            <span>Confirmation</span>
            <input name="reset-confirmation" autocomplete="off" placeholder="type RESET">
          </label>
          <button class="button" type="button" name="reset-confirmation" data-action="confirm-reset-data" disabled>Confirm reset</button>
        </div>
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
    shortcuts: "Shortcuts",
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
