We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- The game has a playable loop with movement, combat, events, rewards, exit, restart/reset, HUD, title/start screen, run summary, predefined layouts, meta progression, and localStorage persistence
- Input is currently keyboard-oriented
- Playwright coverage exists
- The long-term target is a simple phone game, so the next priority is mobile-first usability

Goal of this task:

Make the game meaningfully playable on a phone-sized screen by adding simple touch-friendly controls and improving responsive layout, while keeping the implementation minimal.

## Requirements

### 1) Add Touch-Friendly Movement Controls

Add on-screen controls for movement so the game can be played without a keyboard.

Requirements:

- Provide 4 directional controls:
  - Up
  - Down
  - Left
  - Right
- Tapping a direction should move the player one tile, matching the current turn-based movement rules
- These controls should work during normal gameplay only
- If movement is currently disabled due to title screen, event prompt, victory, or game over, touch movement should also be disabled

Acceptable implementation:

- simple on-screen buttons rendered with Phaser text/rectangles
- or very small DOM overlay buttons if cleaner

Prefer the simplest reliable option.

### 2) Add Touch-Friendly Event Choice Controls

When an event is active, the player must be able to resolve it without a physical keyboard.

Requirements:

- Provide simple on-screen controls for the two event choices
- These controls should only be visible/active when an event is active
- They should map to the same behavior as the current keyboard choices

Keep this very simple.
Do NOT build a general dialog button framework.

### 3) Add Touch-Friendly Title / Summary Controls

Support mobile-friendly interaction for:

- starting the run from the title screen
- restarting from the run summary / end state

Requirements:

- Add a simple on-screen "Start" action on the title screen
- Add a simple on-screen "Restart" action on the run summary/end state

Keyboard controls may remain, but touch controls must exist.

### 4) Responsive Layout Improvements

Make the game more usable on smaller portrait phone screens.

Requirements:

- Keep the game playable in a narrow mobile viewport
- Ensure the HUD remains readable
- Ensure touch controls do not cover critical gameplay information too badly
- Ensure title screen and run summary text remain readable on mobile

It is acceptable to:

- reduce tile size on small screens
- reposition HUD and controls for mobile
- use a simple responsive layout strategy based on viewport size

Do NOT overengineer a full layout system.

### 5) Safe Area / Sizing

Make a small effort to avoid obvious clipping or off-screen UI.

Requirements:

- important controls/text should remain visible in common mobile portrait sizes
- canvas/layout should adapt reasonably to viewport changes
- if needed, center the game board and place controls below or beside it

A simple fit/scale approach is fine.

### 6) Structure

Keep this implementation small and readable.

A good result would include:

- one small area for movement controls
- one small area for contextual actions (start / restart / event choice)
- minimal helper methods for enabling/disabling controls based on current screen state

Do NOT build a full UI widget library.

### 7) Preserve Desktop Support

Existing keyboard controls should continue to work.
This step should add mobile usability, not replace desktop usability.

### 8) Debug State

No major redesign is required, but if useful you may expose small mobile UI state in `window.__gameState`, such as:

- whether touch controls are visible
- current input mode hints

This is optional.

### 9) Playwright Update

Extend Playwright coverage in the simplest reasonable way.

The tests should verify at least one or more of the following:

- touch-friendly controls/buttons exist in the title state
- starting the run can be triggered without keyboard input
- movement can be triggered via the on-screen controls
- event choice can be resolved via on-screen controls
- restart can be triggered via the on-screen controls

Keep the tests stable and readable.
Prefer text/selectors/debug-state over pixel/image assertions.

## Constraints

Do NOT add:

- joystick dragging
- swipe gesture systems
- complex responsive frameworks
- separate mobile scenes
- Capacitor packaging yet
- app-store setup yet
- audio
- animation-heavy UI transitions

Keep this step focused on making the current web game comfortably playable on a phone-sized screen.

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
- meta progression
- localStorage persistence
- debug state
- Playwright coverage
