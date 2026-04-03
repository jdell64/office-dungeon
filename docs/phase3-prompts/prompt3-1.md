We are working on the current Office Dungeon Phaser prototype.

Goal for this chunk:
Implement Phase 3 Chunk 1 + Chunk 2 together:

1. Fix run viability so runs are fair and winnable
2. Turn a run into a multi-floor "work day"

Context from the current codebase:

* Movement currently costs 1 energy every step in `tryStep`, which is making runs too short and too punishing. This is in `GameScene.ts`. 
* The player model is currently just `energy` and `stress` in `Player.ts`. 
* Layouts already exist and can be reused as floors. They define start energy, max energy, stress, reward tile, events, enemies, and exit. `LAYOUTS` is already defined in `layouts.ts`. 
* The game already has reward pickup logic, work progress, run win/loss, relics, meta credits, and session stats in `GameScene.ts`, `relics.ts`, `sessionMeta.ts`, and `sessionStats.ts`.    

What I want implemented:
We are not adding a giant new content system yet. This is a systems pass.

Main design decisions:

* Movement should no longer always cost 1 energy per tile.
* A run should consist of multiple floors in one "day".
* Energy and stress should carry across floors.
* Finishing a floor should feel like progress, not like the run just ends.
* We should keep the implementation simple and use existing layouts and systems as much as possible.

Detailed requirements:

1. Energy system changes

* Remove the default "movement always costs 1 energy" behavior from normal walking.
* Instead, movement should be free.
* Energy should now mainly be lost through:

  * encounters
  * event choices
  * future explicit systems
* Keep energy as a core resource, but not as a passive movement tax.
* Preserve the existing loss condition where hitting 0 energy can still end the run, but only after actual bad decisions or bad outcomes, not just walking around.
* Keep reward/event energy gains meaningful.

2. Multi-floor day structure

* A run should now consist of 3 floors by default.
* Reuse existing layouts from `LAYOUTS`.
* At the start of a new run, choose a sequence of 3 layouts.
* If a layout is pinned via URL for debugging, preserve that behavior as reasonably as possible. If needed, keep pinned layout for floor 1 only and choose the remaining floors normally, or keep all 3 pinned if that is easier and cleaner. Choose the cleanest implementation and note it in code comments.
* Track:

  * current floor number
  * total floors
  * chosen floor layout sequence
* The player should carry over:

  * current energy
  * current stress
  * relic effects / meta state
  * work progress
* The player should NOT reset to fresh run stats between floors.
* Enemies, reward, events, and grid state should reset per floor as expected.

3. Floor completion flow

* Reaching the exit should no longer immediately win the whole run.
* Reaching the exit should:

  * require that the floor objective is complete
  * then either advance to the next floor or, if on the final floor, win the run
* Floor objective:

  * For now, keep using work progress
  * Each floor should contribute toward the total run objective, not reset work to 0
* Keep this simple:

  * Either divide the existing target across floors, or keep the global target and just let the player progress through floors as they accumulate work.
* I prefer the cleanest and most maintainable solution, even if it is not the fanciest.

4. Floor transition UX

* Add a lightweight floor transition message/overlay.
* When a floor is completed, show a brief message like:

  * "Floor Complete"
  * "Heading to Floor 2 of 3"
* Then load the next floor cleanly.
* On the final floor, finishing should trigger the existing victory flow.

5. HUD/debug updates

* Update HUD so the player can see floor progress clearly.
* Add floor info to the HUD/debug state, for example:

  * Floor 1/3
* Update debug state publishing so floor index / total floors / active layout sequence are visible.
* Keep test mirrors updated if needed so automated testing does not become misleading.

6. Fairness tuning

* Because movement is now free, rebalance only minimally for this pass.
* Do not redesign all encounters or layouts yet.
* Make the smallest code changes necessary to produce:

  * noticeably longer runs
  * fairer runs
  * real multi-floor progression

Implementation guidance:

* Prefer extending `GameScene` rather than introducing a large architecture rewrite.
* Reuse `setupRunEntities` if possible, but separate "new floor setup" from "full new run setup" if that makes the code cleaner.
* Avoid breaking existing relic/meta/session systems.
* Keep the code easy to iterate on in the next chunk.
* Add clear comments where behavior changed from "single-floor run" to "multi-floor run".
* If you need small helper methods or types, add them.
* Do not do a huge refactor unless it clearly improves maintainability.

Acceptance criteria:

* Walking around the map does not consume energy anymore.
* A run spans 3 floors.
* Exiting floor 1 advances to floor 2 instead of ending the run.
* Energy and stress carry across floors.
* Work progress carries across floors.
* Final victory only happens after completing the final floor.
* HUD/debug output clearly shows floor progression.
* The game still starts, plays, and ends cleanly.

Output format:

1. First, explain your implementation plan briefly.
2. Then list the files you will change.
3. Then make the code changes.
4. Then summarize what changed and any follow-up risks or cleanup items.

Important:

* Keep this as a pragmatic vertical slice.
* Do not add shops, branching map logic, or new content systems yet.
* Focus on fairness + multi-floor progression only.
