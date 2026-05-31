import { toLocalDateKey } from "./date.js";
import { createDefaultShortcuts } from "./shortcuts.js";

export function createInitialData(nowIso = new Date().toISOString()) {
  const todayKey = toLocalDateKey(nowIso);

  return {
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    goalCards: [
      {
        id: "card-biweekly-report",
        title: "Biweekly report",
        type: "routine",
        importance: 5,
        status: "active",
        pinned: false,
        snoozedUntil: null,
        sortReason: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: null,
        todayItems: [
          {
            id: "item-report-polish",
            goalCardId: "card-biweekly-report",
            title: "Polish narrative and risks section",
            status: "open",
            source: "routine",
            scheduledFor: todayKey,
            doneAt: null,
            skippedAt: null,
            note: "",
            createdAt: nowIso,
            updatedAt: nowIso
          },
          {
            id: "item-report-metrics-check",
            goalCardId: "card-biweekly-report",
            title: "Check metrics table against dashboard",
            status: "open",
            source: "date_triggered",
            scheduledFor: todayKey,
            doneAt: null,
            skippedAt: null,
            note: "",
            createdAt: nowIso,
            updatedAt: nowIso
          }
        ],
        links: [
          { id: "link-report-doc", goalCardId: "card-biweekly-report", label: "Lark Doc", url: "https://example.com/report", kind: "doc", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso },
          { id: "link-report-metrics", goalCardId: "card-biweekly-report", label: "Metrics", url: "https://example.com/metrics", kind: "dashboard", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso },
          { id: "link-report-prev", goalCardId: "card-biweekly-report", label: "Previous report", url: "https://example.com/previous-report", kind: "doc", includeInOpenAll: false, createdAt: nowIso, updatedAt: nowIso }
        ],
        rules: [
          {
            id: "rule-report-biweekly-polish",
            goalCardId: "card-biweekly-report",
            type: "routine",
            titleTemplate: "Polish narrative and risks section",
            schedule: { cadence: "biweekly", weekdays: [3], startDate: "2026-05-06" },
            active: true,
            lastGeneratedFor: null,
            createdAt: nowIso,
            updatedAt: nowIso
          }
        ]
      },
      {
        id: "card-rollout-follow-up",
        title: "Rollout follow-up",
        type: "ad_hoc",
        importance: 5,
        status: "active",
        pinned: false,
        snoozedUntil: null,
        sortReason: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: null,
        todayItems: [
          { id: "item-rollout-impact", goalCardId: "card-rollout-follow-up", title: "Confirm current impact is closed", status: "open", source: "manual", scheduledFor: todayKey, doneAt: null, skippedAt: null, note: "", createdAt: nowIso, updatedAt: nowIso },
          { id: "item-rollout-prevention", goalCardId: "card-rollout-follow-up", title: "Write prevention note for review", status: "open", source: "manual", scheduledFor: todayKey, doneAt: null, skippedAt: null, note: "", createdAt: nowIso, updatedAt: nowIso }
        ],
        links: [
          { id: "link-rollout-alert", goalCardId: "card-rollout-follow-up", label: "Alert", url: "https://example.com/alert", kind: "dashboard", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso },
          { id: "link-rollout-thread", goalCardId: "card-rollout-follow-up", label: "Thread", url: "https://example.com/thread", kind: "thread", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso }
        ],
        rules: []
      },
      {
        id: "card-focus-anchor-mvp",
        title: "Focus Anchor MVP",
        type: "project",
        importance: 4,
        status: "active",
        pinned: false,
        snoozedUntil: null,
        sortReason: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: null,
        todayItems: [
          { id: "item-focus-review-design", goalCardId: "card-focus-anchor-mvp", title: "Review frontend design direction", status: "open", source: "manual", scheduledFor: todayKey, doneAt: null, skippedAt: null, note: "", createdAt: nowIso, updatedAt: nowIso },
          { id: "item-focus-slices", goalCardId: "card-focus-anchor-mvp", title: "Decide implementation slices", status: "open", source: "manual", scheduledFor: todayKey, doneAt: null, skippedAt: null, note: "", createdAt: nowIso, updatedAt: nowIso }
        ],
        links: [
          { id: "link-focus-spec", goalCardId: "card-focus-anchor-mvp", label: "Spec", url: "https://example.com/spec", kind: "doc", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso },
          { id: "link-focus-repo", goalCardId: "card-focus-anchor-mvp", label: "Repo", url: "https://example.com/repo", kind: "repo", includeInOpenAll: true, createdAt: nowIso, updatedAt: nowIso }
        ],
        rules: []
      },
      {
        id: "card-weekly-planning",
        title: "Weekly planning",
        type: "routine",
        importance: 2,
        status: "active",
        pinned: false,
        snoozedUntil: null,
        sortReason: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: null,
        todayItems: [],
        links: [],
        rules: []
      }
    ],
    shortcuts: createDefaultShortcuts(nowIso),
    behaviorEvents: [],
    dailySnapshots: []
  };
}
