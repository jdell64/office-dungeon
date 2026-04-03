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
  workDelta: number;
  creditsDelta?: number;
};

/** Optional spawn filter: evaluated when events are assigned to tiles (per floor). */
export type EventSpawnConditions = {
  minStress?: number;
  maxEnergy?: number;
};

export type EventChoiceTypeDef = {
  kind: "choice";
  id: string;
  name: string;
  prompt: string;
  choiceY: EventChoiceDef;
  choiceN: EventChoiceDef;
  tags?: string[];
  conditions?: EventSpawnConditions;
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
  workDelta: number;
  creditsDelta?: number;
  tags?: string[];
  conditions?: EventSpawnConditions;
};

export type EventTypeDef = EventChoiceTypeDef | EventInstantTypeDef;

export function isChoiceEvent(e: EventTypeDef): e is EventChoiceTypeDef {
  return e.kind === "choice";
}

export type LayoutDef = {
  /** Stable slug for debug / saves (not tied to array order). */
  id: string;
  name: string;
  /** Optional emoji prefix in compact HUD (canonical `name` stays plain for debug/tests). */
  hudIcon?: string;
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
  /**
   * Pick up tile: either `workRestore` (>0) grants work only, or `energyRestore`
   * (default path) restores energy.
   */
  reward: {
    grid: { x: number; y: number };
    energyRestore?: number;
    workRestore?: number;
  };
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
    prompt: "Coworker Venting\nA coworker starts venting to you in the hallway.",
    tags: ["stress", "work"],
    choiceY: {
      label: "Listen",
      energyDelta: 0,
      stressDelta: 1,
      workDelta: 8,
    },
    choiceN: {
      label: "Escape",
      energyDelta: -1,
      stressDelta: 0,
      workDelta: 4,
    },
  },
  {
    kind: "instant",
    id: "free_snacks",
    name: "Free Snacks",
    prompt:
      "Free Snacks\nDonuts in the break room — you grab one on the way through.",
    tags: ["safe", "energy", "work"],
    energyDelta: 1,
    stressChance: 0.15,
    stressDeltaIfRoll: 1,
    workDelta: 5,
  },
  {
    kind: "choice",
    id: "manager_compliment",
    name: "Manager Compliment",
    prompt:
      "Manager Compliment\nYour manager praises you in front of the team.",
    tags: ["safe", "stress", "work"],
    choiceY: {
      label: "Thank them",
      energyDelta: 0,
      stressDelta: -1,
      workDelta: 4,
    },
    choiceN: {
      label: "Deflect",
      energyDelta: 0,
      stressDelta: 1,
      workDelta: 8,
    },
  },
  {
    kind: "choice",
    id: "coffee_spill",
    name: "Coffee Spill",
    prompt:
      "Coffee Spill\nSomeone bumps you and hot coffee sloshes toward your shirt.",
    tags: ["risky", "stress", "work"],
    choiceY: {
      label: "Jump back",
      energyDelta: -1,
      stressDelta: 0,
      workDelta: 4,
    },
    choiceN: {
      label: "Take the hit",
      energyDelta: 0,
      stressDelta: 1,
      workDelta: 8,
    },
  },
  {
    kind: "choice",
    id: "manager_checkin",
    name: "Manager Check-in",
    prompt: "Manager Check-in\nYour manager corners you for a quick sync.",
    tags: ["safe", "stress", "work"],
    choiceY: {
      label: "Keep it brief",
      energyDelta: 0,
      stressDelta: -1,
      workDelta: 4,
    },
    choiceN: {
      label: "Impress them",
      energyDelta: 1,
      stressDelta: 1,
      workDelta: 8,
    },
  },
  {
    kind: "choice",
    id: "copier_jam",
    name: "Printer Jam",
    prompt:
      "Printer Jam\nThe copier ate your report right before the deadline.",
    tags: ["risky", "stress", "work"],
    choiceY: {
      label: "Clear it",
      energyDelta: -1,
      stressDelta: 0,
      workDelta: 4,
    },
    choiceN: {
      label: "Walk away",
      energyDelta: 0,
      stressDelta: 1,
      workDelta: 8,
    },
  },
  {
    kind: "choice",
    id: "last_minute_invite",
    name: "Last-Minute Invite",
    prompt:
      "Last-Minute Invite\nYou're pinged to join a \"quick\" sync in five minutes.",
    tags: ["stress", "work"],
    choiceY: {
      label: "Decline politely",
      energyDelta: -1,
      stressDelta: 0,
      workDelta: 4,
    },
    choiceN: {
      label: "Join",
      energyDelta: 0,
      stressDelta: 1,
      workDelta: 8,
    },
  },
  {
    kind: "choice",
    id: "desk_audit",
    name: "Desk Neatness Check",
    prompt:
      "Desk Neatness Check\nFacilities is doing walkthrough photos today.",
    tags: ["risky", "stress", "work"],
    choiceY: {
      label: "Tidy up",
      energyDelta: -1,
      stressDelta: 0,
      workDelta: 4,
    },
    choiceN: {
      label: "Leave it",
      energyDelta: 0,
      stressDelta: 1,
      workDelta: 8,
    },
  },
  {
    kind: "instant",
    id: "coffee_break",
    name: "Coffee Break",
    prompt:
      "Coffee Break\nYou duck out for a proper cup — hot, bitter, and strangely comforting.",
    tags: ["safe", "energy", "stress"],
    energyDelta: 2,
    stressChance: 0.35,
    stressDeltaIfRoll: 1,
    workDelta: 3,
  },
  {
    kind: "choice",
    id: "crunch_time",
    name: "Crunch Time",
    prompt:
      "Crunch Time\nLeadership wants a \"small push\" before end of day.",
    tags: ["risky", "stress", "work", "energy"],
    choiceY: {
      label: "Say yes",
      energyDelta: -2,
      stressDelta: 2,
      workDelta: 14,
    },
    choiceN: {
      label: "Push back",
      energyDelta: -1,
      stressDelta: 1,
      workDelta: 6,
    },
  },
  {
    kind: "choice",
    id: "slack_off",
    name: "Slack Off",
    prompt:
      "Slack Off\nNobody is watching your calendar for the next hour.",
    tags: ["safe", "energy", "stress", "work"],
    choiceY: {
      label: "Rest at desk",
      energyDelta: 2,
      stressDelta: -2,
      workDelta: 0,
    },
    choiceN: {
      label: "Stay sharp",
      energyDelta: 0,
      stressDelta: 0,
      workDelta: 6,
    },
  },
  {
    kind: "choice",
    id: "side_project",
    name: "Side Project",
    prompt:
      "Side Project\nA friend offers a paid gig — nights and weekends only.",
    tags: ["credits", "risky", "stress"],
    choiceY: {
      label: "Take it",
      energyDelta: -1,
      stressDelta: 2,
      workDelta: 4,
      creditsDelta: 1,
    },
    choiceN: {
      label: "Decline",
      energyDelta: 0,
      stressDelta: 0,
      workDelta: 4,
    },
  },
  {
    kind: "choice",
    id: "hr_checkin",
    name: "HR Check-in",
    prompt:
      "HR Check-in\nWellness wants a quick pulse on \"how you're really doing.\"",
    tags: ["safe", "stress", "work"],
    choiceY: {
      label: "Be honest",
      energyDelta: 0,
      stressDelta: -2,
      workDelta: 4,
    },
    choiceN: {
      label: "Smile through it",
      energyDelta: 0,
      stressDelta: 1,
      workDelta: 8,
    },
  },
  {
    kind: "choice",
    id: "panic_thread",
    name: "Panic Thread",
    prompt:
      "Panic Thread\nA reply-all chain is spiraling — and your name is trending.",
    tags: ["risky", "stress", "work"],
    conditions: { minStress: 4 },
    choiceY: {
      label: "Dive in and fix it",
      energyDelta: -2,
      stressDelta: 2,
      workDelta: 12,
    },
    choiceN: {
      label: "Mute and hide",
      energyDelta: -1,
      stressDelta: 1,
      workDelta: 4,
    },
  },
  {
    kind: "instant",
    id: "emergency_espresso",
    name: "Emergency Espresso",
    prompt:
      "Emergency Espresso\nThe machine is free and you are running on fumes.",
    tags: ["energy", "stress", "safe"],
    conditions: { maxEnergy: 2 },
    energyDelta: 2,
    stressChance: 0.4,
    stressDeltaIfRoll: 1,
    workDelta: 2,
  },
  {
    kind: "choice",
    id: "overtime_offer",
    name: "Overtime Offer",
    prompt:
      "Overtime Offer\nThey'll slip you a little extra if you stay late tonight.",
    tags: ["credits", "risky", "stress", "work", "energy"],
    choiceY: {
      label: "Stay for the pay",
      energyDelta: -2,
      stressDelta: 2,
      workDelta: 10,
      creditsDelta: 1,
    },
    choiceN: {
      label: "Go home",
      energyDelta: 1,
      stressDelta: -1,
      workDelta: 2,
    },
  },
  {
    kind: "instant",
    id: "all_hands_email",
    name: "All-Hands Email",
    prompt:
      "All-Hands Email\nLeadership drops a 2,000-word \"exciting update\" in your inbox.",
    tags: ["stress", "work"],
    energyDelta: 0,
    stressChance: 0.55,
    stressDeltaIfRoll: 1,
    workDelta: 6,
  },
  {
    kind: "choice",
    id: "inbox_zero_hour",
    name: "Inbox Zero Hour",
    prompt:
      "Inbox Zero Hour\nYou have a rare quiet block — burn it down or pace yourself?",
    tags: ["work", "energy", "stress"],
    choiceY: {
      label: "Power through",
      energyDelta: -1,
      stressDelta: 1,
      workDelta: 12,
    },
    choiceN: {
      label: "Steady pace",
      energyDelta: 0,
      stressDelta: -1,
      workDelta: 6,
    },
  },
  {
    kind: "instant",
    id: "window_gazing",
    name: "Window Gazing",
    prompt:
      "Window Gazing\nYou stare at the parking lot until your shoulders unclench.",
    tags: ["safe", "stress", "energy"],
    energyDelta: 1,
    stressChance: 0,
    stressDeltaIfRoll: 0,
    workDelta: 0,
  },
  {
    kind: "instant",
    id: "expense_roulette",
    name: "Expense Roulette",
    prompt:
      "Expense Roulette\nFinance \"might\" approve that team dinner receipt.",
    tags: ["credits", "stress"],
    energyDelta: 0,
    stressChance: 0.3,
    stressDeltaIfRoll: 1,
    workDelta: 4,
    creditsDelta: 1,
  },
  {
    kind: "choice",
    id: "team_lunch",
    name: "Team Lunch",
    prompt:
      "Team Lunch\nThey're ordering — do you join the group chat or bow out?",
    tags: ["safe", "energy", "stress", "work"],
    choiceY: {
      label: "Join them",
      energyDelta: 1,
      stressDelta: -1,
      workDelta: 5,
    },
    choiceN: {
      label: "Skip it",
      energyDelta: 0,
      stressDelta: 1,
      workDelta: 6,
    },
  },
  {
    kind: "choice",
    id: "deadline_roulette",
    name: "Deadline Roulette",
    prompt:
      "Deadline Roulette\nThe client moved the date — again — and only you know.",
    tags: ["risky", "stress", "work"],
    conditions: { minStress: 3 },
    choiceY: {
      label: "Absorb the chaos",
      energyDelta: -1,
      stressDelta: 2,
      workDelta: 14,
    },
    choiceN: {
      label: "Escalate loudly",
      energyDelta: -1,
      stressDelta: 0,
      workDelta: 6,
    },
  },
  {
    kind: "instant",
    id: "fluorescent_buzz",
    name: "Fluorescent Buzz",
    prompt:
      "Fluorescent Buzz\nThe lights hum. Your temples answer. Only when you're already frayed.",
    tags: ["stress", "risky"],
    conditions: { minStress: 5 },
    energyDelta: -1,
    stressChance: 0.5,
    stressDeltaIfRoll: 1,
    workDelta: 3,
  },
];

