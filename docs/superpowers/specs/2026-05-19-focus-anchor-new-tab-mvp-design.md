# Focus Anchor New Tab MVP Design

## Summary

Focus Anchor is a local-first browser New Tab extension for keeping daily attention anchored on the work that matters most.

The first version replaces the browser new tab page with a lightweight focus launcher. It shows the top 3 Today Items first, then prioritized Goal Cards as collapsed work contexts. Goal Cards represent meaningful work blocks such as a quarterly project, recurring responsibility, deadline-driven item, or high-priority ad hoc task.

The product deliberately avoids becoming a full project management tool. Its job is to make the right work visible and easy to start, not to replicate formal project tracking systems.

## Product Boundaries

### In Scope

- Browser extension that replaces the New Tab page.
- Local-first data storage.
- Goal Cards for Project, Routine, Ad Hoc, and Deadline work.
- Top 3 Today Items as the default first action surface.
- Focus Lane with the top 3 cards.
- Backlog Strip for lower-priority active cards.
- Parking or Paused area for cards temporarily out of view.
- Today Items inside cards.
- Manual Today Items.
- Routine-generated Today Items.
- Date-triggered check items.
- Critical links and Open all behavior per card.
- Pin, snooze, edit, drag reorder, item completion, item skip, and card completion.
- Behavior Event logging from day one.
- Daily Snapshot logging from day one.

### Out of Scope for MVP

- Lark bot.
- Team collaboration.
- Full project management.
- Automatic reading from Lark messages, calendar, or docs.
- Complex AI-driven prioritization.
- Cross-device sync.
- Full weekly review or analytics page.
- External system writes.

## Core Product Model

### Goal Card

A Goal Card is an attention entry point, not a generic task.

Supported types:

- `project`: quarterly goal or long-running project.
- `routine`: recurring responsibility such as a biweekly report.
- `ad_hoc`: high-priority temporary work such as a production follow-up or urgent request.
- `deadline`: one-time item with a clear deadline. It may stand alone or be placed under a related project card.

Fields:

- `id`
- `title`
- `type`
- `importance`
- `status`: `active`, `paused`, or `done`
- `pinned`
- `snoozedUntil`
- `sortReason`
- `links`
- `todayItems`
- `rules`
- `createdAt`
- `updatedAt`
- `completedAt`

The card-level completion action means the whole goal or work block is finished and should be archived.

### Today Item

A Today Item is the daily action inside a Goal Card.

Fields:

- `id`
- `goalCardId`
- `title`
- `status`: `open`, `done`, or `skipped`
- `source`: `manual`, `routine`, `date_triggered`, or `suggested`
- `scheduledFor`
- `doneAt`
- `skippedAt`
- `note`
- `createdAt`
- `updatedAt`

Completing a Today Item means today's step is complete. It does not complete the full Goal Card.

### Link

Links are work-entry points attached to a Goal Card.

Fields:

- `id`
- `goalCardId`
- `label`
- `url`
- `kind`: `doc`, `dashboard`, `repo`, `thread`, or `other`
- `includeInOpenAll`
- `createdAt`
- `updatedAt`

The MVP treats links as URLs only. It does not read or analyze link contents.

### Rule

Rules generate Today Items.

Supported MVP rules:

- `routine`: recurring item generation, such as every other Wednesday.
- `date_triggered_check`: a one-time date-based check, such as "On 2026-06-10, check whether X shipped."

Fields:

- `id`
- `goalCardId`
- `type`
- `titleTemplate`
- `schedule`
- `active`
- `lastGeneratedFor`
- `createdAt`
- `updatedAt`

There is no separate Milestone object in the MVP. Date-based project checks are modeled as date-triggered rules that generate Today Items.

### Behavior Event

Behavior Events record how the user calibrates the system. The MVP does not need to learn from these events immediately, but it must preserve them for future adaptive ranking.

Events include:

- Card drag reorder.
- Pin and unpin.
- Snooze.
- Today Item completion.
- Today Item skip.
- Goal Card completion.
- Manual Today Item creation.
- Link open.
- Open all.

Fields:

- `id`
- `type`
- `timestamp`
- `goalCardId`
- `todayItemId`
- `before`
- `after`
- `context`

### Daily Snapshot

Daily Snapshots preserve the user's priority history for future review and learning.

The MVP should automatically create or update a snapshot for each date.

The first New Tab load of a day creates the initial snapshot. Later actions during the same day update the same snapshot rather than creating separate daily records.

Fields:

- `date`
- `initialFocusLaneCardIds`
- `initialBacklogCardIds`
- `finalFocusLaneCardIds`
- `finalBacklogCardIds`
- `generatedTodayItemIds`
- `manualTodayItemIds`
- `completedTodayItemIds`
- `skippedTodayItemIds`
- `snoozedCardIds`
- `behaviorEventIds`
- `optionalReflection`

The MVP may not expose a full review UI yet. The data should still be recorded from day one.

## New Tab Layout

The New Tab page uses a Top 3 Today Items section, a collapsed Focus Lane, and a collapsed Backlog Strip.

### Top 3 Today Items

