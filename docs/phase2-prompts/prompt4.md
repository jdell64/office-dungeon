We are adding the meta progression loop to Office Dungeon.

Current state:
- Movement costs energy
- Player gains work through interactions
- Run ends on:
  - workTarget reached (win)
  - energy <= 0 (loss)

Now we need:
- satisfying end-of-run feedback
- credits based on performance
- clear connection to perk progression

Do NOT overengineer.
Reuse existing meta systems where possible.

========================================
GOAL
========================================

After every run:
- show a clear summary
- award credits based on performance
- reinforce the loop:
  play → earn → unlock → play again

========================================
STEP 1 — ADD RUN SUMMARY DATA
========================================

Track minimal stats during a run:

- workDone (already exists)
- workTarget (already exists)
- runOutcome: "win" | "loss"
- optional:
  - turnsTaken (if easy to track)
  - remainingEnergy (optional)

Ensure this data is available at run end.

========================================
STEP 2 — CREATE END-OF-RUN SUMMARY SCREEN
========================================

After win or loss, transition to a simple summary view.

Display:

- Title:
  - "Work Day Complete" (win)
  - "Sent Home Early" (loss)

- Work:
  e.g. "Work Completed: 18 / 25"

- Credits earned (see next step)

- Optional flavor line (simple, 1 line max):
  - win: "You made it through the day."
  - loss: "You burned out before finishing."

- Prompt:
  - "Press any key / tap to continue"

Do NOT build a complex UI.
Simple text is fine.

========================================
STEP 3 — CREDIT REWARD FORMULA
========================================

Tie credits to performance.

Simple baseline formula:

- baseCredits = floor(workDone / 2)

- if win:
    baseCredits += 5

Optional (only if easy):
- small bonus for remaining energy:
    + floor(remainingEnergy / 2)

Final:
- creditsEarned = max(1, baseCredits)

Implementation:

- call addOfficeCredits(creditsEarned)

(Use existing meta system)
:contentReference[oaicite:0]{index=0}

========================================
STEP 4 — DISPLAY CREDIT EARNED
========================================

On summary screen, clearly show:

- "Credits Earned: +X"

Make this visually obvious (even with simple text).

========================================
STEP 5 — HOOK INTO EXISTING META SYSTEM
========================================

You already have:
- officeCredits
- perk unlock/equip
:contentReference[oaicite:1]{index=1} :contentReference[oaicite:2]{index=2}

Ensure:
- credits are persisted after run
- no duplication or double-awarding occurs

========================================
STEP 6 — RETURN FLOW TO TITLE / META SCREEN
========================================

After summary screen:

- return to title/meta screen
- show updated credits
- show available perks

Do NOT skip this step:
The player must see:
"I earned X → now I can unlock something"

========================================
STEP 7 — LIGHT TITLE SCREEN IMPROVEMENT
========================================

Without full redesign:

Ensure title screen shows clearly:

- current credits
- 3 perks:
  - name
  - cost
  - locked/unlocked state
  - equipped state

Behavior:
- if enough credits → allow unlock
- if unlocked → allow equip

Use existing logic.

Do NOT redesign layout heavily.
Just make the information clear.

========================================
STEP 8 — PREVENT MULTIPLE END TRIGGERS
========================================

Ensure:
- win/loss triggers only once
- summary screen is shown only once
- credits are awarded only once

Guard with a simple state flag if needed.

========================================
STEP 9 — KEEP IT FAST
========================================

The loop should feel quick:

- run ends
- summary appears
- input continues
- back to title

No long delays or transitions.

========================================
DEFINITION OF DONE
========================================

- run ends with a summary screen
- summary shows outcome, work, credits earned
- credits scale with performance
- credits are persisted correctly
- player returns to title/meta screen after summary
- title screen reflects updated credits/perks

========================================
AFTER IMPLEMENTATION
========================================

Summarize:
1. how credits are calculated
2. where summary screen is implemented
3. how run-end flow transitions to meta screen
4. any assumptions about existing systems