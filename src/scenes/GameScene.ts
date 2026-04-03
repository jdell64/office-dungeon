import Phaser from "phaser";
import {
  ENCOUNTER_POOL_IDS,
  getEncounterById,
  type ResolvedEncounterChoice,
} from "../data/encounters";
import {
  EVENT_POOL_IDS,
  getEnemyType,
  getEventType,
  isChoiceEvent,
  layoutBlockedSet,
  LAYOUTS,
  warnBlockedTileEntityOverlaps,
  warnIfExitUnreachable,
  type EventChoiceDef,
  type LayoutDef,
} from "../data/layouts";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { Reward } from "../entities/Reward";
import { GridSystem } from "../systems/GridSystem";
import {
  publishGameDebugState,
  type GameDebugState,
  type ScreenState,
} from "../debug/gameState";
import {
  playEventChoiceSfx,
  playGameOverSfx,
  playHurtSfx,
  playMoveSfx,
  playRewardSfx,
  playVictorySfx,
  setAudioScene,
  setSessionAudioMute,
} from "../audio/soundHooks";
import {
  MAX_RELIC_SLOTS,
  RELIC_SLOT_UNLOCK_RULES,
  RELICS,
  aggregatedDamageBonus,
  aggregatedStartEnergyBonus,
  aggregatedStartStressReduction,
  countRelicEffects,
  getRelicById,
  resolveEncounterChoiceWithRelics,
} from "../meta/relics";
import {
  clearMetaState,
  wasMetaLoadedFromStorage,
} from "../meta/metaStorage";
import {
  addOfficeCredits,
  clearRelicSlot,
  getEquippedRelicIds,
  getEquippedRelicSlots,
  getNextRelicUnlockTease,
  getOfficeCredits,
  getRelicSlotCount,
  getUnlockedRelicIds,
  tryAssignRelicToSlot,
  tryUnlockNextRelicSlot,
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
  difficultyHudIcon,
  difficultyLabel,
  energyBonus,
  scaledEnemyDamage,
  scaledStressGain,
  type Difficulty,
} from "../game/difficulty";
import { uiTextStyle } from "../ui/uiText";

const PLAYER_PADDING = 7;
/** Manhattan distance to exit for "So close..." on loss. */
const NEAR_EXIT_DISTANCE = 2;
/** Fixed run goal for work progress (phase 2 core loop). */
const RUN_WORK_TARGET = 32;
/** Work granted when an office encounter removes an enemy (not per choice). */
const WORK_PER_ENEMY_DEFEAT = 6;
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
/** Solid fill for non-walkable layout cells. */
const COLOR_BLOCKED_TILE = 0x2e2820;
const COLOR_BLOCKED_EDGE = 0x1a1612;
const STROKE_WIDTH = 3;
/** Player token reads slightly stronger than enemies. */
const PLAYER_STROKE_WIDTH = 4;
const ENTITY_DEPTH = 8;
const LABEL_DEPTH = 9;
/** Transient float text above tiles (below HUD). */
const JUICE_DEPTH = 10;
/** Brief destination-tile highlight under entities. */
const TILE_FLASH_DEPTH = 7;
const TILE_FLASH_MS = 200;
/** Floating "+1 Energy" / event juice text; keep on screen long enough to read. */
const FLOATER_LIFETIME_MS = 1300;
const FLOAT_COLOR_HP_LOSS = "#ff8888";
const FLOAT_COLOR_ENERGY_LOSS = "#ff9966";
const FLOAT_COLOR_ENERGY_GAIN = "#eecc44";
const FLOAT_COLOR_STRESS = "#dd99ee";
const FLOAT_COLOR_EVENT = "#cceeff";
const FLOAT_COLOR_CREDITS = "#ffdd44";
const HUD_DEPTH = 1000;
const STATUS_DEPTH = 1001;
const TITLE_DEPTH = 1002;
/** Above HUD/status so the start screen dims them; below title copy (TITLE_DEPTH). */
const TITLE_BACKDROP_DEPTH = 1001.5;
const SUMMARY_DEPTH = 1003;
/** Footer encounter/event prompt copy (above phase lines, below board). */
const FOOTER_PROMPT_DEPTH = 998;
/** Header strip behind compact HUD. */
const HUD_BAR_DEPTH = 996;
const TOUCH_UI_DEPTH = 1100;
const TOUCH_LABEL_DEPTH = 1101;
const COMPACT_VIEWPORT_MAX = 520;
/** Show D-pad when parent/CSS viewport is narrower than this (desktop hides pad). */
const TOUCH_MOVEMENT_PARENT_MAX_WIDTH = 700;
const TOUCH_EDGE_INSET = 16;
/** D-pad arrow cell size (compact). */
const TOUCH_PAD_BTN = 36;
/**
 * Center-to-center offset from D-pad middle to each arrow (horizontal/vertical).
 * Must be ≥ `TOUCH_PAD_BTN` so adjacent cells do not overlap (stroke is drawn on the rect edge).
 */
const TOUCH_MOVEMENT_GAP = 40;
/** Event choice + Start / Restart / Continue banner height. */
const TOUCH_BTN = 40;
const TOUCH_BANNER_GAP = 8;
/** Encounter/event choice tiles: min height, max height, font auto-fit range. */
const TOUCH_CHOICE_MIN_H = 52;
const TOUCH_CHOICE_MAX_H = 102;
const TOUCH_CHOICE_FONT_MAX_PX = 11;
const TOUCH_CHOICE_FONT_MIN_PX = 8;
const TOUCH_CHOICE_PAD_Y = 10;
/** Gap between status line and top of choice / movement band. */
const FOOTER_ABOVE_CHOICE_GAP_PX = 8;
/** Fill alpha for touch chrome (readable but not dominant). */
const TOUCH_FILL_ALPHA = 0.58;
const TOUCH_STROKE_WIDTH = 1;
const TOUCH_STROKE_ALPHA = 0.85;
const COLOR_TOUCH_BG = 0x3a3a55;
const COLOR_TOUCH_STROKE = 0x6e6e8a;

/**
 * Screen layout: three vertical zones (header / board / footer).
 * Header: compact run stats. Board: grid + entities (starts at `boardWorldOffsetY()`).
 * Footer: prompts, phase + last action, touch controls (see `layoutFooterMessages`).
 */
const UI_HEADER_PX = 44;
/** Minimum reserved height for encounter/event prompt (actual height measured + clamped). */
const FOOTER_PROMPT_RESERVE_PX = 56;
/** Run phase label (Ready / Running / …). */
const FOOTER_PHASE_LINE_PX = 15;
/** Last-action line under phase. */
const FOOTER_LAST_LINE_PX = 15;
const FOOTER_STACK_GAP_PX = 4;
/** Vertical band for D-pad (movement) or tall encounter choice row. */
const FOOTER_DPAD_ZONE_PX =
  TOUCH_MOVEMENT_GAP * 2 + TOUCH_PAD_BTN + 12;
/** Room for wrapped encounter title + body before phase line (see `layoutFooterMessages`). */
const FOOTER_PROMPT_BUDGET_PX = 112;
/**
 * Footer height = prompt + phase + last + gap + controls band.
 * Must fit tall 3-line choice labels + title screen banners.
 */
const UI_FOOTER_PX = Math.max(
  FOOTER_PROMPT_BUDGET_PX +
    FOOTER_PHASE_LINE_PX +
    FOOTER_LAST_LINE_PX +
    FOOTER_STACK_GAP_PX +
    FOOTER_ABOVE_CHOICE_GAP_PX +
    TOUCH_CHOICE_MAX_H,
  FOOTER_PROMPT_RESERVE_PX +
    FOOTER_PHASE_LINE_PX +
    FOOTER_LAST_LINE_PX +
    FOOTER_STACK_GAP_PX +
    FOOTER_DPAD_ZONE_PX,
  12 + TOUCH_BTN * 2 + TOUCH_BANNER_GAP + TOUCH_BTN / 2 + 8
);

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

/** Deterministic encounter picks for enemies without layout `encounterId` (matches event tile QA URLs). */
function useDeterministicEnemyEncounters(): boolean {
  const q = new URLSearchParams(window.location.search);
  return (
    q.get("eventRandom") === "0" || q.get("enemyEncounterRandom") === "0"
  );
}

