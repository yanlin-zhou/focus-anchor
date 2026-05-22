import { createInitialData } from "./domain/sampleData.js";
import { toLocalDateKey } from "./domain/date.js";
import { generateDueTodayItems } from "./domain/rules.js";
import { buildHomeModel } from "./domain/ranking.js";
import { upsertDailySnapshot } from "./domain/snapshots.js";
import { createChromeRepository } from "./storage/repository.js";
import { toViewModel } from "./ui/viewModel.js";
import { mountApp } from "./ui/render.js";
import { addTodayItem, completeTodayItem, pinCard, snoozeCard } from "./ui/actions.js";

const app = document.querySelector("#app");
const toast = document.querySelector("#completion-toast");
const repo = createChromeRepository();
let appData = await repo.load();

if (!appData) {
  appData = createInitialData(new Date().toISOString());
  await repo.save(appData);
}

await refresh();

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const nowIso = new Date().toISOString();

  if (action === "complete-item") {
    const itemId = target.dataset.itemId;
    showCompletionReward(target);
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
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    appData = snoozeCard(appData, target.dataset.cardId, toLocalDateKey(tomorrow), nowIso);
    await repo.save(appData);
    await refresh();
    return;
  }

  if (action === "open-all") {
    const card = appData.goalCards.find((entry) => entry.id === target.dataset.cardId);
    for (const link of card.links.filter((entry) => entry.includeInOpenAll)) {
      chrome.tabs.create({ url: link.url, active: false });
    }
  }
});

async function refresh() {
  const nowIso = new Date().toISOString();
  const todayKey = toLocalDateKey(nowIso);
  const generated = generateDueTodayItems(appData, todayKey, nowIso);
  appData = generated.data;
  const homeModel = buildHomeModel(appData, todayKey);
  appData = upsertDailySnapshot(appData, todayKey, homeModel, completedIdsForToday(appData, todayKey));
  await repo.save(appData);
  mountApp(app, toViewModel(homeModel, nowIso));
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
  task.classList.add("is-completing");
  window.setTimeout(() => {
    task.classList.remove("is-completing");
    task.classList.add("is-complete");
  }, 520);
  toast.textContent = "Task closed. One less thing pulling on your day.";
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
}
