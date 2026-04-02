We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Grid-based movement works
- Multiple enemy types and multiple enemy tiles exist
- Multiple event types and multiple event tiles exist
- Reward, exit, restart/reset, HUD, and debug state all exist
- The game currently uses a single fixed level config
- Playwright coverage exists

Goal of this task:

Support a small set of predefined layouts so each run can start from one of a few hand-authored maps, while keeping the implementation simple and deterministic.

## Requirements

### 1) Add Predefined Layout Support

Replace the single-level config with a small set of predefined layouts.

Requirements:

- Create at least 3 predefined layouts
- Each layout should define:
  - grid width
  - grid height
  - tile size
  - player starting position
  - player starting energy
  - player starting stress
  - enemy placements
  - event placements
  - reward placement
  - exit placement

Keep the layouts hand-authored and explicit.
Do NOT add procedural generation.

### 2) Layout Selection Per Run

When a new run starts:

- choose one layout from the predefined set
- use that layout to initialize the run

This should happen on:

- initial game load
- restart/reset with `R`

### 3) Deterministic and Test-Friendly

Keep layout selection deterministic for testing.

Preferred approaches:

- simple sequential cycling through layouts on each restart
  or
- allow a selected layout index to be forced for tests/debug

A good approach is:

- keep an internal `currentLayoutIndex`
- use that layout for the current run
- on restart, move to the next layout in the list and wrap around

This makes behavior predictable and easy to test.

### 4) Structure

Refactor the current single config into a small data structure such as:

- `src/data/layouts.ts`

A good result would include:

- enemy type definitions in one place
- event type definitions in one place
- layouts referencing enemy/event types by id or name

Keep it simple and readable.
Do NOT build a full content/content-loader framework.

### 5) Initialization

Ensure the current scene/run initialization uses the selected layout for:

- player stats and spawn
- enemy positions and stats
- event positions and event types
- reward position/value
- exit position
- grid dimensions and tile size

### 6) Restart/Reset Behavior

Restart should:

- fully reset the run
- switch to the next predefined layout
- restore all entities according to that layout

This should be clean and consistent.

### 7) HUD / Status

HUD should continue to work with no major redesign.
If useful, add a minimal display of the current layout index or layout name, but keep it simple.

This is optional.
Do not build a full map-info panel.

### 8) Debug State

Update `window.__gameState` to include enough layout information for testing.

For example:

```ts
layout: {
  index: 0,
  name: "Cubicle Maze"
}
```

Requirements:

- reflect the current layout
- update correctly after restart
- preserve existing debug state for player, enemies, events, reward, exit, gameOver, and gameWon

### 9) Playwright Update

Extend Playwright coverage in the simplest reasonable way.

The tests should verify at least:

- the current layout info exists in debug state
- restarting advances to a different predefined layout
- the new layout changes at least one meaningful position or entity placement
- the game still functions correctly after layout switching

Keep tests stable and readable.
Do NOT rely on brittle visual assertions.

## Constraints

Do NOT add:

- random generation
- procedural rooms
- multiple floors
- scene transitions
- save/load
- animation systems
- heavy abstractions

Keep this step focused on a few hand-authored layouts and deterministic switching between them.

## Output

- Provide all necessary updated files.
- Ensure the project compiles and runs.

Do not break:

- movement
- combat
- event resolution
- reward collection
- victory
- restart/reset
- HUD
- debug state
- Playwright coverage
