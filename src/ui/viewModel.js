export function toViewModel(homeModel, nowIso) {
  const date = new Date(nowIso);
  return {
    dateLabel: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    summary: homeModel.summary,
    metaLine: `${homeModel.topTodayItems.length} ready - Backlog collapsed`,
    topTasks: homeModel.topTodayItems,
    focusCards: homeModel.focusCards,
    backlog: {
      collapsed: homeModel.backlogCollapsed,
      count: homeModel.backlogCards.length,
      cards: homeModel.backlogCards
    },
    parkingCount: homeModel.parkingCards.length
  };
}
