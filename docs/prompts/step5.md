We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- A 10x10 grid is rendered
- The player can move tile-to-tile with arrow keys
- There is one enemy on a fixed tile
- Moving onto the enemy tile triggers immediate combat
- There is one reward tile that restores player energy and is consumed on pickup
- The game exposes a minimal `window.__gameState`
- Playwright coverage exists for the current basic loop

Goal of this task:

Add a single exit tile and a basic win condition so the game has a complete playable loop.

## Requirements

### 1) Exit Tile

- Add one exit tile at a fixed grid position, for example `(9,9)`
- Represent it visually as a colored square distinct from the player, enemy, and reward
- The exit tile should remain visible unless the game is won

### 2) Win Condition

When the player moves onto the exit tile:

- Mark the game as won
- Log "You Win" to the console
- Disable further movement

### 3) Rules

- Keep the win condition simple
- The player should be able to win by stepping onto the exit tile
- Do NOT require defeating the enemy first unless that rule already exists and is trivial to preserve
- If the player is already game over, they cannot win
- If the player has already won, no further input should do anything

### 4) Structure

- Keep this implementation minimal
- Do not introduce a large game state manager
- GameScene can handle checking whether the player stepped onto the exit tile
- If needed, use a small plain object or simple Exit entity

### 5) Debug State

Update `window.__gameState` to include win/exit information, for example:

```ts
exit: {
  x: 9,
  y: 9
},
gameWon: false
```

Requirements:

- Keep gameWon updated
- Preserve existing debug state fields
- Ensure gameWon and gameOver are both represented clearly

### 6) Console Feedback

Add minimal console logs:

- "Exit reached"
- "You Win"

No UI overlays are required yet.

### 7) Playwright Test Update

Extend the existing Playwright test coverage in the simplest reasonable way.

You may either:

- update an existing test, or
- add one additional small test

The test should verify:

- the exit tile exists in debug state
- the player can move onto the exit tile
- gameWon becomes true
- movement is disabled after winning

Keep the test small, stable, and readable.

## Constraints

Do NOT add:

- multiple levels
- scene transitions
- victory screens
- score systems
- procedural generation
- save systems
- animations or particles

Keep the implementation synchronous, readable, and minimal.

## Output

- Provide all necessary updated files.
- Ensure the game still compiles and the Playwright test(s) are runnable.
- Do not break existing movement, combat, or reward behavior.
