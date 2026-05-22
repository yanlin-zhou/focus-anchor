export function toViewModel(homeModel, nowIso, uiState = {}) {
  const date = new Date(nowIso);
  const expandedCardIds = uiState.expandedCardIds ?? new Set();
  const backlogExpanded = Boolean(uiState.backlogExpanded);

  return {
    dateLabel: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    summary: homeModel.summary,
    metaLine: `${homeModel.topTodayItems.length} ready - Backlog ${backlogExpanded ? "open" : "collapsed"}`,
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
  };
}
