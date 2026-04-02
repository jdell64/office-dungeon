We are extending the new core loop:

- Movement costs energy
- Player must complete WORK to win
- Energy depletion = loss

Now we make encounters (events, enemies, rewards) actually drive progress and decisions.

Do NOT add new systems. Reuse existing structures. Keep implementation simple.

========================================
GOAL
========================================

- All meaningful interactions generate WORK
- Events present clear choices with visible outcomes
- Player must engage with the board to win

========================================
STEP 1 — EVENTS GENERATE WORK
========================================

Update event resolution logic:

Currently events likely:
- modify energy/stress
- maybe give small effects

Add:

- Every event choice must modify workDone

Example baseline:
- safe choice → +3 to +5 work
- risky choice → +6 to +10 work (with downside)

Implementation:

- When resolving an event:
  this.workDone += X

Call:
- checkForWin() after applying work

IMPORTANT:
- Do NOT make work passive (no work per movement)
- Work only comes from interactions

========================================
STEP 2 — ENEMIES GENERATE WORK
========================================

After defeating an enemy:

Add:
- this.workDone += enemyWorkValue

Keep it simple:
- define a fixed value (e.g. 6 or 8)

Hook into existing combat resolution:
- after enemy.hp <= 0

Call:
- checkForWin()

========================================
STEP 3 — REWARDS CAN GENERATE WORK (OPTIONAL BUT RECOMMENDED)
========================================

Update reward pickup logic:

- Some rewards give work
- Others give energy or stress relief

Simple version:
- reward gives either:
  +energy
  OR +work

Do NOT overcomplicate.

========================================
STEP 4 — SHOW OUTCOMES IN EVENT UI
========================================

This is critical.

Update event choice buttons so they show outcomes clearly.

OLD (bad):
- "One modest cup"
- "Double-shot greed"

NEW (good):
- "One modest cup"
  +2 energy, +4 work

- "Double-shot greed"
  +5 energy, +8 work, +2 stress

Implementation:

- Modify event data structure to include:
  - label
  - effects (energy, stress, work)

- Render these effects in button text

Formatting can be simple:
- one line or two lines
- no fancy styling required

========================================
STEP 5 — REMOVE DEBUG-LIKE TEXT
========================================

Remove:
- "Keys: Y/N"
- any duplicate control hints if buttons exist

Goal:
- UI should feel intentional, not debug

========================================
STEP 6 — ENSURE EVENTS ARE REQUIRED FOR PROGRESSION
========================================

Because:
- work only comes from interactions

Player should NOT be able to:
- reach win condition without engaging events/enemies

Do NOT enforce this with hard locks yet.
It should emerge naturally from:
- movement cost
- work requirement

========================================
STEP 7 — MINIMAL NUMBER TUNING
========================================

Set initial rough values:

- workTarget: ~20–30
- event safe: +4 work
- event risky: +8 work (with downside)
- enemy: +6–10 work
- reward: +3–6 work OR +2–3 energy

Do NOT try to perfectly balance.
Just make differences noticeable.

========================================
STEP 8 — CALL WIN CHECKS CONSISTENTLY
========================================

After:
- event resolution
- enemy defeat
- reward pickup

Always call:
- checkForWin()

========================================
DEFINITION OF DONE
========================================

- Events give work
- Enemies give work
- Rewards optionally give work
- Event choices show explicit outcomes
- Player must interact to reach workTarget
- UI no longer shows debug control hints

========================================
AFTER IMPLEMENTATION
========================================

Summarize:
1. Where work is awarded (events, enemies, rewards)
2. How event choices are structured
3. How outcomes are displayed in UI
4. Any assumptions made about event data structures