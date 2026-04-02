Phase 1 — Lock the Core Loop (must feel good)
1. Replace Exit Win Condition with Work System

Goal:
Introduce workDone / workTarget and remove “reach exit = win”

Why:
This is the foundation of your new game identity.

Changes:

Track workDone
Define workTarget
UI: show progress bar in HUD
Win = workDone >= target
2. Make All Content Feed Work

Goal:
Everything meaningful contributes to progress

Why:
Prevents “skip everything” optimization

Changes:

events → give work
enemies → give work
rewards → sometimes give work
exit → becomes optional or removed
3. Enforce Movement Cost (Energy Pressure)

Goal:
Every move matters

Why:
Creates tension and routing decisions

Changes:

-1 energy per move
block movement at 0 energy
trigger “sent home” loss state
4. Rebalance Numbers (Critical)

Goal:
Make decisions non-trivial

Why:
Right now numbers are too small → no tension

Changes:

events: ±3–10 ranges
enemies: meaningful cost/reward
rewards: impactful
tune workTarget vs energy
5. Force Interaction via Layouts

Goal:
Player cannot avoid engagement

Why:
Fixes biggest structural flaw

Changes:

blocked tiles (you’re already doing this)
choke points
content placed on main routes
Phase 2 — Make Decisions Feel Good
6. Upgrade Event UX (Explicit Outcomes)

Goal:
Turn events into real decisions

Why:
Currently guessing, not choosing

Changes:

show outcomes on buttons
remove debug text
add tone (safe vs risky)
7. Add Light Variety to Events

Goal:
Avoid repetition fatigue

Why:
Events are your main content

Changes:

~10–15 events
mix:
safe vs risky
energy vs stress vs work
no new systems, just content
8. Improve Tile Identity (Clarity Pass)

Goal:
Make board readable at a glance

Why:
Reduces cognitive load, increases speed

Changes:

better sprites (you’re planning this)
player stands out
blockers clearly distinct
event/reward/enemy visually unique
Phase 3 — Complete the Run Loop
9. End-of-Run Summary Screen

Goal:
Give closure + feedback

Why:
Makes runs feel meaningful

Changes:

show:
work completed
credits earned
cause of end (burnout / success)
simple UI
10. Credit Rewards + Scaling

Goal:
Tie performance to progression

Why:
Drives replayability

Changes:

credits = function(workDone)
maybe bonus for success vs failure
11. Strengthen Perk Impact

Goal:
Make meta progression noticeable

Why:
Unlocks need to feel meaningful

Changes:

perks noticeably change runs
e.g.:
+2 max energy (already exists)
reduced stress gain
better event outcomes

(You already have the system —this is tuning, not building)

Phase 4 — Add Depth (but stay lean)
12. Introduce Floor Progression (Optional but strong)

Goal:
Extend runs without bloating one map

Why:
Solves “runs feel short”

Changes:

reaching workTarget → next floor
carry energy/stress forward
increase difficulty slightly
13. Difficulty Scaling Within Run

Goal:
Create a second act

Why:
Avoid flat runs

Changes:

later content hits harder
or higher work reward but higher risk

(You already have difficulty helpers —reuse that mindset)

14. Add One “Spike” Mechanic

Goal:
Introduce occasional high-stakes moments

Why:
Breaks monotony

Examples:

boss encounter
forced event
“urgent task” tile

Keep it rare.

Phase 5 — Polish What Matters
15. UI Tightening Pass

Goal:
Make it feel like a real game

Why:
You already improved structure—this refines it

Changes:

better spacing
clearer hierarchy
footer feels intentional
remove all debug-like text
What this sequence does

If you follow this order:

Phase 1 → game becomes playable
Phase 2 → game becomes engaging
Phase 3 → game becomes replayable
Phase 4 → game gains depth
Phase 5 → game feels finished
Important constraint

At every step:

ship something playable

Don’t batch 5 steps before testing.

If you want next

I’d generate prompts for:

Step 1–3 together (core loop pivot)
because they’re tightly coupled.

Then go step-by-step after that.

That’s the fastest path without breaking everything.