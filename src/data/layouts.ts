/**
 * Hand-authored layouts and shared enemy/event type definitions.
 */

export type EnemyTypeDef = {
  id: string;
  name: string;
  hp: number;
  damage: number;
  /** Stress applied to the player each time this enemy lands a hit (after scaling). */
  stressPerHit?: number;
  color: number;
};

export type EventChoiceDef = {
  label: string;
  energyDelta: number;
  stressDelta: number;
};

export type EventChoiceTypeDef = {
  kind: "choice";
  id: string;
  name: string;
  prompt: string;
  choiceY: EventChoiceDef;
  choiceN: EventChoiceDef;
};

export type EventInstantTypeDef = {
  kind: "instant";
  id: string;
  name: string;
  prompt: string;
  energyDelta: number;
  /** 0–1 probability of applying stressDeltaIfRoll after energyDelta */
  stressChance: number;
  stressDeltaIfRoll: number;
};

export type EventTypeDef = EventChoiceTypeDef | EventInstantTypeDef;

export function isChoiceEvent(e: EventTypeDef): e is EventChoiceTypeDef {
  return e.kind === "choice";
}

export type LayoutDef = {
  /** Stable slug for debug / saves (not tied to array order). */
  id: string;
  name: string;
  grid: { cols: number; rows: number; tileSize: number };
  /**
   * Non-walkable cells (furniture, walls). Omit for an empty floor.
   * Do not place blocked tiles on player start, exit, reward, enemy, or event cells.
   */
  blocked?: ReadonlyArray<{ x: number; y: number }>;
  player: {
    startGrid: { x: number; y: number };
    startEnergy: number;
    maxEnergy: number;
    damagePerHit: number;
    startStress: number;
    /** Stress at or above this value ends the run (burnout). */
    maxStress: number;
  };
  enemies: ReadonlyArray<{
    typeId: string;
    grid: { x: number; y: number };
    /** If set, this enemy tile uses this encounter; else assigned at run start from pool. */
    encounterId?: string;
  }>;
  reward: { grid: { x: number; y: number }; energyRestore: number };
  events: ReadonlyArray<{ typeId: string; grid: { x: number; y: number } }>;
  exit: { x: number; y: number };
};

export const enemyTypes: readonly EnemyTypeDef[] = [
  {
    id: "endless_meeting",
    name: "Endless Meeting",
    hp: 3,
    damage: 1,
    color: 0xdd6644,
  },
  {
    id: "printer_jam",
    name: "Printer Jam",
    hp: 2,
    damage: 0,
    color: 0xcc5533,
  },
  {
    id: "passive_email",
    name: "Passive Aggressive Email",
    hp: 4,
    damage: 2,
    color: 0xaa4422,
  },
  {
    id: "slack_ping_storm",
    name: "Slack Ping Storm",
    hp: 3,
    damage: 1,
    stressPerHit: 1,
    color: 0x8866cc,
  },
] as const;

