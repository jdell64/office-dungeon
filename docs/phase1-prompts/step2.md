We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Grid is implemented
- Player can move tile-to-tile on a 10x10 grid

Goal of this task:

Add a single enemy and a basic combat interaction when the player moves onto the enemy tile.

---

## Requirements

### 1) Enemy

- Create a simple Enemy entity:
  - Represented as a colored square (different color than player)
  - Positioned on a fixed tile (e.g. (4,4))

- Enemy should have:
  - hp (number)
  - damage (number)

Use simple hardcoded values:

- hp = 3
- damage = 1

---

### 2) Player Stats (minimal)

Extend player to include:

- energy (acts as HP)

Use:

- energy = 5

---

### 3) Combat Behavior

When the player moves onto the enemy tile:

- Combat resolves immediately (no animations)

Combat loop:

- Player deals 1 damage to enemy
- Enemy deals its damage to player
- Repeat until:
  - enemy hp <= 0 → enemy is removed
  - OR player energy <= 0 → game over

---

### 4) Game Over

If player energy reaches 0:

- Log "Game Over" to console
- Disable further movement

---

### 5) Enemy Death

If enemy is defeated:

- Remove enemy from the grid
- Player remains on that tile

---

### 6) Structure

- Create a CombatSystem responsible ONLY for:
  - resolving combat between player and enemy

- Keep it simple:
  - one function like: resolveCombat(player, enemy)

- Do NOT introduce complex architecture

---

### 7) Integration

- GameScene should:
  - detect when player enters enemy tile
  - call CombatSystem
  - update visuals accordingly

---

### 8) Visual Feedback (minimal)

- Update console logs:
  - "Combat started"
  - "Player hit enemy"
  - "Enemy hit player"
  - "Enemy defeated"
  - "Player defeated"

No UI required yet.

---

## Constraints

- Do NOT add:
  - animations
  - multiple enemies
  - turn queues
  - UI systems
  - event systems

- Keep everything synchronous and simple

---

## Output

- Provide full updated files
- Ensure code compiles and runs
- Do not break existing movement

---

Focus on a clean, minimal implementation.
