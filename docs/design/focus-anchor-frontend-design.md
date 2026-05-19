# Focus Anchor Frontend Design

## Design Direction

### Visual Thesis

Focus Anchor should feel like a quiet local workspace: matte surfaces, precise hierarchy, restrained color, and just enough motion to make priorities feel alive without becoming noisy.

### Content Plan

- Primary workspace: New Tab surface with today's priority summary, Focus Lane, Backlog Strip, and Parking.
- Support surface: Add/Edit drawer for Goal Cards, Today Items, links, routine rules, and date-triggered checks.
- Detail surface: Card expansion state for more links, rules, and recent item history.
- Future surface: lightweight history and weekly review, visually secondary to the daily New Tab.

### Interaction Thesis

- Page entrance should make the Focus Lane appear first, then the Backlog Strip, so the eye lands on current priorities.
- Dragging cards should use smooth layout transitions because manual reorder is both control and learning signal.
- Completing a Today Item should have a clear tactile finish: check, compress, and move into a completed row without shaking the whole layout.

## Product UI Principles

- Start on the working surface. No landing-page hero.
- Use cards only for Goal Cards because cards are the primary interaction.
- Keep supporting UI as rows, dividers, drawers, and compact controls.
- One primary accent: deep teal for current focus and completion.
- Semantic accents are allowed for type tags, but they must stay quiet.
- Default density should fit a normal browser New Tab at 1440 x 900 without scrolling the Focus Lane.
- Text should be operational: status, reason, action.
- Do not use decorative illustration, abstract gradients, or motivational copy.

## Main New Tab Layout

### Structure

1. Top Bar
   - Product name.
   - Date.
   - Quick Add.
   - Settings.

2. Priority Summary
   - One sentence: "Today should orbit around: Polish the biweekly report before review."
   - Small supporting metadata: "3 focus cards - 2 checks due - Snapshot saved."

3. Focus Lane
   - Three large Goal Cards.
   - Cards are equal height.
   - Cards use clear rank, type, sort reason, title, Today Items, key links, and footer actions.

4. Backlog Strip
   - Compact horizontal row of lower-priority active cards.
   - Each small card shows title, type, reason, and open item count.

5. Parking
   - Collapsed row for paused/snoozed cards.
   - Does not compete with active work.

## Goal Card Anatomy

### Default Large Card

- Rank and type label.
- Sort reason.
- Title.
- Today Items, max 3 visible by default.
- Key link chips, max 4 visible by default.
- Footer controls:
  - Done for whole card.
  - Pin.
  - Snooze.
  - Edit.
  - Open all.

### Today Item Row

- Checkbox.
- Item title.
- Source indicator only when useful: manual, routine, check.
- Optional due/check date.
- Done items collapse into a muted completed row.

### Link Chips

- Label only by default.
- Use icons in production when available:
  - ExternalLink for links.
  - FileText for docs.
  - BarChart3 for dashboards.
  - GitBranch for repos.
  - MessageSquare for threads.

### Compact Backlog Card

- Title.
- Type.
- One short reason.
- Open Today Item count.
- Optional pin state.

## Add/Edit Drawer

The drawer opens from the right and should not obscure the whole New Tab context.

### Default Fields

- Title.
- Type.
- Importance.

### Advanced Sections

- Key links.
- Today Items.
- Routine rule.
- Date-triggered check.
- Snooze.
- Notes.

Advanced sections are collapsed by default. The drawer should keep creation fast; the user can add details later.

## Visual System

### Palette

- Background: `#eef2ef`
- Surface: `#fbfcfa`
- Raised surface: `#ffffff`
- Text: `#24312d`
- Muted text: `#6d7771`
- Border: `#d9dfda`
- Primary accent: `#0f766e`
- Accent soft: `#dff3ee`
- Routine tag: `#8a6a18`
- Ad Hoc tag: `#a34d2f`
- Project tag: `#5967a8`

The interface should read as neutral and focused, not teal-themed. Teal is for focus and completion only.

### Typography

- Use one sans-serif family for MVP, preferably system UI or Inter.
- Product name: 18 to 20px, semibold.
- Priority summary: 28 to 34px, semibold, line-height around 1.15.
- Card titles: 20 to 22px, semibold.
- Body and rows: 14 to 15px.
- Metadata: 12 to 13px.
- Letter spacing: 0.

### Spacing

- Page padding: 28px desktop, 18px tablet.
- Top bar height: 48px.
- Summary to cards gap: 24px.
- Focus card padding: 18px.
- Card radius: 8px.
- Row radius: 6px.
- Backlog card radius: 8px.

### Elevation

- Avoid heavy shadows.
- Use border, background contrast, and subtle shadow only for active focus cards.
- Pinned or top-ranked card can use a stronger top border or left accent, not a glow.

## Motion

### Entrance

- Top bar appears immediately.
- Priority summary fades in over 140ms.
- Focus cards enter with a 40ms stagger.
- Backlog Strip appears after Focus Lane.

### Completion

- Today Item checkbox fills with primary accent.
- Completed row compresses to a muted state.
- If all Today Items are complete, the card shows a calm completion state but stays in place until the user completes or archives the card.

### Reorder

- Dragged card lifts slightly.
- Other cards shift with spring-like layout motion.
- Dropping a card briefly shows a subtle "priority updated" state.

### Drawer

- Drawer slides in from the right.
- Background remains visible and inert.
- Save closes the drawer with a short fade.

## Responsive Behavior

### Desktop, 1280px and Wider

- Three Focus Lane cards in one row.
- Backlog Strip horizontal below.
- Drawer width: 420px.

### Narrow Desktop / Tablet

- Two Focus Lane cards in first row, third card below.
- Backlog Strip remains horizontal.
- Drawer width: min(420px, 92vw).

### Small Screens

Chrome New Tab extension is desktop-first. If a small viewport is needed:

- Focus Lane becomes a vertical list.
- Backlog Strip becomes a compact horizontal scroll.
- Top bar actions collapse into icon buttons.

## Accessibility

- Every interactive control must be keyboard reachable.
- Checkbox state must be visible without relying only on color.
- Sort reason and item source should be text, not only icons.
- Link chips need accessible labels.
- Focus states should use a visible outline.
- Completion animation must not be required to understand state.

## Static Mockup

A static visual reference is available at:

`docs/design/focus-anchor-new-tab-mockup.html`

This mockup is not production code. It exists to lock the visual direction before implementation planning.