export const eventTypes: readonly EventTypeDef[] = [
  {
    kind: "choice",
    id: "coworker_venting",
    name: "Coworker Venting",
    prompt:
      "Coworker Venting\nA coworker starts venting to you in the hallway.\n[Y] Listen (+1 stress)  [N] Escape (-1 energy)",
    choiceY: { label: "Listen", energyDelta: 0, stressDelta: 1 },
    choiceN: { label: "Escape", energyDelta: -1, stressDelta: 0 },
  },
  {
    kind: "instant",
    id: "free_snacks",
    name: "Free Snacks",
    prompt:
      "Free Snacks\nDonuts in the break room — you grab one on the way through.",
    energyDelta: 1,
    stressChance: 0.15,
    stressDeltaIfRoll: 1,
  },
  {
    kind: "choice",
    id: "manager_compliment",
    name: "Manager Compliment",
    prompt:
      "Manager Compliment\nYour manager praises you in front of the team.\n[Y] Thank them (-1 stress)  [N] Deflect awkwardly (+1 stress)",
    choiceY: { label: "Thank them", energyDelta: 0, stressDelta: -1 },
    choiceN: { label: "Deflect", energyDelta: 0, stressDelta: 1 },
  },
  {
    kind: "choice",
    id: "coffee_spill",
    name: "Coffee Spill",
    prompt:
      "Coffee Spill\nSomeone bumps you and hot coffee sloshes toward your shirt.\n[Y] Jump back (-1 energy)  [N] Take the hit (+1 stress)",
    choiceY: { label: "Jump back", energyDelta: -1, stressDelta: 0 },
    choiceN: { label: "Take the hit", energyDelta: 0, stressDelta: 1 },
  },
  {
    kind: "choice",
    id: "manager_checkin",
    name: "Manager Check-in",
    prompt:
      "Manager Check-in\nYour manager corners you for a quick sync.\n[Y] Keep it brief (-1 stress)  [N] Impress them (+1 energy, +1 stress)",
    choiceY: { label: "Keep it brief", energyDelta: 0, stressDelta: -1 },
    choiceN: { label: "Impress them", energyDelta: 1, stressDelta: 1 },
  },
  {
    kind: "choice",
    id: "copier_jam",
    name: "Printer Jam",
    prompt:
      "Printer Jam\nThe copier ate your report right before the deadline.\n[Y] Clear it (-1 energy)  [N] Walk away (+1 stress)",
    choiceY: { label: "Clear it", energyDelta: -1, stressDelta: 0 },
    choiceN: { label: "Walk away", energyDelta: 0, stressDelta: 1 },
  },
  {
    kind: "choice",
    id: "last_minute_invite",
    name: "Last-Minute Invite",
    prompt:
      "Last-Minute Invite\nYou're pinged to join a \"quick\" sync in five minutes.\n[Y] Decline politely (-1 energy)  [N] Join and dread it (+1 stress)",
    choiceY: { label: "Decline politely", energyDelta: -1, stressDelta: 0 },
    choiceN: { label: "Join", energyDelta: 0, stressDelta: 1 },
  },
  {
    kind: "choice",
    id: "desk_audit",
    name: "Desk Neatness Check",
    prompt:
      "Desk Neatness Check\nFacilities is doing walkthrough photos today.\n[Y] Tidy in a hurry (-1 energy)  [N] Leave it messy (+1 stress)",
    choiceY: { label: "Tidy up", energyDelta: -1, stressDelta: 0 },
    choiceN: { label: "Leave it", energyDelta: 0, stressDelta: 1 },
  },
] as const;

/** Ids eligible for random assignment on event tiles (all defined events). */
export const EVENT_POOL_IDS: readonly string[] = eventTypes.map((t) => t.id);

/** Layout 0 — identical to former single levelConfig. */
const layoutOriginalOffice: LayoutDef = {
  id: "original_office",
  name: "Original Office",
  grid: { cols: 10, rows: 10, tileSize: 64 },
  player: {
    startGrid: { x: 0, y: 0 },
    startEnergy: 6,
    maxEnergy: 6,
    damagePerHit: 1,
    startStress: 0,
    maxStress: 8,
  },
  enemies: [
    {
      typeId: "endless_meeting",
      grid: { x: 4, y: 4 },
      encounterId: "surprise_meeting",
    },
    {
      typeId: "printer_jam",
      grid: { x: 7, y: 7 },
      encounterId: "broken_printer",
    },
    {
      typeId: "passive_email",
      grid: { x: 3, y: 5 },
      encounterId: "reply_all_disaster",
    },
  ],
  reward: {
    grid: { x: 2, y: 2 },
    energyRestore: 3,
  },
  events: [
    { typeId: "coworker_venting", grid: { x: 6, y: 2 } },
    { typeId: "free_snacks", grid: { x: 1, y: 5 } },
    { typeId: "manager_compliment", grid: { x: 8, y: 3 } },
  ],
  exit: { x: 9, y: 9 },
  /** Top bar, central conference cluster (gap at 6,4), east corridor pinch. */
  blocked: [
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 0 },
    { x: 5, y: 0 },
    { x: 6, y: 0 },
    { x: 7, y: 0 },
    { x: 8, y: 0 },
    { x: 9, y: 0 },
    { x: 5, y: 3 },
    { x: 6, y: 3 },
    { x: 7, y: 3 },
    { x: 5, y: 4 },
    { x: 7, y: 4 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 7, y: 5 },
    { x: 9, y: 1 },
    { x: 9, y: 2 },
    { x: 9, y: 3 },
    { x: 9, y: 4 },
    { x: 9, y: 5 },
    { x: 9, y: 6 },
  ],
};

