We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Core gameplay, content, UI, mobile controls, and persistence are complete
- The game currently has little or no sound
- Goal is to add lightweight audio feedback to improve game feel

Goal of this task:

Add a small set of sound effects and optional background music to improve feedback and player experience, while keeping implementation simple and mobile-friendly.

## Requirements

### 1) Add Basic Sound Effects

Add simple sound effects for key actions:

- Player move
- Player attack / enemy hit
- Player taking damage
- Event choice selection
- Reward gained
- Victory
- Game over

Use placeholder sounds if needed (short, lightweight files).

### 2) Implementation

- Use Phaser’s built-in audio system
- Load sounds in a central place (e.g. preload)
- Play sounds at appropriate interaction points

Keep it simple:

- no audio manager abstraction unless extremely small
- direct calls are fine

### 3) Add Optional Background Music (Simple Loop)

Add one background track:

- plays during gameplay
- loops automatically
- low volume by default

### 4) Volume Control (Minimal)

Add a simple toggle:

- Press `M` to mute/unmute all audio

Behavior:

- affects both sound effects and music
- persists only for the current session (no need to store yet)

### 5) Mobile Considerations

Ensure:

- audio only starts after first user interaction (required on mobile browsers)
- no autoplay issues

### 6) Performance

Ensure:

- sounds are short and lightweight
- no noticeable lag or stutter

### 7) No Overengineering

Do NOT:

- add audio settings menus
- add multiple tracks
- add complex mixing systems
- add spatial audio

### 8) Debug State (Optional)

Optionally expose:

```ts
audio: {
  muted: boolean
}
```

### 9) Playwright

No need for deep audio testing.

If needed:

- verify mute toggle state via debug state

## Output

- Provide all necessary code and asset loading.

Ensure:

- sounds play at correct times
- mute toggle works
- game still runs smoothly on mobile and desktop
