# Focus Anchor Frontend Design V2

## Design Direction

### Visual Thesis

Focus Anchor V2 should feel like a warm, capable desk at the start of a hard workday: bright paper, walnut and clay undertones, crisp structure, and small kinetic rewards that make progress feel tangible.

### Content Plan

- Primary workspace: New Tab surface with a warm daily header, Top 3 Today Items, collapsed Focus Lane, collapsed Backlog, and Parking.
- Support surface: Add/Edit drawer with friendly controls and compact advanced sections.
- Detail surface: Expanded Goal Card with links, rules, recent activity, and Today Items.
- Future surface: review mode using Daily Snapshots, visually quieter than the New Tab.

### Interaction Thesis

- The page should enter like a workspace coming into focus: summary first, top actions second, collapsed context third.
- Completing a Today Item should feel satisfying: check mark, warm accent fill, slight row settle, and completed line movement.
- Card expand/collapse should feel calm and intentional, enough to reveal context without stealing attention from the Top 3 list.

## What Changes From V1

V1 is calm, neutral, and slightly austere. V2 keeps the same product architecture but changes the emotional temperature:

- Warm-neutral background and surfaces with enough ink and blue-green contrast to avoid a soft planner feel.
- More expressive typography.
- Stronger visual rhythm inside cards.
- Softer borders and more tactile controls.
- A brighter accent system with amber as the primary action color.
- Still not pastel, cute, or decorative.

The design should feel lively in a masculine-neutral way: workshop, notebook, studio desk, not lifestyle planner.

## Product UI Principles

- Start on the working surface. No marketing hero.
- Keep the New Tab useful in five seconds.
- Default to the least amount of information that still tells the user what to do next.
- Goal Cards remain the only major card type because they are the interaction.
- Use warmth through material and spacing, not illustration.
- Avoid pink, lavender, soft floral palettes, glassy gradients, ornamental stickers, and one-note beige/orange themes.
- Keep controls compact and durable.
- Use rounded corners sparingly: 10px for cards, 7px for rows and buttons.
- Use one primary accent and a few muted semantic tags.

## Main New Tab Layout

### Structure

1. Top Bar
   - Product name with a simple anchor mark.
   - Date.
   - Snapshot status.
   - Quick Add.
   - Settings.

2. Daily Header
   - Warm tinted surface.
   - One strong summary sentence.
   - Small operational facts: focus cards, checks due, last snapshot.
   - No motivational copy.

3. Top 3 Today Items
   - The primary default execution surface.
   - Three compact action rows or tiles.
   - Each item shows the task, parent Goal Card, and why it is surfaced.
   - Users can complete items directly from this section.
   - If fewer than three items exist, show fewer items plus a quiet Quick Add affordance rather than filler.

4. Focus Lane
   - Three large Goal Cards.
   - Cards are collapsed by default.
   - Each card shows rank, type, title, sort reason, open item count, link count, and expand.
   - Expanded state reveals Today Items, links, and card actions.

5. Backlog Strip
   - Collapsed by default.
   - Shows count and a short summary.
   - Expands only when the user asks to browse lower-priority work.

6. Parking
   - Muted, collapsed, and visually secondary.

## Goal Card Anatomy

### Collapsed Large Card

- Top band with rank, type, and sort reason.
- Title.
- Open Today Item count.
- Link count.
- Expand action.
- Optional Open all action if the user already knows they want to enter that context.

The first card may use a warmer highlighted surface, but it must not become an oversized hero card. Its default job is context, not execution.

### Expanded Large Card

- Today Items, max 3 visible.
- Key link chips.
- Footer with Open all, Done, Pin, Snooze, and Edit.

Expansion should happen in place. The page should not navigate away just to inspect a card.

### Today Item Row

- Larger checkbox target than V1.
- Slightly warmer row background.
- Item source appears as compact text on the right.
- Completed row keeps the text readable but visibly settled.

### Link Chips

- Chips are compact, tactile, and warm white.
- The active/open-all chip uses amber.
- Use icons in implementation when available.

## Visual System

### Palette

- Background: `#f2f0e8`
- Surface: `#fff9ed`
- Raised surface: `#fffdf7`
- Warm panel: `#f0d6ad`
- Text: `#26312f`
- Muted text: `#6f746c`
- Border: `#ded4c2`
- Primary accent: `#b85c1f`
- Primary accent dark: `#793c15`
- Accent soft: `#f6d4b6`
- Completion: `#167963`
- Project tag: `#435f98`
- Routine tag: `#8c6118`
- Ad Hoc tag: `#9d4326`

This is a warm palette, but it should not become brown/orange-dominant. Use warm neutrals as the base, amber only for action and focus, and rely on deep ink plus project blue for structure.

### Typography

- MVP can use system UI, but implementation should prefer `Aptos`, `Inter`, or `IBM Plex Sans` for text.
- Optional display face: `Fraunces` or `Newsreader` for the daily summary only.
- Product name: 19 to 21px, semibold.
- Daily summary: 34 to 38px desktop, semibold, line-height around 1.12.
- Card title: 21 to 23px, semibold.
- Today Item: 14 to 15px.
- Metadata: 12 to 13px.
- Letter spacing: 0.

The type should feel human and energetic, not cute.

### Spacing

- Page padding: 28px desktop.
- Top bar height: 48px.
- Header padding: 22px.
- Header to Top 3 gap: 16px.
- Top 3 to Focus Lane gap: 18px.
- Focus card padding: 18px.
- Card radius: 10px.
- Row radius: 7px.
- Button radius: 7px.

### Elevation

- Use soft, grounded shadows.
- Active card can use a stronger border and small top accent.
- Avoid glow effects.

## Motion

### Entrance

- Daily Header fades and moves up 6px over 150ms.
- Top 3 Today Items enter with a 40ms stagger.
- Collapsed Focus Cards enter after the Top 3 list.
- Collapsed Backlog fades in last.

### Click / Press

- Buttons and chips compress by 1px on press.
- Cards lift 2px on hover and return on leave.
- Card hover must not shift layout.

### Completion

- Checkbox fills with completion green.
- Row background warms briefly, then settles into muted completed state.
- A tiny "Done" label can fade in for 600ms, then disappear.

### Reorder

- Dragged card lifts with a larger shadow.
- Neighbor cards slide smoothly.
- On drop, the card top band briefly pulses with amber.

## Accessibility

- Warm colors must still pass contrast.
- Completion state must use both color and check mark.
- Hover effects must have keyboard equivalents.
- Motion should respect reduced motion settings.
- Text labels must remain visible for sort reason, item source, and action state.

## Static Mockup

A static visual reference is available at:

`docs/design/focus-anchor-new-tab-mockup-v2.html`

This mockup is not production code. It exists to compare the warmer direction against V1 before implementation planning.
