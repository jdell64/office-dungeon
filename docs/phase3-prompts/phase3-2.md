We are continuing development on the Office Dungeon Phaser prototype.

Goal for this chunk:

1. Make events the primary driver of gameplay variety
2. Add visible progression hooks so the player wants to do another run

This is a vertical slice. Do NOT overbuild systems. Keep it simple and extend what already exists.

---

Context from current codebase:

* Events are defined in `layouts.ts` as `EventTypeDef` with:

  * choice events (Y/N)
  * instant events
  * energy/stress/work deltas
* Events are already placed on tiles and resolved during gameplay. 
* Relics already interact with event choices (e.g., aggressive_reply). 
* Meta progression exists:

  * credits
  * relic unlocks
  * relic slots
  * wins/losses tracking  
* Multi-floor runs are now implemented.

---

PART 1 — Event System Expansion

Goal:
Increase run-to-run variety and make events feel meaningful.

### Requirements

1. Add event tags

* Extend `EventTypeDef` to include optional tags:

```ts
tags?: string[]
```

Examples:

* "safe"
* "risky"
* "energy"
* "stress"
* "credits"
* "work"

Keep it simple (string array).

---

2. Add at least 10 new events

Add a mix of:

* energy recovery events
* high risk / high reward events
* stress manipulation events
* credit-focused events

Examples of patterns (do not copy literally, but follow structure):

* "Coffee Break":
  +energy, +stress
* "Crunch Time":
  +work, +stress, -energy
* "Slack Off":
  -work, -stress, +energy
* "Side Project":
  +credits, +stress
* "HR Check-in":
  -stress, small +work

Use both:

* choice events
* instant events

---

3. Add simple event weighting by floor

Goal:
Make later floors feel harder and more chaotic.

Implementation:

* Do NOT redesign the entire system.
* Add a lightweight filter when assigning events to tiles:

  * Floor 1 → prefer "safe" events
  * Floor 2 → balanced
  * Floor 3 → more "risky" / "stress" events

Simple approach:

* When selecting from `EVENT_POOL_IDS`, filter or weight based on tags and current floor index.

Do not overengineer weighting. A simple bias is enough.

---

4. Add conditional event spawning (lightweight)

Add optional conditions:

```ts
conditions?: {
  minStress?: number
  maxEnergy?: number
}
```

Use this sparingly for a few events:

* Example:

  * only appears if stress >= 4
  * only appears if energy <= 2

Apply conditions when selecting events for a tile.

---

Acceptance Criteria (Events):

* At least 10 new events added
* Events visibly differ in tone and outcomes
* Floor 1 feels safer than Floor 3
* Some events only appear in certain player states
* Player pauses to think before choosing

---

PART 2 — Visible Progression Hooks

Goal:
Make the player aware of what they are working toward.

---

1. Add “Next Unlock” visibility (Title or HUD)

Use existing meta systems:

* credits
* relic costs
* slot unlock rules 

Add a function like:

```ts
getNextProgressionGoal(): string | null
```

Examples:

* "3 more credits to unlock ☕ Extra Coffee"
* "Win 2 more runs to unlock relic slot"

You already have:

* `getNextRelicUnlockTease()`
  Use or extend it.

---

2. Show progression info in UI

Minimum requirement:

* Show a simple text line on:

  * title screen OR
  * top HUD OR
  * end-of-run summary

Do NOT build a full UI system.
Just display text.

---

3. End-of-run summary improvement

When a run ends:

* Show:

  * credits earned this run
  * total credits
  * next unlock progress

Keep it simple (text only is fine).

---

Acceptance Criteria (Progression):

* Player sees what they are working toward
* After losing, player has a reason to run again
* Progression messaging updates correctly when credits/wins change

---

Implementation Guidance

* Keep everything inside existing architecture where possible
* Extend `layouts.ts` for events
* Modify event selection logic where events are assigned to tiles
* Avoid large refactors
* Prefer small helper functions over big systems
* Add comments where logic depends on floor index or player state

---

Output format:

1. Brief implementation plan
2. Files to be modified
3. Code changes
4. Summary of behavior changes
5. Any follow-up improvements (short list)

---

Important constraints:

* Do NOT add shops yet
* Do NOT redesign the map system
* Do NOT add new combat systems
* Focus only on:

  * event depth
  * progression visibility

This is about making runs feel different and giving players a reason to come back.
