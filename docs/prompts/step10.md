We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Grid-based movement works
- One enemy exists and triggers immediate combat
- One reward tile exists and restores energy
- One exit tile exists and triggers victory
- Restart/reset works with the `R` key
- A small level config exists
- One event tile exists with a simple two-choice resolution
- A minimal HUD displays energy, stress, and status
- `window.__gameState` is exposed
- Playwright coverage exists

Goal of this task:

Expand the prototype slightly by adding 2 more enemy types and 2 more event types, while keeping the implementation simple and data-driven enough to support future content additions.

## Requirements

### 1) Add 2 More Enemy Types

We currently have 1 enemy. Add 2 additional enemy types for a total of 3 distinct enemy definitions.

Use simple office-themed enemies, for example:

- "Endless Meeting"
- "Printer Jam"
- "Passive Aggressive Email"

Each enemy type should define:

- name
- hp
- damage
- color or visual identifier

Keep combat behavior the same for all enemies for now:

- immediate combat on entering the tile
- player deals fixed damage
- enemy deals its damage
- repeat until one side is defeated

Do NOT add special abilities yet.

### 2) Place Multiple Enemy Tiles

Update the current level config to support multiple enemies on the map.

Requirements:

- Use at least 3 enemies total on the board
- Each enemy should occupy a distinct tile
- At least 2 different enemy types must actually appear in the level

Keep positions fixed in config.
Do NOT add random spawning.

### 3) Data Shape for Enemies

Refactor from a single hardcoded enemy to a small list-based approach.

A good result would be:

- enemy definitions in one place
- level config references which enemy type appears at which position

Keep this simple and readable.
Do NOT build a large content engine.

### 4) Add 2 More Event Types

We currently have 1 event. Add 2 additional event definitions for a total of 3 distinct event types.

Example event ideas:

- "Coworker Venting"
- "Free Snacks"
- "Manager Compliment"

Each event should define:

- name
- prompt
- two choices
- two outcomes

Keep outcomes simple and limited to:

- energy change
- stress change

Do NOT add event chains, inventory, or status effects.

### 5) Place Multiple Event Tiles

Update the level config to support multiple event tiles.

Requirements:

- Use at least 3 event tiles total on the board
- At least 2 different event types must actually appear in the level
- Event tiles should remain one-time use per run

Keep positions fixed in config.

### 6) Event Flow

Preserve the current event flow:

- stepping on event tile activates event
- movement is paused
- player chooses via keyboard
- event resolves immediately
- event is consumed
- movement resumes

Do not redesign the interaction model.

### 7) HUD / Status

Keep the HUD minimal, but ensure it still behaves correctly when:

- multiple enemies exist
- multiple events exist
- different event prompts are triggered

If there is currently a status text area, it may display the active event name/prompt in a simple way.
Do not build a full dialog UI.

### 8) Debug State

Update `window.__gameState` so it can represent:

- multiple enemies
- multiple events
- their positions and current availability/alive state

A simple shape like this is acceptable:

```ts
enemies: [
  { name: "Printer Jam", x: 4, y: 4, hp: 3, damage: 1, alive: true }
],
events: [
  { name: "Coworker Venting", x: 6, y: 2, available: true, active: false }
]
```

Requirements:

- keep these updated during play
- reflect defeated enemies
- reflect consumed events

### 9) Restart/Reset

Restart must fully restore:

- all enemies
- all events
- their original stats/state
- player stats and position

Restart should use existing level config / initial state sources.

### 10) Playwright Update

Extend Playwright coverage in the simplest reasonable way.

You may either:

- update existing tests, or
- add one additional small test

The tests should verify at least:

- multiple enemies/events are present in debug state
- one of the new events can be triggered and resolved
- one of the enemy encounters still resolves correctly
- restart restores consumed/defeated entities

Keep tests stable and readable.
Do NOT add broad brittle coverage.

## Constraints

Do NOT add:

- enemy special abilities
- random generation
- procedural layouts
- inventory
- sound
- animation systems
- scene transitions
- progression/meta systems

Keep this step focused on adding a little content variety without overengineering.

## Output

- Provide all necessary updated files.
- Ensure the project compiles and runs.

Do not break:

- movement
- combat
- reward collection
- victory
- restart/reset
- HUD
- existing Playwright coverage
