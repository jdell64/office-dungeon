import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";

/**
 * Resolves combat between player and enemy synchronously (mutates both).
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
