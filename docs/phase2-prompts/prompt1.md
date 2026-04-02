We are pivoting the core gameplay loop of Office Dungeon.

This is a structural change. Do not add unnecessary systems. Keep implementation simple and clean.

========================================
GOAL
========================================

Replace "reach exit to win" with:

- Player must complete WORK to finish the run
- Movement costs energy
- Running out of energy = loss ("sent home")

This becomes the new core loop:
- Move → costs energy
- Interact → gain work / lose energy / gain stress
- Reach work target → win
- Hit 0 energy → lose

========================================
STEP 1 — ADD WORK SYSTEM
========================================

Introduce a new run-level stat:

- workDone: number
- workTarget: number

Implementation:

- Initialize workDone = 0 at run start
- Define a simple starting workTarget (e.g. 20 or 25)

Add to GameScene (or equivalent run state):
- this.workDone
- this.workTarget

========================================
STEP 2 — WIN CONDITION
========================================

Replace current win logic:

OLD:
- reaching exit tile triggers win

NEW:
- when workDone >= workTarget → trigger win

Implementation details:

- Add a function like:
  checkForWin(): void

- Call it after any action that modifies workDone

- On win:
  - stop input
  - show a simple message in footer: "Work day complete"
  - transition to end-of-run flow (reuse existing if present)

IMPORTANT:
- Do NOT remove exit tile yet unless necessary
- Exit can remain but should NOT trigger win anymore

========================================
STEP 3 — MOVEMENT COSTS ENERGY
========================================

Modify movement logic:

- Every successful move costs:
  player.energy -= 1

Where:
- Only apply cost if movement actually happens (not blocked)

========================================
STEP 4 — PREVENT MOVEMENT AT 0 ENERGY
========================================

Before moving:

If player.energy <= 0:
- do not move
- optionally update footer status: "Too exhausted"

========================================
STEP 5 — LOSS CONDITION ("SENT HOME")
========================================

Define loss condition:

- If player.energy <= 0 → run ends in failure

Implementation:

- After applying movement cost OR after any action:
  checkForLoss()

Function:
  checkForLoss(): void

Behavior:
- If energy <= 0:
  - stop input
  - set state to "lost"
  - footer message: "Sent home early"
  - trigger end-of-run flow

========================================
STEP 6 — UI UPDATES (MINIMAL)
========================================

Update HUD:

- Show work progress:
  e.g. "Work: 8 / 25"

Keep it simple for now (text is fine).

Footer:
- On win → "Work day complete"
- On loss → "Sent home early"

Do NOT redesign UI in this step.

========================================
STEP 7 — DO NOT OVERREACH
========================================

Do NOT:
- rebalance all numbers yet
- add new event types
- change perks
- implement multi-floor
- remove exit tile system entirely (yet)

This step is ONLY about:
- work system
- energy pressure
- win/loss conditions

========================================
DEFINITION OF DONE
========================================

- Movement reduces energy by 1
- Player cannot move at 0 energy
- Player loses when energy hits 0
- workDone/workTarget exist
- Run ends in win when workDone >= workTarget
- HUD shows work progress
- Footer shows win/loss messages

========================================
AFTER IMPLEMENTATION
========================================

Summarize:
1. Where workDone/workTarget live
2. Where movement cost was applied
3. Where win/loss checks are triggered
4. Any assumptions made about existing systems