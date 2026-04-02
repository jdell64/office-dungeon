We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- A 10x10 grid is rendered
- The player can move tile-to-tile with arrow keys
- There is one enemy on a fixed tile
- Moving onto the enemy tile triggers immediate combat
- There is one reward tile that restores player energy and is consumed on pickup
- There is one exit tile that triggers a win condition
- The run can be restarted/reset with the `R` key
- The game uses a small level config for initial layout/state
- The game exposes a minimal `window.__gameState`
- Playwright coverage exists for the current loop

Goal of this task:

Add one simple event tile that triggers a basic choice with a small outcome, so the game starts to feel more like a dungeon run and less like a pure movement/combat demo.

## Requirements

### 1) Add One Event Tile

- Add one event tile at a fixed position from the level config, for example `(6,2)`
- Represent it visually as a colored square distinct from the player, enemy, reward, and exit
- The event should only be triggerable once per run

### 2) Event Trigger

When the player moves onto the event tile:

- Pause normal movement
- Mark that an event is active
- Present a very simple event choice to the player

Keep the presentation minimal.
A simple text overlay or simple DOM/debug text is acceptable.
Do NOT build a full dialog framework.

### 3) Event Content

Implement exactly one event with exactly two choices.

Example event:

- Event name: "Coworker Venting"
- Prompt: "A coworker starts venting to you in the hallway."

Choices:

- Press `Y` to listen
  - Outcome: `+1 stress`
- Press `N` to politely escape
  - Outcome: `-1 energy`

If you do not currently track stress in code, add it now in the smallest possible way.

### 4) Player Stats

Add `stress` as a minimal player stat.

Requirements:

- starting stress = 0
- it should be tracked in state
- it should update when the event resolves
- keep it simple; stress does not need to affect combat yet

### 5) Movement Rules

While the event is active:

- normal arrow-key movement must be disabled
- only the event input keys should work

After the player makes a choice:

- apply the outcome
- mark the event as consumed
- clear the active event state
- allow movement again

### 6) Event Consumption

- The tile should not trigger again after resolution
- It may remain visible in a "used" state or disappear, whichever is simpler
- The debug state must reflect whether the event is still available

### 7) Structure

Keep this implementation minimal.

You may add a very small `EventSystem` or simple helper if useful, but do NOT build a large event engine.
A good outcome is:

- one event definition
- one active-event flow
- one resolution path

Do NOT add a generalized content pipeline yet.

### 8) Debug State

Update `window.__gameState` to include event-related state, for example:

```ts
event: {
  x: 6,
  y: 2,
  available: true,
  active: false,
  name: "Coworker Venting"
},
playerStress: 0
```

Requirements:

- reflect when the event is active
- reflect when it has been consumed
- reflect updated stress/energy after resolution

### 9) Console / Minimal UI Feedback

Add minimal logs such as:

- "Event triggered"
- "Event choice selected"
- "Event resolved"

A small visible text prompt is preferred if easy, but keep it minimal.

### 10) Playwright Test Update

Extend Playwright coverage in the simplest reasonable way.

You may either:

- update an existing test, or
- add one additional small test

The test should verify:

- the player can move onto the event tile
- the event becomes active
- movement is blocked while the event is active
- pressing Y or N resolves the event
- the event becomes unavailable after resolution
- the player's energy or stress changes correctly

Keep the test stable and readable.

## Constraints

Do NOT add:

- multiple event types
- random event generation
- event chains
- inventory
- UI frameworks
- animation systems
- stress-based gameplay effects yet

Keep this step focused on one simple event tile with one choice prompt and two outcomes.

## Output

- Provide all necessary updated files.
- Ensure the project still compiles and runs.

Do not break:

- movement
- combat
- reward collection
- win condition
- restart/reset
- level config usage
- Playwright coverage
