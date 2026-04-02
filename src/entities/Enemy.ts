import type { EnemyTypeDef } from "../data/layouts";

export class Enemy {
  readonly typeId: string;
  readonly name: string;
  readonly damage: number;
  readonly stressPerHit: number;
  readonly color: number;
  readonly gridX: number;
  readonly gridY: number;
  hp: number;

  constructor(
    type: EnemyTypeDef,
    gridX: number,
    gridY: number,
    overrides?: { damage?: number; stressPerHit?: number }
  ) {
    this.typeId = type.id;
    this.name = type.name;
    this.damage = overrides?.damage ?? type.damage;
    this.stressPerHit =
      overrides?.stressPerHit ?? (type.stressPerHit ?? 0);
    this.color = type.color;
    this.gridX = gridX;
    this.gridY = gridY;
    this.hp = type.hp;
  }
}
