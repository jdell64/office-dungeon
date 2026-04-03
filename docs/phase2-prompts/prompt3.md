We have already pivoted Office Dungeon toward:
- movement costs energy
- workDone/workTarget as the run goal
- interactions generating work

Now we need the board/layout design to support that loop.

Current problem:
- boards are too open
- too many interactions are avoidable
- shortest paths are too clean
- the player can often route around the interesting decisions

This prompt is about LEVEL / LAYOUT PRESSURE.
Do not introduce procedural generation yet.
Use hand-authored layouts and blocked tiles.

========================================
GOAL
========================================

Make layouts force more meaningful routing and interaction.

The player should feel:
- detours cost energy
- some encounters are on the main path
- blockers shape the route
- the board feels like an office space, not an empty checkerboard

========================================
STEP 1 — USE BLOCKED TILES DELIBERATELY
========================================

Assuming blocked tiles / walls now exist or are being added:

Update layouts so blocked tiles are used to create:
- hallways
- desk clusters
- narrow passages
- room-like sections
- route choices

Avoid giant open spaces.

Do NOT make layouts maze-like or frustrating.
The goal is clarity + pressure, not confusion.

========================================
STEP 2 — REDESIGN 3–5 LAYOUTS
========================================

Take several current layouts and improve them by hand.

For each improved layout:
- shortest meaningful path should cross or come near content
- avoid having the player spawn on a totally open board
- avoid putting all encounters off in dead corners
- create at least one meaningful routing decision

Examples:
- break room tucked behind desks
- event placed in a corridor
- enemy/problem controlling a central route
- reward slightly off-path but tempting

========================================
STEP 3 — REDUCE EMPTY CELLS
========================================

Too many empty tiles makes the game feel flat.

Adjust layouts so:
- there is less useless open space
- each board section feels authored
- empty space is intentional, not default

Do not remove all breathing room.
Just reduce “nothing squares.”

========================================
STEP 4 — PRESERVE PLAYABILITY
========================================

Every updated layout must still:
- have a valid traversable path
- not trap the player unfairly
- not place blockers on player start / reward / event / objective tiles
- feel readable

If useful, add light runtime warnings for invalid overlap or obviously broken layouts.
Do NOT build a large validation system.

========================================
STEP 5 — SUPPORT THE WORK LOOP
========================================

Given the new work-based win condition:

Design layouts so the player is encouraged to interact enough to reach workTarget.
The layout should naturally support:
- encountering events
- considering detours for reward/work
- feeling movement pressure

Do NOT solve this with hard locks yet.
Solve it with topology first.

========================================
STEP 6 — KEEP CONTENT DISTRIBUTION INTENTIONAL
========================================

For the updated layouts:
- place at least one “main route” interaction
- place at least one optional but tempting interaction
- use blockers to make the choice visible

This is important:
We want "choose what to engage with"
NOT "skip everything for free"

========================================
STEP 7 — NO PROC GEN YET
========================================

Do NOT implement procedural generation in this step.

If useful, leave comments / notes on what patterns seem reusable later, such as:
- corridor layout
- central desk cluster
- split path with reward on one side
- conference room blocker shape

But do not build generators yet.

========================================
DEFINITION OF DONE
========================================

- 3–5 layouts are improved using blocked tiles
- layouts feel less open
- shortest routes are more interesting
- some content is naturally encountered instead of trivially skipped
- the board better supports the work/energy loop

========================================
AFTER IMPLEMENTATION
========================================

Summarize:
1. which layouts were updated
2. what blocker/topology patterns were used
3. how the new routes force or encourage interaction
4. what reusable layout patterns could later inform proc gen