/** Different exit, reward, and entity positions (same grid size). */
const layoutBreakRoomSprint: LayoutDef = {
  id: "break_room_sprint",
  name: "Break Room Sprint",
  grid: { cols: 10, rows: 10, tileSize: 64 },
  player: {
    startGrid: { x: 0, y: 0 },
    startEnergy: 6,
    maxEnergy: 6,
    damagePerHit: 1,
    startStress: 0,
    maxStress: 8,
  },
  enemies: [
    { typeId: "printer_jam", grid: { x: 5, y: 5 } },
    { typeId: "endless_meeting", grid: { x: 2, y: 8 } },
    { typeId: "passive_email", grid: { x: 8, y: 1 } },
  ],
  reward: {
    grid: { x: 4, y: 3 },
    energyRestore: 3,
  },
  events: [
    { typeId: "free_snacks", grid: { x: 7, y: 4 } },
    { typeId: "coworker_venting", grid: { x: 1, y: 7 } },
    { typeId: "manager_compliment", grid: { x: 3, y: 1 } },
  ],
  exit: { x: 8, y: 8 },
  /** Top bar, east pinch toward exit, cluster south of reward. */
  blocked: [
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 0 },
    { x: 5, y: 0 },
    { x: 6, y: 0 },
    { x: 7, y: 0 },
    { x: 8, y: 0 },
    { x: 9, y: 0 },
    { x: 9, y: 1 },
    { x: 9, y: 2 },
    { x: 9, y: 3 },
    { x: 9, y: 4 },
    { x: 9, y: 5 },
    { x: 9, y: 6 },
    { x: 9, y: 7 },
    { x: 4, y: 4 },
    { x: 3, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 7, y: 6 },
  ],
};

/** Smaller floor — different bounds and placements. */
const layoutExecutiveRow: LayoutDef = {
  id: "executive_row",
  name: "Executive Row",
  grid: { cols: 8, rows: 8, tileSize: 64 },
  player: {
    startGrid: { x: 0, y: 0 },
    startEnergy: 6,
    maxEnergy: 6,
    damagePerHit: 1,
    startStress: 1,
    maxStress: 8,
  },
  enemies: [
    {
      typeId: "passive_email",
      grid: { x: 4, y: 4 },
      encounterId: "it_ticket_swarm",
    },
    { typeId: "printer_jam", grid: { x: 6, y: 2 } },
  ],
  reward: {
    grid: { x: 1, y: 1 },
    energyRestore: 3,
  },
  events: [
    { typeId: "manager_compliment", grid: { x: 5, y: 5 } },
    { typeId: "coworker_venting", grid: { x: 2, y: 6 } },
  ],
  exit: { x: 7, y: 7 },
};

/** Many fights, one event — favors combat. */
const layoutCombatHeavy: LayoutDef = {
  id: "combat_heavy",
  name: "Combat Heavy",
  grid: { cols: 10, rows: 10, tileSize: 64 },
  player: {
    startGrid: { x: 0, y: 0 },
    startEnergy: 7,
    maxEnergy: 7,
    damagePerHit: 1,
    startStress: 0,
    maxStress: 8,
  },
  enemies: [
    { typeId: "endless_meeting", grid: { x: 2, y: 2 } },
    { typeId: "printer_jam", grid: { x: 5, y: 2 } },
    { typeId: "passive_email", grid: { x: 8, y: 2 } },
    { typeId: "printer_jam", grid: { x: 3, y: 5 } },
    { typeId: "endless_meeting", grid: { x: 6, y: 6 } },
    { typeId: "passive_email", grid: { x: 8, y: 7 } },
  ],
  reward: {
    grid: { x: 4, y: 4 },
    energyRestore: 3,
  },
  events: [{ typeId: "free_snacks", grid: { x: 1, y: 8 } }],
  exit: { x: 9, y: 9 },
};

/** Light combat, many events. */
const layoutEventHeavy: LayoutDef = {
  id: "event_heavy",
  name: "Event Heavy",
  grid: { cols: 10, rows: 10, tileSize: 64 },
  player: {
    startGrid: { x: 0, y: 0 },
    startEnergy: 6,
    maxEnergy: 6,
    damagePerHit: 1,
    startStress: 0,
    maxStress: 8,
  },
  enemies: [
    { typeId: "printer_jam", grid: { x: 7, y: 7 } },
    { typeId: "endless_meeting", grid: { x: 8, y: 1 } },
  ],
  reward: {
    grid: { x: 2, y: 2 },
    energyRestore: 3,
  },
  events: [
    { typeId: "coworker_venting", grid: { x: 3, y: 1 } },
    { typeId: "manager_compliment", grid: { x: 1, y: 4 } },
    { typeId: "coffee_spill", grid: { x: 5, y: 3 } },
    { typeId: "manager_checkin", grid: { x: 2, y: 6 } },
    { typeId: "copier_jam", grid: { x: 6, y: 5 } },
  ],
  exit: { x: 9, y: 9 },
};

/**
 * Top/east band: dense enemies + reward. Lower/side path: one light fight to the exit.
 */
