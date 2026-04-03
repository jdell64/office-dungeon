Phase 3 = **turn your systems into a *real game loop with depth***
Not adding features randomly — this is where you **lock in retention**.

You’ve likely done:

* Phase 1: core movement + combat + tiles
* Phase 2: basic meta (relics, credits, runs)

Now Phase 3 is:

> “Make players want to do run #20”

---

# Phase 3 Goal

> Create **run identity + strategic depth + replayability**

If Phase 2 made it “playable”,
Phase 3 makes it **addictive**.

---

# Phase 3 Roadmap (ordered, don’t shuffle)

---

## 1. 🧠 Build System (Run Identity)

Right now relics are small modifiers.

You need:

> Runs that feel fundamentally different

You already have relic hooks:

* energy bonus
* stress reduction


That’s good — expand it.

### Add 6–10 stronger relics:

Examples:

* “Burnout Engine”

  * Gain +2 credits per stress gained
* “Overachiever”

  * Double rewards if energy > 4
* “Bare Minimum”

  * Gain rewards when avoiding events

### Requirement:

Each relic should:

* push a *playstyle*
* not just be +1 stats

---

## 2. ⚖️ Stress System Overhaul

Right now stress is just a loss condition.

That’s weak.

Turn it into:

> A *risk resource*

### Add breakpoints:

* 0–3: normal
* 4–6: bad events more likely
* 7+: severe penalties
* max: burnout

### Add mechanics:

* High stress = better rewards (temptation)
* Low stress = safer but slower

Now:

> Player is constantly making tradeoffs

---

## 3. 🗺️ Map Structure (Critical)

Right now it's a grid sandbox.

You need:

> Directed decision-making

### Add:

* Visible branching paths
* Tile previews

Example:

```
Start
 ├── Fight → Elite → Reward
 └── Event → Rest → Shop
```

### Why:

Players need to think:

> “What path fits my build?”

Without this, replayability dies.

---

## 4. 🎲 Event Depth (Content Engine)

You already have event structure:

* choices
* deltas (energy/stress/work)


This is your strongest system.

Now scale it.

### Add:

* 20–30 events minimum
* Tags (aggressive, safe, risky)

You already support this with relic interactions:

* aggressive_reply relic


Lean into that.

### Add:

* Rare events
* Conditional events (based on stress, relics, etc.)

---

## 5. 🏆 Run Objective System

Right now it’s vague survival.

Make it explicit:

### Core goal:

* Fill “work progress” bar

### Add:

* Optional objectives:

  * “Finish under X stress”
  * “Defeat all elites”
  * “Take no breaks”

Now runs feel:

> Directed and replayable

---

## 6. 🛒 Shop + Economy Layer

You already have:

* credits
* relic costs


But missing:

> In-run spending decisions

### Add shop tiles:

* Buy relics
* Heal stress
* Restore energy

Now player decisions become:

> “Do I save or spend?”

---

## 7. 💥 Difficulty Scaling

Right now difficulty is static.

Add:

### Per-run scaling:

* Enemies scale by floor/depth
* Events get harsher

### Meta scaling:

* Unlock harder “floors”
* New enemy types

You already have enemy defs:


Extend them with:

* scaling multipliers
* variants

---

## 8. 🔁 Meta Progression Expansion

You already track:

* wins
* runs


Use it.

### Add unlocks:

* New relics
* New events
* New layouts
* New starting modifiers

### Example:

* “Win 5 runs → unlock Hardcore Mode”

---

## 9. ⚡ Feedback + Juice Pass

This is not optional.

Add:

* hit effects
* stress spikes (visual)
* reward bursts

Right now it feels like:

> numbers changing

It needs to feel like:

> consequences happening

---

## 10. 🎯 Session Framing

Make runs feel like runs.

### Add:

* “Day 1 → Day 5” structure
* End-of-run summary:

  * stats
  * build recap
  * performance

---

# What Phase 3 looks like when done

Player experience becomes:

1. Picks relics → “I’m doing a stress build”
2. Sees map → plans path
3. Hits events → makes meaningful choices
4. Builds synergy → feels stronger/weirder
5. Reaches end → win or burnout
6. Unlocks something → starts again

---

# What to NOT do

Avoid:

* adding more layouts (you already have enough)
* adding more basic enemies
* tweaking numbers endlessly

Those won’t fix the core issue.

---

# If you want the highest ROI

Do these first:

