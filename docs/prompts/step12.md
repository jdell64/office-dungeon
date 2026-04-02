We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Grid-based movement works
- Multiple enemy types and event types exist
- Reward, exit, restart/reset, HUD, and debug state all exist
- The game supports multiple predefined layouts and switches layouts deterministically on restart
- Playwright coverage exists

Goal of this task:

Add a very small title/start screen so the game feels more like a real product and the run begins intentionally instead of dropping directly into gameplay.

## Requirements

### 1) Add a Start State

The game should begin in a simple title/start state before the run starts.

In this state:

- gameplay movement is disabled
- combat/events do not run
- the player should see a minimal title/instruction overlay

### 2) Title / Instruction Overlay

Display a simple overlay with:

- Game title: "Office Dungeon"
- Instruction: "Press Space to Start"
- Instruction: "Press R to Restart" (optional to show here, but useful)
- Optional short subtitle/tagline if simple, such as:
  - "Survive the workday."

This can be implemented using Phaser text objects.
No menus or buttons are required.

### 3) Start Input

- Pressing `Space` should begin the run
- When the run begins:
  - hide or remove the title overlay
  - enable gameplay input
  - initialize or reveal the current layout cleanly

### 4) Restart Behavior

Restart with `R` should continue to work as before.

Expected behavior:

- if pressed during gameplay end states (win or loss), restart should reset the run and return to the title/start state, OR reset directly into a ready-to-start state
- choose the simpler, cleaner behavior and keep it consistent

Preferred behavior:

- `R` resets the run and returns to the title/start state for the next layout

### 5) State Handling

Add a minimal way to track whether the game is:

- on title screen
- running
- game over
- victory
- event active

Keep this implementation simple.
Do NOT build a full scene/state machine framework.
A small enum/string flag is enough.

### 6) HUD Interaction

The HUD should behave cleanly with the start screen.

Acceptable options:

- hide the HUD until gameplay starts
  or
- show the HUD but keep status as something like "Ready"

Either is fine as long as it is consistent and readable.

### 7) Debug State

Update `window.__gameState` to include a simple state field, for example:

```ts
screenState: "title" | "running" | "event" | "gameOver" | "victory"
```

Requirements:

- reflect the title/start state initially
- update correctly when the run begins
- update correctly on restart

### 8) Playwright Update

Extend Playwright coverage in the simplest reasonable way.

The tests should verify at least:

- the game starts in title/start state
- pressing Space transitions to running state
- pressing R after a completed run returns to the title/start state (or the chosen consistent reset behavior)
- debug state reflects the current screen/state correctly

Keep tests stable and readable.
Do NOT add brittle visual/image assertions.

## Constraints

Do NOT add:

- buttons
- animated title screens
- multiple scenes unless absolutely necessary
- menu systems
- save slots
- audio
- particles
- heavy state machine abstractions

Keep this step focused on a minimal title/start overlay and simple start-state flow.

## Output

- Provide all necessary updated files.
- Ensure the project compiles and runs.

Do not break:

- movement
- combat
- events
- reward collection
- victory
- restart/reset
- HUD
- predefined layouts
- debug state
- Playwright coverage
