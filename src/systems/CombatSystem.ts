import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";

/**
 * Legacy bump-combat resolution (synchronous). Not used for normal enemy tiles
 * after the office-encounter pivot; kept for possible future boss / special tiles.
 */
export function resolveCombat(
  player: Player,
  enemy: Enemy,
  damagePerHit: number
): void {
  console.log("Combat started");
  while (enemy.hp > 0 && player.energy > 0) {
    enemy.hp -= damagePerHit;
    console.log("Player hit enemy");
    if (enemy.hp <= 0) break;
    player.energy -= enemy.damage;
    if (enemy.stressPerHit > 0) {
      player.stress = Math.max(0, player.stress + enemy.stressPerHit);
    }
    console.log("Enemy hit player");
  }
  if (enemy.hp <= 0) console.log("Enemy defeated");
  if (player.energy <= 0) console.log("Player defeated");
}