1. **Map branching**
2. **Stronger relics**
3. **Stress as risk system**
4. **10+ new events**

That’s the inflection point.

---

If you want, I can:

* design your first “real” 10 relics (build-defining)
* or rewrite your event system into something that scales cleanly

That’s where this becomes sticky instead of shallow.


You’re hitting two separate problems:

1. **Runs feel too short + unwinnable → frustrating**
2. **Even if fixed, there’s no long-term hook → no reason to replay**

Both need to be solved together or the game still won’t stick.

---

# 1. Energy problem (this is currently breaking your game)

Right now:

> Energy = movement tax → guaranteed failure over time

That creates:

* no agency
* no strategy
* no “I could have played better”

That’s bad.

---

## Fix: Energy needs to be *manageable*, not doomed

You want:

> “I ran out because of my decisions”
> NOT
> “I ran out because the system says so”

### Do this:

### A. Add recovery sources (mandatory)

* Rest tiles → +energy
* Some events → +energy
* Shops → buy energy

Right now you only have small restore via rewards  — not enough.

---

### B. Reduce passive drain

Options:

* Movement costs 0 energy (big improvement)
* OR only costs energy when:

  * fighting
  * taking actions

This alone will massively improve feel.

---

### C. Add *energy scaling*

* Early game: forgiving
* Late game: tighter

Right now it’s just flat → feels punishing immediately.

---

### D. Add “last stand” buffer

When energy hits 0:

* Instead of instant loss:

  * convert damage → stress
  * or slow movement

This creates:

> tension instead of hard stop

---

# 2. Run length (your instinct is correct)

You said:

> more like “life simulator”

Yes — your game *wants* to be session-based, not micro-runs.

---

## Target structure

### Ideal run:

* 10–20 minutes
* 3–5 “phases” (morning → evening)

Right now you have:

> 1 phase → ends too fast

---

## Fix: Add “Day Progression”

### Structure:

* Day = multiple floors/maps
* Each floor = current layout system

You already have layouts:


Chain them.

### Example:

* Floor 1: easy (low stress)
* Floor 2: medium
* Floor 3: hard

Now:

> Run feels like a journey

---

# 3. The missing hook (this is the real issue)

You said:

> no progression that makes me want to keep playing

Correct.

You have systems (credits, relics), but not a **motivating loop**.

---

# Fix: Add “Run Identity + Unlock Pressure”

Right now:

* You finish a run → nothing exciting changes

You need:

> “One more run because I almost unlocked X”

---

## Add these 3 hooks:

### A. Visible unlock track

Instead of hidden meta:

Show:

* “Next relic unlock in 3 credits”
* “Win 3 runs → unlock new job”

You already track credits + wins  
Just surface it.

---

### B. New starting builds

Let player choose:

* High energy / low rewards
* High stress / high rewards

Now runs feel different immediately.

---

### C. Escalating difficulty tiers

After first win:

* Unlock “Hard Mode”

Now player thinks:

> “I beat it… but can I beat harder?”

---

# 4. What your game *should feel like*

Right now:

> short, constrained, deterministic

Target:

> “I’m managing my day, pushing my luck, building something, and maybe I can pull this off”

---

# 5. Concrete next steps (do these, no distractions)

### Step 1 — Fix energy immediately

* Remove movement cost OR reduce it heavily
* Add 2–3 recovery sources

If you don’t do this first, nothing else matters.

---

### Step 2 — Chain layouts into a “day”

* 3 floors per run
* increasing difficulty

---

### Step 3 — Add 5 strong events that give energy

Examples:

* “Coffee Break” → +2 energy, +1 stress
* “Power Nap” → +3 energy, skip next turn

---

### Step 4 — Add visible progression UI

* show unlocks
* show next milestone

---

# Hard truth

Right now:

> You don’t have a retention problem — you have a *run viability* problem

Players won’t care about progression if runs feel unfair or too short.

Fix energy + run length first.

---

If you want, next I’d:

* redesign your exact energy formula based on your current numbers
* or sketch your full “Day system” using your existing layouts

That’s where this turns from prototype → actual game.



🚧 PHASE 3 — “Make it Addictive”
🧩 CHUNK 1 — Fix Core Run Viability (Energy + Flow)
Goal

Make a run winnable and skill-driven, not doomed.

