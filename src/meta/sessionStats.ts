export const OFFICE_DUNGEON_SESSION_STATS_KEY = "office-dungeon-session-stats-v1";

const MAX_COUNT = 1e9;

type PersistedShape = {
  runsStarted: number;
  runsCompleted: number;
  wins: number;
  losses: number;
  totalRunDurationMs: number;
};

let memory: PersistedShape = {
  runsStarted: 0,
  runsCompleted: 0,
  wins: 0,
  losses: 0,
  totalRunDurationMs: 0,
};

function clampNonNegInt(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), MAX_COUNT);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateAndNormalize(raw: unknown): PersistedShape | null {
  if (!isPlainObject(raw)) return null;
  const rs = raw.runsStarted;
  const rc = raw.runsCompleted;
  const w = raw.wins;
  const l = raw.losses;
  const td = raw.totalRunDurationMs;
  if (
    typeof rs !== "number" ||
    typeof rc !== "number" ||
    typeof w !== "number" ||
    typeof l !== "number" ||
    typeof td !== "number" ||
    !Number.isFinite(td) ||
    td < 0
  ) {
    return null;
  }
  return {
    runsStarted: clampNonNegInt(rs),
    runsCompleted: clampNonNegInt(rc),
    wins: clampNonNegInt(w),
    losses: clampNonNegInt(l),
    totalRunDurationMs: Math.min(td, Number.MAX_SAFE_INTEGER),
  };
}

export function loadSessionStats(): void {
  try {
    const item = localStorage.getItem(OFFICE_DUNGEON_SESSION_STATS_KEY);
    if (item === null) {
      memory = {
        runsStarted: 0,
        runsCompleted: 0,
        wins: 0,
        losses: 0,
        totalRunDurationMs: 0,
      };
      return;
    }
    const parsed: unknown = JSON.parse(item);
    const normalized = validateAndNormalize(parsed);
    if (!normalized) {
      memory = {
        runsStarted: 0,
        runsCompleted: 0,
        wins: 0,
        losses: 0,
        totalRunDurationMs: 0,
      };
      return;
    }
    memory = normalized;
  } catch {
    memory = {
      runsStarted: 0,
      runsCompleted: 0,
      wins: 0,
      losses: 0,
      totalRunDurationMs: 0,
    };
  }
}

function saveSessionStats(): void {
  try {
    localStorage.setItem(
      OFFICE_DUNGEON_SESSION_STATS_KEY,
      JSON.stringify(memory)
    );
  } catch {
    /* private mode / quota */
  }
}

export function recordRunStarted(): void {
  memory = {
    ...memory,
    runsStarted: Math.min(memory.runsStarted + 1, MAX_COUNT),
  };
  saveSessionStats();
}

export function recordRunEnded(args: {
  outcome: "win" | "loss";
  durationMs: number;
}): void {
  const dur = clampNonNegInt(args.durationMs);
  memory = {
    ...memory,
    runsCompleted: Math.min(memory.runsCompleted + 1, MAX_COUNT),
    wins: args.outcome === "win" ? Math.min(memory.wins + 1, MAX_COUNT) : memory.wins,
    losses:
      args.outcome === "loss"
        ? Math.min(memory.losses + 1, MAX_COUNT)
        : memory.losses,
    totalRunDurationMs: Math.min(
      memory.totalRunDurationMs + dur,
      Number.MAX_SAFE_INTEGER
    ),
  };
  saveSessionStats();
}

export type SessionStatsDebug = {
  runsStarted: number;
  wins: number;
  losses: number;
  runsCompleted: number;
  averageRunLengthSeconds: number;
};

export function getSessionStatsForDebug(): SessionStatsDebug {
  const n = memory.runsCompleted;
  const avgSec =
    n > 0 ? memory.totalRunDurationMs / n / 1000 : 0;
  return {
    runsStarted: memory.runsStarted,
    wins: memory.wins,
    losses: memory.losses,
    runsCompleted: memory.runsCompleted,
    averageRunLengthSeconds: Math.round(avgSec * 1000) / 1000,
  };
}
