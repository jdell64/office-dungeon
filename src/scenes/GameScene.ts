import Phaser from "phaser";
import {
  EVENT_POOL_IDS,
  getEnemyType,
  getEventType,
  isChoiceEvent,
  LAYOUTS,
  type LayoutDef,
} from "../data/layouts";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { Reward } from "../entities/Reward";
import { GridSystem } from "../systems/GridSystem";
import { resolveCombat } from "../systems/CombatSystem";
import {
  publishGameDebugState,
  type GameDebugState,
  type ScreenState,
} from "../debug/gameState";
import {
  playCombatSfx,
  playEventChoiceSfx,
  playGameOverSfx,
  playHurtSfx,
  playMoveSfx,
  playRewardSfx,
  playVictorySfx,
  setAudioScene,
  setSessionAudioMute,
} from "../audio/soundHooks";
import { getPerkById, PERKS } from "../meta/perks";
import {
  clearMetaState,
  wasMetaLoadedFromStorage,
} from "../meta/metaStorage";
import {
  addOfficeCredits,
  getEquippedPerkId,
  getNextPerkUnlockTease,
  getOfficeCredits,
  getUnlockedPerkIds,
  tryTitlePerkKey,
} from "../meta/sessionMeta";
import {
  getPremiumNoAdsEnabled,
  setPremiumNoAdsEnabled,
} from "../meta/monetizationStorage";
import {
  getSessionStatsForDebug,
  recordRunEnded,
  recordRunStarted,
} from "../meta/sessionStats";
import {
  cycleDifficulty,
  difficultyLabel,
  energyBonus,
  scaledEnemyDamage,
  scaledStressGain,
  type Difficulty,
} from "../game/difficulty";

const PLAYER_PADDING = 8;
/** Manhattan distance to exit for "So close..." on loss. */
const NEAR_EXIT_DISTANCE = 2;
const COLOR_TILE_A = 0x2a2a3e;
const COLOR_TILE_B = 0x242438;
const COLOR_GRID_LINE = 0x444466;
const COLOR_PLAYER = 0x33ee99;
const COLOR_REWARD = 0xffdd44;
const COLOR_EXIT = 0x7799ff;
const COLOR_EVENT = 0xdd88ee;
/** Subtle floor hints under entity cells (drawn in drawGrid). */
const FLOOR_TINT_ENEMY = 0x883322;
const FLOOR_TINT_EVENT = 0x662266;
const FLOOR_TINT_REWARD = 0x886622;
const FLOOR_TINT_EXIT = 0x334488;
const FLOOR_TINT_ALPHA = 0.18;
const STROKE_WIDTH = 3;
const ENTITY_DEPTH = 8;
const LABEL_DEPTH = 9;
/** Transient float text above tiles (below HUD). */
const JUICE_DEPTH = 10;
/** Brief destination-tile highlight under entities. */
const TILE_FLASH_DEPTH = 7;
const TILE_FLASH_MS = 200;
const FLOATER_LIFETIME_MS = 220;
const FLOAT_COLOR_HP_LOSS = "#ff8888";
const FLOAT_COLOR_ENERGY_LOSS = "#ff9966";
const FLOAT_COLOR_ENERGY_GAIN = "#eecc44";
const FLOAT_COLOR_STRESS = "#dd99ee";
const FLOAT_COLOR_EVENT = "#cceeff";
const HUD_DEPTH = 1000;
const STATUS_DEPTH = 1001;
const TITLE_DEPTH = 1002;
/** Dims the board so title/menu text reads clearly above the grid. */
const TITLE_BACKDROP_DEPTH = 990;
const SUMMARY_DEPTH = 1003;
const EVENT_PROMPT_DEPTH = 999;
/** Below HUD so the event body does not cover Energy/Stress/Status */
const EVENT_PROMPT_Y = 96;
const EVENT_PROMPT_Y_COMPACT = 84;
const TOUCH_UI_DEPTH = 1100;
const TOUCH_LABEL_DEPTH = 1101;
const COMPACT_VIEWPORT_MAX = 520;
const TOUCH_BTN = 44;
const TOUCH_BANNER_GAP = 8;
const TOUCH_PAD_GAP = 46;
const COLOR_TOUCH_BG = 0x3a3a55;
const COLOR_TOUCH_STROKE = 0x8888aa;

function parseLayoutIndexFromUrl(): number | null {
  const raw = new URLSearchParams(window.location.search).get("layout");
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  const len = LAYOUTS.length;
  return ((n % len) + len) % len;
}

/** When true, event tiles use layout-authored `typeId` instead of a random pool pick. */
function parseUseLayoutEventTypesFromUrl(): boolean {
  return new URLSearchParams(window.location.search).get("eventRandom") === "0";
}

function parseEventSeedFromUrl(): string | undefined {
  const raw = new URLSearchParams(window.location.search).get("eventSeed");
  if (raw === null || raw === "") return undefined;
  return raw;
}

export class GameScene extends Phaser.Scene {
  private grid!: GridSystem;
  private gridBoardGraphics: Phaser.GameObjects.Graphics | null = null;
  /** When set from `?layout=N`, every new run uses this index. */
  private pinnedLayoutIndexFromUrl: number | null = null;
  private currentLayoutIndex = 0;
  private player!: Player;
  private enemies: Enemy[] = [];
  private enemyRects: (Phaser.GameObjects.Rectangle | null)[] = [];
  private reward!: Reward;
  private playerRect: Phaser.GameObjects.Rectangle | null = null;
  private rewardRect: Phaser.GameObjects.Rectangle | null = null;
  private exitRect: Phaser.GameObjects.Rectangle | null = null;
  private eventRects: (Phaser.GameObjects.Rectangle | null)[] = [];
  private eventAvailable: boolean[] = [];
  private activeEventIndex: number | null = null;
  private eventPromptText: Phaser.GameObjects.Text | null = null;
  private playerGridX = 0;
  private playerGridY = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyRestart!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyY!: Phaser.Input.Keyboard.Key;
  private keyN!: Phaser.Input.Keyboard.Key;
  private keyPerk1!: Phaser.Input.Keyboard.Key;
  private keyPerk2!: Phaser.Input.Keyboard.Key;
  private keyPerk3!: Phaser.Input.Keyboard.Key;
  private keyClearSave!: Phaser.Input.Keyboard.Key;
  private keyBracketLeft!: Phaser.Input.Keyboard.Key;
  private keyBracketRight!: Phaser.Input.Keyboard.Key;
  private keyPremiumToggle!: Phaser.Input.Keyboard.Key;
  private keyContinueReward!: Phaser.Input.Keyboard.Key;
  /** Looping run music; stopped on title. */
  private bgmMusic: Phaser.Sound.BaseSound | null = null;
  private audioUnlocked = false;
  /** M-key mute; source of truth for `__gameState.audio` and SFX gating in soundHooks. */
  private sessionAudioMuted = false;
  private selectedDifficulty: Difficulty = "normal";
  private runStarted = false;
  /** `performance.now()` when the current run started; null on title / after reset. */
  private runStartTime: number | null = null;
  /** Ensures session stats record win/loss once per finished run. */
  private sessionMetricsRecordedForRun = false;
  private titleTexts: Phaser.GameObjects.Text[] = [];
  private titleBackdrop: Phaser.GameObjects.Graphics | null = null;
  private gameOver = false;
  private gameWon = false;
  private enemiesDefeated = 0;
  private eventsResolved = 0;
  private creditsAwardedForCurrentRun = false;
  private creditsEarnedThisRun = 0;
  /** Per-run cap for energy (reward/event clamps); may exceed layout max with Extra Coffee. */
  private effectiveMaxEnergy = 5;
  /** Per-run stress ceiling (from layout); at or above = burnout. */
  private effectiveMaxStress = 8;
  private gameOverReason: "burnout" | "no_energy" | null = null;
  /** Rewarded continue placeholder; resets each new run. */
  private continueUsedThisRun = false;
  private runSummaryBg: Phaser.GameObjects.Graphics | null = null;
  private runSummaryText: Phaser.GameObjects.Text | null = null;
  private hudText!: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text | null = null;
  private latestMessageStr = "";
  private playerLabel: Phaser.GameObjects.Text | null = null;
  private enemyLabels: (Phaser.GameObjects.Text | null)[] = [];
  private rewardLabel: Phaser.GameObjects.Text | null = null;
  private exitLabel: Phaser.GameObjects.Text | null = null;
  private eventLabels: (Phaser.GameObjects.Text | null)[] = [];
  /** Per slot, actual event type for this run (random pool or layout `typeId`). */
  private eventRuntimeTypeIds: string[] = [];
  private runEventRng = new Phaser.Math.RandomDataGenerator();
  private lastEventResult: string | null = null;

