We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- A 10x10 grid is rendered
- The player can move tile-to-tile with arrow keys
- There is one enemy on a fixed tile
- Moving onto the enemy tile triggers immediate combat
- The game exposes a minimal `window.__gameState`
- A Playwright smoke test exists

Goal of this task:

Add a single reward tile that restores player energy when stepped on.

## Requirements

### 1) Reward Tile

- Add one reward tile at a fixed grid position, for example `(2,2)`
- Represent it visually as a colored square distinct from both the player and enemy
- It should only be collectible once

### 2) Reward Behavior

When the player moves onto the reward tile:

- Restore player energy by `+2`
- Clamp energy to a maximum of `5`
- Remove the reward tile from the grid after collection

### 3) Player Rules

- If the player is already at max energy, collecting the reward should still consume the tile
- Do not create inventory or item systems
- Do not add multiple reward types yet

### 4) Structure

- Keep this implementation simple
- You may add a small `Reward` entity or plain object
- If needed, add a small helper/system for reward collection, but do NOT overengineer it
- Keep GameScene responsible for checking whether the player stepped onto the reward tile

### 5) Debug State

Update `window.__gameState` to include reward information, for example:

```ts
reward: {
  x: 2,
  y: 2,
  available: true
}
```

Requirements:

- Update reward availability when collected
- Update player energy after collection

### 6) Console Feedback

Add minimal console logs:

- "Reward collected"
- "Player energy restored"

No new UI is required.

### 7) Playwright Test Update

Extend the existing Playwright smoke coverage in the simplest reasonable way.

You may either:

- update the existing test to also collect the reward before or after combat, or
- add one additional small test

The test should verify:

- the reward starts available
- the player can move onto it
- the reward becomes unavailable after collection
- player energy is updated correctly

Keep the test lightweight and stable.

## Constraints

Do NOT add:

- inventory
- multiple rewards
- random generation
- animations
- a full item system
- sound effects

Keep everything synchronous, readable, and minimal.

## Output

- Provide all necessary updated files.
- Ensure the game still compiles and the Playwright test(s) are runnable.
- Do not break existing movement or combat behavior.
