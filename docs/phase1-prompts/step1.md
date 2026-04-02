We are building a simple 2D game called "Office Dungeon" using Phaser 3 and TypeScript.

## Goal of this task

Create the minimal playable foundation:

- A grid-based map
- A player that can move tile-to-tile using arrow keys
- Visual representation of the grid and player

## Requirements

### 1. Setup

- Use Phaser 3 with TypeScript
- Create a basic GameScene

### 2. Grid

- Create a 10x10 grid
- Each tile should be a fixed size (e.g. 64x64)
- Render the grid visually (simple rectangles or lines is fine)

### 3. Player

- Represent player as a simple colored square
- Start at position (0,0)

### 4. Movement

- Use arrow keys to move the player
- Movement must:
  - snap to grid
  - prevent moving outside bounds
  - be turn-based (one move per key press)

### 5. Structure

- Create a GridSystem to manage:
  - grid size
  - tile size
  - bounds checking

- Keep GameScene responsible for:
  - rendering
  - input handling

### 6. Code Quality

- Keep everything simple and readable
- No overengineering
- No unnecessary abstractions

### 7. Output

- Provide all necessary files to run this scene
- Include imports and setup
- Ensure it compiles and runs

Do not implement enemies, combat, or events yet.