/** Ids eligible for random assignment on event tiles (all defined events). */
export const EVENT_POOL_IDS: readonly string[] = eventTypes.map((t) => t.id);

export function eventPassesSpawnConditions(
  def: EventTypeDef,
  stress: number,
  energy: number
): boolean {
  const c = def.conditions;
  if (!c) return true;
  if (c.minStress !== undefined && stress < c.minStress) return false;
  if (c.maxEnergy !== undefined && energy > c.maxEnergy) return false;
  return true;
}

/**
 * Pool entries for RNG pick per event tile. Duplicates bias toward safe events on
 * floor 1 and risky/stress-tagged events on floor 3 (`floorIndex` 0 and 2).
 */
export function buildWeightedEventPoolIds(
  floorIndex: number,
  stress: number,
  energy: number
): string[] {
  let eligible = eventTypes.filter((t) =>
    eventPassesSpawnConditions(t, stress, energy)
  );
  if (eligible.length === 0) {
    eligible = [...eventTypes];
  }

  const pool: string[] = [];
  for (const t of eligible) {
    pool.push(t.id);
    const tags = new Set(t.tags ?? []);
    const isSafe = tags.has("safe");
    const isRiskyOrStress =
      tags.has("risky") || tags.has("stress");

    if (floorIndex <= 0) {
      if (isSafe) {
        pool.push(t.id, t.id);
      }
    } else if (floorIndex === 1) {
      if (isSafe) pool.push(t.id);
      if (isRiskyOrStress) pool.push(t.id);
    } else {
      if (isRiskyOrStress) {
        pool.push(t.id, t.id);
      }
    }
  }
  return pool;
}