- Shows the three highest-priority open Today Items.
- Appears above the Focus Lane.
- Each item shows the action, its parent Goal Card, and the reason it is surfaced.
- This is the default execution surface. It should answer "what should I do next?" without requiring the user to expand any cards.
- If fewer than three open Today Items exist, show only the real open items and a quiet Quick Add affordance. Do not invent filler items.

### Focus Lane

- Shows the top 3 active cards.
- Uses large but collapsed cards by default.
- Represents the current attention surface.
- Collapsed cards show title, type, sort reason, open item count, link count, and an expand action.
- Expanded cards show Today Items, key links, Open all, pin, snooze, edit, and card completion.

### Backlog Strip

- Is collapsed by default.
- Shows a compact count and summary of remaining active cards.
- Can be expanded to show remaining active cards as smaller cards.
- Lets the user browse lower-priority work without letting it dominate the page.
- Cards can be dragged into the Focus Lane.

### Parking / Paused

- Contains paused or snoozed cards.
- Does not compete for attention.
- Snoozed cards return automatically when `snoozedUntil` arrives.

## Sorting and Page Generation

The MVP uses transparent rule-based ranking plus manual calibration.

On each New Tab load:

1. Generate due Today Items from active routine and date-triggered rules.
2. Filter out cards with `status = done`.
3. Move paused or not-yet-unsnoozed cards to Parking.
4. Score active cards.
5. Produce a short sort reason for each visible card.
6. Derive the top 3 open Today Items from the highest-priority cards and show them above the Focus Lane.
7. Place the top 3 cards into the collapsed Focus Lane.
8. Place the rest into the collapsed Backlog Strip.
9. Record relevant Behavior Events and update the Daily Snapshot.

Rule-based Today Item generation must be idempotent. A routine or date-triggered rule can generate at most one item for the same card, rule, and scheduled date unless the user explicitly creates another item manually.

Ranking factors:

- Pinned cards.
- Date-triggered checks due today.
- Open Today Items.
- Card type.
- Importance.
- Routine timing window.
- Ad Hoc urgency.
- Project stagnation.
- Snooze return.
- Recent manual ordering behavior.

Every card in the Focus Lane must display a human-readable reason, such as:

- "Today has a delivery check."
- "Biweekly report is entering the review window."
- "You moved this into Focus Lane yesterday."
- "This project has not moved for 4 days."

The system proposes a default attention order. The user remains in control through pinning, snoozing, dragging, editing, completing, and skipping.

## Core Interactions

### Open New Tab

The user sees:

- A natural-language summary of what the day should orbit around.
- Top 3 Today Items as the primary execution surface.
- Focus Lane with 3 collapsed large cards.
- Backlog Strip collapsed by default.
- Parking / Paused collapsed away from the main attention area.

### Add Goal Card

Default fields:

- Title.
- Type.
- Importance.

Advanced fields:

- Key links.
- Routine rule.
- Date-triggered check.
- Snooze.
- Notes.

### Add Today Item

The user can manually add a Today Item to any card.

The system can also create Today Items from routine and date-triggered rules.

Each Today Item can be edited, completed, or skipped.

### Use Links

The user can open individual links from a card.

The `Open all` action opens all links on that card where `includeInOpenAll = true`.

### Complete Work

- Completing a Today Item means today's step is finished.
- Completing a Today Item should trigger a short completion reward: check mark draw, brief warm pulse, compact confirmation message, then a settled completed state.
- Completing a Goal Card means the full work block is done and should be archived.

### Pin, Snooze, and Drag

- Pin keeps a card near the front.
- Snooze removes a card until a chosen date.
- Dragging reorders cards and records a calibration signal.

### Date-Triggered Check

If the user records a future check such as "On 2026-06-10, check whether X shipped," the system generates a Today Item on that date and places it at the top of the card's Today Items.

This is a visibility mechanism only. It does not replace the status source of truth in external project management tools.

### Daily Snapshot

Each day, the system records the initial and final priority state, generated items, manual items, completion outcomes, skipped items, snoozes, and behavior events.

This enables future weekly review, preference learning, and personal priority analysis without adding interaction cost in the MVP.

## Future Evolution

### v1.1

- Basic history view.
- Simple weekly review.
- Lightweight priority/completion summary.

### v1.2

- Natural-language quick add.
- Convert phrases such as "next Thursday check whether X shipped" into structured date-triggered checks.

### v2

- Adaptive ranking from Behavior Events and Daily Snapshots.
- Better project stagnation detection.
- Suggestions for Today Items that require user confirmation.

### v2+

- Optional Lark import.
- Optional calendar import.
- Optional cross-device sync.

### v3

- AI-assisted review and recommendations.
- Explanations remain visible.
- Suggestions remain reversible.
- The product must not learn the user's procrastination as a preference.

## Product Principles

- The New Tab page is a focus launcher, not a project management system.
- A Goal Card is a work context, not just a task.
- The first screen should make the top work obvious within seconds.
- Manual control is mandatory.
- Automation must be explainable and reversible.
- First version should be useful without Lark, AI, sync, or a server.
- Store learning-ready data from day one, even if learning ships later.
- Completion should feel satisfying at the Today Item level without falsely completing long-term goals.
