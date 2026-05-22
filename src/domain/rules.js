import { daysBetween, isSameOrAfter, weekdayForDateKey } from "./date.js";

export function generateDueTodayItems(data, todayKey, nowIso) {
  const generatedItemIds = [];
  const goalCards = data.goalCards.map((card) => {
    if (card.status !== "active") return card;

    let todayItems = [...card.todayItems];
    let generatedForCard = false;
    const rules = card.rules.map((rule) => {
      if (!shouldGenerate(rule, todayKey)) return rule;

      const itemId = `item-${rule.id}-${todayKey}`;
      const alreadyExists = todayItems.some((item) => item.id === itemId);
      if (alreadyExists) return rule;

      todayItems = [
        ...todayItems,
        {
          id: itemId,
          goalCardId: card.id,
          title: rule.titleTemplate,
          status: "open",
          source: rule.type === "routine" ? "routine" : "date_triggered",
          scheduledFor: todayKey,
          doneAt: null,
          skippedAt: null,
          note: "",
          createdAt: nowIso,
          updatedAt: nowIso
        }
      ];
      generatedItemIds.push(itemId);
      generatedForCard = true;
      return { ...rule, lastGeneratedFor: todayKey, updatedAt: nowIso };
    });

    return { ...card, todayItems, rules, updatedAt: generatedForCard ? nowIso : card.updatedAt };
  });

  return { data: { ...data, goalCards, updatedAt: nowIso }, generatedItemIds };
}

function shouldGenerate(rule, todayKey) {
  if (!rule.active) return false;
  if (rule.lastGeneratedFor === todayKey) return false;

  if (rule.type === "date_triggered_check") {
    return rule.schedule.date === todayKey;
  }

  if (rule.type === "routine") {
    const weekdayMatches = rule.schedule.weekdays.includes(weekdayForDateKey(todayKey));
    if (!weekdayMatches) return false;
    if (!isSameOrAfter(todayKey, rule.schedule.startDate)) return false;
    if (rule.schedule.cadence === "weekly") return true;
    if (rule.schedule.cadence === "biweekly") return daysBetween(rule.schedule.startDate, todayKey) % 14 === 0;
  }

  return false;
}
