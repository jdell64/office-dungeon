We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Core gameplay, content, UI, mobile controls, persistence, and sound are in place
- The game is approaching a first real mobile test build
- The next goal is to add very light monetization hooks without integrating real ad/payment SDKs yet

Goal of this task:

Add simple monetization-ready hooks and UX placeholders so the game can later support ads or premium unlocks, without introducing external SDK complexity right now.

## Requirements

### 1) Add Rewarded Continue Hook

After a run ends in defeat, add a simple "Continue" option placeholder.

Behavior:

- Show a button or action prompt such as:
  - "Continue (Ad)"
- Selecting it should simulate a rewarded continue for now
- The continue should:
  - restore a small amount of energy (for example +2)
  - clear game over
  - return the player to the run
- This can only be used once per run

Important:

- Do NOT integrate a real ad SDK yet
- Treat this as a local placeholder hook for future rewarded ads

### 2) Add Premium/No-Ads Placeholder Flag

Add a simple in-memory/local flag representing a hypothetical premium purchase or "No Ads" unlock.

Behavior:

- if premium/no-ads is enabled:
  - the rewarded continue should still work, but should not mention ads
  - text can become simply "Continue"
- if premium/no-ads is disabled:
  - show "Continue (Ad)"

This does NOT need real payments yet.

### 3) Add Simple Dev Toggle

Add a development/testing toggle on the title screen:

- Press `P` to toggle premium/no-ads mode on/off

Requirements:

- update UI immediately
- persist this flag in localStorage for now
- keep implementation minimal

### 4) Add Monetization State Storage

Persist the placeholder monetization state in localStorage:

At minimum:

- premium/no-ads enabled: true/false

If a rewarded continue has run-specific usage, that should reset each run and does NOT need persistent storage.

### 5) Title Screen / Summary Screen Integration

Display a minimal monetization state hint somewhere appropriate, such as:

- "Premium: On"
- "Premium: Off"

Keep it simple and unobtrusive.

### 6) Run Summary Integration

When the player loses:

- clearly show whether continue is available
- after using continue once, remove or disable the option

When the player wins:

- do not show continue option

### 7) Structure

Keep this implementation small.

A good result would include:

- one small monetization state object
- one localStorage-backed premium flag
- one per-run boolean for whether continue has been used

Do NOT build:

- payment systems
- ad SDK wrappers
- entitlement frameworks
- storefront UI

### 8) Debug State

Update `window.__gameState` to include minimal monetization-related info, for example:

```ts
monetization: {
  premiumEnabled: false,
  continueAvailable: true,
  continueUsedThisRun: false
}
```

Requirements:

- reflect premium toggle state
- reflect continue availability for the current run
- update after continue is used

### 9) Playwright Update

Extend Playwright coverage in the simplest reasonable way.

The tests should verify at least:

- premium toggle can be changed and persisted
- after a loss, continue option is available
- using continue restores the run and disables further continue use for that run
- continue label changes appropriately when premium is enabled

Keep tests stable and readable.
Do NOT test real ads or payments.

## Constraints

Do NOT add:

- real ad SDKs
- real in-app purchases
- backend validation
- remote config
- analytics SDKs
- multiple monetization products
- popups beyond what is needed

Keep this step focused on lightweight monetization-ready hooks and UI placeholders only.

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
- persistence
- sound
- debug state
- Playwright coverage
