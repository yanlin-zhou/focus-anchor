import { createEmptyAppData, ensureSetupMeta, getSetupState } from "./domain/emptyData.js";
import { nextLocalDateKey, toLocalDateKey } from "./domain/date.js";
import { generateDueTodayItems } from "./domain/rules.js";
import { buildHomeModel } from "./domain/ranking.js";
import { upsertDailySnapshot } from "./domain/snapshots.js";
import { isAllowedLinkUrl } from "./domain/schema.js";
import { SETUP_TEMPLATES, completeSetupDraft, createDraft, createDraftCardFromTemplate } from "./domain/templates.js";
import { createChromeRepository } from "./storage/repository.js";
import { toViewModel } from "./ui/viewModel.js";
import { mountApp } from "./ui/render.js";
import { renderNotSetUpHtml, renderSetupHtml } from "./ui/setupRender.js";
import { toSetupViewModel } from "./ui/setupViewModel.js";
import { addTodayItem, completeTodayItem, pinCard, snoozeCard } from "./ui/actions.js";

const REVEAL_DURATION_MS = 20_000;
const app = document.querySelector("#app");
const toast = document.querySelector("#completion-toast");
const repo = createChromeRepository();
const uiState = {
  expandedCardIds: new Set(),
  backlogExpanded: false,
  focusRevealed: false
};
let revealTimerId = null;
let appData = ensureSetupMeta(await repo.load());
await refresh();

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-action='update-draft-card']");
  if (!form) return;
  event.preventDefault();

  const draftCardId = form.dataset.draftCardId;
  const draft = appData?.setup?.draft;
  const cards = Array.isArray(draft?.cards) ? draft.cards : [];
  const card = cards.find((entry) => entry.id === draftCardId);
  if (!draft || !card) return;

  const nowIso = new Date().toISOString();
  const todayKey = toLocalDateKey(nowIso);
  const fields = new FormData(form);
  const title = String(fields.get("title") ?? "").trim();
  const itemTitle = String(fields.get("itemTitle") ?? "").trim();

  appData = {
    ...appData,
    updatedAt: nowIso,
    setup: {
      ...appData.setup,
      draft: {
        ...draft,
        cards: cards.map((entry) => {
          if (entry.id !== draftCardId) return entry;
          return {
            ...entry,
            title: title || entry.title,
            items: itemTitle
              ? [...(Array.isArray(entry.items) ? entry.items : []), { title: itemTitle, scheduledFor: todayKey }]
              : (Array.isArray(entry.items) ? entry.items : [])
          };
        }),
        activeCardId: draftCardId
      }
    }
  };

  await repo.save(appData);
  await refresh();
});

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const nowIso = new Date().toISOString();

  if (action === "start-setup") {
    appData = createEmptyAppData(nowIso);
    appData.setup.draft = createDraft();
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "add-template-card") {
    const templateId = target.dataset.templateId;
    if (!SETUP_TEMPLATES.some((template) => template.id === templateId)) return;
    const base = ensureSetupMeta(appData ?? createEmptyAppData(nowIso), nowIso);
    const draft = base.setup?.draft ?? createDraft();
    const card = createDraftCardFromTemplate(templateId, nowIso);
    appData = {
      ...base,
      updatedAt: nowIso,
      setup: {
        ...base.setup,
        draft: {
          ...draft,
          cards: [...(draft.cards ?? []), card],
          activeCardId: card.id
        }
      }
    };
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "finish-setup") {
    if (!appData?.setup?.draft) return;
    const todayKey = toLocalDateKey(nowIso);
    appData = completeSetupDraft(appData.setup.draft, nowIso, todayKey);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "quick-add-empty") {
    const title = window.prompt("One thing worth protecting today");
    if (!title?.trim()) return;
    const todayKey = toLocalDateKey(nowIso);
    const card = {
      ...createDraftCardFromTemplate("project_progress", nowIso),
      title: "Today",
      items: [{ title: title.trim(), scheduledFor: todayKey }]
    };
    appData = completeSetupDraft(createDraft({ cards: [card], activeCardId: card.id }), nowIso, todayKey);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "open-manage") {
    const manageUrl = globalThis.chrome?.runtime?.getURL?.("src/manage.html") ?? "/src/manage.html";
    const createTab = globalThis.chrome?.tabs?.create;
    if (createTab) {
      createTab({ url: manageUrl, active: true });
    } else {
      window.location.assign(manageUrl);
    }
    return;
  }

  if (action === "open-shortcut") {
    const url = target.dataset.shortcutUrl;
    if (!isAllowedLinkUrl(url)) return;
    globalThis.chrome?.tabs?.create?.({ url, active: true });
    return;
  }

  if (action === "reveal-focus") {
    if (getSetupState(appData) !== "complete") return;
    revealFocus();
    await refresh();
    return;
  }

  if (action === "hide-focus") {
    hideFocus();
    await refresh();
    return;
  }

  if (getSetupState(appData) !== "complete") return;

  if (action === "complete-item") {
    const itemId = target.dataset.itemId;
    showCompletionReward(target);
    scheduleRevealHide();
    appData = completeTodayItem(appData, itemId, nowIso);
    await repo.save(appData);
    window.setTimeout(refresh, 700);
    return;
  }

  if (action === "quick-add") {
    const title = window.prompt("One thing worth protecting today");
    if (!title?.trim()) return;
    const todayKey = toLocalDateKey(nowIso);
    const targetCardId = buildHomeModel(appData, todayKey).focusCards[0]?.id ?? appData.goalCards.find((card) => card.status === "active")?.id;
    if (!targetCardId) return;
    appData = addTodayItem(appData, targetCardId, title, todayKey, nowIso);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "pin-card") {
    appData = pinCard(appData, target.dataset.cardId, nowIso);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "snooze-card") {
    uiState.expandedCardIds.delete(target.dataset.cardId);
    appData = snoozeCard(appData, target.dataset.cardId, nextLocalDateKey(nowIso), nowIso);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "expand-card") {
    toggleExpandedCard(target.dataset.cardId);
    await refresh();
    return;
  }

  if (action === "show-backlog") {
    uiState.backlogExpanded = !uiState.backlogExpanded;
    await refresh();
    return;
  }

  if (action === "open-all") {
    const card = appData.goalCards.find((entry) => entry.id === target.dataset.cardId);
    if (!card) return;
    for (const link of card.links.filter((entry) => entry.includeInOpenAll && isAllowedLinkUrl(entry.url))) {
      globalThis.chrome?.tabs?.create?.({ url: link.url, active: false });
    }
  }
});

