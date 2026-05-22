const TYPE_WEIGHT = {
  ad_hoc: 34,
  routine: 28,
  deadline: 26,
  project: 20
};

export function buildHomeModel(data, todayKey) {
  const activeCards = data.goalCards.filter((card) => card.status === "active" && !isSnoozed(card, todayKey));
  const scored = activeCards
    .map((card) => {
      const score = scoreCard(card, todayKey);
      return { ...card, score, sortReason: reasonFor(card, todayKey) };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const focusCards = scored.slice(0, 3).map(toCollapsedCard);
  const backlogCards = scored.slice(3).map(toCollapsedCard);
  const topTodayItems = deriveTopTodayItems(scored, todayKey);
  const parkingCards = data.goalCards.filter((card) => card.status === "paused" || isSnoozed(card, todayKey)).map(toCollapsedCard);

  return {
    date: todayKey,
    summary: summaryFor(topTodayItems, focusCards),
    topTodayItems,
    focusCards,
    backlogCards,
    parkingCards,
    backlogCollapsed: true
  };
}

export function scoreCard(card, todayKey) {
  let score = 0;
  if (card.pinned) score += 100;
  score += TYPE_WEIGHT[card.type] ?? 0;
  score += Number(card.importance ?? 0) * 10;
  score += openItemsForToday(card, todayKey).length * 8;
  score += card.todayItems.some((item) => item.source === "date_triggered" && item.scheduledFor === todayKey && item.status === "open") ? 20 : 0;
  return score;
}

function deriveTopTodayItems(cards, todayKey) {
  return cards
    .flatMap((card) => openItemsForToday(card, todayKey).map((item) => ({
      id: item.id,
      goalCardId: card.id,
      goalTitle: card.title,
      goalType: card.type,
      title: item.title,
      reason: reasonFor(card, todayKey),
      score: card.score
    })))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 3);
}

function toCollapsedCard(card) {
  return {
    id: card.id,
    title: card.title,
    type: card.type,
    sortReason: card.sortReason,
    openItemCount: card.todayItems.filter((item) => item.status === "open").length,
    linkCount: card.links.length,
    expanded: false,
    pinned: card.pinned
  };
}

function openItemsForToday(card, todayKey) {
  return card.todayItems.filter((item) => item.status === "open" && (!item.scheduledFor || item.scheduledFor <= todayKey));
}

function isSnoozed(card, todayKey) {
  return Boolean(card.snoozedUntil && card.snoozedUntil > todayKey);
}

function reasonFor(card, todayKey) {
  if (card.pinned) return "Pinned to the front.";
  if (card.todayItems.some((item) => item.source === "date_triggered" && item.scheduledFor === todayKey && item.status === "open")) return "Today has a delivery check.";
  if (card.type === "routine") return "Routine work is in its active window.";
  if (card.type === "ad_hoc") return "Needs owner and closure today.";
  if (card.type === "project") return "Important project work is ready to move.";
  return "Deadline work needs attention.";
}

function summaryFor(topTodayItems, focusCards) {
  if (topTodayItems.length > 0) return `Today starts with ${topTodayItems[0].title}.`;
  if (focusCards.length > 0) return `No open item yet. Start by reviewing ${focusCards[0].title}.`;
  return "No active anchors. Add one thing worth protecting today.";
}
