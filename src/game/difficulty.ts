export type Difficulty = "easy" | "normal" | "hard";

const ORDER: readonly Difficulty[] = ["easy", "normal", "hard"];

export function cycleDifficulty(prev: Difficulty, direction: 1 | -1): Difficulty {
  const i = ORDER.indexOf(prev);
  const n = ORDER.length;
  const next = (i + direction + n * 10) % n;
  return ORDER[next]!;
}

export function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case "easy":
      return "Easy";
    case "normal":
      return "Normal";
    case "hard":
      return "Hard";
  }
}

/** Compact cue for HUD / title (pairs with `difficultyLabel`). */
export function difficultyHudIcon(d: Difficulty): string {
  switch (d) {
    case "easy":
      return "🌿";
    case "normal":
      return "📋";
    case "hard":
      return "🔥";
  }
}

/** Added to starting energy and effective max energy after layout + relics. */
export function energyBonus(d: Difficulty): number {
  switch (d) {
    case "easy":
      return 1;
    case "normal":
      return 0;
    case "hard":
      return -1;
  }
}

export function scaledEnemyDamage(baseDamage: number, d: Difficulty): number {
  if (baseDamage <= 0) return 0;
  switch (d) {
    case "easy":
      return Math.max(0, baseDamage - 1);
    case "normal":
      return baseDamage;
    case "hard":
      return baseDamage + 1;
  }
}

/** Only positive stress changes are scaled; relief (negative) is unchanged. */
export function scaledStressGain(delta: number, d: Difficulty): number {
  if (delta <= 0) return delta;
  switch (d) {
    case "easy":
      return Math.max(0, delta - 1);
    case "normal":
      return delta;
    case "hard":
      return delta + 1;
  }
}
