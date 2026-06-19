import { pinnedShortcuts } from "../domain/shortcuts.js";

export function toViewModel(homeModel, nowIso, uiState = {}) {
  const date = new Date(nowIso);
  const expandedCardIds = uiState.expandedCardIds ?? new Set();
  const backlogExpanded = Boolean(uiState.backlogExpanded);
  const focusRevealed = Boolean(uiState.focusRevealed);
  const quickAddOpen = Boolean(uiState.quickAddOpen);
  const readyCount = homeModel.topTodayItems.length;
  const dateCheckCount = homeModel.topTodayItems.filter((item) => item.goalType === "deadline").length
    + homeModel.focusCards.filter((card) => card.type === "deadline").length;

  return {
    dateLabel: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    quickAdd: {
      open: quickAddOpen,
      error: uiState.quickAddError ?? ""
    },
    safeHome: {
      privacyLabel: "Private by default",
      headline: `${homeModel.focusCards.length} ${homeModel.focusCards.length === 1 ? "anchor" : "anchors"} ready`,
      detail: dateCheckCount > 0
        ? `${dateCheckCount} time-sensitive ${dateCheckCount === 1 ? "check" : "checks"} today`
        : `${readyCount} ready ${readyCount === 1 ? "item" : "items"} hidden`,
      metaLine: `Focus hidden - Backlog ${backlogExpanded ? "available" : "collapsed"}`,
      peekItems: homeModel.topTodayItems.map((item, index) => ({
        id: `peek-${index + 1}`,
        rank: index + 1,
        type: item.goalType,
        label: labelForType(item.goalType)
      })),
      shortcuts: pinnedShortcuts(homeModel.shortcuts, 3).map((shortcut, index) => ({
        slot: index + 1,
        label: shortcut.label
      }))
    },
    focusDrawer: {
      revealed: focusRevealed,
      summary: homeModel.summary,
      autoHideLabel: "Auto-hide in 20s",
      topTasks: homeModel.topTodayItems,
      focusCards: homeModel.focusCards.map((card) => ({
        ...card,
        expanded: expandedCardIds.has(card.id)
      })),
      backlog: {
        collapsed: !backlogExpanded,
        count: homeModel.backlogCards.length,
        cards: homeModel.backlogCards
      },
      parkingCount: homeModel.parkingCards.length
    }
  };
}

function labelForType(type) {
  return ({ project: "Project", routine: "Routine", ad_hoc: "Ad hoc", deadline: "Date check" })[type] ?? "Focus";
}
