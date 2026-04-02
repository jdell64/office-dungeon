/**
 * Grid layout and bounds. No rendering or input — see GameScene.
 */
export type GridLayout = {
  cols: number;
  rows: number;
  tileSize: number;
};

export class GridSystem {
  readonly cols: number;
  readonly rows: number;
  readonly tileSize: number;

  constructor(layout: GridLayout) {
    this.cols = layout.cols;
    this.rows = layout.rows;
    this.tileSize = layout.tileSize;
  }

  isInBounds(gridX: number, gridY: number): boolean {
    return (
      gridX >= 0 &&
      gridX < this.cols &&
      gridY >= 0 &&
      gridY < this.rows
    );
  }

  /** World coordinates of the center of a tile (Phaser default y-down). */
  gridToWorldCenter(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.tileSize + this.tileSize / 2,
      y: gridY * this.tileSize + this.tileSize / 2,
    };
  }
}