Changes
Remove or reduce movement energy cost
Add 2–3 reliable energy recovery sources
Add soft-fail (energy → stress conversion)
AC (Acceptance Criteria)
Player can complete a run without perfect play
Player can identify why they lost
Average run length ≥ 5 minutes
Energy never feels like “inevitable death”
Implementation Notes
Modify Player.energy consumption rules
Add:
Rest tile
Energy events
Shop restore
Milestone
“First fair run”
You can win 2/5 runs consistently

🧩 CHUNK 2 — Introduce Day Structure (Run Length)
Goal

Turn runs into multi-stage journeys

Changes
Chain 3 layouts per run
Add “floor complete → next floor” transition
Slight difficulty scaling per floor
AC
Run lasts 10–15 minutes
Player feels escalation across floors
Winning requires sustained performance
Implementation Notes
Reuse LAYOUTS
Add:
currentFloorIndex
Reset entities, carry over:
energy
stress
relics
Milestone
“First full day completed”

🧩 CHUNK 3 — Event System Expansion (Core Gameplay)
Goal

Make decisions the main gameplay

Changes
Add 10–15 new events
Add tags (risky, safe, aggressive)
Add conditional events (based on stress, relics)
AC
Every run has different event combinations
Player pauses to think before choosing
Events meaningfully impact outcome
Implementation Notes

You already support:

choice vs instant events

Add:

tags?: string[]
conditions?: { minStress?: number; hasRelic?: string }
Milestone
“Runs feel different without changing map”

🧩 CHUNK 4 — Build System (Relic Depth)
Goal

Create run identity

Changes
Add 6–10 new relics
Add synergy hooks (stress-based, energy-based)
AC
Player can describe their build:
“I’m doing high-stress build”
Relics influence decisions mid-run
Some relics feel “run-defining”
Implementation Notes

Extend:

RelicEffect

Add effects like:

{ kind: "stress_to_energy" }
{ kind: "high_stress_bonus" }
Milestone
“Two runs feel completely different”
🧩 CHUNK 5 — Map Decisions (Branching Paths)
Goal

Add strategic planning

Changes
Replace free grid wandering with:
branching paths OR
visible node types ahead
AC
Player plans route before moving
Player avoids/targets nodes intentionally
Decisions happen BEFORE movement
Implementation Options
Option A (faster)
Keep grid
Reveal tile types ahead
Option B (better)
Switch to node graph (Slay the Spire style)
Milestone
“Player makes decisions before moving, not after”
🧩 CHUNK 6 — Economy + Shops
Goal

Add resource tension

Changes
Add shop tiles
Allow spending credits mid-run
AC
Player must choose:
save vs spend
Shops affect survival
Implementation Notes

You already have:

credits
relic costs

Add:

energy restore purchase
stress heal purchase
Milestone
“Player regrets purchases or lack of purchases”
🧩 CHUNK 7 — Stress System Rework
Goal

Turn stress into a core risk mechanic

Changes
Add stress tiers:
low / medium / high
Add penalties:
high stress → worse events
Add rewards:
high stress → better rewards
AC
Player intentionally plays risky sometimes
Stress is not just “bad bar”
Implementation Notes

Extend:

event outcomes
enemy effects
Milestone
“Player chooses to stay at high stress sometimes”
🧩 CHUNK 8 — Meta Progression (Hook)
Goal

Create long-term motivation

Changes
Add visible unlock system
Add new unlock categories:
relics
events
layouts
AC
Player knows what they’re working toward
Player says “one more run”
Implementation Notes

You already track:

credits
wins

Add UI:

“Next unlock in X credits”
“Win 3 runs → unlock X”
Milestone
“Player plays again after losing”
🧩 CHUNK 9 — Feedback / Juice
Goal

Make actions feel impactful

Changes
Add:
animations
color feedback
sound cues
AC
Player notices changes instantly
Stress/energy changes feel dramatic
Milestone
“Game feels alive, not like a spreadsheet”
🧩 CHUNK 10 — Run Framing (Polish)
Goal

Make runs feel complete and meaningful

Changes
Add:
run summary screen
stats
build recap
AC
Player understands why they won/lost
Player reflects on build
Milestone
“Run has a satisfying ending”
📊 Suggested Execution Order (don’t deviate)
Chunk 1 — Energy fix (blocking issue)
Chunk 2 — Multi-floor runs
Chunk 3 — Events expansion
Chunk 4 — Relics depth
Chunk 8 — Meta hook (early visibility)
Chunk 5 — Map decisions
Chunk 6 — Shops
Chunk 7 — Stress system
Chunk 9 — Juice
Chunk 10 — Polish