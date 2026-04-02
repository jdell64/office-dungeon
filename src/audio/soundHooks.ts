import Phaser from "phaser";

/** Loader keys in `GameScene.preload` → `public/audio/{name}.ogg|.mp3`. */
let sceneRef: Phaser.Scene | null = null;
/** Mirrors M-key mute; WebAudio `sound.mute` getter can lag gain in some browsers. */
let sessionMuted = false;

export function setAudioScene(scene: Phaser.Scene): void {
  sceneRef = scene;
}

export function setSessionAudioMute(muted: boolean): void {
  sessionMuted = muted;
}

function play(
  key: string,
  config?: Phaser.Types.Sound.SoundConfig
): void {
  const s = sceneRef;
  if (!s || s.sound.mute || sessionMuted) return;
  if (!s.cache.audio.exists(key)) return;
  s.sound.play(key, { volume: 0.45, ...config });
}

export function playMoveSfx(): void {
  play("sfx_move", { volume: 0.32 });
}

export function playCombatSfx(): void {
  play("sfx_combat", { volume: 0.42 });
}

export function playHurtSfx(): void {
  play("sfx_hurt", { volume: 0.4 });
}

export function playEventChoiceSfx(): void {
  play("sfx_choice", { volume: 0.38 });
}

export function playRewardSfx(): void {
  play("sfx_reward", { volume: 0.44 });
}

export function playVictorySfx(): void {
  play("sfx_victory", { volume: 0.5 });
}

export function playGameOverSfx(): void {
  play("sfx_gameover", { volume: 0.48 });
}
