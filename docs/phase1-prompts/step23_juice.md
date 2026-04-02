We are continuing the "Office Dungeon" project.

## Goal

Add lightweight visual and feedback improvements ("juice") to make actions feel responsive and satisfying without adding complex animation systems.

## Requirements

### 1) Damage / Effect Feedback

When actions occur:

- show small floating text:
  - "-1 HP"
  - "+1 Energy"
  - "+1 Stress"
- text should appear briefly and disappear

### 2) Tile Feedback

When player moves:

- briefly highlight the destination tile
- or flash the tile color slightly

### 3) Enemy Feedback

When enemy takes damage:

- briefly flash (e.g. red tint)
- or small visual indication

### 4) Event Feedback

When event choice is made:

- show short result text:
  - "Lost Energy"
  - "Gained Reward"
  - "Stress Increased"

### 5) Minimal Animation Only

Keep everything:

- very short (100–300ms)
- simple (no animation systems)

### 6) No New Systems

Do NOT:

- add animation frameworks
- add particle systems
- restructure rendering

### 7) Performance Safe

Ensure:

- no noticeable lag on mobile

## Output

All changes should be small, readable, and isolated.
