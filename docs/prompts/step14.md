We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Grid-based movement works
- Multiple enemy types and event types exist
- Reward, exit, restart/reset, HUD, title/start screen, run summary, and debug state all exist
- Multiple predefined layouts exist and switch deterministically on restart
- Playwright coverage exists

Goal of this task:

Add a small amount of visual/game-feel polish so the prototype feels more alive without introducing complexity.

## Requirements

### 1) Improve Tile Readability

Make the different tile/entity types easier to distinguish at a glance.

At minimum, improve the visual distinction for:

- player
- enemy tiles
- reward tile
- event tiles
- exit tile

Acceptable improvements:

- clearer colors
- simple labels/letters on tiles
- slightly different shapes or borders

Keep visuals minimal and generated in code if possible.
Do NOT introduce a full art pipeline yet.

### 2) Add Simple Combat Feedback

When combat occurs:

- briefly show some visible indication that combat happened

Examples:

- flash the enemy tile
- flash the player tile
- briefly show floating text like "-1"
- briefly change tint/color and restore it

Choose the simplest reliable approach.
Keep it lightweight.

Do NOT build a full animation system.

### 3) Add Simple Event/Action Status Text

Add a small status/message text area that can briefly show recent events such as:

- "Combat started"
- "Enemy defeated"
- "Reward collected"
- "Event triggered"
- "Chose to listen"
- "You Win"
- "Game Over"

Requirements:

- it should be visible on screen during gameplay
- it can replace/overwrite the previous message
- keep it simple; no scrolling log required

This can be a single Phaser text object.

### 4) Add Minimal Transition Feedback

When the game changes major states:

- title -> running
- running -> victory
- running -> game over
- restart -> title

Show a small visible update through the status/message text or overlay refresh.
Do NOT add scene transitions or fades unless extremely small and simple.

### 5) Optional Sound Hook Placeholder

If easy, add a very small placeholder structure for future sound hooks such as methods like:

- `playCombatSfx()`
- `playRewardSfx()`

These can be empty/no-op for now if no sound assets exist.

This is optional.
Do NOT spend much effort here.

### 6) HUD / Summary Compatibility

Ensure the new visual polish does not break:

- HUD readability
- title screen
- event prompt display
- run summary overlay

### 7) Debug State

No major redesign is needed.
If useful, you may expose the latest status message in `window.__gameState`, for example:

```ts
latestMessage: "Enemy defeated"
```

This is optional but helpful for testing.

### 8) Playwright Update

Only update Playwright if needed.

If you expose a status message in debug state or visible text, add one small assertion to verify that a meaningful message appears after a gameplay action such as:

- combat
- reward collection
- event resolution
- victory or defeat

Keep the test stable and minimal.
Do NOT add brittle timing-heavy assertions for flashes/visual effects.

## Constraints

Do NOT add:

- a full animation framework
- imported art assets unless absolutely necessary
- audio assets
- particles
- complex tween choreography
- menu redesign
- scene transitions
- heavy UI abstractions

Keep this step focused on small polish that improves readability and feel.

## Output

- Provide all necessary updated files.
- Ensure the project compiles and runs.

Do not break:

- movement
- combat
- events
- reward collection
- victory / game over behavior
- restart/reset
- HUD
- title/start screen
- run summary
- predefined layouts
- debug state
- Playwright coverage