  private touchLayerReady = false;
  private touchStartHit: Phaser.GameObjects.Rectangle | null = null;
  private touchStartLabel: Phaser.GameObjects.Text | null = null;
  private touchRestartHit: Phaser.GameObjects.Rectangle | null = null;
  private touchRestartLabel: Phaser.GameObjects.Text | null = null;
  private touchContinueHit: Phaser.GameObjects.Rectangle | null = null;
  private touchContinueLabel: Phaser.GameObjects.Text | null = null;
  private touchMoveHits: Phaser.GameObjects.Rectangle[] = [];
  private touchMoveLabels: Phaser.GameObjects.Text[] = [];
  private touchEventHits: Phaser.GameObjects.Rectangle[] = [];
  private touchEventLabels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    const urls = (base: string) => [`audio/${base}.ogg`, `audio/${base}.mp3`];
    this.load.audio("sfx_move", urls("move"));
    this.load.audio("sfx_combat", urls("combat"));
    this.load.audio("sfx_hurt", urls("hurt"));
    this.load.audio("sfx_choice", urls("choice"));
    this.load.audio("sfx_reward", urls("reward"));
    this.load.audio("sfx_victory", urls("victory"));
    this.load.audio("sfx_gameover", urls("gameover"));
    this.load.audio("bgm", urls("bgm"));
  }

  private activeLayout(): LayoutDef {
    return LAYOUTS[this.currentLayoutIndex];
  }

  private pickLayoutIndexForNewRun(): number {
    if (this.pinnedLayoutIndexFromUrl !== null) {
      return this.pinnedLayoutIndexFromUrl;
    }
    return Phaser.Math.RND.integerInRange(0, LAYOUTS.length - 1);
  }

  private computeStartingVitals(layout: LayoutDef): {
    startEnergy: number;
    startStress: number;
  } {
    let energy = layout.player.startEnergy;
    let stress = layout.player.startStress;
    this.effectiveMaxEnergy = layout.player.maxEnergy;
    this.effectiveMaxStress = layout.player.maxStress;
    const id = getEquippedPerkId();
    const perk = id ? getPerkById(id) : undefined;
    if (perk?.effect.kind === "extra_coffee") {
      energy += 2;
      this.effectiveMaxEnergy = layout.player.maxEnergy + 2;
    }
    if (perk?.effect.kind === "calm_mind") {
      stress = Math.max(0, stress - 2);
    }
    const diffEnergy = energyBonus(this.selectedDifficulty);
    energy = Math.max(1, energy + diffEnergy);
    this.effectiveMaxEnergy = Math.max(1, this.effectiveMaxEnergy + diffEnergy);
    return { startEnergy: energy, startStress: stress };
  }

  private playerDamagePerHit(layout: LayoutDef): number {
    let hit = layout.player.damagePerHit;
    const id = getEquippedPerkId();
    const perk = id ? getPerkById(id) : undefined;
    if (perk?.effect.kind === "aggressive_reply") hit += 1;
    return hit;
  }

  private maybeAwardRunCredits(): void {
    if (
      !this.runStarted ||
      (!this.gameOver && !this.gameWon) ||
      this.creditsAwardedForCurrentRun
    ) {
      return;
    }
    this.creditsAwardedForCurrentRun = true;
    const interactionCredits = Math.floor(
      (this.enemiesDefeated + this.eventsResolved) / 2
    );
    const earned = Math.max(2, interactionCredits + (this.gameWon ? 2 : 0));
    this.creditsEarnedThisRun = earned;
    addOfficeCredits(earned);
  }

  /**
   * Ends the run if energy is depleted or stress hits the ceiling (energy checked first).
   * @param energyDetail optional extra context for no-energy loss (e.g. combat).
   */
  private checkRunEndAfterVitals(energyDetail?: string): void {
    if (this.gameOver || this.gameWon) return;
    if (this.player.energy <= 0) {
      this.gameOver = true;
      this.gameOverReason = "no_energy";
      playGameOverSfx();
      this.setStatusMessage(
        energyDetail
          ? `You ran out of energy (${energyDetail})`
          : "You ran out of energy"
      );
      console.log("Game Over");
      return;
    }
    if (this.player.stress >= this.effectiveMaxStress) {
      this.gameOver = true;
      this.gameOverReason = "burnout";
      playGameOverSfx();
      this.setStatusMessage("You burned out (stress)");
      console.log("Game Over");
    }
  }

  private ensureAudioUnlocked(): void {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    this.sound.unlock();
  }

  private stopRunMusic(): void {
    if (this.bgmMusic?.isPlaying) {
      this.bgmMusic.stop();
    }
  }

  private startRunMusicIfNeeded(): void {
    if (!this.runStarted || this.sessionAudioMuted || !this.bgmMusic) return;
    if (this.bgmMusic.isPlaying) return;
    this.bgmMusic.play();
  }

  private formatHudPerkLine(): string | null {
    const id = getEquippedPerkId();
    const perk = id ? getPerkById(id) : undefined;
    if (!perk) return null;
    const m = this.computeActiveRunModifiers();
    const parts: string[] = [];
    if (m?.energyDelta) parts.push(`+${m.energyDelta} max energy`);
    if (m?.stressDelta !== undefined && m.stressDelta !== 0) {
      parts.push(`${m.stressDelta > 0 ? "+" : ""}${m.stressDelta} start stress`);
    }
    if (m?.damageBonus) parts.push(`+${m.damageBonus} damage`);
    const suffix = parts.length ? ` — ${parts.join(", ")}` : "";
    return `Perk: ${perk.name}${suffix}`;
  }

  private computeActiveRunModifiers():
    | GameDebugState["meta"]["activeRunModifiers"]
    | undefined {
    const id = getEquippedPerkId();
    const perk = id ? getPerkById(id) : undefined;
    if (!perk) return undefined;
    const m: NonNullable<GameDebugState["meta"]["activeRunModifiers"]> = {};
    if (perk.effect.kind === "extra_coffee") m.energyDelta = 2;
    if (perk.effect.kind === "calm_mind") m.stressDelta = -2;
    if (perk.effect.kind === "aggressive_reply") m.damageBonus = 1;
    return m;
  }

  private makeTileLabel(x: number, y: number, text: string): Phaser.GameObjects.Text {
    const fs = this.isCompactViewport() ? "12px" : "11px";
    const t = this.add.text(x, y, text, {
      fontSize: fs,
      color: "#f4f4ff",
    });
    t.setOrigin(0.5);
    t.setScrollFactor(0, 0);
    t.setDepth(LABEL_DEPTH);
    t.setStroke("#0a0a14", 4);
    return t;
  }

  private layoutStatusMessage(): void {
    if (!this.statusText) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const bottomPad = this.isCompactViewport() ? 8 : 12;
    let inset = 6;
    if (this.isCompactViewport() && this.computeTouchUiFlags().movement) {
      inset = bottomPad + TOUCH_PAD_GAP * 2 + TOUCH_BTN + 10;
    }
    this.statusText.setPosition(w / 2, h - inset);
    this.statusText.setOrigin(0.5, 1);
  }

  /** Replaces prior message; also stored for `latestMessage` in debug state. */
  private setStatusMessage(text: string): void {
    this.latestMessageStr = text;
    if (this.statusText) {
      const display =
        text === ""
          ? ""
          : this.runStarted
            ? `Last: ${text}`
            : text;
      this.statusText.setText(display);
    }
  }

  private formatSigned(value: number, label: string): string {
    if (value === 0) return `0 ${label}`;
    return `${value > 0 ? "+" : ""}${value} ${label}`;
  }

  /** Short labels for event juice (floaters only; does not replace `lastEventResult`). */
  private eventJuiceLabels(energyDelta: number, stressDelta: number): string[] {
    const labels: string[] = [];
    if (energyDelta < 0) labels.push("Lost Energy");
    if (energyDelta > 0) labels.push("Gained Reward");
    if (stressDelta > 0) labels.push("Stress Increased");
    return labels;
  }

  /** Small floating text at world position; auto-destroys after ~FLOATER_LIFETIME_MS. */
  private spawnFloater(
    worldX: number,
    worldY: number,
    text: string,
    color: string,
    yOffsetPx = 0
  ): void {
    const fs = this.isCompactViewport() ? "11px" : "12px";
    const t = this.add.text(worldX, worldY + yOffsetPx, text, {
      fontSize: fs,
      color,
    });
    t.setOrigin(0.5);
    t.setDepth(JUICE_DEPTH);
    t.setStroke("#0a0a14", 3);
    this.time.delayedCall(FLOATER_LIFETIME_MS, () => {
      t.destroy();
    });
  }

  /** Numeric deltas plus `eventJuiceLabels` lines, stacked upward from the player tile. */
  private spawnEventOutcomeFloaters(dE: number, dS: number): void {
    const { x, y } = this.grid.gridToWorldCenter(
      this.playerGridX,
      this.playerGridY
    );
    let row = 0;
    const line = (text: string, color: string) => {
      this.spawnFloater(x, y, text, color, -14 * row);
      row += 1;
    };
    if (dE !== 0) {
      line(
        `${dE > 0 ? "+" : ""}${dE} Energy`,
        dE > 0 ? FLOAT_COLOR_ENERGY_GAIN : FLOAT_COLOR_ENERGY_LOSS
      );
    }
    if (dS !== 0) {
      line(`${dS > 0 ? "+" : ""}${dS} Stress`, FLOAT_COLOR_STRESS);
    }
    for (const label of this.eventJuiceLabels(dE, dS)) {
      line(label, FLOAT_COLOR_EVENT);
    }
  }

  private isCompactViewport(): boolean {
    return Math.min(this.scale.width, this.scale.height) <= COMPACT_VIEWPORT_MAX;
  }

  private eventPromptScreenY(): number {
    return this.isCompactViewport() ? EVENT_PROMPT_Y_COMPACT : EVENT_PROMPT_Y;
  }

  private hudFontSizePx(): string {
    return this.isCompactViewport() ? "13px" : "14px";
  }

  private statusFontSizePx(): string {
    return this.isCompactViewport() ? "13px" : "14px";
  }

  private computeResponsiveTileSize(layout: LayoutDef): number {
    const base = layout.grid.tileSize;
    const canvasParent = this.game.canvas?.parentElement;
    const pw = canvasParent?.clientWidth ?? window.innerWidth ?? 800;
    const ph = canvasParent?.clientHeight ?? window.innerHeight ?? 600;
    const m = Math.min(pw, ph);
    const maxBoardPx = Math.floor(m * 0.58);
    const maxTile = Math.floor(
      maxBoardPx / Math.max(layout.grid.cols, layout.grid.rows)
    );
    return Math.max(24, Math.min(base, maxTile));
  }

  private computeTouchUiFlags(): GameDebugState["touchUi"] {
    const continueReward =
      this.runStarted &&
      this.gameOver &&
      !this.gameWon &&
      !this.continueUsedThisRun;
    return {
      movement:
        this.runStarted &&
        this.activeEventIndex === null &&
        !this.gameOver &&
        !this.gameWon,
      event: this.activeEventIndex !== null,
      start: !this.runStarted,
      restart: this.runStarted && (this.gameOver || this.gameWon),
      continueReward,
    };
  }

  /** One grid step; same rules as arrow keys (caller must gate by game state). */
  private tryStep(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const nx = this.playerGridX + dx;
    const ny = this.playerGridY + dy;
    if (!this.grid.isInBounds(nx, ny)) return;

    const ts = this.grid.tileSize;
    const dest = this.grid.gridToWorldCenter(nx, ny);
    const flash = this.add.rectangle(
      dest.x,
      dest.y,
      ts,
      ts,
      0xaaccff,
      0.32
    );
    flash.setDepth(TILE_FLASH_DEPTH);
    this.time.delayedCall(TILE_FLASH_MS, () => flash.destroy());

    this.playerGridX = nx;
    this.playerGridY = ny;
    const { x, y } = this.grid.gridToWorldCenter(
      this.playerGridX,
      this.playerGridY
    );
    this.playerRect!.setPosition(x, y);
    this.playerLabel?.setPosition(x, y);

    this.ensureAudioUnlocked();
    playMoveSfx();

    this.tryCombatAtTile(this.playerGridX, this.playerGridY);
    this.tryRewardAtTile(this.playerGridX, this.playerGridY);
    this.tryExitAtTile(this.playerGridX, this.playerGridY);
    this.tryEventAtTile(this.playerGridX, this.playerGridY);
    this.syncDebugState();
  }

  private startRunFromTouch(): void {
    if (this.runStarted) return;
    this.ensureAudioUnlocked();
    this.continueUsedThisRun = false;
    this.runStarted = true;
    this.sessionMetricsRecordedForRun = false;
    this.runStartTime = performance.now();
    recordRunStarted();
    this.hideTitleOverlay();
    this.setStatusMessage("Run started");
    this.startRunMusicIfNeeded();
    this.syncDebugState();
  }

  /** Next layout restart (same as R when shown after run end). */
  private restartRunFromTouch(): void {
    if (!this.runStarted || (!this.gameOver && !this.gameWon)) return;
    this.runStarted = false;
    this.stopRunMusic();
    this.setupRunEntities(true);
  }

  /** Placeholder rewarded ad: +2 energy, clear game over, once per run. */
  private performRewardedContinue(): void {
    if (
      !this.runStarted ||
      !this.gameOver ||
      this.gameWon ||
      this.continueUsedThisRun
    ) {
      return;
    }
    this.player.energy = Math.min(
      this.effectiveMaxEnergy,
      this.player.energy + 2
    );
    this.gameOver = false;
    this.gameOverReason = null;
    this.continueUsedThisRun = true;
    this.sessionMetricsRecordedForRun = false;
    this.setStatusMessage("Continue — +2 energy");
    this.startRunMusicIfNeeded();
    this.syncDebugState();
  }

  private addTouchPadButton(
    x: number,
    y: number,
    letter: string,
    onPress: () => void
  ): void {
    const half = TOUCH_BTN / 2;
    const hit = this.add.rectangle(x, y, TOUCH_BTN, TOUCH_BTN, COLOR_TOUCH_BG);
    hit.setStrokeStyle(2, COLOR_TOUCH_STROKE);
    hit.setScrollFactor(0, 0);
    hit.setDepth(TOUCH_UI_DEPTH);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", onPress);
    const lab = this.add.text(x, y, letter, {
      fontSize: "18px",
      color: "#e8e8ff",
    });
    lab.setOrigin(0.5);
    lab.setScrollFactor(0, 0);
    lab.setDepth(TOUCH_LABEL_DEPTH);
    this.touchMoveHits.push(hit);
    this.touchMoveLabels.push(lab);
  }

  private addTouchChoiceButton(
    x: number,
    y: number,
    initial: string,
    onPress: () => void,
    width = 80
  ): void {
    const w = width;
    const h = TOUCH_BTN;
    const hit = this.add.rectangle(x, y, w, h, COLOR_TOUCH_BG);
    hit.setStrokeStyle(2, COLOR_TOUCH_STROKE);
    hit.setScrollFactor(0, 0);
    hit.setDepth(TOUCH_UI_DEPTH);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", onPress);
    const lab = this.add.text(x, y, initial, {
      fontSize: "11px",
      color: "#e8e8ff",
      align: "center",
      wordWrap: { width: w - 8 },
    });
    lab.setOrigin(0.5);
    lab.setScrollFactor(0, 0);
    lab.setDepth(TOUCH_LABEL_DEPTH);
    this.touchEventHits.push(hit);
    this.touchEventLabels.push(lab);
  }

  private addTouchBannerButton(
    x: number,
    y: number,
    w: number,
    label: string,
    onPress: () => void
  ): { hit: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const h = TOUCH_BTN;
    const hit = this.add.rectangle(x, y, w, h, COLOR_TOUCH_BG);
    hit.setStrokeStyle(2, COLOR_TOUCH_STROKE);
    hit.setScrollFactor(0, 0);
    hit.setDepth(TOUCH_UI_DEPTH);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", onPress);
    const text = this.add.text(x, y, label, {
      fontSize: "14px",
      color: "#e8e8ff",
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0, 0);
    text.setDepth(TOUCH_LABEL_DEPTH);
    return { hit, text };
  }

  private createTouchControlsOnce(): void {
    if (this.touchLayerReady) return;

    const w = this.scale.width;
    const h = this.scale.height;
    const bottomPad = this.isCompactViewport() ? 8 : 12;
    const cx = w - 12 - TOUCH_PAD_GAP;
    const cy = h - bottomPad - TOUCH_PAD_GAP;

    this.addTouchPadButton(cx, cy - TOUCH_PAD_GAP, "↑", () =>
      this.computeTouchUiFlags().movement ? this.tryStep(0, -1) : undefined
    );
    this.addTouchPadButton(cx, cy + TOUCH_PAD_GAP, "↓", () =>
      this.computeTouchUiFlags().movement ? this.tryStep(0, 1) : undefined
    );
    this.addTouchPadButton(cx - TOUCH_PAD_GAP, cy, "←", () =>
      this.computeTouchUiFlags().movement ? this.tryStep(-1, 0) : undefined
    );
    this.addTouchPadButton(cx + TOUCH_PAD_GAP, cy, "→", () =>
      this.computeTouchUiFlags().movement ? this.tryStep(1, 0) : undefined
    );

    this.addTouchChoiceButton(48, h - bottomPad - TOUCH_PAD_GAP, "A", () =>
      this.computeTouchUiFlags().event ? this.resolveEventChoice(true) : undefined
    );
    this.addTouchChoiceButton(48 + 80, h - bottomPad - TOUCH_PAD_GAP, "B", () =>
      this.computeTouchUiFlags().event ? this.resolveEventChoice(false) : undefined
    );

    const startPair = this.addTouchBannerButton(
      w / 2,
      h - bottomPad - TOUCH_BTN / 2,
      Math.min(200, w - 24),
      "Start",
      () => this.startRunFromTouch()
    );
    this.touchStartHit = startPair.hit;
    this.touchStartLabel = startPair.text;

    const restartY = h - bottomPad - TOUCH_BTN / 2;
    const continueY = restartY - TOUCH_BTN - TOUCH_BANNER_GAP;
    const bw = Math.min(200, w - 24);

    const restartPair = this.addTouchBannerButton(
      w / 2,
      restartY,
      bw,
      "Restart",
      () => this.restartRunFromTouch()
    );
    this.touchRestartHit = restartPair.hit;
    this.touchRestartLabel = restartPair.text;

    const premium = getPremiumNoAdsEnabled();
    const continuePair = this.addTouchBannerButton(
      w / 2,
      continueY,
      bw,
      premium ? "Continue" : "Continue (Ad)",
      () =>
        this.computeTouchUiFlags().continueReward
          ? this.performRewardedContinue()
          : undefined
    );
    this.touchContinueHit = continuePair.hit;
    this.touchContinueLabel = continuePair.text;

    this.touchLayerReady = true;
    this.syncTouchLayer();
  }

  private registerOdE2e(): void {
    window.__odE2e = {
      pressStart: () => this.startRunFromTouch(),
      restartRun: () => this.restartRunFromTouch(),
      step: (dx, dy) => {
        if (this.computeTouchUiFlags().movement) this.tryStep(dx, dy);
      },
      eventChoice: (yes) => {
        if (this.computeTouchUiFlags().event) this.resolveEventChoice(yes);
      },
      /** E2E: set stress then evaluate burnout (must be in an active run). */
      setStressForTest: (n: number) => {
        if (!this.runStarted || this.gameOver || this.gameWon) return;
        this.player.stress = n;
        this.checkRunEndAfterVitals();
        this.syncDebugState();
      },
      rewardedContinue: () => {
        if (this.computeTouchUiFlags().continueReward) {
          this.performRewardedContinue();
        }
      },
    };
  }

  private syncTouchLayer(): void {
    if (!this.touchLayerReady) return;

    const w = this.scale.width;
    const h = this.scale.height;
    const bottomPad = this.isCompactViewport() ? 8 : 12;
    const cx = w - 12 - TOUCH_PAD_GAP;
    const cy = h - bottomPad - TOUCH_PAD_GAP;

    const padOrder = [
      { x: cx, y: cy - TOUCH_PAD_GAP },
      { x: cx, y: cy + TOUCH_PAD_GAP },
      { x: cx - TOUCH_PAD_GAP, y: cy },
      { x: cx + TOUCH_PAD_GAP, y: cy },
    ];
    for (let i = 0; i < 4; i++) {
      const pos = padOrder[i]!;
      this.touchMoveHits[i]?.setPosition(pos.x, pos.y);
      this.touchMoveLabels[i]?.setPosition(pos.x, pos.y);
    }

    const evY = h - bottomPad - TOUCH_PAD_GAP;
    const evW = this.isCompactViewport()
      ? Math.min(160, Math.max(72, Math.floor((w - 40) / 2)))
      : 80;
    const evGap = 8;
    const leftCx = 24 + evW / 2;
    const rightCx = 24 + evW + evGap + evW / 2;
    this.touchEventHits[0]?.setPosition(leftCx, evY);
    this.touchEventHits[0]?.setSize(evW, TOUCH_BTN);
    this.touchEventLabels[0]?.setPosition(leftCx, evY);
    this.touchEventLabels[0]?.setStyle({ wordWrap: { width: evW - 8 } });
    this.touchEventHits[1]?.setPosition(rightCx, evY);
    this.touchEventHits[1]?.setSize(evW, TOUCH_BTN);
    this.touchEventLabels[1]?.setPosition(rightCx, evY);
    this.touchEventLabels[1]?.setStyle({ wordWrap: { width: evW - 8 } });

    const restartY = h - bottomPad - TOUCH_BTN / 2;
    const continueY = restartY - TOUCH_BTN - TOUCH_BANNER_GAP;
    const bw = Math.min(200, w - 24);
    this.touchStartHit?.setPosition(w / 2, restartY);
    this.touchStartLabel?.setPosition(w / 2, restartY);
    this.touchStartHit?.setSize(bw, TOUCH_BTN);
    this.touchRestartHit?.setPosition(w / 2, restartY);
    this.touchRestartLabel?.setPosition(w / 2, restartY);
    this.touchRestartHit?.setSize(bw, TOUCH_BTN);
    this.touchContinueHit?.setPosition(w / 2, continueY);
    this.touchContinueLabel?.setPosition(w / 2, continueY);
    this.touchContinueHit?.setSize(bw, TOUCH_BTN);

    const flags = this.computeTouchUiFlags();
    const setGroup = (
      show: boolean,
      hits: Phaser.GameObjects.Rectangle[],
      labels: Phaser.GameObjects.Text[]
    ) => {
      for (const r of hits) {
        r.setVisible(show);
        if (show) r.setInteractive({ useHandCursor: true });
        else r.disableInteractive();
      }
      for (const t of labels) t.setVisible(show);
    };

    setGroup(flags.movement, this.touchMoveHits, this.touchMoveLabels);
    setGroup(flags.event, this.touchEventHits, this.touchEventLabels);

    if (this.touchStartHit && this.touchStartLabel) {
      const show = flags.start;
      this.touchStartHit.setVisible(show);
      this.touchStartLabel.setVisible(show);
      if (show) this.touchStartHit.setInteractive({ useHandCursor: true });
      else this.touchStartHit.disableInteractive();
    }
    if (this.touchRestartHit && this.touchRestartLabel) {
      const show = flags.restart;
      this.touchRestartHit.setVisible(show);
      this.touchRestartLabel.setVisible(show);
      if (show) this.touchRestartHit.setInteractive({ useHandCursor: true });
      else this.touchRestartHit.disableInteractive();
    }

    if (this.touchContinueHit && this.touchContinueLabel) {
      const show = flags.continueReward;
      this.touchContinueHit.setVisible(show);
      this.touchContinueLabel.setVisible(show);
      if (show) {
        this.touchContinueHit.setInteractive({ useHandCursor: true });
        this.touchContinueLabel.setText(
          getPremiumNoAdsEnabled() ? "Continue" : "Continue (Ad)"
        );
      } else {
        this.touchContinueHit.disableInteractive();
      }
    }

    if (flags.event && this.activeEventIndex !== null) {
      const idx = this.activeEventIndex;
      const typeId = this.eventRuntimeTypeIds[idx];
      if (typeId) {
        const et = getEventType(typeId);
        if (isChoiceEvent(et)) {
          this.touchEventLabels[0]?.setText(et.choiceY.label);
          this.touchEventLabels[1]?.setText(et.choiceN.label);
        }
      }
    }

    const mirror = document.getElementById("touch-ui-test-mirror");
    if (mirror) {
      const parts: string[] = [];
      if (flags.start) parts.push("Start");
      if (flags.continueReward) parts.push("Continue");
      if (flags.restart) parts.push("Restart");
      if (flags.movement) parts.push("Move");
      if (flags.event) parts.push("Event");
      mirror.textContent = parts.join("|");
    }
  }

  create(): void {
    this.pinnedLayoutIndexFromUrl = parseLayoutIndexFromUrl();
    this.currentLayoutIndex = this.pickLayoutIndexForNewRun();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyRestart = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.R
    );
    this.keySpace = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.keyY = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
    this.keyN = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.keyPerk1 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keyPerk2 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keyPerk3 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keyClearSave = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.C
    );
    this.keyBracketLeft = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET
    );
    this.keyBracketRight = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.CLOSED_BRACKET
    );
    this.keyPremiumToggle = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.P
    );
    this.keyContinueReward = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
    setAudioScene(this);
    setSessionAudioMute(false);
    this.input.once("pointerdown", () => {
      this.ensureAudioUnlocked();
    });
    this.bgmMusic = this.sound.add("bgm", { loop: true, volume: 0.12 });
    window.addEventListener("keydown", (ev: KeyboardEvent) => {
      const isM =
        ev.key === "m" || ev.key === "M" || ev.code === "KeyM";
      if (!isM || ev.repeat) return;
      this.sessionAudioMuted = !this.sessionAudioMuted;
      setSessionAudioMute(this.sessionAudioMuted);
      this.sound.setMute(this.sessionAudioMuted);
      if (this.sessionAudioMuted) {
        this.stopRunMusic();
      } else {
        this.startRunMusicIfNeeded();
      }
      this.syncDebugState();
    });

    this.hudText = this.add.text(8, 8, "", {
      fontSize: "14px",
      color: "#e8e8ff",
    });
    this.hudText.setScrollFactor(0, 0);
    this.hudText.setDepth(HUD_DEPTH);

    this.statusText = this.add.text(0, 0, "", {
      fontSize: "13px",
      color: "#c8c8e8",
    });
    this.statusText.setScrollFactor(0, 0);
    this.statusText.setDepth(STATUS_DEPTH);

    this.setupRunEntities(false);
    this.createTouchControlsOnce();
    this.registerOdE2e();
  }

  /** Resets run state and visuals; logs "Run restarted" when `logRestart` (R key). */
  private setupRunEntities(logRestart: boolean): void {
    if (logRestart) {
      this.currentLayoutIndex = this.pickLayoutIndexForNewRun();
    }

    this.hideRunSummaryOverlay();

    const layout = this.activeLayout();
    const tileSize = this.computeResponsiveTileSize(layout);
    const gridSpec = {
      cols: layout.grid.cols,
      rows: layout.grid.rows,
      tileSize,
    };
    const w = layout.grid.cols * tileSize;
    const h = layout.grid.rows * tileSize;
    this.scale.setGameSize(w, h);
    // Phaser's default RESIZE handler only updates the main camera when its size
    // exactly matches the *previous* game size; if that ever fails, the camera
    // stays out of sync with setGameSize and entities can render off-screen.
    const cam = this.cameras.main;
    cam.setPosition(0, 0);
    cam.setSize(w, h);
    cam.setScroll(0, 0);

    this.gridBoardGraphics?.destroy();
    this.gridBoardGraphics = null;
    this.grid = new GridSystem(gridSpec);
    this.drawGrid(layout);

    this.gameOver = false;
    this.gameWon = false;
    this.gameOverReason = null;
    this.continueUsedThisRun = false;
    this.runStartTime = null;
    this.sessionMetricsRecordedForRun = false;
    this.enemiesDefeated = 0;
    this.eventsResolved = 0;
    this.creditsAwardedForCurrentRun = false;
    this.creditsEarnedThisRun = 0;
    this.activeEventIndex = null;
    if (this.eventPromptText) {
      this.eventPromptText.destroy();
      this.eventPromptText = null;
    }
    this.playerGridX = layout.player.startGrid.x;
    this.playerGridY = layout.player.startGrid.y;
    const { startEnergy, startStress } = this.computeStartingVitals(layout);
    this.player = new Player(startEnergy, startStress);
    this.enemies = layout.enemies.map((pl) => {
      const t = getEnemyType(pl.typeId);
      return new Enemy(t, pl.grid.x, pl.grid.y, {
        damage: scaledEnemyDamage(t.damage, this.selectedDifficulty),
        stressPerHit: scaledStressGain(
          t.stressPerHit ?? 0,
          this.selectedDifficulty
        ),
      });
    });
    this.reward = new Reward(layout.reward.grid.x, layout.reward.grid.y);
    this.eventAvailable = layout.events.map(() => true);
    this.lastEventResult = null;
    this.assignEventRuntimeTypes(layout);

    const size = this.grid.tileSize - PLAYER_PADDING;

    const p = this.grid.gridToWorldCenter(this.playerGridX, this.playerGridY);
    if (!this.playerRect) {
      this.playerRect = this.add.rectangle(p.x, p.y, size, size, COLOR_PLAYER);
      this.playerRect.setStrokeStyle(STROKE_WIDTH, 0x118855);
      this.playerRect.setDepth(ENTITY_DEPTH);
    } else {
      this.playerRect.setPosition(p.x, p.y);
      this.playerRect.setVisible(true);
    }
    if (!this.playerLabel) {
      this.playerLabel = this.makeTileLabel(p.x, p.y, "P");
    } else {
      this.playerLabel.setPosition(p.x, p.y);
      this.playerLabel.setVisible(true);
    }

    while (this.enemyRects.length < this.enemies.length) {
      this.enemyRects.push(null);
    }
    while (this.enemyLabels.length < this.enemies.length) {
      this.enemyLabels.push(null);
    }
    while (this.enemyRects.length > this.enemies.length) {
      this.enemyRects.pop()?.destroy();
      this.enemyLabels.pop()?.destroy();
    }
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const eWorld = this.grid.gridToWorldCenter(enemy.gridX, enemy.gridY);
      const letter = "E";
      let rect = this.enemyRects[i];
      if (!rect) {
        rect = this.add.rectangle(
          eWorld.x,
          eWorld.y,
          size,
          size,
          enemy.color
        );
        rect.setStrokeStyle(STROKE_WIDTH, 0xaa2200);
        rect.setDepth(ENTITY_DEPTH);
        this.enemyRects[i] = rect;
      } else {
        rect.setPosition(eWorld.x, eWorld.y);
        rect.setFillStyle(enemy.color);
        rect.setVisible(true);
      }
      let el = this.enemyLabels[i];
      if (!el) {
        el = this.makeTileLabel(eWorld.x, eWorld.y, letter);
        this.enemyLabels[i] = el;
      } else {
        el.setPosition(eWorld.x, eWorld.y);
        el.setText(letter);
        el.setVisible(true);
      }
    }

    const rWorld = this.grid.gridToWorldCenter(
      this.reward.gridX,
      this.reward.gridY
    );
    if (!this.rewardRect) {
      this.rewardRect = this.add.rectangle(
        rWorld.x,
        rWorld.y,
        size,
        size,
        COLOR_REWARD
      );
      this.rewardRect.setStrokeStyle(STROKE_WIDTH, 0xcc9900);
      this.rewardRect.setDepth(ENTITY_DEPTH);
    } else {
      this.rewardRect.setPosition(rWorld.x, rWorld.y);
      this.rewardRect.setVisible(true);
    }
    if (!this.rewardLabel) {
      this.rewardLabel = this.makeTileLabel(rWorld.x, rWorld.y, "R");
    } else {
      this.rewardLabel.setPosition(rWorld.x, rWorld.y);
      this.rewardLabel.setVisible(true);
    }

    const exitWorld = this.grid.gridToWorldCenter(
      layout.exit.x,
      layout.exit.y
    );
    if (!this.exitRect) {
      this.exitRect = this.add.rectangle(
        exitWorld.x,
        exitWorld.y,
        size,
        size,
        COLOR_EXIT
      );
      this.exitRect.setStrokeStyle(STROKE_WIDTH, 0x3355cc);
      this.exitRect.setDepth(ENTITY_DEPTH);
    } else {
      this.exitRect.setPosition(exitWorld.x, exitWorld.y);
      this.exitRect.setVisible(true);
    }
    if (!this.exitLabel) {
      this.exitLabel = this.makeTileLabel(exitWorld.x, exitWorld.y, "X");
    } else {
      this.exitLabel.setPosition(exitWorld.x, exitWorld.y);
      this.exitLabel.setVisible(true);
    }

    while (this.eventRects.length < layout.events.length) {
      this.eventRects.push(null);
    }
    while (this.eventLabels.length < layout.events.length) {
      this.eventLabels.push(null);
    }
    while (this.eventRects.length > layout.events.length) {
      this.eventRects.pop()?.destroy();
      this.eventLabels.pop()?.destroy();
    }
    for (let i = 0; i < layout.events.length; i++) {
      const eg = layout.events[i].grid;
      const eventWorld = this.grid.gridToWorldCenter(eg.x, eg.y);
      let rect = this.eventRects[i];
      if (!rect) {
        rect = this.add.rectangle(
          eventWorld.x,
          eventWorld.y,
          size,
          size,
          COLOR_EVENT
        );
        rect.setStrokeStyle(STROKE_WIDTH, 0xaa44aa);
        rect.setDepth(ENTITY_DEPTH);
        this.eventRects[i] = rect;
      } else {
        rect.setPosition(eventWorld.x, eventWorld.y);
        rect.setVisible(true);
      }
      let evl = this.eventLabels[i];
      if (!evl) {
        evl = this.makeTileLabel(eventWorld.x, eventWorld.y, "?");
        this.eventLabels[i] = evl;
      } else {
        evl.setPosition(eventWorld.x, eventWorld.y);
        evl.setText("?");
        evl.setVisible(true);
      }
    }

    this.layoutStatusMessage();
    this.setStatusMessage("");

    this.syncDebugState();
    if (logRestart) console.log("Run restarted");
    if (!this.runStarted) {
      this.showTitleOverlay();
    }
  }

  private computeScreenState(): ScreenState {
    if (!this.runStarted) return "title";
    if (this.activeEventIndex !== null) return "event";
    if (this.gameOver) return "gameOver";
    if (this.gameWon) return "victory";
    return "running";
  }

  private hideTitleOverlay(): void {
    this.titleBackdrop?.destroy();
    this.titleBackdrop = null;
    for (const t of this.titleTexts) {
      t.destroy();
    }
    this.titleTexts = [];
  }

  private hideRunSummaryOverlay(): void {
    this.runSummaryBg?.destroy();
    this.runSummaryBg = null;
    this.runSummaryText?.destroy();
    this.runSummaryText = null;
    const mirror = document.getElementById("summary-test-mirror");
    if (mirror) mirror.textContent = "";
  }

  private syncRunSummaryOverlay(): void {
    if (!this.runStarted || (!this.gameOver && !this.gameWon)) {
      this.hideRunSummaryOverlay();
      return;
    }

    const layout = this.activeLayout();
    const resultLabel = this.gameWon ? "Victory" : "Game Over";
    const whyLine =
      this.gameOver && this.gameOverReason === "no_energy"
        ? "Why: You ran out of energy"
        : this.gameOver && this.gameOverReason === "burnout"
          ? "Why: You burned out (stress)"
          : null;

    const distToExit =
      Math.abs(this.playerGridX - layout.exit.x) +
      Math.abs(this.playerGridY - layout.exit.y);
    const lossEncouragement: string[] = [];
    if (this.gameOver) {
      if (distToExit <= NEAR_EXIT_DISTANCE) {
        lossEncouragement.push("So close...");
      }
      lossEncouragement.push("One more run?");
      const tease = getNextPerkUnlockTease();
      if (tease) lossEncouragement.push(tease);
    }

    const summaryLines: string[] = [];
    if (this.gameWon) {
      summaryLines.push("You made it through the office!", "");
    }
    summaryLines.push(`Result: ${resultLabel}`);
    if (whyLine) summaryLines.push(whyLine);
    if (this.gameWon) {
      summaryLines.push(
        `Reward: +${this.creditsEarnedThisRun} Office Credits this run`
      );
    }
    if (lossEncouragement.length) {
      summaryLines.push(""); // space after result/why before encouragement
      summaryLines.push(...lossEncouragement);
    }
    summaryLines.push(
      `Final Energy: ${this.player.energy}`,
      `Final Stress: ${this.player.stress}`,
      `Enemies Defeated: ${this.enemiesDefeated}`,
      `Events Resolved: ${this.eventsResolved}`,
      `Credits earned (this run): ${this.creditsEarnedThisRun}`,
      `Office Credits (total): ${getOfficeCredits()}`,
      `Layout: ${layout.name} [${layout.id}] (${this.currentLayoutIndex})`
    );
    if (this.gameOver) {
      summaryLines.push("");
      if (!this.continueUsedThisRun) {
        summaryLines.push("Continue: available");
        const contLabel = getPremiumNoAdsEnabled() ? "Continue" : "Continue (Ad)";
        summaryLines.push(`Press Enter — ${contLabel}`);
      } else {
        summaryLines.push("Continue: used this run");
      }
    }
    summaryLines.push(
      "",
      "Tap Restart (on-screen) or Press R or Space to Restart"
    );

    const body = summaryLines.join("\n");

    const vw = this.scale.width;
    const vh = this.scale.height;

    if (!this.runSummaryBg) {
      const g = this.add.graphics();
      g.fillStyle(0x141428, 0.88);
      g.fillRect(0, 0, vw, vh);
      g.setScrollFactor(0, 0);
      g.setDepth(SUMMARY_DEPTH);
      this.runSummaryBg = g;
    } else {
      this.runSummaryBg.clear();
      this.runSummaryBg.fillStyle(0x141428, 0.88);
      this.runSummaryBg.fillRect(0, 0, vw, vh);
    }

    if (!this.runSummaryText) {
      const t = this.add.text(vw / 2, vh / 2, body, {
        fontSize: this.isCompactViewport() ? "13px" : "16px",
        color: "#e8e8ff",
        align: "center",
      });
      t.setOrigin(0.5);
      t.setScrollFactor(0, 0);
      t.setDepth(SUMMARY_DEPTH + 1);
      this.runSummaryText = t;
    } else {
      this.runSummaryText.setText(body);
      this.runSummaryText.setStyle({
        fontSize: this.isCompactViewport() ? "13px" : "16px",
      });
    }

    const mirror = document.getElementById("summary-test-mirror");
    if (mirror) mirror.textContent = body;
  }

  private showTitleOverlay(): void {
    this.hideTitleOverlay();
    const vw = this.scale.width;
    const vh = this.scale.height;
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x141428, 0.88);
    backdrop.fillRect(0, 0, vw, vh);
    backdrop.setScrollFactor(0, 0);
    backdrop.setDepth(TITLE_BACKDROP_DEPTH);
    this.titleBackdrop = backdrop;

    const cx = vw / 2;
    const cy = vh / 2;
    const compact = this.isCompactViewport();
    const credits = getOfficeCredits();
    const unlocked = new Set(getUnlockedPerkIds());
    const equipped = getEquippedPerkId();
    const st = getSessionStatsForDebug();
    const avgPart =
      st.runsCompleted > 0 && st.averageRunLengthSeconds > 0
        ? ` · avg ${st.averageRunLengthSeconds}s`
        : "";
    const lines: { text: string; fontSize: string; y: number }[] = [
      {
        text: "Office Dungeon",
        fontSize: compact ? "20px" : "26px",
        y: compact ? -118 : -132,
      },
      {
        text: "Survive the workday.",
        fontSize: compact ? "12px" : "14px",
        y: compact ? -92 : -100,
      },
      {
        text: `Office Credits: ${credits}`,
        fontSize: compact ? "12px" : "14px",
        y: compact ? -72 : -74,
      },
      {
        text: `Session: ${st.runsStarted} started · W ${st.wins} / L ${st.losses}${avgPart}`,
        fontSize: compact ? "11px" : "12px",
        y: compact ? -56 : -58,
      },
      {
        text: `Difficulty: ${difficultyLabel(this.selectedDifficulty)} — [ ] to cycle`,
        fontSize: compact ? "11px" : "12px",
        y: compact ? -40 : -42,
      },
    ];
    let y = compact ? -28 : -32;
    const perkStep = compact ? 14 : 16;
    const perkFs = compact ? "11px" : "12px";
    for (let i = 0; i < PERKS.length; i++) {
      const p = PERKS[i]!;
      const isUnlocked = unlocked.has(p.id);
      const isEquipped = equipped === p.id;
      const lock = isUnlocked ? "unlocked" : `locked (${p.cost} cr)`;
      const eq = isEquipped ? " [equipped]" : "";
      lines.push({
        text: `[${i + 1}] ${p.name} — ${lock}${eq}`,
        fontSize: perkFs,
        y,
      });
      y += perkStep;
    }
    y += compact ? 4 : 6;
    const hintFs = compact ? "11px" : "12px";
    lines.push({
      text: "Tap Start (below) or Space — 1–3: perks",
      fontSize: hintFs,
      y,
    });
    lines.push({
      text: "C: clear save (dev)",
      fontSize: hintFs,
      y: y + (compact ? 16 : 18),
    });
    lines.push({
      text: "R: restart (new layout)",
      fontSize: hintFs,
      y: y + (compact ? 32 : 36),
    });
    lines.push({
      text: `Premium: ${getPremiumNoAdsEnabled() ? "On" : "Off"}`,
      fontSize: hintFs,
      y: y + (compact ? 48 : 54),
    });
    lines.push({
      text: "P: toggle premium (dev)",
      fontSize: hintFs,
      y: y + (compact ? 64 : 72),
    });
    for (const line of lines) {
      const t = this.add.text(cx, cy + line.y, line.text, {
        fontSize: line.fontSize,
        color: "#e8e8ff",
      });
      t.setOrigin(0.5);
      t.setScrollFactor(0, 0);
      t.setDepth(TITLE_DEPTH);
      this.titleTexts.push(t);
    }
  }

  private syncDebugState(): void {
    this.maybeAwardRunCredits();
    if (
      this.runStarted &&
      (this.gameOver || this.gameWon) &&
      !this.sessionMetricsRecordedForRun
    ) {
      this.sessionMetricsRecordedForRun = true;
      const durationMs =
        this.runStartTime !== null ? performance.now() - this.runStartTime : 0;
      recordRunEnded({
        outcome: this.gameWon ? "win" : "loss",
        durationMs,
      });
    }
    const layout = this.activeLayout();
    const eventStates = layout.events.map((ev, i) => {
      const tid = this.eventRuntimeTypeIds[i] ?? ev.typeId;
      const t = getEventType(tid);
      return {
        id: tid,
        name: t.name,
        x: ev.grid.x,
        y: ev.grid.y,
        available: this.eventAvailable[i] ?? false,
        active: this.activeEventIndex === i,
      };
    });

    const currentEventId =
      this.activeEventIndex !== null
        ? (this.eventRuntimeTypeIds[this.activeEventIndex] ?? null)
        : null;
    const activeEnemy =
      this.enemies.find(
        (e) =>
          e.gridX === this.playerGridX && e.gridY === this.playerGridY && e.hp > 0
      ) ?? null;

    const touchUi = this.computeTouchUiFlags();

    publishGameDebugState({
      screenState: this.computeScreenState(),
      difficulty: this.selectedDifficulty,
      touchUi,
      layout: {
        id: layout.id,
        index: this.currentLayoutIndex,
        name: layout.name,
      },
      currentEventId,
      lastEventResult: this.lastEventResult,
      lastActionResult: this.latestMessageStr,
      playerPosition: { x: this.playerGridX, y: this.playerGridY },
      playerEnergy: this.player.energy,
      playerStress: this.player.stress,
      enemies: this.enemies.map((e) => ({
        name: e.name,
        x: e.gridX,
        y: e.gridY,
        hp: e.hp,
        damage: e.damage,
        stressPerHit: e.stressPerHit,
        alive: e.hp > 0,
      })),
      activeEnemy: activeEnemy
        ? {
            name: activeEnemy.name,
            hp: activeEnemy.hp,
            damage: activeEnemy.damage,
            stressPerHit: activeEnemy.stressPerHit,
            alive: activeEnemy.hp > 0,
          }
        : null,
      reward: {
        x: this.reward.gridX,
        y: this.reward.gridY,
        available: this.reward.available,
      },
      events: eventStates,
      exit: { x: layout.exit.x, y: layout.exit.y },
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
      gameWon: this.gameWon,
      runStats: {
        enemiesDefeated: this.enemiesDefeated,
        eventsResolved: this.eventsResolved,
      },
      latestMessage: this.latestMessageStr,
      meta: {
        officeCredits: getOfficeCredits(),
        equippedPerkId: getEquippedPerkId(),
        unlockedPerkIds: getUnlockedPerkIds(),
        creditsEarnedThisRun: this.creditsEarnedThisRun,
        metaLoadedFromStorage: wasMetaLoadedFromStorage(),
        activeRunModifiers:
          this.runStarted && !this.gameOver && !this.gameWon
            ? this.computeActiveRunModifiers()
            : undefined,
      },
      stats: getSessionStatsForDebug(),
      audio: { muted: this.sessionAudioMuted },
      monetization: {
        premiumEnabled: getPremiumNoAdsEnabled(),
        continueAvailable:
          this.runStarted &&
          this.gameOver &&
          !this.gameWon &&
          !this.continueUsedThisRun,
        continueUsedThisRun: this.continueUsedThisRun,
      },
    });
    this.updateHud();
    this.syncRunSummaryOverlay();
    this.syncTouchLayer();
    this.layoutStatusMessage();
  }

  private updateHud(): void {
    const layout = this.activeLayout();
    const eventActive = this.activeEventIndex !== null;
    const status = !this.runStarted
      ? "Ready"
      : this.gameOver
        ? "Game Over"
        : this.gameWon
          ? "Victory"
          : eventActive
            ? "Event Active"
            : "Running";
    const perkLine = this.formatHudPerkLine();
    const body = [
      `Layout: ${layout.name} [${layout.id}]`,
      `Energy: ${this.player.energy}/${this.effectiveMaxEnergy}`,
      `Stress: ${this.player.stress}/${this.effectiveMaxStress}`,
      ...(perkLine ? [perkLine] : []),
      `Status: ${status}`,
    ].join("\n");
    this.hudText.setStyle({ fontSize: this.hudFontSizePx() });
    this.hudText.setText(body);
    if (this.statusText) {
      this.statusText.setStyle({ fontSize: this.statusFontSizePx() });
    }
    const mirror = document.getElementById("hud-test-mirror");
    if (mirror) mirror.textContent = body;
  }

  private drawGrid(layout: LayoutDef): void {
    const g = this.add.graphics();
    this.gridBoardGraphics = g;
    const ts = this.grid.tileSize;

    for (let gy = 0; gy < this.grid.rows; gy++) {
      for (let gx = 0; gx < this.grid.cols; gx++) {
        const x = gx * ts;
        const y = gy * ts;
        const alt = (gx + gy) % 2 === 0;
        g.fillStyle(alt ? COLOR_TILE_A : COLOR_TILE_B, 1);
        g.fillRect(x, y, ts, ts);
      }
    }

    const tintCell = (gx: number, gy: number, color: number): void => {
      g.fillStyle(color, FLOOR_TINT_ALPHA);
      g.fillRect(gx * ts, gy * ts, ts, ts);
    };
    for (const e of layout.enemies) {
      tintCell(e.grid.x, e.grid.y, FLOOR_TINT_ENEMY);
    }
    for (const ev of layout.events) {
      tintCell(ev.grid.x, ev.grid.y, FLOOR_TINT_EVENT);
    }
    tintCell(layout.reward.grid.x, layout.reward.grid.y, FLOOR_TINT_REWARD);
    tintCell(layout.exit.x, layout.exit.y, FLOOR_TINT_EXIT);

    g.lineStyle(1, COLOR_GRID_LINE, 1);
    for (let i = 0; i <= this.grid.cols; i++) {
      const x = i * ts;
      g.lineBetween(x, 0, x, this.grid.rows * ts);
    }
    for (let j = 0; j <= this.grid.rows; j++) {
      const y = j * ts;
      g.lineBetween(0, y, this.grid.cols * ts, y);
    }
  }

  private tryCombatAtTile(gridX: number, gridY: number): void {
    const layout = this.activeLayout();
    const enemy = this.enemies.find(
      (e) => e.hp > 0 && e.gridX === gridX && e.gridY === gridY
    );
    if (!enemy) return;

    const idx = this.enemies.indexOf(enemy);
    const playerEnergyBefore = this.player.energy;
    const playerStressBefore = this.player.stress;
    const enemyHpBefore = enemy.hp;
    playCombatSfx();
    resolveCombat(this.player, enemy, this.playerDamagePerHit(layout));
    const playerEnergyLost = Math.max(0, playerEnergyBefore - this.player.energy);
    if (playerEnergyLost > 0) {
      playHurtSfx();
    }
    const playerStressGained = Math.max(0, this.player.stress - playerStressBefore);
    const enemyHpLost = Math.max(0, enemyHpBefore - enemy.hp);

    const pCenter = this.grid.gridToWorldCenter(gridX, gridY);
    if (enemyHpLost > 0) {
      const eCenter = this.grid.gridToWorldCenter(enemy.gridX, enemy.gridY);
      this.spawnFloater(eCenter.x, eCenter.y, `-${enemyHpLost} HP`, FLOAT_COLOR_HP_LOSS);
    }
    let combatFloaterRow = 0;
    if (playerEnergyLost > 0) {
      this.spawnFloater(
        pCenter.x,
        pCenter.y,
        `-${playerEnergyLost} Energy`,
        FLOAT_COLOR_ENERGY_LOSS,
        -14 * combatFloaterRow
      );
      combatFloaterRow += 1;
    }
    if (playerStressGained > 0) {
      this.spawnFloater(
        pCenter.x,
        pCenter.y,
        `+${playerStressGained} Stress`,
        FLOAT_COLOR_STRESS,
        -14 * combatFloaterRow
      );
    }

    if (this.playerRect) {
      this.playerRect.setFillStyle(0xff6666);
      this.time.delayedCall(100, () =>
        this.playerRect?.setFillStyle(COLOR_PLAYER)
      );
    }

    const er = this.enemyRects[idx];
    if (er && enemy.hp > 0) {
      const ec = enemy.color;
      er.setFillStyle(0xff4444);
      this.time.delayedCall(180, () => er.setFillStyle(ec));
    }

    if (enemy.hp <= 0) {
      this.enemiesDefeated += 1;
      const rect = this.enemyRects[idx];
      const label = this.enemyLabels[idx];
      if (rect) {
        rect.setFillStyle(0xffeedd);
        this.time.delayedCall(100, () => {
          rect.destroy();
          label?.destroy();
          this.enemyRects[idx] = null;
          this.enemyLabels[idx] = null;
        });
      }
    }

    this.checkRunEndAfterVitals(
      this.player.energy <= 0 ? `defeated by ${enemy.name}` : undefined
    );

    if (!this.gameOver) {
      if (enemy.hp <= 0) {
        this.setStatusMessage(
          `Defeated ${enemy.name} (enemy -${enemyHpLost} HP` +
            (playerEnergyLost > 0 ? `, took ${playerEnergyLost} damage` : "") +
            (playerStressGained > 0 ? `, +${playerStressGained} stress` : "") +
            ")"
        );
      } else {
        this.setStatusMessage(
          playerEnergyLost > 0
            ? `Took ${playerEnergyLost} damage (${enemy.name}, enemy -${enemyHpLost} HP` +
                (playerStressGained > 0 ? `, +${playerStressGained} stress` : "")
            : `No damage — ${enemy.name} (enemy -${enemyHpLost} HP` +
                (playerStressGained > 0 ? `, +${playerStressGained} stress` : "") +
                ")"
        );
      }
    }
  }

  private tryRewardAtTile(gridX: number, gridY: number): void {
    const layout = this.activeLayout();
    if (!this.reward.available) return;
    if (gridX !== this.reward.gridX || gridY !== this.reward.gridY) return;

    const energyBefore = this.player.energy;
    this.player.energy = Math.min(
      this.player.energy + layout.reward.energyRestore,
      this.effectiveMaxEnergy
    );
    const energyGained = this.player.energy - energyBefore;
    const rewardCenter = this.grid.gridToWorldCenter(gridX, gridY);
    if (energyGained > 0) {
      this.spawnFloater(
        rewardCenter.x,
        rewardCenter.y,
        `+${energyGained} Energy`,
        FLOAT_COLOR_ENERGY_GAIN
      );
      this.spawnFloater(
        rewardCenter.x,
        rewardCenter.y,
        "Gained Reward",
        FLOAT_COLOR_EVENT,
        -14
      );
    }
    this.reward.available = false;
    playRewardSfx();
    if (this.rewardRect) {
      this.rewardRect.destroy();
      this.rewardRect = null;
    }
    if (this.rewardLabel) {
      this.rewardLabel.destroy();
      this.rewardLabel = null;
    }
    this.setStatusMessage(
      energyGained > 0
        ? `Gained ${energyGained} energy`
        : "No energy gained (already at max)"
    );
    console.log("Reward collected");
    console.log("Player energy restored");
  }

  private tryExitAtTile(gridX: number, gridY: number): void {
    const layout = this.activeLayout();
    if (this.gameOver || this.gameWon) return;
    if (gridX !== layout.exit.x || gridY !== layout.exit.y) return;

    console.log("Exit reached");
    console.log("You Win");
    this.gameWon = true;
    playVictorySfx();
    this.setStatusMessage("You Win");
    if (this.exitRect) {
      this.exitRect.destroy();
      this.exitRect = null;
    }
    if (this.exitLabel) {
      this.exitLabel.destroy();
      this.exitLabel = null;
    }
  }

  private assignEventRuntimeTypes(layout: LayoutDef): void {
    const seed = parseEventSeedFromUrl();
    this.runEventRng =
      seed !== undefined
        ? new Phaser.Math.RandomDataGenerator(seed)
        : new Phaser.Math.RandomDataGenerator();
    if (parseUseLayoutEventTypesFromUrl()) {
      this.eventRuntimeTypeIds = layout.events.map((e) => e.typeId);
    } else {
      const pool = [...EVENT_POOL_IDS];
      this.eventRuntimeTypeIds = layout.events.map(() =>
        this.runEventRng.pick(pool)
      );
    }
  }

  /** 0–1 for instant-event stress chance; tests may override via `window.__odStressRoll`. */
  private eventStressRollFrac(): number {
    const fn = window.__odStressRoll;
    if (typeof fn === "function") return fn();
    return this.runEventRng.frac();
  }

  private resolveInstantEvent(idx: number): void {
    const typeId = this.eventRuntimeTypeIds[idx]!;
    const et = getEventType(typeId);
    if (et.kind !== "instant") return;

    const energyBefore = this.player.energy;
    const stressBefore = this.player.stress;

    let stressExtra = 0;
    if (this.eventStressRollFrac() < et.stressChance) {
      stressExtra = scaledStressGain(
        et.stressDeltaIfRoll,
        this.selectedDifficulty
      );
    }

    this.player.energy = Math.max(
      0,
      Math.min(
        this.effectiveMaxEnergy,
        this.player.energy + et.energyDelta
      )
    );
    this.player.stress = Math.max(0, this.player.stress + stressExtra);

    const dE = this.player.energy - energyBefore;
    const dS = this.player.stress - stressBefore;
    if (dE < 0) {
      playHurtSfx();
    }
    this.spawnEventOutcomeFloaters(dE, dS);

    const detail: string[] = [];
    if (et.energyDelta !== 0) {
      detail.push(this.formatSigned(et.energyDelta, "Energy"));
    }
    if (stressExtra !== 0) {
      detail.push(this.formatSigned(stressExtra, "Stress"));
    }
    this.lastEventResult =
      detail.length > 0 ? `${et.name}: ${detail.join(", ")}` : et.name;

    if (dE === 0 && dS > 0) {
      this.setStatusMessage("Stress increased");
    } else if (dE === 0 && dS < 0) {
      this.setStatusMessage("Stress decreased");
    } else {
      this.setStatusMessage(this.lastEventResult);
    }
    console.log("Event resolved (instant)");
    this.eventsResolved += 1;
    this.eventAvailable[idx] = false;

    this.checkRunEndAfterVitals();

    const er = this.eventRects[idx];
    if (er) {
      er.destroy();
      this.eventRects[idx] = null;
    }
    const evl = this.eventLabels[idx];
    if (evl) {
      evl.destroy();
      this.eventLabels[idx] = null;
    }
  }

  private tryEventAtTile(gridX: number, gridY: number): void {
    const layout = this.activeLayout();
    if (this.activeEventIndex !== null) return;
    for (let i = 0; i < layout.events.length; i++) {
      if (!this.eventAvailable[i]) continue;
      const eg = layout.events[i].grid;
      if (gridX !== eg.x || gridY !== eg.y) continue;

      const typeId = this.eventRuntimeTypeIds[i] ?? layout.events[i].typeId;
      const et = getEventType(typeId);
      if (et.kind === "instant") {
        console.log("Event triggered");
        this.resolveInstantEvent(i);
        this.syncDebugState();
        return;
      }

      this.activeEventIndex = i;
      console.log("Event triggered");
      this.setStatusMessage(`Event: ${et.name} (choose Y/N)`);
      if (this.eventPromptText) {
        this.eventPromptText.destroy();
        this.eventPromptText = null;
      }
      const wrapW = Math.max(120, this.scale.width - 24);
      this.eventPromptText = this.add.text(8, this.eventPromptScreenY(), et.prompt, {
        fontSize: this.isCompactViewport() ? "12px" : "14px",
        color: "#e8e8ff",
        backgroundColor: "#1a1a2e",
        padding: { x: 8, y: 6 },
        wordWrap: { width: wrapW },
      });
      this.eventPromptText.setLineSpacing(3);
      this.eventPromptText.setScrollFactor(0, 0);
      this.eventPromptText.setDepth(EVENT_PROMPT_DEPTH);
      this.syncDebugState();
      return;
    }
  }

  private resolveEventChoice(listen: boolean): void {
    console.log("Event choice selected");
    if (this.activeEventIndex === null) return;
    const idx = this.activeEventIndex;
    const typeId = this.eventRuntimeTypeIds[idx]!;
    const et = getEventType(typeId);
    if (!isChoiceEvent(et)) return;
    playEventChoiceSfx();
    const choice = listen ? et.choiceY : et.choiceN;
    const stressDelta = scaledStressGain(
      choice.stressDelta,
      this.selectedDifficulty
    );
    const energyBefore = this.player.energy;
    const stressBefore = this.player.stress;
    this.player.energy = Math.max(
      0,
      Math.min(
        this.effectiveMaxEnergy,
        this.player.energy + choice.energyDelta
      )
    );
    this.player.stress = Math.max(0, this.player.stress + stressDelta);
    const dE = this.player.energy - energyBefore;
    const dS = this.player.stress - stressBefore;
    if (dE < 0) {
      playHurtSfx();
    }
    this.spawnEventOutcomeFloaters(dE, dS);
    this.lastEventResult = `${et.name}: ${choice.label} (${this.formatSigned(choice.energyDelta, "Energy")}, ${this.formatSigned(stressDelta, "Stress")})`;
    console.log("Event resolved");
    this.eventsResolved += 1;
    this.eventAvailable[idx] = false;
    this.activeEventIndex = null;
    if (dE === 0 && dS > 0) {
      this.setStatusMessage("Stress increased");
    } else if (dE === 0 && dS < 0) {
      this.setStatusMessage("Stress decreased");
    } else if (dE > 0 && dS === 0) {
      this.setStatusMessage(`Gained ${dE} energy`);
    } else if (dE < 0 && dS === 0) {
      this.setStatusMessage(`Lost ${-dE} energy`);
    } else {
      this.setStatusMessage(this.lastEventResult);
    }
    if (this.eventPromptText) {
      this.eventPromptText.destroy();
      this.eventPromptText = null;
    }
    const er = this.eventRects[idx];
    if (er) {
      er.destroy();
      this.eventRects[idx] = null;
    }
    const evl = this.eventLabels[idx];
    if (evl) {
      evl.destroy();
      this.eventLabels[idx] = null;
    }
    this.checkRunEndAfterVitals();
    this.syncDebugState();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyRestart)) {
      this.runStarted = false;
      this.stopRunMusic();
      this.setupRunEntities(true);
      return;
    }

    if (
      this.runStarted &&
      this.gameOver &&
      !this.gameWon &&
      !this.continueUsedThisRun &&
      Phaser.Input.Keyboard.JustDown(this.keyContinueReward)
    ) {
      this.performRewardedContinue();
      return;
    }

    if (
      this.runStarted &&
      (this.gameOver || this.gameWon) &&
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      this.runStarted = false;
      this.stopRunMusic();
      this.setupRunEntities(true);
      return;
    }

    if (!this.runStarted) {
      if (Phaser.Input.Keyboard.JustDown(this.keyPremiumToggle)) {
        setPremiumNoAdsEnabled(!getPremiumNoAdsEnabled());
        this.showTitleOverlay();
        this.syncDebugState();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyBracketLeft)) {
        this.selectedDifficulty = cycleDifficulty(this.selectedDifficulty, -1);
        this.showTitleOverlay();
        this.syncDebugState();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyBracketRight)) {
        this.selectedDifficulty = cycleDifficulty(this.selectedDifficulty, 1);
        this.showTitleOverlay();
        this.syncDebugState();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyClearSave)) {
        clearMetaState();
        console.log("Save cleared");
        this.setStatusMessage("Save cleared");
        this.showTitleOverlay();
        this.syncDebugState();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyPerk1)) {
        const r = tryTitlePerkKey(0);
        if (r === "no_credits") this.setStatusMessage("Not enough credits");
        this.setupRunEntities(false);
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyPerk2)) {
        const r = tryTitlePerkKey(1);
        if (r === "no_credits") this.setStatusMessage("Not enough credits");
        this.setupRunEntities(false);
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyPerk3)) {
        const r = tryTitlePerkKey(2);
        if (r === "no_credits") this.setStatusMessage("Not enough credits");
        this.setupRunEntities(false);
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
        this.startRunFromTouch();
      }
      return;
    }

    if (this.activeEventIndex !== null) {
      if (Phaser.Input.Keyboard.JustDown(this.keyY)) {
        this.resolveEventChoice(true);
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyN)) {
        this.resolveEventChoice(false);
        return;
      }
      return;
    }

    if (!this.cursors || this.gameOver || this.gameWon) return;

    let dx = 0;
    let dy = 0;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) dy = -1;
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) dy = 1;
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) dx = -1;
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) dx = 1;

    if (dx === 0 && dy === 0) return;

    this.tryStep(dx, dy);
  }
}
