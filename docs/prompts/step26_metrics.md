We are continuing the "Office Dungeon" project.

## Goal

Track simple session metrics locally to help evaluate gameplay.

## Requirements

### 1) Track Metrics

Track:

- runs started
- runs completed
- wins
- losses
- average run length (optional)

### 2) Store Locally

Use localStorage.

### 3) Debug Exposure

Expose via `window.__gameState`:

```ts
stats: {
  runsStarted: number,
  wins: number,
  losses: number
}
```

### 4) No Backend

Do NOT:

- add analytics services
- send data externally

### 5) Optional Display

Optionally show simple stats on title screen.

## Output

Keep implementation minimal.
