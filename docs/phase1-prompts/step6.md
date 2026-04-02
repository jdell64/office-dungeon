We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- A 10x10 grid is rendered
- The player can move tile-to-tile with arrow keys
- There is one enemy on a fixed tile
- Moving onto the enemy tile triggers immediate combat
- There is one reward tile that restores player energy and is consumed on pickup
- There is one exit tile that triggers a win condition
- The game exposes a minimal `window.__gameState`
- Playwright coverage exists for the current loop

Goal of this task:

Add a simple restart/reset flow so the run can be played again after either game over or victory.

## Requirements

### 1) Restart Input

- Add support for restarting the run by pressing the `R` key
- Restart should work after:
  - game over
  - victory
- It may also work during an active run if that is simpler, as long as behavior is clean and consistent

### 2) Reset Behavior

When restart happens, fully reset the run to its original initial state:

- player position returns to starting tile
- player energy returns to initial value
- enemy respawns with original hp and original position
- reward becomes available again at its original position
- exit remains at its original position
- `gameOver` becomes `false`
- `gameWon` becomes `false`
- movement becomes enabled again

### 3) Structure

- Keep this implementation minimal and readable
- Do NOT add a save system
- Do NOT add a menu
- Do NOT add scene transitions unless absolutely necessary

Preferred approach:

- Reset the state within the current scene if simple
- If restarting the Phaser scene is cleaner, that is acceptable, but preserve the same external behavior and debug state shape

### 4) Initial State Source

- Avoid duplicating hardcoded values in many places
- Introduce a small, clear way to define the initial state for:
  - player
  - enemy
  - reward
  - exit

This can be simple constants or a small config object.
Do NOT build a full data-loading system yet.

### 5) Debug State

Ensure `window.__gameState` is fully refreshed after restart.

It should correctly reflect the reset state, including:

- player position
- player energy
- enemy alive/hp
- reward available
- gameOver
- gameWon

### 6) Console Feedback

Add minimal console logs:

- "Run restarted"

No restart UI button is required yet.

### 7) Playwright Test Update

Extend Playwright coverage in the simplest reasonable way.

You may either:

- update an existing test, or
- add one additional small test

The test should verify:

- the game can reach either a win or loss state
- pressing `R` resets the run
- debug state returns to the original initial values
- movement works again after reset

Keep the test stable and easy to read.

## Constraints

Do NOT add:

- title screen
- pause menu
- save/load
- level progression
- multiple scenes
- animations
- sound effects

Keep the implementation focused and minimal.

## Output

- Provide all necessary updated files.
- Ensure the game still compiles and Playwright test(s) are runnable.
- Do not break existing movement, combat, reward, or win behavior.
