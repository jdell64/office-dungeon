We are continuing the "Office Dungeon" project.

## Goal

Add 4 new events to improve run variety and personality.

## Requirements

### 1) Add Events

Implement:

1. Coffee Spill
   - Choice A: lose 1 energy
   - Choice B: gain 1 stress

2. Manager Check-in
   - Choice A: reduce stress
   - Choice B: gain reward but +2 stress

3. Printer Jam
   - Choice A: spend 1 energy
   - Choice B: gain 1 stress

4. Free Snacks
   - Gain 1 energy
   - Small chance to gain 1 stress

### 2) Structure

- Reuse existing event system
- Each event has:
  - title
  - description
  - 2 choices
  - simple outcomes

### 3) Randomization

Ensure events:

- appear in normal event tiles
- are randomly selected from available pool

### 4) UI

Ensure:

- choices are readable on mobile
- outcomes are visible via HUD updates or text

### 5) Debug State

Expose:

- current event id
- last event result

Keep everything simple and consistent with existing events.