export class GameScene extends Phaser.Scene {
  private grid!: GridSystem;
  /** Current layout's blocked cells (`"x,y"` keys). */
  private blockedCells = new Set<string>();
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
  /** Multiline prompt in footer (encounter / choice event). */
  private footerPromptText: Phaser.GameObjects.Text | null = null;
  private playerGridX = 0;
  private playerGridY = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyRestart!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyY!: Phaser.Input.Keyboard.Key;
  private keyN!: Phaser.Input.Keyboard.Key;
  private keyB!: Phaser.Input.Keyboard.Key;
  private keyRelicCatalog1!: Phaser.Input.Keyboard.Key;
  private keyRelicCatalog2!: Phaser.Input.Keyboard.Key;
  private keyRelicCatalog3!: Phaser.Input.Keyboard.Key;
  private keyRelicSlotPrev!: Phaser.Input.Keyboard.Key;
  private keyRelicSlotNext!: Phaser.Input.Keyboard.Key;
  private keyRelicSlotClear!: Phaser.Input.Keyboard.Key;
  private keyRelicSlotUnlock!: Phaser.Input.Keyboard.Key;
  /** Title loadout: focused slot index (not persisted). */
  private titleFocusedRelicSlot = 0;
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
  private workDone = 0;
  private workTarget = RUN_WORK_TARGET;
  /** Successful grid moves this run (optional summary / debug). */
  private turnsTaken = 0;
  private creditsAwardedForCurrentRun = false;
  private creditsEarnedThisRun = 0;
  /** Office credits already granted via encounters/pickups this run (end-of-run bonus subtracts this). */
  private creditsGrantedDuringRun = 0;
  /** Per-run cap for energy (reward/event clamps); may exceed layout max with Extra Coffee. */
  private effectiveMaxEnergy = 5;
  /** Per-run stress ceiling (from layout); at or above = burnout. */
  private effectiveMaxStress = 8;
  private gameOverReason: "burnout" | "no_energy" | null = null;
  /** Rewarded continue placeholder; resets each new run. */
  private continueUsedThisRun = false;
  private runSummaryBg: Phaser.GameObjects.Graphics | null = null;
  private runSummaryText: Phaser.GameObjects.Text | null = null;
  private hudBarGraphics: Phaser.GameObjects.Graphics | null = null;
  private hudText!: Phaser.GameObjects.Text;
  /** Footer: Ready / Running / Event / … */
  private footerPhaseText: Phaser.GameObjects.Text | null = null;
  /** Footer: last action (`Last: …` while in a run). */
  private statusText: Phaser.GameObjects.Text | null = null;
  private latestMessageStr = "";
  private playerLabel: Phaser.GameObjects.Text | null = null;
  private enemyLabels: (Phaser.GameObjects.Text | null)[] = [];
  private rewardLabel: Phaser.GameObjects.Text | null = null;
  private exitLabel: Phaser.GameObjects.Text | null = null;
  private eventLabels: (Phaser.GameObjects.Text | null)[] = [];
  /** Per slot, actual event type for this run (random pool or layout `typeId`). */
  private eventRuntimeTypeIds: string[] = [];
  /** Per enemy index, encounter id for this run (layout override or pool). */
  private enemyRuntimeEncounterIds: string[] = [];
  private runEventRng = new Phaser.Math.RandomDataGenerator();
  /** Enemy index when an office encounter prompt is open (mutually exclusive with activeEventIndex). */
  private activeEncounterEnemyIndex: number | null = null;
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
  /** Vertical center of D-pad or event choice row (updated in `syncTouchLayer`). */
  private choiceBandCenterY = 0;
  /** Row height for event choices, or movement band height for layout spacing. */
  private choiceBandRowH = TOUCH_MOVEMENT_GAP * 2 + TOUCH_PAD_BTN;

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

  /** World Y offset where the grid and entities are drawn (below header). */
  private boardWorldOffsetY(): number {
    return UI_HEADER_PX;
  }

  /** Top Y of the footer panel (below board). */
  private footerTopY(): number {
    return UI_HEADER_PX + this.grid.rows * this.grid.tileSize;
  }

  /** Tile center in world space; accounts for header offset. */
  private boardCellCenter(gridX: number, gridY: number): { x: number; y: number } {
    const p = this.grid.gridToWorldCenter(gridX, gridY);
    return { x: p.x, y: p.y + this.boardWorldOffsetY() };
  }

  /** Fallback before `syncTouchLayer` has run (matches legacy footer math). */
  private computeDefaultChoiceBandCenterY(): number {
    return (
      this.footerTopY() +
      FOOTER_PROMPT_RESERVE_PX +
      FOOTER_PHASE_LINE_PX +
      FOOTER_LAST_LINE_PX +
      FOOTER_STACK_GAP_PX +
      TOUCH_MOVEMENT_GAP +
      TOUCH_PAD_BTN / 2
    );
  }

  /** Vertical center of D-pad / event choice row inside the footer. */
  private touchControlsCenterY(): number {
    if (this.touchLayerReady && this.choiceBandCenterY > 0) {
      return this.choiceBandCenterY;
    }
    return this.computeDefaultChoiceBandCenterY();
  }

  private clearFooterPrompt(): void {
    this.footerPromptText?.destroy();
    this.footerPromptText = null;
  }

  /**
   * Encounter/event copy in the footer prompt band (keeps the board clean).
   * Choice labels use on-screen buttons; keyboard Y/N/B remains unchanged in input handling.
   */
  private showFooterPrompt(title: string, body: string): void {
    this.clearFooterPrompt();
    const wrapW = Math.max(100, this.scale.width - 2 * TOUCH_EDGE_INSET);
    const lines = [title, "", body].join("\n");
    this.footerPromptText = this.add.text(
      TOUCH_EDGE_INSET,
      this.footerTopY() + 2,
      lines,
      uiTextStyle({
        fontSize: this.isCompactViewport() ? "10px" : "11px",
        color: "#d8d8ee",
        wordWrap: { width: wrapW },
        lineSpacing: 2,
      })
    );
    this.footerPromptText.setOrigin(0, 0);
    this.footerPromptText.setScrollFactor(0, 0);
    this.footerPromptText.setDepth(FOOTER_PROMPT_DEPTH);
  }

  /** Semi-opaque bar behind compact HUD text. */
  private layoutHeaderBar(): void {
    const w = this.scale.width;
    const g = this.hudBarGraphics;
    if (!g) return;
    g.clear();
    g.fillStyle(0x1e1e2e, 0.92);
    g.fillRect(0, 0, w, UI_HEADER_PX);
    g.lineStyle(1, 0x3a3a55, 0.9);
    g.lineBetween(0, UI_HEADER_PX, w, UI_HEADER_PX);
    this.hudText.setPosition(TOUCH_EDGE_INSET, UI_HEADER_PX / 2);
    this.hudText.setOrigin(0, 0.5);
  }

  /** Phase + last-action lines under the prompt band. */
  private layoutFooterMessages(): void {
    if (!this.footerPhaseText || !this.statusText) return;
    const ft = this.footerTopY();
    const bandCenter = this.touchLayerReady
      ? this.choiceBandCenterY
      : this.computeDefaultChoiceBandCenterY();
    const bandH = this.touchLayerReady
      ? this.choiceBandRowH
      : TOUCH_MOVEMENT_GAP * 2 + TOUCH_PAD_BTN;
    const rowTop = bandCenter - bandH / 2;
    const yLast = rowTop - FOOTER_ABOVE_CHOICE_GAP_PX - FOOTER_LAST_LINE_PX;
    const yPhase = yLast - FOOTER_PHASE_LINE_PX;

    if (this.footerPromptText) {
      const wrapW = Math.max(100, this.scale.width - 2 * TOUCH_EDGE_INSET);
      this.footerPromptText.setPosition(TOUCH_EDGE_INSET, ft + 4);
      const maxBottom = yPhase - 6;
      let fp = this.isCompactViewport() ? 10 : 11;
      for (; fp >= 8; fp--) {
        this.footerPromptText.setStyle(
          uiTextStyle({
            fontSize: `${fp}px`,
            color: "#d8d8ee",
            wordWrap: { width: wrapW },
            lineSpacing: 2,
          })
        );
        if (this.footerPromptText.getBounds().bottom <= maxBottom) break;
      }
    }

    this.footerPhaseText.setPosition(TOUCH_EDGE_INSET, yPhase);
    this.footerPhaseText.setOrigin(0, 0);
    this.statusText.setPosition(TOUCH_EDGE_INSET, yLast);
    this.statusText.setOrigin(0, 0);
    this.syncFooterTestMirror();
  }

  /** DOM mirror for Playwright (footer text is not in the canvas DOM). */
  private syncFooterTestMirror(): void {
    const el = document.getElementById("footer-test-mirror");
    if (!el || !this.footerPhaseText || !this.statusText) return;
    el.textContent = `${this.footerPhaseText.text}\n${this.statusText.text}`;
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
    const relicIds = getEquippedRelicIds();
    const eBonus = aggregatedStartEnergyBonus(relicIds);
    if (eBonus > 0) {
      energy += eBonus;
      this.effectiveMaxEnergy = layout.player.maxEnergy + eBonus;
    }
    const sRed = aggregatedStartStressReduction(relicIds);
    if (sRed > 0) {
      stress = Math.max(0, stress - sRed);
    }
    const diffEnergy = energyBonus(this.selectedDifficulty);
    energy = Math.max(1, energy + diffEnergy);
    this.effectiveMaxEnergy = Math.max(1, this.effectiveMaxEnergy + diffEnergy);
    return { startEnergy: energy, startStress: stress };
  }

