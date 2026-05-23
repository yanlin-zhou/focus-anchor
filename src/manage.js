import { serializeExportData } from "./domain/importExport.js";
import { updateGoalCard } from "./domain/manageActions.js";
import { createChromeRepository } from "./storage/repository.js";
import { readCheckbox, readFormData, readNumber } from "./ui/forms.js";
import { renderManageHtml } from "./ui/manageRender.js";
import { toManageViewModel } from "./ui/manageViewModel.js";

const app = document.querySelector("#manage-app");
const repo = createChromeRepository();

let appData = await repo.load();
let selectedCardId = appData?.goalCards?.[0]?.id ?? null;

render();

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-action='save-card']");
  if (!form || !appData) return;
  event.preventDefault();

  const fields = readFormData(form);
  const currentCard = appData.goalCards.find((card) => card.id === form.dataset.cardId);
  appData = updateGoalCard(appData, form.dataset.cardId, {
    title: fields.title,
    type: fields.type,
    status: fields.status,
    importance: readNumber(fields.importance, currentCard?.importance ?? 3),
    pinned: readCheckbox(form, "pinned"),
    snoozedUntil: fields.snoozedUntil,
    sortReason: fields.sortReason
  });
  selectedCardId = form.dataset.cardId ?? selectedCardId;
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

  if (!appData) return;

  if (action === "export-json") {
    downloadJson(serializeExportData(appData));
    return;
  }

  if (action === "reset-data") {
    await repo.remove();
    appData = null;
    selectedCardId = null;
    render();
  }
});

app.addEventListener("input", (event) => {
  if (event.target?.name !== "reset-confirmation") return;
  const resetButton = app.querySelector("[data-action='reset-data']");
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