document.addEventListener("keydown", async (event) => {
  if (getSetupState(appData) !== "complete") return;
  if (event.key === "Escape" && uiState.focusRevealed) {
    hideFocus();
    await refresh();
    return;
  }
  if ((event.key === "f" || event.key === "/") && !uiState.focusRevealed) {
    revealFocus();
    await refresh();
  }
});

window.addEventListener("blur", async () => {
  if (!uiState.focusRevealed) return;
  hideFocus();
  await refresh();
});

async function refresh() {
  const nowIso = new Date().toISOString();
  const state = getSetupState(appData);

  if (state === "not_set_up" || state === "skipped") {
    app.innerHTML = renderNotSetUpHtml();
    return;
  }

  if (state === "in_progress") {
    app.innerHTML = renderSetupHtml(toSetupViewModel(appData.setup.draft, nowIso));
    return;
  }

  const todayKey = toLocalDateKey(nowIso);
  const generated = generateDueTodayItems(appData, todayKey, nowIso);
  appData = generated.data;
  const homeModel = buildHomeModel(appData, todayKey);
  appData = upsertDailySnapshot(appData, todayKey, homeModel, completedIdsForToday(appData, todayKey));
  mountApp(app, toViewModel(homeModel, nowIso, uiState));
  await repo.save(appData);
}

function completedIdsForToday(data, todayKey) {
  return data.goalCards.flatMap((card) =>
    card.todayItems
      .filter((item) => item.scheduledFor === todayKey && item.status === "done")
      .map((item) => item.id)
  );
}

function showCompletionReward(button) {
  const task = button.closest(".top-task");
  button.classList.add("completed");
  task?.classList.add("is-completing");
  window.setTimeout(() => {
    task?.classList.remove("is-completing");
    task?.classList.add("is-complete");
  }, 520);
  if (!toast) return;
  toast.textContent = "Task closed. One less thing pulling on your day.";
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
}

function toggleExpandedCard(cardId) {
  if (!cardId) return;
  if (uiState.expandedCardIds.has(cardId)) {
    uiState.expandedCardIds.delete(cardId);
    return;
  }
  uiState.expandedCardIds.add(cardId);
}

function revealFocus() {
  uiState.focusRevealed = true;
  scheduleRevealHide();
}

function hideFocus() {
  uiState.focusRevealed = false;
  clearRevealTimer();
}

function scheduleRevealHide() {
  clearRevealTimer();
  revealTimerId = window.setTimeout(async () => {
    uiState.focusRevealed = false;
    await refresh();
  }, REVEAL_DURATION_MS);
}

function clearRevealTimer() {
  if (revealTimerId !== null) {
    window.clearTimeout?.(revealTimerId);
    revealTimerId = null;
  }
}
