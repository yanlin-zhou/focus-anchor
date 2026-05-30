import { parseImportJson, serializeExportData } from "./domain/importExport.js";
import { updateGoalCard } from "./domain/manageActions.js";
import { ensureShortcuts, resetShortcuts, updateShortcut } from "./domain/shortcuts.js";
import { createChromeRepository } from "./storage/repository.js";
import { readCheckbox, readFormData, readNumber } from "./ui/forms.js";
import { renderManageHtml } from "./ui/manageRender.js";
import { toManageViewModel } from "./ui/manageViewModel.js";

const app = document.querySelector("#manage-app");
const repo = createChromeRepository();

let appData = normalizeAppData(await repo.load());
let selectedCardId = appData?.goalCards?.[0]?.id ?? null;
let pendingImport = null;

render();

app.addEventListener("submit", async (event) => {
  const cardForm = event.target.closest("form[data-action='save-card']");
  if (cardForm && appData) {
    event.preventDefault();

    const fields = readFormData(cardForm);
    const currentCard = appData.goalCards.find((card) => card.id === cardForm.dataset.cardId);
    appData = updateGoalCard(appData, cardForm.dataset.cardId, {
      title: fields.title,
      type: fields.type,
      status: fields.status,
      importance: readNumber(fields.importance, currentCard?.importance ?? 3),
      pinned: readCheckbox(cardForm, "pinned"),
      snoozedUntil: fields.snoozedUntil,
      sortReason: fields.sortReason
    });
    selectedCardId = cardForm.dataset.cardId ?? selectedCardId;
    await repo.save(appData);
    render();
    return;
  }

  const shortcutForm = event.target.closest("form[data-action='save-shortcut']");
  if (!shortcutForm || !appData) return;
  event.preventDefault();

  appData = ensureShortcuts(appData);
  const fields = readFormData(shortcutForm);
  const currentShortcut = appData.shortcuts?.find((shortcut) => shortcut.id === shortcutForm.dataset.shortcutId);
  appData = updateShortcut(appData, shortcutForm.dataset.shortcutId, {
    label: fields.label,
    url: fields.url,
    pinned: readCheckbox(shortcutForm, "pinned"),
    position: readNumber(fields.position, currentShortcut?.position ?? 1)
  });
  await repo.save(appData);
  render();
});

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;

  if (action === "select-card") {
    selectedCardId = target.dataset.cardId ?? selectedCardId;
    render();
    return;
  }

  if (action === "open-reset-confirmation") {
    const panel = app.querySelector(".reset-confirmation");
    if (panel) panel.hidden = false;
    return;
  }

  if (!appData) return;

  if (action === "export-json") {
    downloadJson(serializeExportData(appData));
    return;
  }

  if (action === "reset-shortcuts") {
    appData = resetShortcuts(ensureShortcuts(appData));
    await repo.save(appData);
    render();
    return;
  }

  if (action === "confirm-import" && pendingImport?.data) {
    appData = normalizeAppData(pendingImport.data);
    pendingImport = null;
    selectedCardId = appData.goalCards?.[0]?.id ?? null;
    await repo.save(appData);
    render();
    return;
  }

  if (action === "confirm-reset-data") {
    const confirmation = app.querySelector("input[name='reset-confirmation']");
    if (confirmation?.value !== "RESET") return;
    await repo.remove();
    appData = null;
    selectedCardId = null;
    pendingImport = null;
    render();
  }
});

app.addEventListener("change", async (event) => {
  const input = event.target?.closest?.("[data-action='import-json-file']");
  if (!input) return;

  const panel = app.querySelector(".import-panel");
  const summary = app.querySelector("[data-role='import-summary']");
  const confirmButton = app.querySelector("[data-action='confirm-import']");
  if (!panel || !summary || !confirmButton) return;

  panel.hidden = false;
  pendingImport = null;
  confirmButton.disabled = true;

  const file = input.files?.[0];
  if (!file) {
    summary.textContent = "Choose an exported Focus Anchor JSON file to review it before replacing local data.";
    return;
  }

  try {
    const result = parseImportJson(await file.text());
    if (!result.ok) {
      summary.textContent = result.error;
      return;
    }

    const importSummary = result.summary;
    summary.textContent = `${importSummary.cards} cards, ${importSummary.openItems} open items, ${importSummary.rules} rules, ${importSummary.shortcuts} shortcuts, ${importSummary.snapshots} snapshots`;
    pendingImport = result;
    confirmButton.disabled = false;
  } catch {
    summary.textContent = "Import file could not be read.";
  }
});

app.addEventListener("input", (event) => {
  if (event.target?.name !== "reset-confirmation") return;
  const resetButton = app.querySelector("[data-action='confirm-reset-data']");
  if (!resetButton) return;
  resetButton.disabled = event.target.value !== "RESET";
});

function render() {
  if (!appData) {
    app.innerHTML = `
      <section class="setup-empty" aria-label="No local data">
        <div class="brand"><div class="mark" aria-hidden="true"></div><span>Focus Anchor</span></div>
        <div class="setup-empty-copy">
          <p class="summary-label">No local data</p>
          <h1>Set up your anchors</h1>
          <p>This browser does not have Focus Anchor data yet. Return to the new tab page to create your first cards.</p>
        </div>
      </section>
    `;
    return;
  }

  if (!appData.goalCards?.some((card) => card.id === selectedCardId)) {
    selectedCardId = appData.goalCards?.[0]?.id ?? null;
  }
  app.innerHTML = renderManageHtml(toManageViewModel(appData, selectedCardId));
}

function normalizeAppData(data) {
  return data ? ensureShortcuts(data) : data;
}

function downloadJson(text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "focus-anchor-export.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