const layoutRiskReward: LayoutDef = {
  id: "risk_reward",
  name: "Risk / Reward",
  grid: { cols: 10, rows: 10, tileSize: 64 },
  player: {
    startGrid: { x: 0, y: 0 },
    startEnergy: 6,
    maxEnergy: 6,
    damagePerHit: 1,
    startStress: 0,
    maxStress: 8,
  },
  enemies: [
    { typeId: "printer_jam", grid: { x: 2, y: 0 } },
    { typeId: "endless_meeting", grid: { x: 4, y: 0 } },
    { typeId: "passive_email", grid: { x: 6, y: 1 } },
    { typeId: "printer_jam", grid: { x: 8, y: 2 } },
    { typeId: "endless_meeting", grid: { x: 7, y: 4 } },
    { typeId: "printer_jam", grid: { x: 1, y: 8 } },
  ],
  reward: {
    grid: { x: 5, y: 1 },
    energyRestore: 3,
  },
  events: [
    { typeId: "free_snacks", grid: { x: 3, y: 7 } },
    { typeId: "coworker_venting", grid: { x: 8, y: 8 } },
  ],
  exit: { x: 9, y: 9 },
  /** East strip forces west approach to exit; central desk island. */
  blocked: [
    { x: 9, y: 0 },
    { x: 9, y: 1 },
    { x: 9, y: 2 },
    { x: 9, y: 3 },
    { x: 9, y: 4 },
    { x: 9, y: 5 },
    { x: 9, y: 6 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
  ],
};

/** Exit on the top row — rim route or interior detour for reward and events. */
const layoutTopRowSprint: LayoutDef = {
  id: "top_row_sprint",
  name: "Top Row Sprint",
  grid: { cols: 10, rows: 10, tileSize: 64 },
  player: {
    startGrid: { x: 0, y: 0 },
    startEnergy: 6,
    maxEnergy: 6,
    damagePerHit: 1,
    startStress: 0,
    maxStress: 8,
  },
  enemies: [
    { typeId: "slack_ping_storm", grid: { x: 3, y: 0 } },
    { typeId: "printer_jam", grid: { x: 6, y: 4 } },
    { typeId: "endless_meeting", grid: { x: 8, y: 7 } },
  ],
  reward: {
    grid: { x: 5, y: 5 },
    energyRestore: 3,
  },
  events: [
    { typeId: "last_minute_invite", grid: { x: 1, y: 7 } },
    { typeId: "desk_audit", grid: { x: 7, y: 1 } },
    { typeId: "free_snacks", grid: { x: 4, y: 8 } },
  ],
  exit: { x: 9, y: 0 },
};

export const LAYOUTS: readonly LayoutDef[] = [
  layoutOriginalOffice,
  layoutBreakRoomSprint,
  layoutExecutiveRow,
  layoutCombatHeavy,
  layoutEventHeavy,
  layoutRiskReward,
  layoutTopRowSprint,
] as const;

/** Key for blocked-tile sets and lookups. */
export function layoutCellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function layoutBlockedSet(layout: LayoutDef): Set<string> {
  const s = new Set<string>();
  for (const c of layout.blocked ?? []) {
    s.add(layoutCellKey(c.x, c.y));
  }
  return s;
}

/** Logs a warning when a blocked cell overlaps special tiles (dev / authoring aid). */
export function warnBlockedTileEntityOverlaps(
  layout: LayoutDef,
  blocked: Set<string>
): void {
  const check = (x: number, y: number, label: string): void => {
    if (blocked.has(layoutCellKey(x, y))) {
      console.warn(
        `[Office Dungeon] Layout "${layout.id}": blocked tile overlaps ${label} at (${x},${y})`
      );
    }
  };
  const p = layout.player.startGrid;
  check(p.x, p.y, "player start");
  check(layout.exit.x, layout.exit.y, "exit");
  check(layout.reward.grid.x, layout.reward.grid.y, "reward");
  for (const e of layout.enemies) {
    check(e.grid.x, e.grid.y, `enemy (${e.typeId})`);
  }
  for (const ev of layout.events) {
    check(ev.grid.x, ev.grid.y, `event (${ev.typeId})`);
  }
}

const enemyTypeById = new Map(enemyTypes.map((t) => [t.id, t] as const));
const eventTypeById = new Map(eventTypes.map((t) => [t.id, t] as const));

export function getEnemyType(id: string): EnemyTypeDef {
  const t = enemyTypeById.get(id);
  if (!t) throw new Error(`Unknown enemy type: ${id}`);
  return t;
}

export function getEventType(id: string): EventTypeDef {
  const t = eventTypeById.get(id);
  if (!t) throw new Error(`Unknown event type: ${id}`);
  return t;
}

export const GAME_WIDTH = Math.max(
  ...LAYOUTS.map((l) => l.grid.cols * l.grid.tileSize)
);
export const GAME_HEIGHT = Math.max(
  ...LAYOUTS.map((l) => l.grid.rows * l.grid.tileSize)
);
