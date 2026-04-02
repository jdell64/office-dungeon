We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- A 10x10 grid is rendered
- The player can move tile-to-tile with arrow keys
- There is one enemy on a fixed tile
- Moving onto the enemy tile triggers immediate combat
- The enemy can be defeated or the player can lose and movement stops on game over

Goal of this task:

Add a minimal Playwright-based smoke test setup so we can verify the game loop automatically in the browser.

## Requirements

### 1) Install and configure Playwright

- Add the minimal files needed to run Playwright tests in this project
- Keep the setup simple
- Assume the game runs locally through the existing dev server

### 2) Add a minimal debug state for testing

Expose a stable debug state on `window` so Playwright can inspect the game without relying on visuals alone.

Use a structure like this:

```ts
(window as any).__gameState = {
  playerPosition: { x: 0, y: 0 },
  playerEnergy: 5,
  enemy: {
    x: 4,
    y: 4,
    alive: true,
    hp: 3
  },
  gameOver: false
};
```

Requirements for debug state:

- Keep it updated after movement
- Keep it updated after combat
- Keep it updated when enemy dies
- Keep it updated when game over happens

Do not build a large debug framework.
Just expose and update a small plain object.

### 3) Add one Playwright smoke test

Create one browser test that:

- opens the local game
- verifies initial game state exists
- simulates arrow key movement to move the player to the enemy tile
- verifies combat occurred by checking updated window.__gameState

The assertions should check at least:

- the player position changed from the start
- the enemy is no longer alive OR the player energy changed
- the game did not crash during the flow

### 4) Keep the test resilient

- Do not rely on brittle pixel/image assertions
- Prefer keyboard input and window.__gameState
- Keep the test small and easy to read

### 5) Output

Provide all necessary files and code changes, including:

- Playwright config
- package.json script updates if needed
- the smoke test file
- the minimal debug-state code changes

## Constraints

Do NOT:

- refactor the whole game architecture
- add UI just for testing
- add multiple tests
- add snapshot/image comparison
- add a full e2e framework beyond what is needed

Keep this focused and minimal.

## Notes

If the project needs a stable selector or container element for readiness, add a very small one

Ensure the final code compiles and the test is runnable
