We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- A 10x10 grid is rendered
- The player can move tile-to-tile with arrow keys
- There is one enemy on a fixed tile
- Moving onto the enemy tile triggers immediate combat
- There is one reward tile that restores player energy and is consumed on pickup
- There is one exit tile that triggers a win condition
- The run can be restarted/reset with the `R` key
- The game exposes a minimal `window.__gameState`
- Playwright coverage exists for the current loop

Goal of this task:

Move the hardcoded layout and initial entity values into a small, explicit level config so the game is easier to extend without changing game logic.

## Requirements

### 1) Introduce a Small Level Config

Create a single source of truth for the initial run state.

This config should define:

- grid width
- grid height
- tile size
- player starting position
- player starting energy
- enemy starting position
- enemy starting hp
- enemy starting damage
- reward starting position
- reward energy restore amount
- exit position

This may be:

- a TypeScript object in a dedicated file, or
- a small JSON file if that is straightforward

Prefer the simplest option that works cleanly with the current project.

### 2) Use Config During Initialization

Update the game so the scene/entity setup reads from the level config instead of scattered hardcoded values.

At minimum, the following should come from the config:

- player spawn
- player energy
- enemy spawn and stats
- reward spawn and reward amount
- exit spawn
- grid dimensions / tile size

### 3) Use Config During Restart

When the run is reset with `R`, the reset logic should also use the same config source rather than duplicated literals.

### 4) Keep Scope Tight

This is NOT a procedural generation step.
This is NOT a multi-level system.

Do NOT add:

- level selection
- multiple levels
- file loading pipelines
- random map generation
- dynamic enemy lists
- content editors

Just move the current single-level hardcoded values into one clean config source.

### 5) Structure

Keep the structure small and readable.

A good result would look something like:

- `src/data/levelConfig.ts`
  or
- `src/data/level1.ts`

Do not overengineer abstractions for future content.

### 6) Debug State

No major debug-state redesign is needed, but ensure `window.__gameState` still reflects the same gameplay state as before after this refactor.

### 7) Playwright

Update tests only if needed due to code organization changes.
Behavior should remain the same.
Existing tests should still pass.

### 8) Output

- Provide all necessary updated files.
- Ensure the project still compiles and runs.

Do not break:

- movement
- combat
- reward collection
- win condition
- restart/reset
- Playwright coverage

## Constraints

Do NOT add:

- multiple enemies
- event tiles
- inventory
- save/load
- procedural generation
- heavy abstractions

Keep this step focused on replacing hardcoded setup values with a single small level config.
