export type ScreenState =
  | "title"
  | "running"
  | "event"
  | "gameOver"
  | "victory";

export type TouchUiDebug = {
  movement: boolean;
  event: boolean;
  start: boolean;
  restart: boolean;
  continueReward: boolean;
};

export type GameDebugState = {
  screenState: ScreenState;
  touchUi: TouchUiDebug;
  layout: { id: string; index: number; name: string };
  playerPosition: { x: number; y: number };
  playerEnergy: number;
  /** Current run energy ceiling (layout + relics). */
  playerEnergyMax: number;
  playerStress: number;
  enemies: Array<{
    name: string;
    x: number;
    y: number;
    hp: number;
    damage: number;
    stressPerHit: number;
    alive: boolean;
  }>;
  /** Enemy currently on the player's tile, if any. */
  activeEnemy: {
    name: string;
    hp: number;
    damage: number;
    stressPerHit: number;
    alive: boolean;
  } | null;
  reward: { x: number; y: number; available: boolean };
  /** Active choice-event type id, or null if none. */
  currentEventId: string | null;
  /** Active office encounter id when an enemy-tile prompt is open. */
  currentEncounterId: string | null;
  /** Summary of the most recently resolved event (choice or instant). */
  lastEventResult: string | null;
  /** Last player-facing action result shown in status text. */
  lastActionResult: string;
  events: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    available: boolean;
    active: boolean;
  }>;
  exit: { x: number; y: number };
  gameOver: boolean;
  /** Set when `gameOver` is true. */
  gameOverReason: "burnout" | "no_energy" | null;
  gameWon: boolean;
  /** Run goal: complete enough tasks to reach `workTarget`. */
  workDone: number;
  workTarget: number;
  runStats: {
    enemiesDefeated: number;
    eventsResolved: number;
    /** Successful moves this run (grid steps). */
    turnsTaken: number;
  };
  latestMessage: string;
  meta: {
    officeCredits: number;
    equippedRelicIds: (string | null)[];
    unlockedRelicIds: string[];
    relicSlotCount: number;
    titleFocusedRelicSlot: number;
    creditsEarnedThisRun: number;
    metaLoadedFromStorage?: boolean;
    activeRunModifiers?: {
      energyDelta?: number;
      stressDelta?: number;
      damageBonus?: number;
    };
  };
  /** Lifetime session metrics (localStorage). */
  stats: {
    runsStarted: number;
    wins: number;
    losses: number;
    runsCompleted: number;
    averageRunLengthSeconds: number;
  };
  /** Session-only mute (M key); mirrors Phaser `sound.mute`. */
  audio: { muted: boolean };
  monetization: {
    premiumEnabled: boolean;
    continueAvailable: boolean;
    continueUsedThisRun: boolean;
  };
};

export function publishGameDebugState(state: GameDebugState): void {
  window.__gameState = state;
}