  private playerDamagePerHit(layout: LayoutDef): number {
    let hit = layout.player.damagePerHit;
    hit += aggregatedDamageBonus(getEquippedRelicIds());
    return hit;
  }

  /**
   * End-of-run credits from work performance (prompt4). In-run encounter grants
   * reduce the top-up so nothing is double-awarded.
   */
  private computeRunPerformanceCredits(): number {
    let base = Math.floor(this.workDone / 2);
    if (this.gameWon) base += 5;
    base += Math.floor(Math.max(0, this.player.energy) / 2);
    return Math.max(1, base);
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
    const performanceTotal = this.computeRunPerformanceCredits();
    const remainder = Math.max(0, performanceTotal - this.creditsGrantedDuringRun);
    if (remainder > 0) {
      addOfficeCredits(remainder);
    }
    this.creditsEarnedThisRun = this.creditsGrantedDuringRun + remainder;
  }

  /** Immediate meta credits during a run (encounter choices); end-of-run grant is reduced so nothing double-pays. */
  private grantOfficeCreditsDuringRun(amount: number): void {
    if (amount <= 0) return;
    addOfficeCredits(amount);
    this.creditsGrantedDuringRun += amount;
  }

  /**
   * Ends the run if energy is depleted or stress hits the ceiling (energy checked first).
   * @param energyDetail optional extra context for logs only (no-energy UI is fixed copy).
   */
  private checkRunEndAfterVitals(energyDetail?: string): void {
    if (this.gameOver || this.gameWon) return;
    if (this.player.energy <= 0) {
      this.gameOver = true;
      this.gameOverReason = "no_energy";
      playGameOverSfx();
      if (energyDetail) {
        console.log(`Game Over (no energy): ${energyDetail}`);
      } else {
        console.log("Game Over");
      }
      this.setStatusMessage("Sent home early");
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

  private checkForWin(): void {
    if (!this.runStarted || this.gameOver || this.gameWon) return;
    if (this.workDone < this.workTarget) return;
    this.gameWon = true;
    playVictorySfx();
    this.setStatusMessage("Work day complete");
    console.log("Work day complete");
    this.syncTouchLayer();
    this.syncDebugState();
  }

  /** Adds work from an interaction and checks win (reward tile may call when granting work). */
  private addWork(amount: number): void {
    if (amount <= 0) return;
    if (!this.runStarted || this.gameOver || this.gameWon) return;
    this.workDone += amount;
    this.updateHud();
    this.checkForWin();
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

  /** Compact relic line for HUD (icons; avoids overflow with multiple relics). */
  private formatHudRelicsShort(): string | null {
    const ids = getEquippedRelicIds();
    if (ids.length === 0) return null;
    const icons = ids.map((id) => getRelicById(id)?.icon ?? "?").join("");
    if (icons.length <= 6) return icons;
    return `${ids.length} relics`;
  }

  private computeActiveRunModifiers():
    | GameDebugState["meta"]["activeRunModifiers"]
    | undefined {
    const c = countRelicEffects(getEquippedRelicIds());
    if (
      c.extraCoffee === 0 &&
      c.calmMind === 0 &&
      c.aggressiveReply === 0
    ) {
      return undefined;
    }
    const m: NonNullable<GameDebugState["meta"]["activeRunModifiers"]> = {};
    if (c.extraCoffee > 0) m.energyDelta = 2 * c.extraCoffee;
    if (c.calmMind > 0) m.stressDelta = -2 * c.calmMind;
    if (c.aggressiveReply > 0) m.damageBonus = c.aggressiveReply;
    return m;
  }

  private makeTileLabel(x: number, y: number, text: string): Phaser.GameObjects.Text {
    const fs = this.isCompactViewport() ? "10px" : "10px";
    const t = this.add.text(
      x,
      y,
      text,
      uiTextStyle({
        fontSize: fs,
        color: "#f4f4ff",
      })
    );
    t.setOrigin(0.5);
    t.setScrollFactor(0, 0);
    t.setDepth(LABEL_DEPTH);
    t.setStroke("#0a0a14", 3);
    return t;
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
    this.syncFooterTestMirror();
  }

  private formatSigned(value: number, label: string): string {
    if (value === 0) return `0 ${label}`;
    return `${value > 0 ? "+" : ""}${value} ${label}`;
  }

  private formatInteractionOutcomeParts(
    energyDelta: number,
    stressDelta: number,
    workDelta: number
  ): string {
    const parts: string[] = [];
    if (energyDelta !== 0) {
      parts.push(this.formatSigned(energyDelta, "energy"));
    }
    if (stressDelta !== 0) {
      parts.push(this.formatSigned(stressDelta, "stress"));
    }
    if (workDelta !== 0) {
      parts.push(this.formatSigned(workDelta, "work"));
    }
    return parts.join(", ");
  }

  private formatEventChoiceButtonText(choice: EventChoiceDef): string {
    const stress = scaledStressGain(choice.stressDelta, this.selectedDifficulty);
    const line2 = this.formatInteractionOutcomeParts(
      choice.energyDelta,
      stress,
      choice.workDelta
    );
    return line2 ? `${choice.label}\n${line2}` : choice.label;
  }

  private formatEncounterChoiceButtonText(
    resolved: ResolvedEncounterChoice
  ): string {
    const stress = scaledStressGain(
      resolved.stressDelta,
      this.selectedDifficulty
    );
    const parts: string[] = [];
    if (resolved.energyDelta !== 0) {
      parts.push(this.formatSigned(resolved.energyDelta, "energy"));
    }
    if (stress !== 0) {
      parts.push(this.formatSigned(stress, "stress"));
    }
    if (resolved.creditsDelta !== 0) {
      parts.push(this.formatSigned(resolved.creditsDelta, "credits"));
    }
    const line2 = parts.join(", ");
    return line2 ? `${resolved.label}\n${line2}` : resolved.label;
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
    const t = this.add.text(
      worldX,
      worldY + yOffsetPx,
      text,
      uiTextStyle({
        fontSize: fs,
        color,
      })
    );
    t.setOrigin(0.5);
    t.setDepth(JUICE_DEPTH);
    t.setStroke("#0a0a14", 3);
    this.time.delayedCall(FLOATER_LIFETIME_MS, () => {
      t.destroy();
    });
  }

  /** Numeric deltas plus `eventJuiceLabels` lines, stacked upward from the player tile. */
  private spawnEventOutcomeFloaters(
    dE: number,
    dS: number,
    dCredits = 0
  ): void {
    const { x, y } = this.boardCellCenter(
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
    if (dCredits !== 0) {
      line(
        `${dCredits > 0 ? "+" : ""}${dCredits} Credits`,
        FLOAT_COLOR_CREDITS
      );
    }
    for (const label of this.eventJuiceLabels(dE, dS)) {
      line(label, FLOAT_COLOR_EVENT);
    }
  }

  private isCompactViewport(): boolean {
    return Math.min(this.scale.width, this.scale.height) <= COMPACT_VIEWPORT_MAX;
  }

  /** Movement D-pad: narrow browser layout or small game frame (debug flags unchanged). */
  private showTouchMovementChrome(): boolean {
    const el = this.game.canvas?.parentElement;
    const pw =
      el?.clientWidth ??
      (typeof window !== "undefined" ? window.innerWidth : 800);
    return (
      pw < TOUCH_MOVEMENT_PARENT_MAX_WIDTH || this.isCompactViewport()
    );
  }

  private clampMovementPadCenterX(w: number): number {
    const halfSpan = TOUCH_MOVEMENT_GAP + TOUCH_PAD_BTN / 2;
    const minCx = TOUCH_EDGE_INSET + halfSpan;
    const maxCx = w - TOUCH_EDGE_INSET - halfSpan;
    if (minCx > maxCx) return w / 2;
    return Phaser.Math.Clamp(w / 2, minCx, maxCx);
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
    /** Keep grid legible when FIT scales a taller canvas (header + footer). */
    const chromeApprox = UI_HEADER_PX + UI_FOOTER_PX + 28;
    const maxBoardPx = Math.floor(
      Math.min(m * 0.58, Math.max(m * 0.42, ph - chromeApprox))
    );
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
        this.activeEncounterEnemyIndex === null &&
        !this.gameOver &&
        !this.gameWon,
      event:
        this.activeEventIndex !== null ||
        this.activeEncounterEnemyIndex !== null,
      start: !this.runStarted,
      restart: this.runStarted && (this.gameOver || this.gameWon),
      continueReward,
    };
  }

  private isBlockedTile(gridX: number, gridY: number): boolean {
    return this.blockedCells.has(`${gridX},${gridY}`);
  }

  /** One grid step; same rules as arrow keys (caller must gate by game state). */
  private tryStep(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const nx = this.playerGridX + dx;
    const ny = this.playerGridY + dy;
    if (!this.grid.isInBounds(nx, ny)) return;
    if (this.isBlockedTile(nx, ny)) {
      this.setStatusMessage("Blocked");
      return;
    }
    if (this.player.energy <= 0) {
      this.setStatusMessage("Too exhausted");
      this.checkRunEndAfterVitals();
      this.syncDebugState();
      return;
    }

    const ts = this.grid.tileSize;
    const dest = this.boardCellCenter(nx, ny);
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
    const { x, y } = this.boardCellCenter(
      this.playerGridX,
      this.playerGridY
    );
    this.playerRect!.setPosition(x, y);
    this.playerLabel?.setPosition(x, y);

    this.ensureAudioUnlocked();
    playMoveSfx();

    this.player.energy -= 1;
    this.turnsTaken += 1;

    if (this.tryEncounterAtTile(this.playerGridX, this.playerGridY)) {
      this.syncDebugState();
      return;
    }
    this.tryRewardAtTile(this.playerGridX, this.playerGridY);
    this.tryExitAtTile(this.playerGridX, this.playerGridY);
    this.tryEventAtTile(this.playerGridX, this.playerGridY);
    if (this.activeEventIndex !== null) {
      this.syncDebugState();
      return;
    }
    this.checkRunEndAfterVitals();
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
    this.dismissSummaryToTitle();
  }

  /** Rewarded ad / premium continue: refill energy to run max, clear game over, once per run. */
  private performRewardedContinue(): void {
    if (
      !this.runStarted ||
      !this.gameOver ||
      this.gameWon ||
      this.continueUsedThisRun
    ) {
      return;
    }
    this.player.energy = this.effectiveMaxEnergy;
    this.gameOver = false;
    this.gameOverReason = null;
    this.continueUsedThisRun = true;
    this.sessionMetricsRecordedForRun = false;
    this.setStatusMessage("Continue — energy restored");
    this.startRunMusicIfNeeded();
    this.syncDebugState();
  }

  private addTouchPadButton(
    x: number,
    y: number,
    letter: string,
    onPress: () => void
  ): void {
    const hit = this.add.rectangle(
      x,
      y,
      TOUCH_PAD_BTN,
      TOUCH_PAD_BTN,
      COLOR_TOUCH_BG,
      TOUCH_FILL_ALPHA
    );
    hit.setStrokeStyle(
      TOUCH_STROKE_WIDTH,
      COLOR_TOUCH_STROKE,
      TOUCH_STROKE_ALPHA
    );
    hit.setScrollFactor(0, 0);
    hit.setDepth(TOUCH_UI_DEPTH);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", onPress);
    const lab = this.add.text(
      x,
      y,
      letter,
      uiTextStyle({
        fontSize: "15px",
        color: "#e4e4f2",
      })
    );
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
    const hit = this.add.rectangle(x, y, w, h, COLOR_TOUCH_BG, TOUCH_FILL_ALPHA);
    hit.setStrokeStyle(
      TOUCH_STROKE_WIDTH,
      COLOR_TOUCH_STROKE,
      TOUCH_STROKE_ALPHA
    );
    hit.setScrollFactor(0, 0);
    hit.setDepth(TOUCH_UI_DEPTH);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", onPress);
    const lab = this.add.text(
      x,
      y,
      initial,
      uiTextStyle({
        fontSize: "11px",
        color: "#e4e4f2",
        align: "center",
        wordWrap: { width: w - 8 },
      })
    );
    lab.setOrigin(0.5);
    lab.setScrollFactor(0, 0);
    lab.setDepth(TOUCH_LABEL_DEPTH);
    this.touchEventHits.push(hit);
    this.touchEventLabels.push(lab);
  }

  /**
   * Shrinks choice label font until wrapped text fits in `TOUCH_CHOICE_MAX_H`.
   * Returns the hit box height to use for this column.
   */
  private fitTouchChoiceLabel(
    lab: Phaser.GameObjects.Text,
    wrapW: number
  ): number {
    if (!lab.text || lab.text.length === 0) {
      return TOUCH_CHOICE_MIN_H;
    }
    const innerMax = TOUCH_CHOICE_MAX_H - TOUCH_CHOICE_PAD_Y;
    for (let fs = TOUCH_CHOICE_FONT_MAX_PX; fs >= TOUCH_CHOICE_FONT_MIN_PX; fs--) {
      lab.setStyle(
        uiTextStyle({
          fontSize: `${fs}px`,
          color: "#e4e4f2",
          align: "center",
          wordWrap: { width: Math.max(32, wrapW) },
          lineSpacing: 2,
        })
      );
      if (lab.height <= innerMax || fs === TOUCH_CHOICE_FONT_MIN_PX) {
        return Math.max(
          TOUCH_CHOICE_MIN_H,
          Math.min(
            TOUCH_CHOICE_MAX_H,
            Math.ceil(lab.height + TOUCH_CHOICE_PAD_Y)
          )
        );
      }
    }
    return TOUCH_CHOICE_MAX_H;
  }

  private addTouchBannerButton(
    x: number,
    y: number,
    w: number,
    label: string,
    onPress: () => void
  ): { hit: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const h = TOUCH_BTN;
    const hit = this.add.rectangle(x, y, w, h, COLOR_TOUCH_BG, TOUCH_FILL_ALPHA);
    hit.setStrokeStyle(
      TOUCH_STROKE_WIDTH,
      COLOR_TOUCH_STROKE,
      TOUCH_STROKE_ALPHA
    );
    hit.setScrollFactor(0, 0);
    hit.setDepth(TOUCH_UI_DEPTH);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", onPress);
    const text = this.add.text(
      x,
      y,
      label,
      uiTextStyle({
        fontSize: "14px",
        color: "#e4e4f2",
      })
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0, 0);
    text.setDepth(TOUCH_LABEL_DEPTH);
    return { hit, text };
  }

  private createTouchControlsOnce(): void {
    if (this.touchLayerReady) return;

    const w = this.scale.width;
    const bottomPad = this.isCompactViewport() ? 8 : 12;
    const cx = this.clampMovementPadCenterX(w);
    const cy = this.touchControlsCenterY();

    this.addTouchPadButton(cx, cy - TOUCH_MOVEMENT_GAP, "↑", () =>
      this.computeTouchUiFlags().movement ? this.tryStep(0, -1) : undefined
    );
    this.addTouchPadButton(cx, cy + TOUCH_MOVEMENT_GAP, "↓", () =>
      this.computeTouchUiFlags().movement ? this.tryStep(0, 1) : undefined
    );
    this.addTouchPadButton(cx - TOUCH_MOVEMENT_GAP, cy, "←", () =>
      this.computeTouchUiFlags().movement ? this.tryStep(-1, 0) : undefined
    );
    this.addTouchPadButton(cx + TOUCH_MOVEMENT_GAP, cy, "→", () =>
      this.computeTouchUiFlags().movement ? this.tryStep(1, 0) : undefined
    );

    const evWCreate = 80;
    const evGapCreate = 8;
    this.addTouchChoiceButton(
      TOUCH_EDGE_INSET + evWCreate / 2,
      cy,
      "A",
      () => {
        if (!this.computeTouchUiFlags().event) return;
        if (this.activeEncounterEnemyIndex !== null) {
          this.resolveActiveEncounterChoice(0);
        } else {
          this.resolveEventChoice(true);
        }
      }
    );
    this.addTouchChoiceButton(
      TOUCH_EDGE_INSET + evWCreate + evGapCreate + evWCreate / 2,
      cy,
      "B",
      () => {
        if (!this.computeTouchUiFlags().event) return;
        if (this.activeEncounterEnemyIndex !== null) {
          this.resolveActiveEncounterChoice(1);
        } else {
          this.resolveEventChoice(false);
        }
      }
    );
    this.addTouchChoiceButton(
      TOUCH_EDGE_INSET +
        evWCreate * 2 +
        evGapCreate * 2 +
        evWCreate / 2,
      cy,
      "C",
      () => {
        if (!this.computeTouchUiFlags().event) return;
        if (this.activeEncounterEnemyIndex !== null) {
          const enc = getEncounterById(
            this.enemyRuntimeEncounterIds[this.activeEncounterEnemyIndex]!
          );
          if (enc.choices.length > 2) this.resolveActiveEncounterChoice(2);
        }
      }
    );

    const h = this.scale.height;
    const startPair = this.addTouchBannerButton(
      w / 2,
      h - bottomPad - TOUCH_BTN / 2,
      Math.min(200, w - 2 * TOUCH_EDGE_INSET),
      "Start",
      () => this.startRunFromTouch()
    );
    this.touchStartHit = startPair.hit;
    this.touchStartLabel = startPair.text;

    const restartY = h - bottomPad - TOUCH_BTN / 2;
    const continueY = restartY - TOUCH_BTN - TOUCH_BANNER_GAP;
    const bw = Math.min(200, w - 2 * TOUCH_EDGE_INSET);

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
        if (!this.computeTouchUiFlags().event) return;
        if (this.activeEncounterEnemyIndex !== null) {
          this.resolveActiveEncounterChoice(yes ? 0 : 1);
        } else {
          this.resolveEventChoice(yes);
        }
      },
      encounterChoice: (choiceIndex: 0 | 1 | 2) => {
        if (
          !this.computeTouchUiFlags().event ||
          this.activeEncounterEnemyIndex === null
        ) {
          return;
        }
        this.resolveActiveEncounterChoice(choiceIndex);
      },
      /** E2E: set stress then evaluate burnout (must be in an active run). */
      setStressForTest: (n: number) => {
        if (!this.runStarted || this.gameOver || this.gameWon) return;
        this.player.stress = n;
        this.checkRunEndAfterVitals();
        this.syncDebugState();
      },
      setEnergyForTest: (n: number, uncapped?: boolean) => {
        if (!this.runStarted || this.gameOver || this.gameWon) return;
        this.player.energy = uncapped
          ? Math.max(0, n)
          : Math.max(0, Math.min(this.effectiveMaxEnergy, n));
        this.updateHud();
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
    const cx = this.clampMovementPadCenterX(w);
    const flags = this.computeTouchUiFlags();

    const footerBottom = this.footerTopY() + UI_FOOTER_PX;
    const moveBandH = TOUCH_MOVEMENT_GAP * 2 + TOUCH_PAD_BTN;

    const usableW = w - 2 * TOUCH_EDGE_INSET;
    const evGap = 8;
    const threeChoiceEncounter =
      this.activeEncounterEnemyIndex !== null &&
      getEncounterById(
        this.enemyRuntimeEncounterIds[this.activeEncounterEnemyIndex]!
      ).choices.length > 2;
    const evW2 = Math.min(
      184,
      Math.max(88, Math.floor((usableW - evGap) / 2))
    );
    const evW3 = Math.min(
      140,
      Math.max(76, Math.floor((usableW - evGap * 2) / 3))
    );
    const evW = threeChoiceEncounter ? evW3 : evW2;
    const leftCx = TOUCH_EDGE_INSET + evW / 2;
    const midCx = TOUCH_EDGE_INSET + evW + evGap + evW / 2;
    const rightCx = TOUCH_EDGE_INSET + (evW + evGap) * 2 + evW / 2;
    const twoLeftCx = TOUCH_EDGE_INSET + evW2 / 2;
    const twoMidCx = TOUCH_EDGE_INSET + evW2 + evGap + evW2 / 2;

    if (flags.event && this.activeEventIndex !== null) {
      const idx = this.activeEventIndex;
      const typeId = this.eventRuntimeTypeIds[idx];
      if (typeId) {
        const et = getEventType(typeId);
        if (isChoiceEvent(et)) {
          this.touchEventLabels[0]?.setText(
            this.formatEventChoiceButtonText(et.choiceY)
          );
          this.touchEventLabels[1]?.setText(
            this.formatEventChoiceButtonText(et.choiceN)
          );
        }
      }
    } else if (flags.event && this.activeEncounterEnemyIndex !== null) {
      const eid =
        this.enemyRuntimeEncounterIds[this.activeEncounterEnemyIndex];
      if (eid) {
        const enc = getEncounterById(eid);
        const relicIds = getEquippedRelicIds();
        this.touchEventLabels[0]?.setText(
          this.formatEncounterChoiceButtonText(
            resolveEncounterChoiceWithRelics(enc.choices[0], relicIds)
          )
        );
        this.touchEventLabels[1]?.setText(
          this.formatEncounterChoiceButtonText(
            resolveEncounterChoiceWithRelics(enc.choices[1], relicIds)
          )
        );
        const third = enc.choices[2];
        if (third) {
          this.touchEventLabels[2]?.setText(
            this.formatEncounterChoiceButtonText(
              resolveEncounterChoiceWithRelics(third, relicIds)
            )
          );
        }
      }
    }

    let cy: number;
    let choiceRowH = moveBandH;
    if (flags.event) {
      const wrapPair = (threeChoiceEncounter ? evW : evW2) - 10;
      let maxFit = TOUCH_CHOICE_MIN_H;
      const l0 = this.touchEventLabels[0];
      const l1 = this.touchEventLabels[1];
      const l2 = this.touchEventLabels[2];
      if (l0) maxFit = Math.max(maxFit, this.fitTouchChoiceLabel(l0, wrapPair));
      if (l1) maxFit = Math.max(maxFit, this.fitTouchChoiceLabel(l1, wrapPair));
      if (threeChoiceEncounter && l2) {
        maxFit = Math.max(maxFit, this.fitTouchChoiceLabel(l2, evW3 - 10));
      }
      choiceRowH = Math.min(
        TOUCH_CHOICE_MAX_H,
        Math.max(TOUCH_CHOICE_MIN_H, maxFit)
      );
      cy = footerBottom - 14 - choiceRowH / 2;
      this.choiceBandCenterY = cy;
      this.choiceBandRowH = choiceRowH;
    } else {
      cy = footerBottom - 14 - moveBandH / 2;
      this.choiceBandCenterY = cy;
      this.choiceBandRowH = moveBandH;
    }

    const evY = cy;

    const padOrder = [
      { x: cx, y: cy - TOUCH_MOVEMENT_GAP },
      { x: cx, y: cy + TOUCH_MOVEMENT_GAP },
      { x: cx - TOUCH_MOVEMENT_GAP, y: cy },
      { x: cx + TOUCH_MOVEMENT_GAP, y: cy },
    ];
    for (let i = 0; i < 4; i++) {
      const pos = padOrder[i]!;
      this.touchMoveHits[i]?.setPosition(pos.x, pos.y);
      this.touchMoveLabels[i]?.setPosition(pos.x, pos.y);
    }

    this.touchEventHits[0]?.setPosition(
      threeChoiceEncounter ? leftCx : twoLeftCx,
      evY
    );
    this.touchEventHits[0]?.setSize(
      threeChoiceEncounter ? evW : evW2,
      choiceRowH
    );
    this.touchEventLabels[0]?.setPosition(
      threeChoiceEncounter ? leftCx : twoLeftCx,
      evY
    );
    this.touchEventLabels[0]?.setOrigin(0.5, 0.5);

    this.touchEventHits[1]?.setPosition(
      threeChoiceEncounter ? midCx : twoMidCx,
      evY
    );
    this.touchEventHits[1]?.setSize(
      threeChoiceEncounter ? evW : evW2,
      choiceRowH
    );
    this.touchEventLabels[1]?.setPosition(
      threeChoiceEncounter ? midCx : twoMidCx,
      evY
    );
    this.touchEventLabels[1]?.setOrigin(0.5, 0.5);

    this.touchEventHits[2]?.setPosition(rightCx, evY);
    this.touchEventHits[2]?.setSize(evW3, choiceRowH);
    this.touchEventLabels[2]?.setPosition(rightCx, evY);
    this.touchEventLabels[2]?.setOrigin(0.5, 0.5);

    const restartY = h - bottomPad - TOUCH_BTN / 2;
    const continueY = restartY - TOUCH_BTN - TOUCH_BANNER_GAP;
    const bw = Math.min(200, w - 2 * TOUCH_EDGE_INSET);
    this.touchStartHit?.setPosition(w / 2, restartY);
    this.touchStartLabel?.setPosition(w / 2, restartY);
    this.touchStartHit?.setSize(bw, TOUCH_BTN);
    this.touchRestartHit?.setPosition(w / 2, restartY);
    this.touchRestartLabel?.setPosition(w / 2, restartY);
    this.touchRestartHit?.setSize(bw, TOUCH_BTN);
    this.touchContinueHit?.setPosition(w / 2, continueY);
    this.touchContinueLabel?.setPosition(w / 2, continueY);
    this.touchContinueHit?.setSize(bw, TOUCH_BTN);
    const moveChrome =
      flags.movement && this.showTouchMovementChrome();
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

    setGroup(moveChrome, this.touchMoveHits, this.touchMoveLabels);

    if (flags.event) {
      const showThird = threeChoiceEncounter;
      for (let i = 0; i < 2; i++) {
        const hit = this.touchEventHits[i];
        const lab = this.touchEventLabels[i];
        if (hit) {
          hit.setVisible(true);
          hit.setInteractive({ useHandCursor: true });
        }
        if (lab) lab.setVisible(true);
      }
      const h2 = this.touchEventHits[2];
      const l2 = this.touchEventLabels[2];
      if (h2) {
        h2.setVisible(showThird);
        if (showThird) h2.setInteractive({ useHandCursor: true });
        else h2.disableInteractive();
      }
      if (l2) l2.setVisible(showThird);
    } else {
      for (const r of this.touchEventHits) {
        r.setVisible(false);
        r.disableInteractive();
      }
      for (const t of this.touchEventLabels) t.setVisible(false);
    }

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
    this.keyB = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.keyRelicCatalog1 = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ONE
    );
    this.keyRelicCatalog2 = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.TWO
    );
    this.keyRelicCatalog3 = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.THREE
    );
    this.keyRelicSlotPrev = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.COMMA
    );
    this.keyRelicSlotNext = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.PERIOD
    );
    this.keyRelicSlotClear = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ZERO
    );
    this.keyRelicSlotUnlock = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.U
    );
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

    const hudBar = this.add.graphics();
    hudBar.setScrollFactor(0, 0);
    hudBar.setDepth(HUD_BAR_DEPTH);
    this.hudBarGraphics = hudBar;

    this.hudText = this.add.text(
      0,
      0,
      "",
      uiTextStyle({
        fontSize: "14px",
        color: "#e8e8ff",
      })
    );
    this.hudText.setScrollFactor(0, 0);
    this.hudText.setDepth(HUD_DEPTH);

    this.footerPhaseText = this.add.text(
      0,
      0,
      "",
      uiTextStyle({
        fontSize: "12px",
        color: "#a8a8c8",
      })
    );
    this.footerPhaseText.setScrollFactor(0, 0);
    this.footerPhaseText.setDepth(STATUS_DEPTH);
    this.footerPhaseText.setVisible(false);

    this.statusText = this.add.text(
      0,
      0,
      "",
      uiTextStyle({
        fontSize: "13px",
        color: "#c8c8e8",
      })
    );
    this.statusText.setScrollFactor(0, 0);
    this.statusText.setDepth(STATUS_DEPTH);
    this.statusText.setVisible(false);

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
    const gridH = layout.grid.rows * tileSize;
    const h = UI_HEADER_PX + gridH + UI_FOOTER_PX;
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
    this.blockedCells = layoutBlockedSet(layout);
    warnBlockedTileEntityOverlaps(layout, this.blockedCells);
    warnIfExitUnreachable(layout, this.blockedCells);
    this.drawGrid(layout);

    this.gameOver = false;
    this.gameWon = false;
    this.gameOverReason = null;
    this.continueUsedThisRun = false;
    this.runStartTime = null;
    this.sessionMetricsRecordedForRun = false;
    this.enemiesDefeated = 0;
    this.eventsResolved = 0;
    this.workDone = 0;
    this.workTarget = RUN_WORK_TARGET;
    this.turnsTaken = 0;
    this.creditsAwardedForCurrentRun = false;
    this.creditsEarnedThisRun = 0;
    this.creditsGrantedDuringRun = 0;
    this.activeEventIndex = null;
    this.activeEncounterEnemyIndex = null;
    this.clearFooterPrompt();
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
    this.assignEnemyEncounterRuntimeIds(layout);

    const size = this.grid.tileSize - PLAYER_PADDING;

    const p = this.boardCellCenter(this.playerGridX, this.playerGridY);
    if (!this.playerRect) {
      this.playerRect = this.add.rectangle(p.x, p.y, size, size, COLOR_PLAYER);
      this.playerRect.setStrokeStyle(PLAYER_STROKE_WIDTH, 0x66ffcc);
      this.playerRect.setDepth(ENTITY_DEPTH);
    } else {
      this.playerRect.setPosition(p.x, p.y);
      this.playerRect.setStrokeStyle(PLAYER_STROKE_WIDTH, 0x66ffcc);
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
      const eWorld = this.boardCellCenter(enemy.gridX, enemy.gridY);
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
        rect.setStrokeStyle(4, 0xcc5533);
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

    const rWorld = this.boardCellCenter(
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
      this.rewardRect.setStrokeStyle(4, 0xeebb33);
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

    const exitWorld = this.boardCellCenter(
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
      this.exitRect.setStrokeStyle(4, 0x5588ff);
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
      const eventWorld = this.boardCellCenter(eg.x, eg.y);
      let rect = this.eventRects[i];
      if (!rect) {
        rect = this.add.rectangle(
          eventWorld.x,
          eventWorld.y,
          size,
          size,
          COLOR_EVENT
        );
        rect.setStrokeStyle(4, 0xcc77dd);
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

    this.layoutFooterMessages();
    this.setStatusMessage("");

    this.syncDebugState();
    if (logRestart) console.log("Run restarted");
    if (!this.runStarted) {
      this.showTitleOverlay();
    }
  }

  private computeScreenState(): ScreenState {
    if (!this.runStarted) return "title";
    if (
      this.activeEventIndex !== null ||
      this.activeEncounterEnemyIndex !== null
    ) {
      return "event";
    }
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

  /** Leave finished run for title / meta (new layout). Idempotent guards in caller. */
  private dismissSummaryToTitle(): void {
    if (!this.runStarted || (!this.gameOver && !this.gameWon)) return;
    this.runStarted = false;
    this.stopRunMusic();
    this.setupRunEntities(true);
  }

  private syncRunSummaryOverlay(): void {
    if (!this.runStarted || (!this.gameOver && !this.gameWon)) {
      this.hideRunSummaryOverlay();
      return;
    }

    const layout = this.activeLayout();
    const headline = this.gameWon ? "Work Day Complete" : "Sent Home Early";
    const flavorWin = "You made it through the day.";
    const flavorLoss = "You burned out before finishing.";

    const distToExit =
      Math.abs(this.playerGridX - layout.exit.x) +
      Math.abs(this.playerGridY - layout.exit.y);
    const lossEncouragement: string[] = [];
    if (this.gameOver) {
      if (distToExit <= NEAR_EXIT_DISTANCE) {
        lossEncouragement.push("So close...");
      }
      lossEncouragement.push("One more run?");
      const tease = getNextRelicUnlockTease();
      if (tease) lossEncouragement.push(tease);
    }

    const creditsLine = `Credits Earned: +${this.creditsEarnedThisRun}`;
    const creditsBlock = ["  ----------", `  ${creditsLine}`, "  ----------"].join(
      "\n"
    );
    const summaryLines: string[] = [
      headline,
      "",
      `Work Completed: ${this.workDone} / ${this.workTarget}`,
      "",
      creditsBlock,
      "",
      this.gameWon ? flavorWin : flavorLoss,
    ];
    if (lossEncouragement.length) {
      summaryLines.push("", ...lossEncouragement);
    }
    summaryLines.push(
      "",
      `Total Office Credits: ${getOfficeCredits()}`,
      "",
      "Press any key or tap here to continue (Space / R)",
      "— or tap Restart below —"
    );
    if (this.gameOver) {
      if (!this.continueUsedThisRun) {
        summaryLines.push("", "Continue: available");
        const contLabel = getPremiumNoAdsEnabled() ? "Continue" : "Continue (Ad)";
        summaryLines.push(`Press Enter — ${contLabel} (resume run)`);
      } else {
        summaryLines.push("", "Continue: used this run");
      }
    }

    const body = summaryLines.join("\n");

    const vw = this.scale.width;
    const vh = this.scale.height;

    if (!this.runSummaryBg) {
      const g = this.add.graphics();
      g.fillStyle(0x141428, 0.88);
      g.fillRect(0, 0, vw, vh);
      g.setScrollFactor(0, 0);
      g.setDepth(SUMMARY_DEPTH);
      g.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, vw, vh),
        Phaser.Geom.Rectangle.Contains
      );
      g.on("pointerdown", () => this.dismissSummaryToTitle());
      this.runSummaryBg = g;
    } else {
      this.runSummaryBg.clear();
      this.runSummaryBg.fillStyle(0x141428, 0.88);
      this.runSummaryBg.fillRect(0, 0, vw, vh);
    }

    const baseFs = this.isCompactViewport() ? "13px" : "16px";

    if (!this.runSummaryText) {
      const t = this.add.text(
        vw / 2,
        vh / 2,
        body,
        uiTextStyle({
          fontSize: baseFs,
          color: "#e8e8ff",
          align: "center",
        })
      );
      t.setOrigin(0.5);
      t.setScrollFactor(0, 0);
      t.setDepth(SUMMARY_DEPTH + 1);
      this.runSummaryText = t;
    } else {
      this.runSummaryText.setText(body);
      this.runSummaryText.setStyle(
        uiTextStyle({ fontSize: baseFs, color: "#e8e8ff", align: "center" })
      );
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
    const unlocked = new Set(getUnlockedRelicIds());
    const slots = getEquippedRelicSlots();
    const slotCount = getRelicSlotCount();
    this.titleFocusedRelicSlot = Math.max(
      0,
      Math.min(this.titleFocusedRelicSlot, Math.max(0, slotCount - 1))
    );
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
        text: `Difficulty: ${difficultyHudIcon(this.selectedDifficulty)} ${difficultyLabel(this.selectedDifficulty)} — [ ] to cycle`,
        fontSize: compact ? "11px" : "12px",
        y: compact ? -40 : -42,
      },
    ];
    let y = compact ? -28 : -32;
    const smallFs = compact ? "11px" : "12px";
    lines.push({
      text: `Relics — ${slotCount}/${MAX_RELIC_SLOTS} slots · focus ${this.titleFocusedRelicSlot + 1} (, .) · 0 clear · U unlock`,
      fontSize: smallFs,
      y,
    });
    y += compact ? 15 : 17;
    for (let s = 0; s < slotCount; s++) {
      const id = slots[s] ?? null;
      const def = id ? getRelicById(id) : undefined;
      const label = def ? `${def.icon} ${def.name}` : "— empty —";
      const focus = s === this.titleFocusedRelicSlot ? "  ◀ focus" : "";
      lines.push({
        text: `  Slot ${s + 1}: ${label}${focus}`,
        fontSize: smallFs,
        y,
      });
      y += compact ? 15 : 17;
    }
    if (slotCount < MAX_RELIC_SLOTS) {
      const nextN = slotCount + 1;
      const rule = RELIC_SLOT_UNLOCK_RULES[nextN];
      if (rule) {
        const ruleStr =
          rule.kind === "credits"
            ? `${rule.cost} cr`
            : `${rule.need} wins (have ${st.wins})`;
        lines.push({
          text: `  Next slot (${nextN}): need ${ruleStr} — press U`,
          fontSize: smallFs,
          y,
        });
        y += compact ? 15 : 17;
      }
    }
    lines.push({
      text: "Catalog (assign to focused slot):",
      fontSize: smallFs,
      y,
    });
    y += compact ? 15 : 17;
    for (let i = 0; i < RELICS.length; i++) {
      const p = RELICS[i]!;
      const isUnlocked = unlocked.has(p.id);
      const inLoadout = slots.includes(p.id);
      const costStr = `${p.cost} cr`;
      const state = isUnlocked
        ? inLoadout
          ? "In loadout"
          : "Unlocked"
        : `Locked · need ${Math.max(0, p.cost - credits)} more`;
      lines.push({
        text: `[${i + 1}] ${p.icon} ${p.name} · ${costStr} · ${state}`,
        fontSize: smallFs,
        y,
      });
      y += compact ? 15 : 17;
    }
    y += compact ? 4 : 6;
    const hintFs = compact ? "11px" : "12px";
    lines.push({
      text: "Tap Start (below) or Space — 1–3: assign relic to focused slot",
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
      const t = this.add.text(
        cx,
        cy + line.y,
        line.text,
        uiTextStyle({
          fontSize: line.fontSize,
          color: "#e8e8ff",
        })
      );
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
    const currentEncounterId =
      this.activeEncounterEnemyIndex !== null
        ? (this.enemyRuntimeEncounterIds[this.activeEncounterEnemyIndex] ??
          null)
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
      currentEncounterId,
      lastEventResult: this.lastEventResult,
      lastActionResult: this.latestMessageStr,
      playerPosition: { x: this.playerGridX, y: this.playerGridY },
      playerEnergy: this.player.energy,
      playerEnergyMax: this.effectiveMaxEnergy,
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
      workDone: this.workDone,
      workTarget: this.workTarget,
      runStats: {
        enemiesDefeated: this.enemiesDefeated,
        eventsResolved: this.eventsResolved,
        turnsTaken: this.turnsTaken,
      },
      latestMessage: this.latestMessageStr,
      meta: {
        officeCredits: getOfficeCredits(),
        equippedRelicIds: getEquippedRelicSlots(),
        unlockedRelicIds: getUnlockedRelicIds(),
        relicSlotCount: getRelicSlotCount(),
        titleFocusedRelicSlot: this.titleFocusedRelicSlot,
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
    this.layoutFooterMessages();
  }

  /** Run phase shown in footer (not in compact HUD). */
  private footerPhaseLabel(): string {
    const eventActive =
      this.activeEventIndex !== null ||
      this.activeEncounterEnemyIndex !== null;
    if (!this.runStarted) return "Ready";
    if (this.gameOver) return "Sent Home Early";
    if (this.gameWon) return "Work Day Complete";
    if (eventActive) return "Event";
    return "Running";
  }

  private footerPhaseFontSizePx(): string {
    return this.isCompactViewport() ? "11px" : "12px";
  }

  private updateHud(): void {
    const layout = this.activeLayout();
    const credits = getOfficeCredits();
    const line1 = `⚡ ${this.player.energy}/${this.effectiveMaxEnergy}   🤯 ${this.player.stress}/${this.effectiveMaxStress}   💰 ${credits}   💼 ${this.workDone}/${this.workTarget}`;
    const relicHud = this.formatHudRelicsShort();
    const shortName =
      layout.name.length > 16 ? `${layout.name.slice(0, 15)}…` : layout.name;
    const shortLayout = layout.hudIcon
      ? `${layout.hudIcon} ${shortName}`
      : shortName;
    const line2 = relicHud
      ? `${shortLayout} · ${relicHud}`
      : `${shortLayout} (${layout.id})`;
    const body = `${line1}\n${line2}`;
    this.hudText.setStyle(uiTextStyle({ fontSize: this.hudFontSizePx() }));
    this.hudText.setText(body);
    if (this.footerPhaseText) {
      this.footerPhaseText.setStyle(
        uiTextStyle({
          fontSize: this.footerPhaseFontSizePx(),
          color: "#a8a8c8",
        })
      );
      this.footerPhaseText.setText(this.footerPhaseLabel());
    }
    if (this.statusText) {
      this.statusText.setStyle(uiTextStyle({ fontSize: this.statusFontSizePx() }));
    }
    const mirror = document.getElementById("hud-test-mirror");
    if (mirror) mirror.textContent = body;
    this.layoutHeaderBar();
  }

  private drawGrid(layout: LayoutDef): void {
    const g = this.add.graphics();
    this.gridBoardGraphics = g;
    const ts = this.grid.tileSize;
    const oy = UI_HEADER_PX;

    for (let gy = 0; gy < this.grid.rows; gy++) {
      for (let gx = 0; gx < this.grid.cols; gx++) {
        const x = gx * ts;
        const y = gy * ts + oy;
        if (this.isBlockedTile(gx, gy)) {
          g.fillStyle(COLOR_BLOCKED_TILE, 1);
          g.fillRect(x, y, ts, ts);
          g.lineStyle(1, COLOR_BLOCKED_EDGE, 0.9);
          g.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);
        } else {
          const alt = (gx + gy) % 2 === 0;
          g.fillStyle(alt ? COLOR_TILE_A : COLOR_TILE_B, 1);
          g.fillRect(x, y, ts, ts);
        }
      }
    }

    const tintCell = (gx: number, gy: number, color: number): void => {
      if (this.isBlockedTile(gx, gy)) return;
      g.fillStyle(color, FLOOR_TINT_ALPHA);
      g.fillRect(gx * ts, gy * ts + oy, ts, ts);
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
    const gridPixelH = this.grid.rows * ts;
    for (let i = 0; i <= this.grid.cols; i++) {
      const x = i * ts;
      g.lineBetween(x, oy, x, gridPixelH + oy);
    }
    for (let j = 0; j <= this.grid.rows; j++) {
      const y = j * ts + oy;
      g.lineBetween(0, y, this.grid.cols * ts, y);
    }

    g.fillStyle(0x141422, 1);
    g.fillRect(0, gridPixelH + oy, this.grid.cols * ts, UI_FOOTER_PX);
    g.lineStyle(1, 0x2a2a40, 0.95);
    g.lineBetween(0, gridPixelH + oy, this.grid.cols * ts, gridPixelH + oy);
  }

  /**
   * Office encounter on enemy tiles (data-driven). Returns true if a prompt opened
   * and the caller must skip reward/exit/event on the same step.
   */
  private tryEncounterAtTile(gridX: number, gridY: number): boolean {
    const enemy = this.enemies.find(
      (e) => e.hp > 0 && e.gridX === gridX && e.gridY === gridY
    );
    if (!enemy) return false;
    if (this.activeEventIndex !== null || this.activeEncounterEnemyIndex !== null) {
      return false;
    }

    const idx = this.enemies.indexOf(enemy);
    const eid = this.enemyRuntimeEncounterIds[idx];
    if (!eid) return false;
    const enc = getEncounterById(eid);

    this.activeEncounterEnemyIndex = idx;
    this.setStatusMessage("");
    this.showFooterPrompt(enc.name, enc.prompt);

    console.log("Encounter opened");
    this.syncTouchLayer();
    return true;
  }

  private resolveActiveEncounterChoice(choiceIndex: number): void {
    if (this.activeEncounterEnemyIndex === null) return;
    const idx = this.activeEncounterEnemyIndex;
    const eid = this.enemyRuntimeEncounterIds[idx];
    if (!eid) return;
    const enc = getEncounterById(eid);
    const raw = enc.choices[choiceIndex];
    if (!raw) return;

    playEventChoiceSfx();
    const resolved = resolveEncounterChoiceWithRelics(
      raw,
      getEquippedRelicIds()
    );
    const stressDelta = scaledStressGain(
      resolved.stressDelta,
      this.selectedDifficulty
    );

    const energyBefore = this.player.energy;
    const stressBefore = this.player.stress;

    this.player.energy = Math.max(
      0,
      Math.min(
        this.effectiveMaxEnergy,
        this.player.energy + resolved.energyDelta
      )
    );
    this.player.stress = Math.max(0, this.player.stress + stressDelta);

    this.grantOfficeCreditsDuringRun(resolved.creditsDelta);

    const dE = this.player.energy - energyBefore;
    const dS = this.player.stress - stressBefore;
    const dC = resolved.creditsDelta;

    if (dE < 0) {
      playHurtSfx();
    }

    this.spawnEventOutcomeFloaters(dE, dS, dC);
    const pCenter = this.boardCellCenter(
      this.playerGridX,
      this.playerGridY
    );
    const outcomeRows =
      (dE !== 0 ? 1 : 0) + (dS !== 0 ? 1 : 0) + (dC !== 0 ? 1 : 0);
    const problemRow = outcomeRows > 0 ? outcomeRows : 0;
    this.spawnFloater(
      pCenter.x,
      pCenter.y,
      "Problem solved",
      FLOAT_COLOR_EVENT,
      -14 * (problemRow > 0 ? problemRow + 1 : 2)
    );
    this.spawnFloater(
      pCenter.x,
      pCenter.y,
      `+${WORK_PER_ENEMY_DEFEAT} Work`,
      FLOAT_COLOR_EVENT,
      -14 * (problemRow > 0 ? problemRow + 2 : 3)
    );

    if (this.playerRect) {
      this.playerRect.setFillStyle(0xff6666);
      this.time.delayedCall(100, () =>
        this.playerRect?.setFillStyle(COLOR_PLAYER)
      );
    }

    this.lastEventResult = `${enc.name}: ${resolved.label} (${this.formatSigned(resolved.energyDelta, "Energy")}, ${this.formatSigned(stressDelta, "Stress")}${dC !== 0 ? `, ${this.formatSigned(dC, "Credits")}` : ""}, ${this.formatSigned(WORK_PER_ENEMY_DEFEAT, "Work")})`;

    const enemy = this.enemies[idx]!;
    enemy.hp = 0;
    this.enemiesDefeated += 1;
    this.activeEncounterEnemyIndex = null;

    this.clearFooterPrompt();

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

    if (resolved.statusMessage) {
      this.setStatusMessage(resolved.statusMessage);
    } else if (dE === 0 && dS > 0) {
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

    console.log("Encounter resolved");
    this.addWork(WORK_PER_ENEMY_DEFEAT);
    this.checkRunEndAfterVitals(
      this.player.energy <= 0
        ? `drained by ${enc.name} (${resolved.label})`
        : undefined
    );

    this.syncTouchLayer();
    this.syncDebugState();
  }

  private tryRewardAtTile(gridX: number, gridY: number): void {
    const layout = this.activeLayout();
    if (!this.reward.available) return;
    if (gridX !== this.reward.gridX || gridY !== this.reward.gridY) return;

    const rewardCenter = this.boardCellCenter(gridX, gridY);
    const workPick =
      layout.reward.workRestore != null && layout.reward.workRestore > 0
        ? layout.reward.workRestore
        : 0;

    if (workPick > 0) {
      this.addWork(workPick);
      this.spawnFloater(
        rewardCenter.x,
        rewardCenter.y,
        `+${workPick} Work`,
        FLOAT_COLOR_EVENT
      );
      this.spawnFloater(
        rewardCenter.x,
        rewardCenter.y,
        "Gained Reward",
        FLOAT_COLOR_EVENT,
        -14
      );
      this.setStatusMessage(`Gained ${workPick} work`);
    } else {
      const energyBefore = this.player.energy;
      const restore = layout.reward.energyRestore ?? 0;
      this.player.energy = Math.min(
        this.player.energy + restore,
        this.effectiveMaxEnergy
      );
      const energyGained = this.player.energy - energyBefore;
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
      this.setStatusMessage(
        energyGained > 0
          ? `Gained ${energyGained} energy`
          : "No energy gained (already at max)"
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
    console.log("Reward collected");
    this.syncDebugState();
  }

  /** Exit door tile (marked "X"): win if work quota is met; otherwise nudge the player. */
  private tryExitAtTile(gridX: number, gridY: number): void {
    const layout = this.activeLayout();
    if (this.gameOver || this.gameWon) return;
    if (gridX !== layout.exit.x || gridY !== layout.exit.y) return;

    if (this.workDone >= this.workTarget) {
      this.checkForWin();
      return;
    }
    this.setStatusMessage("Exit — finish your work first");
    const c = this.boardCellCenter(gridX, gridY);
    this.spawnFloater(c.x, c.y, "Need more work", FLOAT_COLOR_EVENT, -12);
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

  private assignEnemyEncounterRuntimeIds(layout: LayoutDef): void {
    const pool = [...ENCOUNTER_POOL_IDS];
    this.enemyRuntimeEncounterIds = layout.enemies.map((pl, i) => {
      if (pl.encounterId) return pl.encounterId;
      if (useDeterministicEnemyEncounters()) {
        return pool[i % pool.length]!;
      }
      return this.runEventRng.pick(pool);
    });
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
    if (et.workDelta !== 0) {
      detail.push(this.formatSigned(et.workDelta, "Work"));
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

    if (et.workDelta > 0) {
      const { x, y } = this.boardCellCenter(this.playerGridX, this.playerGridY);
      let row = (dE !== 0 ? 1 : 0) + (dS !== 0 ? 1 : 0);
      this.spawnFloater(
        x,
        y,
        `+${et.workDelta} Work`,
        FLOAT_COLOR_EVENT,
        -14 * (row > 0 ? row + 1 : 1)
      );
    }
    this.addWork(et.workDelta);
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
    if (this.activeEncounterEnemyIndex !== null) return;
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
      this.setStatusMessage("");
      this.showFooterPrompt(et.name, et.prompt);
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
    const w = choice.workDelta;
    this.lastEventResult = `${et.name}: ${choice.label} (${this.formatSigned(choice.energyDelta, "Energy")}, ${this.formatSigned(stressDelta, "Stress")}${w !== 0 ? `, ${this.formatSigned(w, "Work")}` : ""})`;
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
    this.clearFooterPrompt();
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
    if (w > 0) {
      const { x, y } = this.boardCellCenter(this.playerGridX, this.playerGridY);
      let row = (dE !== 0 ? 1 : 0) + (dS !== 0 ? 1 : 0);
      this.spawnFloater(
        x,
        y,
        `+${w} Work`,
        FLOAT_COLOR_EVENT,
        -14 * (row > 0 ? row + 1 : 1)
      );
    }
    this.addWork(w);
    this.checkRunEndAfterVitals();
    this.syncTouchLayer();
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
      this.dismissSummaryToTitle();
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
      if (Phaser.Input.Keyboard.JustDown(this.keyRelicSlotPrev)) {
        const n = getRelicSlotCount();
        if (n > 1) {
          this.titleFocusedRelicSlot =
            (this.titleFocusedRelicSlot - 1 + n) % n;
          this.showTitleOverlay();
          this.syncDebugState();
        }
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyRelicSlotNext)) {
        const n = getRelicSlotCount();
        if (n > 1) {
          this.titleFocusedRelicSlot =
            (this.titleFocusedRelicSlot + 1) % n;
          this.showTitleOverlay();
          this.syncDebugState();
        }
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyRelicSlotClear)) {
        clearRelicSlot(this.titleFocusedRelicSlot);
        this.showTitleOverlay();
        this.syncDebugState();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyRelicSlotUnlock)) {
        const wins = getSessionStatsForDebug().wins;
        const ur = tryUnlockNextRelicSlot(wins);
        if (ur === "not_enough_credits") {
          this.setStatusMessage("Not enough credits for slot");
        } else if (ur === "milestone_not_met") {
          this.setStatusMessage("Need more wins for next slot");
        } else if (ur === "max_slots") {
          this.setStatusMessage("All relic slots unlocked");
        }
        this.showTitleOverlay();
        this.syncDebugState();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyRelicCatalog1)) {
        const r = tryAssignRelicToSlot(0, this.titleFocusedRelicSlot);
        if (r === "no_credits") this.setStatusMessage("Not enough credits");
        this.showTitleOverlay();
        this.syncDebugState();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyRelicCatalog2)) {
        const r = tryAssignRelicToSlot(1, this.titleFocusedRelicSlot);
        if (r === "no_credits") this.setStatusMessage("Not enough credits");
        this.showTitleOverlay();
        this.syncDebugState();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyRelicCatalog3)) {
        const r = tryAssignRelicToSlot(2, this.titleFocusedRelicSlot);
        if (r === "no_credits") this.setStatusMessage("Not enough credits");
        this.showTitleOverlay();
        this.syncDebugState();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
        this.startRunFromTouch();
      }
      return;
    }

    if (this.activeEncounterEnemyIndex !== null) {
      const enc = getEncounterById(
        this.enemyRuntimeEncounterIds[this.activeEncounterEnemyIndex]!
      );
      const n = enc.choices.length;
      if (Phaser.Input.Keyboard.JustDown(this.keyY)) {
        this.resolveActiveEncounterChoice(0);
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyN)) {
        this.resolveActiveEncounterChoice(1);
        return;
      }
      if (n > 2 && Phaser.Input.Keyboard.JustDown(this.keyB)) {
        this.resolveActiveEncounterChoice(2);
        return;
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