/**
 * Reusable topology ideas for future proc-gen (hand maps below use these shapes):
 * - Reception top-bar (row 0) leaving a 1–2 tile lobby lane from spawn
 * - East-edge service strip forcing westward approach to the far column
 * - Hollow or C-shaped desk cluster with a single-file or 2-wide choke
 * - Split path: risky dense band vs longer safe corridor
 * - Break-room pocket: 3 walls + one entrance off a side hall
 */

/** Layout 0 — identical to former single levelConfig. */
const layoutOriginalOffice: LayoutDef = {
  id: "original_office",
  name: "Original Office",
  hudIcon: "🏢",
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
  hudIcon: "🏃",
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
  hudIcon: "🎩",
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
    workRestore: 8,
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
  hudIcon: "⚔️",
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
    { typeId: "endless_meeting", grid: { x: 4, y: 2 } },
    { typeId: "printer_jam", grid: { x: 7, y: 2 } },
    { typeId: "passive_email", grid: { x: 1, y: 6 } },
    { typeId: "printer_jam", grid: { x: 6, y: 5 } },
    { typeId: "endless_meeting", grid: { x: 3, y: 6 } },
    { typeId: "passive_email", grid: { x: 8, y: 8 } },
  ],
  reward: {
    grid: { x: 3, y: 8 },
    energyRestore: 3,
  },
  events: [{ typeId: "free_snacks", grid: { x: 4, y: 1 } }],
  exit: { x: 9, y: 9 },
  /**
   * Top lobby bar, west bench row, east service strip, central desk choke (gap 6,5),
   * south pinch + reward alcove (enter from 3,7).
   */
  blocked: [
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 0 },
    { x: 5, y: 0 },
    { x: 6, y: 0 },
    { x: 7, y: 0 },
    { x: 8, y: 0 },
    { x: 9, y: 0 },
    { x: 0, y: 3 },
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 9, y: 1 },
    { x: 9, y: 2 },
    { x: 9, y: 3 },
    { x: 9, y: 4 },
    { x: 9, y: 5 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 7, y: 4 },
    { x: 5, y: 5 },
    { x: 7, y: 5 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 7, y: 6 },
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 2, y: 8 },
    { x: 4, y: 8 },
    { x: 3, y: 9 },
  ],
};

