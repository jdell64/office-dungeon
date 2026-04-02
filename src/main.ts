import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./data/layouts";
import { loadMetaState } from "./meta/metaStorage";
import { loadMonetizationState } from "./meta/monetizationStorage";
import { loadSessionStats } from "./meta/sessionStats";
import { GameScene } from "./scenes/GameScene";

loadMetaState();
loadSessionStats();
loadMonetizationState();

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1a1a2e",
  parent: "game-root",
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
