export function renderAppHtml(viewModel) {
  return `
    <header class="topbar">
      <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
      <div class="top-actions">
        <span>${escapeHtml(viewModel.dateLabel)}</span>
        <span>Snapshot saved</span>
        <button class="button" data-action="open-manage">Manage</button>
        <button class="button primary" data-action="quick-add">Quick Add</button>
      </div>
    </header>
    <section class="daily-panel" aria-label="Today summary">
      <div>
        <div class="summary-label">Today's anchor</div>
        <h1>${escapeHtml(viewModel.summary)}</h1>
      </div>
      <div class="daily-meta">
        <div>${escapeHtml(viewModel.metaLine)}</div>
        <div>Local only</div>
      </div>
    </section>
    <section class="top-tasks" aria-label="Top 3 Today Items">
      ${viewModel.topTasks.length > 0 ? viewModel.topTasks.map(renderTopTask).join("") : renderEmptyTopTasks()}
    </section>
    <section class="focus-lane" aria-label="Focus Lane">
      ${viewModel.focusCards.map(renderFocusCard).join("")}
    </section>
    <section class="backlog" aria-label="Backlog Strip">
      <div class="section-head"><span>Backlog</span><span>${viewModel.backlog.collapsed ? "Collapsed by default" : "Visible for review"}</span></div>
      ${viewModel.backlog.collapsed ? renderCollapsedBacklog(viewModel.backlog) : renderExpandedBacklog(viewModel.backlog)}
    </section>
    <section class="parking" aria-label="Parking">
      <span>Parking / Paused</span>
      <span>${viewModel.parkingCount} cards hidden until their return date</span>
    </section>
  `;
}

export function mountApp(container, viewModel) {
  container.innerHTML = renderAppHtml(viewModel);
}

function renderTopTask(task) {
  return `
    <article class="top-task" data-task-id="${escapeHtml(task.id)}" data-card-id="${escapeHtml(task.goalCardId)}">
      <div class="task-meta">
        <span>${escapeHtml(task.goalTitle)}</span>
        <span class="tag-${classNameForType(task.goalType)}">${escapeHtml(labelForType(task.goalType))}</span>
      </div>
      <h2 class="task-title">${escapeHtml(task.title)}</h2>
      <div class="task-foot">
        <span>${escapeHtml(task.reason)}</span>
        <button class="complete-action" type="button" data-action="complete-item" data-item-id="${escapeHtml(task.id)}" aria-label="Mark ${escapeHtml(task.title)} done"><span class="tiny-check"><span class="checkbox"></span><span>Done</span></span></button>
      </div>
    </article>
  `;
}

function renderFocusCard(card) {
  return `
    <article class="goal-card ${card.pinned ? "primary" : ""} ${card.expanded ? "is-expanded" : ""}" data-card-id="${escapeHtml(card.id)}" data-card-expanded="${card.expanded ? "true" : "false"}">
      <div class="card-band">
        <div><div class="rank">${escapeHtml(card.title)}</div><div class="type tag-${classNameForType(card.type)}">${escapeHtml(labelForType(card.type))}</div></div>
        <div class="reason">${escapeHtml(card.sortReason)}</div>
      </div>
      <div class="card-body">
        <h2 class="card-title">${escapeHtml(card.title)}</h2>
        <div class="collapsed-meta">
          <div class="collapsed-stat"><strong>${card.openItemCount}</strong>open items</div>
          <div class="collapsed-stat"><strong>${card.linkCount}</strong>links</div>
        </div>
        ${card.expanded ? renderExpandedCard(card) : ""}
        <div class="card-footer">
          <div class="footer-group">
            <button class="button primary" data-action="expand-card" data-card-id="${escapeHtml(card.id)}">${card.expanded ? "Collapse" : "Expand"}</button>
            <button class="button text" data-action="open-all" data-card-id="${escapeHtml(card.id)}">Open all</button>
          </div>
          <div class="footer-group">
            <button class="button" data-action="pin-card" data-card-id="${escapeHtml(card.id)}">Pin</button>
            <button class="button" data-action="snooze-card" data-card-id="${escapeHtml(card.id)}">Snooze</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderExpandedCard(card) {
  return `
    <div class="card-expanded">
      <div class="expanded-section">
        <div class="expanded-label">Today items</div>
        <div class="items">
          ${card.items.length > 0 ? card.items.map(renderCardItem).join("") : `<div class="empty-line">No open item for today.</div>`}
        </div>
      </div>
      <div class="expanded-section">
        <div class="expanded-label">Card links</div>
        <div class="links">
          ${card.links.length > 0 ? card.links.map(renderCardLink).join("") : `<span class="empty-line">No links saved yet.</span>`}
        </div>
      </div>
    </div>
  `;
}

function renderCardItem(item) {
  return `
    <div class="item">
      <span class="checkbox" aria-hidden="true"></span>
      <span>${escapeHtml(item.title)}</span>
      <span class="item-source">${escapeHtml(labelForSource(item.source))}</span>
    </div>
  `;
}

function renderCardLink(link) {
  return `<a class="chip" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`;
}

function renderCollapsedBacklog(backlog) {
  return `
    <div class="backlog-collapsed">
      <span>${backlog.count} lower-priority cards hidden to keep the page quiet.</span>
      <button class="button" data-action="show-backlog">Show backlog</button>
    </div>
  `;
}

function renderExpandedBacklog(backlog) {
  return `
    <div class="backlog-collapsed">
      <span>${backlog.count} lower-priority cards available.</span>
      <button class="button" data-action="show-backlog">Hide backlog</button>
    </div>
    <div class="backlog-expanded">
      ${backlog.cards.length > 0 ? backlog.cards.map(renderBacklogCard).join("") : `<div class="empty-line">No backlog cards.</div>`}
    </div>
  `;
}

function renderBacklogCard(card) {
  return `
    <article class="mini-card">
      <h2>${escapeHtml(card.title)}</h2>
      <div class="mini-meta">
        <span class="tag-${classNameForType(card.type)}">${escapeHtml(labelForType(card.type))}</span>
        <span>${card.openItemCount} items</span>
      </div>
    </article>
  `;
}

function renderEmptyTopTasks() {
  return `<article class="top-task"><h2 class="task-title">No open item yet.</h2><div class="task-foot"><span>Add one thing worth protecting today.</span><button class="button primary" data-action="quick-add">Quick Add</button></div></article>`;
}

function labelForType(type) {
  return ({ project: "Project", routine: "Routine", ad_hoc: "Ad Hoc", deadline: "Deadline" })[type] ?? type;
}

function classNameForType(type) {
  return ({ project: "project", routine: "routine", ad_hoc: "adhoc", deadline: "deadline" })[type] ?? "project";
}

function labelForSource(source) {
  return ({ routine: "Routine", manual: "Manual", date_triggered: "Date" })[source] ?? "Item";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