/** Light combat, many events. */
const layoutEventHeavy: LayoutDef = {
  id: "event_heavy",
  name: "Event Heavy",
  hudIcon: "🎭",
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
    { typeId: "printer_jam", grid: { x: 8, y: 7 } },
    { typeId: "endless_meeting", grid: { x: 8, y: 2 } },
  ],
  reward: {
    grid: { x: 2, y: 2 },
    energyRestore: 3,
  },
  exit: { x: 9, y: 9 },
  /**
   * Top bar + east strip; hollow conference (walk through 5,5); west break pocket
   * with free_snacks optional via (3,8); main hall carries coworker on row 2.
   */
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
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 4, y: 5 },
    { x: 6, y: 5 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 0, y: 7 },
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 2, y: 8 },
    { x: 4, y: 8 },
    { x: 3, y: 9 },
  ],
  events: [
    { typeId: "coworker_venting", grid: { x: 6, y: 2 } },
    { typeId: "manager_compliment", grid: { x: 8, y: 4 } },
    { typeId: "coffee_spill", grid: { x: 5, y: 7 } },
    { typeId: "manager_checkin", grid: { x: 3, y: 5 } },
    { typeId: "copier_jam", grid: { x: 7, y: 6 } },
    { typeId: "free_snacks", grid: { x: 3, y: 8 } },
  ],
};

