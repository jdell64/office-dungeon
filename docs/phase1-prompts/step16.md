We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Grid-based movement works
- Multiple enemies, events, reward, exit, restart/reset, HUD, title/start screen, run summary, and predefined layouts all exist
- A small meta-progression loop exists with:
  - Office Credits
  - unlockable perks
  - one equipped perk
- Meta progression currently persists only for the current app session
- Debug state is exposed via `window.__gameState`
- Playwright coverage exists

Goal of this task:

Persist the meta-progression state across browser refreshes using localStorage, while keeping the implementation small and reliable.

## Requirements

### 1) Persist Meta Progression to localStorage

Persist the following meta state in localStorage:

- total Office Credits
- unlocked perk ids
- equipped perk id

This should survive:

- browser refresh
- closing and reopening the tab/browser

It does NOT need cloud sync or account-based persistence.

### 2) Load Meta Progression on Startup

When the game starts:

- attempt to load saved meta progression from localStorage
- if valid saved data exists, use it
- otherwise initialize default meta progression state

This should happen before the title screen is displayed so the title screen reflects saved data immediately.

### 3) Save Timing

Update localStorage whenever relevant meta state changes, including:

- credits awarded at end of run
- perk unlocked
- perk equipped

Keep it simple and reliable.
No debounce is necessary unless already useful.

### 4) Data Safety

Add minimal validation when reading localStorage.

Requirements:

- if data is missing, malformed, or partially invalid, fall back safely to defaults
- do not crash the game because of bad saved data
- keep validation simple and readable

### 5) Clear Save Helper

Add a simple way to clear saved progression during development/testing.

Use a keyboard shortcut on the title screen:

- Press `C` to clear saved meta progression and reset to defaults

Behavior:

- clear localStorage entry used by this game
- reset in-memory meta state
- update title screen immediately
- log a simple console/status message such as "Save cleared"

Keep this limited to development-friendly behavior. It is fine if it remains available in the prototype.

### 6) Structure

Keep this implementation small.

A good result would include:

- a small storage key constant
- a small helper/service for:
  - loadMetaState()
  - saveMetaState()
  - clearMetaState()

Do NOT build a full persistence framework.

### 7) Title Screen Integration

Ensure the title screen correctly reflects persisted state:

- current Office Credits
- unlocked perks
- equipped perk

These should be correct immediately on load/refresh.

### 8) Run Summary Integration

Ensure that after a run ends and credits are awarded:

- the new total is saved
- refreshing the page preserves the updated total

### 9) Debug State

Update `window.__gameState` to reflect persistence-related state if useful.

At minimum, preserve:

```ts
meta: {
  officeCredits: number,
  equippedPerkId: string | null,
  unlockedPerkIds: string[]
}
```

Optional:

- include a boolean such as metaLoadedFromStorage: true/false

This is optional, not required.

### 10) Playwright Update

Extend Playwright coverage in the simplest reasonable way.

The tests should verify at least:

- meta progression is saved after it changes
- after a page reload, the saved credits/perks are restored
- clearing save data resets progression to defaults

Use Playwright's page reload support and debug-state assertions.
Keep tests stable and readable.

## Constraints

Do NOT add:

- backend persistence
- user accounts
- cloud save
- encryption
- multiple save slots
- settings menus
- large persistence abstractions

Keep this step focused on small, reliable localStorage persistence for meta progression only.

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
- debug state
- Playwright coverage
