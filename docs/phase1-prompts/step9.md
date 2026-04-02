We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Grid-based movement works
- Combat, reward, exit, restart all work
- One event system exists
- Level config is in place
- Playwright tests exist
- Debug state is exposed via `window.__gameState`

Goal of this task:

Add a minimal HUD (heads-up display) to show key player stats and game status.

## Requirements

### 1) HUD Elements

Display the following on screen:

- Player Energy
- Player Stress
- Game Status:
  - "Running"
  - "Game Over"
  - "Victory"
  - "Event Active" (when applicable)

This can be simple text rendered using Phaser text objects.

---

### 2) Placement

- Place HUD in a fixed position (top-left corner is fine)
- It should not move with the player
- It should always be visible

---

### 3) Updates

HUD must update in real-time when:

- player energy changes
- player stress changes
- gameOver becomes true
- gameWon becomes true
- event becomes active or resolves

---

### 4) Structure

Keep it simple:

- HUD logic can live inside GameScene or a small helper
- Do NOT build a full UI system
- Do NOT introduce complex layout frameworks

---

### 5) Visual Simplicity

- Use basic text (no fonts, no styling required)
- Example format:

Energy: 4  
Stress: 1  
Status: Running  

---

### 6) Debug Alignment

HUD values should match `window.__gameState`

---

### 7) Playwright Update

Extend tests minimally to verify HUD updates.

For example:

- after combat, energy value in HUD changes
- after event, stress value updates
- after win/lose, status text updates

Prefer simple text queries over visual assertions.

---

## Constraints

Do NOT add:

- menus
- buttons
- styling systems
- animations
- sound

Keep it minimal and functional.

---

## Output

- Provide all necessary updated files.
- Ensure the project compiles and runs.
- Do not break any existing systems or tests.
