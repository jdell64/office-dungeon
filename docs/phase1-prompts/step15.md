We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Grid-based movement works
- Multiple enemies, events, reward, exit, restart/reset, HUD, title/start screen, run summary, and predefined layouts all exist
- A small amount of visual polish exists
- Debug state is exposed via `window.__gameState`
- Playwright coverage exists

Goal of this task:

Add a very small meta-progression loop so the player has a reason to replay runs.

## Requirements

### 1) Add a Persistent Session Currency

Add a simple currency called `Office Credits`.

Rules:

- credits persist across restarts during the current app session
- credits do NOT need to persist across browser refreshes yet
- credits are earned at the end of each run

### 2) Credits Earned Per Run

At the end of a run, award credits based on performance:

- +1 credit per enemy defeated
- +1 credit per event resolved
- +3 credits for victory
- +0 extra for defeat

Calculate this when the run ends and preserve the total credits for future runs during the session.

### 3) Add 3 Perks

Add exactly 3 perks:

1. Extra Coffee
   - Effect: start each run with +1 energy

2. Calm Mind
   - Effect: start each run with -1 stress, minimum 0

3. Aggressive Reply
   - Effect: player deals +1 combat damage

### 4) Unlock / Equip Rules

Use this rule set:

- perks begin locked except one default starter perk OR all begin locked if cleaner
- perks can be unlocked by spending Office Credits
- once unlocked, perks remain unlocked for the current app session
- only ONE perk can be equipped at a time
- the equipped perk applies at run start

Keep costs simple, for example:

- Extra Coffee: 3
- Calm Mind: 3
- Aggressive Reply: 4

### 5) Title Screen Integration

Extend the existing title/start screen to show:

- current Office Credits
- the 3 perks
- whether each perk is locked/unlocked
- which perk is currently equipped

Add simple keyboard controls:

- Press `1` to unlock/equip perk 1
- Press `2` to unlock/equip perk 2
- Press `3` to unlock/equip perk 3
- Press `Space` to start run

Behavior:

- if the perk is locked and the player has enough credits, pressing the key unlocks it and equips it
- if the perk is already unlocked, pressing the key equips it
- if the perk is locked and credits are insufficient, do nothing except optionally show a status message

### 6) Perk Application

When a run starts, apply the currently equipped perk to the run's starting state.

Requirements:

- Extra Coffee modifies starting energy
- Calm Mind modifies starting stress, not below 0
- Aggressive Reply modifies player combat damage
- restart/reset and predefined layout logic must still work correctly

### 7) Run Summary Integration

Update the run summary to show:

- credits earned this run
- total Office Credits after the run

### 8) Debug State

Update `window.__gameState` to include meta-progression state, for example:

```ts
meta: {
  officeCredits: 6,
  equippedPerkId: "extra_coffee",
  unlockedPerkIds: ["extra_coffee"]
}
```

Requirements:

- reflect current credits
- reflect unlocked perks
- reflect equipped perk
- reflect any active run modifier if useful

### 9) Structure

Keep this implementation simple.

A good result would include:

- a small perk definition list
- a small meta/session state object
- minimal title-screen logic for unlocking/equipping

Do NOT build:

- save files
- multiple currencies
- skill trees
- inventories
- backend services

### 10) Playwright Update

Extend Playwright coverage in the simplest reasonable way.

The tests should verify at least:

- credits are awarded after a run ends
- a perk can be unlocked when enough credits exist
- an unlocked perk can be equipped
- starting a new run applies the equipped perk correctly

Keep tests stable and readable.
Prefer debug-state assertions and simple visible text checks.

## Constraints

Do NOT add:

- persistent storage across refresh yet
- multiple equip slots
- random perk generation
- shops
- rarity systems
- monetization systems
- backend persistence

Keep this step focused on a very small session-based replay progression loop.

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
- debug state
- Playwright coverage