/**
 * Top/east band: dense enemies + reward. Lower/side path: one light fight to the exit.
 */
const layoutRiskReward: LayoutDef = {
  id: "risk_reward",
  name: "Risk / Reward",
  hudIcon: "⚖️",
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
    { typeId: "free_snacks", grid: { x: 8, y: 5 } },
    { typeId: "coworker_venting", grid: { x: 5, y: 7 } },
  ],
  exit: { x: 9, y: 9 },
  /**
   * East strip + central island; top filler (6–8,0) tightens the risky band;
   * coworker on the south approach to the island, snacks on the east column detour.
   */
  blocked: [
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
  hudIcon: "⬆️",
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
    /** Only approach to exit is (9,1)→(9,0); guarantees combat work toward target 32. */
    { typeId: "printer_jam", grid: { x: 9, y: 1 } },
  ],
  reward: {
    grid: { x: 5, y: 5 },
    energyRestore: 3,
  },
  events: [
    { typeId: "last_minute_invite", grid: { x: 4, y: 7 } },
    { typeId: "desk_audit", grid: { x: 1, y: 2 } },
    { typeId: "free_snacks", grid: { x: 2, y: 8 } },
  ],
  exit: { x: 9, y: 0 },
  /**
   * Mid top wall forces dip south before the exit column; west row blocks, interior
   * cubicles, east spine; reward sits in the inner room; snacks in SW pocket.
   */
  blocked: [
    { x: 4, y: 0 },
    { x: 5, y: 0 },
    { x: 6, y: 0 },
    { x: 7, y: 0 },
    { x: 8, y: 0 },
    { x: 0, y: 4 },
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 3, y: 4 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 2, y: 6 },
    { x: 3, y: 6 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 8, y: 4 },
    { x: 8, y: 5 },
    { x: 8, y: 6 },
    { x: 5, y: 8 },
    { x: 6, y: 8 },
    { x: 7, y: 8 },
  ],
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

/** Largest authored grid span — used so every floor uses the same canvas size (no FIT “zoom” jumps). */
export const MAX_LAYOUT_COLS = Math.max(...LAYOUTS.map((l) => l.grid.cols));
export const MAX_LAYOUT_ROWS = Math.max(...LAYOUTS.map((l) => l.grid.rows));

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

/** True if some orthogonal path exists from player start to exit (blocked cells impassable). */
export function isExitReachable(
  layout: LayoutDef,
  blocked: Set<string>
): boolean {
  const { cols, rows } = layout.grid;
  const sx = layout.player.startGrid.x;
  const sy = layout.player.startGrid.y;
  const ex = layout.exit.x;
  const ey = layout.exit.y;
  const walkable = (x: number, y: number): boolean =>
    x >= 0 &&
    x < cols &&
    y >= 0 &&
    y < rows &&
    !blocked.has(layoutCellKey(x, y));
  if (!walkable(sx, sy) || !walkable(ex, ey)) return false;
  const seen = new Set<string>();
  const q: Array<[number, number]> = [[sx, sy]];
  seen.add(layoutCellKey(sx, sy));
  while (q.length > 0) {
    const [x, y] = q.shift()!;
    if (x === ex && y === ey) return true;
    const next: Array<[number, number]> = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of next) {
      const k = layoutCellKey(nx, ny);
      if (walkable(nx, ny) && !seen.has(k)) {
        seen.add(k);
        q.push([nx, ny]);
      }
    }
  }
  return false;
}

export function warnIfExitUnreachable(
  layout: LayoutDef,
  blocked: Set<string>
): void {
  if (!isExitReachable(layout, blocked)) {
    console.warn(
      `[Office Dungeon] Layout "${layout.id}": exit is not reachable from player start (blocked topology).`
    );
  }
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

const maxAuthoredTile = Math.max(...LAYOUTS.map((l) => l.grid.tileSize));
export const GAME_WIDTH = MAX_LAYOUT_COLS * maxAuthoredTile;
export const GAME_HEIGHT = MAX_LAYOUT_ROWS * maxAuthoredTile;
