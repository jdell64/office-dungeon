import { PERKS, type PerkDef } from "./perks";
import { saveMetaState } from "./metaStorage";

const STARTER_UNLOCKED = "extra_coffee";

let officeCredits = 0;
const unlockedPerkIds = new Set<string>([STARTER_UNLOCKED]);
let equippedPerkId: string | null = STARTER_UNLOCKED;

export type TitlePerkKeyResult =
  | "equipped"
  | "unlocked_equipped"
  | "no_credits"
  | "invalid";

export function resetMetaToDefaults(): void {
  officeCredits = 0;
  unlockedPerkIds.clear();
  unlockedPerkIds.add(STARTER_UNLOCKED);
  equippedPerkId = STARTER_UNLOCKED;
}

export function applyPersistedMeta(data: {
  officeCredits: number;
  unlockedPerkIds: string[];
  equippedPerkId: string | null;
}): void {
  officeCredits = data.officeCredits;
  unlockedPerkIds.clear();
  for (const id of data.unlockedPerkIds) {
    unlockedPerkIds.add(id);
  }
  equippedPerkId = data.equippedPerkId;
}

export function getMetaPersistenceSnapshot(): {
  officeCredits: number;
  unlockedPerkIds: string[];
  equippedPerkId: string | null;
} {
  return {
    officeCredits,
    unlockedPerkIds: [...unlockedPerkIds].sort(),
    equippedPerkId,
  };
}

export function getOfficeCredits(): number {
  return officeCredits;
}

export function getUnlockedPerkIds(): string[] {
  return [...unlockedPerkIds].sort();
}

export function getEquippedPerkId(): string | null {
  return equippedPerkId;
}

export function addOfficeCredits(amount: number): void {
  officeCredits += amount;
  saveMetaState();
}

const UNLOCK_TEASE_MAX_GAP = 3;

/** If the next locked perk (PERKS order) is 1–3 credits away, return a one-line tease; else null. */
export function getNextPerkUnlockTease(): string | null {
  const credits = officeCredits;
  for (const p of PERKS) {
    if (unlockedPerkIds.has(p.id)) continue;
    const need = p.cost - credits;
    if (need <= 0) continue;
    if (need <= UNLOCK_TEASE_MAX_GAP) {
      const unit = need === 1 ? "credit" : "credits";
      return `${need} more ${unit} to unlock ${p.name}`;
    }
    return null;
  }
  return null;
}

/** Title screen: perk slot index 0..2 maps to PERKS order. */
export function tryTitlePerkKey(index: number): TitlePerkKeyResult {
  const perk = PERKS[index] as PerkDef | undefined;
  if (!perk) return "invalid";

  if (unlockedPerkIds.has(perk.id)) {
    equippedPerkId = perk.id;
    saveMetaState();
    return "equipped";
  }

  if (officeCredits >= perk.cost) {
    officeCredits -= perk.cost;
    unlockedPerkIds.add(perk.id);
    equippedPerkId = perk.id;
    saveMetaState();
    return "unlocked_equipped";
  }

  return "no_credits";
}
