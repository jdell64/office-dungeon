We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Grid-based movement works
- Multiple enemy types and event types exist
- Reward, exit, restart/reset, HUD, and debug state all exist
- Multiple predefined layouts exist and switch deterministically on restart
- A title/start screen exists
- Playwright coverage exists

Goal of this task:

Add a very small run summary / score screen after victory or game over so each run has a clearer ending and the game starts to feel more complete.

## Requirements

### 1) Add a Run Summary Screen

After a run ends, do NOT leave the player only on the gameplay board with a status change.

Instead, show a simple run summary overlay when:

- the player wins
- the player loses

This overlay can be implemented with Phaser text objects and a simple background rectangle.

### 2) Summary Content

Display at least the following:

- Result:
  - "Victory" or "Game Over"
- Final Energy
- Final Stress
- Enemies Defeated
- Events Resolved
- Current Layout Name or Index

Also display:

- "Press R to Restart"

Optional:

- "Press Space to Continue" is NOT required yet, since restart is enough

### 3) Tracking Stats

Add minimal run tracking so the summary can display:

- `enemiesDefeated`
- `eventsResolved`

Requirements:

- increment `enemiesDefeated` when an enemy is defeated
- increment `eventsResolved` when an event is completed
- reset these counters when a new run starts

Do NOT add score formulas yet.
Just track and display these counts.

### 4) End-State Behavior

When the run summary is visible:

- movement must remain disabled
- event input must remain disabled
- the summary should stay visible until restart

If the current implementation already uses screen/state flags, extend that cleanly.

### 5) Title / Start Flow Compatibility

Keep the start/title flow consistent with the new summary behavior.

Preferred behavior:

- initial load → title screen
- press Space → run starts
- win or lose → run summary overlay appears
- press R → reset to title screen for the next layout

Keep this clean and consistent.

### 6) HUD Interaction

HUD may remain visible underneath, but the run summary should clearly be the primary focus.

Acceptable options:

- keep HUD visible and overlay the summary
  or
- hide parts of the HUD while summary is shown

Do whichever is simplest and cleanest.
Do NOT build a full layered UI framework.

### 7) Debug State

Update `window.__gameState` to include summary-related run stats, for example:

```ts
runStats: {
  enemiesDefeated: 2,
  eventsResolved: 1
}
```

Requirements:

- keep run stats updated during play
- preserve them when the run ends
- reset them when a new run is started/reset
- ensure screenState still clearly reflects whether the game is in title, running, event, gameOver, or victory state

If you prefer, screenState can remain "gameOver" or "victory" while the summary overlay is shown.

### 8) Playwright Update

Extend Playwright coverage in the simplest reasonable way.

The tests should verify at least:

- after a win or loss, the run summary state is reached
- run stats exist in debug state
- pressing R resets run stats
- the summary includes the expected result text or corresponding state

Keep the tests stable and readable.
Prefer debug-state and text assertions over visual/image assertions.

## Constraints

Do NOT add:

- score multipliers
- leaderboards
- persistence
- menus beyond what is required
- multiple scenes unless absolutely necessary
- animations
- audio
- particle effects
- heavy UI abstractions

Keep this step focused on a minimal run summary overlay and simple run stat tracking.

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
- predefined layouts
- debug state
- Playwright coverage
