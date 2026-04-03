import type {
  EncounterChoiceDef,
  ResolvedEncounterChoice,
} from "../data/encounters";

export type RelicEffect =
  | { kind: "extra_coffee" }
  | { kind: "calm_mind" }
  | { kind: "aggressive_reply" };

export type RelicDef = {
  id: string;
  icon: string;
  name: string;
  cost: number;
  effect: RelicEffect;
};

export const RELICS: readonly RelicDef[] = [
  {
    id: "extra_coffee",
    icon: "☕",
    name: "Extra Coffee",
    cost: 5,
    effect: { kind: "extra_coffee" },
  },
  {
    id: "calm_mind",
    icon: "🧘",
    name: "Calm Mind",
    cost: 5,
    effect: { kind: "calm_mind" },
  },
  {
    id: "aggressive_reply",
    icon: "💢",
    name: "Aggressive Reply",
    cost: 7,
    effect: { kind: "aggressive_reply" },
  },
] as const;

export const MAX_RELIC_SLOTS = 3;

/** Unlock slot 2 with credits; unlock slot 3 with lifetime wins (session stats). */
export const RELIC_SLOT_UNLOCK_RULES: Record<
  number,
  | { kind: "credits"; cost: number }
  | { kind: "wins"; need: number }
> = {
  2: { kind: "credits", cost: 15 },
  3: { kind: "wins", need: 5 },
};

const VALID_IDS = new Set(RELICS.map((r) => r.id));

export function isValidRelicId(id: string): boolean {
  return VALID_IDS.has(id);
}

export function getRelicById(id: string): RelicDef | undefined {
  return RELICS.find((r) => r.id === id);
}

export function relicAtCatalogIndex(index: number): RelicDef | undefined {
  return RELICS[index] as RelicDef | undefined;
}

/** Count each effect kind across equipped relic ids (invalid ids ignored). */
export function countRelicEffects(relicIds: readonly string[]): {
  extraCoffee: number;
  calmMind: number;
  aggressiveReply: number;
} {
  let extraCoffee = 0;
  let calmMind = 0;
  let aggressiveReply = 0;
  for (const id of relicIds) {
    const r = getRelicById(id);
    if (!r) continue;
    switch (r.effect.kind) {
      case "extra_coffee":
        extraCoffee++;
        break;
      case "calm_mind":
        calmMind++;
        break;
      case "aggressive_reply":
        aggressiveReply++;
        break;
    }
  }
  return { extraCoffee, calmMind, aggressiveReply };
}

/** Starting energy bonus (+2 per Extra Coffee) and max energy bonus (same). */
export function aggregatedStartEnergyBonus(relicIds: readonly string[]): number {
  return countRelicEffects(relicIds).extraCoffee * 2;
}

/** Stress reduction at run start (2 per Calm Mind). */
export function aggregatedStartStressReduction(relicIds: readonly string[]): number {
  return countRelicEffects(relicIds).calmMind * 2;
}

export function aggregatedDamageBonus(relicIds: readonly string[]): number {
  return countRelicEffects(relicIds).aggressiveReply;
}

/**
 * Apply all equipped relics to an encounter choice (stacked).
 * Each Extra Coffee: +1 energy when choice already gains energy.
 * Each Calm Mind: -1 stress from positive stress gains (floors at 0).
 * Each Aggressive Reply: +1 credits when choice has aggressive tag.
 */
export function resolveEncounterChoiceWithRelics(
  choice: EncounterChoiceDef,
  equippedRelicIds: readonly string[]
): ResolvedEncounterChoice {
  let energyDelta = choice.energyDelta;
  let stressDelta = choice.stressDelta;
  let creditsDelta = choice.creditsDelta;

  const counts = countRelicEffects(equippedRelicIds);
  if (counts.extraCoffee > 0 && energyDelta > 0) {
    energyDelta += counts.extraCoffee;
  }
  if (counts.calmMind > 0 && stressDelta > 0) {
    stressDelta = Math.max(0, stressDelta - counts.calmMind);
  }
  if (
    counts.aggressiveReply > 0 &&
    choice.perkTag === "aggressive"
  ) {
    creditsDelta += counts.aggressiveReply;
  }

  return {
    label: choice.label,
    energyDelta,
    stressDelta,
    creditsDelta,
    statusMessage: choice.statusMessage,
  };
}
