export class Reward {
  readonly gridX: number;
  readonly gridY: number;
  available = true;

  constructor(gridX: number, gridY: number) {
    this.gridX = gridX;
    this.gridY = gridY;
  }
}
