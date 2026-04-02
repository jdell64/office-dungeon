export type PerkEffect =
  | { kind: "extra_coffee" }
  | { kind: "calm_mind" }
  | { kind: "aggressive_reply" };

export type PerkDef = {
  id: string;
  name: string;
  cost: number;
  effect: PerkEffect;
};

export const PERKS: readonly PerkDef[] = [
  {
    id: "extra_coffee",
    name: "Extra Coffee",
    cost: 5,
    effect: { kind: "extra_coffee" },
  },
  {
    id: "calm_mind",
    name: "Calm Mind",
    cost: 5,
    effect: { kind: "calm_mind" },
  },
  {
    id: "aggressive_reply",
    name: "Aggressive Reply",
    cost: 7,
    effect: { kind: "aggressive_reply" },
  },
] as const;

export function getPerkById(id: string): PerkDef | undefined {
  return PERKS.find((p) => p.id === id);
}

export function perkAtTitleIndex(index: number): PerkDef | undefined {
  return PERKS[index] as PerkDef | undefined;
}
