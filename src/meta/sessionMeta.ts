import {
  MAX_RELIC_SLOTS,
  RELICS,
  RELIC_SLOT_UNLOCK_RULES,
  type RelicDef,
} from "./relics";
import { saveMetaState } from "./metaStorage";

const STARTER_UNLOCKED = "extra_coffee";

let officeCredits = 0;
const unlockedRelicIds = new Set<string>([STARTER_UNLOCKED]);
/** 1..MAX_RELIC_SLOTS */
let relicSlotCount = 1;
/** Length === relicSlotCount; null = empty slot */
let equippedRelicIds: (string | null)[] = [STARTER_UNLOCKED];

function normalizeEquippedLength(): void {
  while (equippedRelicIds.length < relicSlotCount) {
    equippedRelicIds.push(null);
  }
  if (equippedRelicIds.length > relicSlotCount) {
    equippedRelicIds = equippedRelicIds.slice(0, relicSlotCount);
  }
}

export type TitleRelicAssignResult =
  | "equipped"
  | "unlocked_equipped"
  | "no_credits"
  | "invalid";

export type UnlockRelicSlotResult =
  | "unlocked"
  | "max_slots"
  | "no_rule"
  | "not_enough_credits"
  | "milestone_not_met";

export function resetMetaToDefaults(): void {
  officeCredits = 0;
  unlockedRelicIds.clear();
  unlockedRelicIds.add(STARTER_UNLOCKED);
  relicSlotCount = 1;
  equippedRelicIds = [STARTER_UNLOCKED];
}

export function applyPersistedMeta(data: {
  officeCredits: number;
  unlockedRelicIds: string[];
  relicSlotCount: number;
  equippedRelicIds: (string | null)[];
}): void {
  officeCredits = data.officeCredits;
  unlockedRelicIds.clear();
  for (const id of data.unlockedRelicIds) {
    unlockedRelicIds.add(id);
  }
  relicSlotCount = data.relicSlotCount;
  equippedRelicIds = [...data.equippedRelicIds];
  normalizeEquippedLength();
}

export function getMetaPersistenceSnapshot(): {
  officeCredits: number;
  unlockedRelicIds: string[];
  relicSlotCount: number;
  equippedRelicIds: (string | null)[];
} {
  normalizeEquippedLength();
  return {
    officeCredits,
    unlockedRelicIds: [...unlockedRelicIds].sort(),
    relicSlotCount,
    equippedRelicIds: [...equippedRelicIds],
  };
}

export function getOfficeCredits(): number {
  return officeCredits;
}

export function getUnlockedRelicIds(): string[] {
  return [...unlockedRelicIds].sort();
}

export function getRelicSlotCount(): number {
  return relicSlotCount;
}

/** Equipped relic ids per slot (includes nulls). */
export function getEquippedRelicSlots(): (string | null)[] {
  normalizeEquippedLength();
  return [...equippedRelicIds];
}

/** Non-null equipped relic ids for gameplay (order preserved, no dupes by construction). */
export function getEquippedRelicIds(): string[] {
  normalizeEquippedLength();
  const out: string[] = [];
  for (const id of equippedRelicIds) {
    if (id !== null) out.push(id);
  }
  return out;
}

export function addOfficeCredits(amount: number): void {
  officeCredits += amount;
  saveMetaState();
}

const UNLOCK_TEASE_MAX_GAP = 3;

export function getNextRelicUnlockTease(): string | null {
  const credits = officeCredits;
  for (const r of RELICS) {
    if (unlockedRelicIds.has(r.id)) continue;
    const need = r.cost - credits;
    if (need <= 0) continue;
    if (need <= UNLOCK_TEASE_MAX_GAP) {
      const unit = need === 1 ? "credit" : "credits";
      return `${need} more ${unit} to unlock ${r.icon} ${r.name}`;
    }
    return null;
  }
  return null;
}

function clearRelicFromOtherSlots(relicId: string, exceptSlot: number): void {
  for (let i = 0; i < equippedRelicIds.length; i++) {
    if (i !== exceptSlot && equippedRelicIds[i] === relicId) {
      equippedRelicIds[i] = null;
    }
  }
}

/**
 * Unlock with credits if needed, then assign catalog relic to the given slot.
 * Removes the same relic from other slots (no duplicates).
 */
export function tryAssignRelicToSlot(
  catalogIndex: number,
  slotIndex: number
): TitleRelicAssignResult {
  const relic = RELICS[catalogIndex] as RelicDef | undefined;
  if (!relic) return "invalid";
  if (slotIndex < 0 || slotIndex >= relicSlotCount) return "invalid";

  if (unlockedRelicIds.has(relic.id)) {
    clearRelicFromOtherSlots(relic.id, slotIndex);
    equippedRelicIds[slotIndex] = relic.id;
    saveMetaState();
    return "equipped";
  }

  if (officeCredits >= relic.cost) {
    officeCredits -= relic.cost;
    unlockedRelicIds.add(relic.id);
    clearRelicFromOtherSlots(relic.id, slotIndex);
    equippedRelicIds[slotIndex] = relic.id;
    saveMetaState();
    return "unlocked_equipped";
  }

  return "no_credits";
}

export function clearRelicSlot(slotIndex: number): void {
  if (slotIndex < 0 || slotIndex >= relicSlotCount) return;
  equippedRelicIds[slotIndex] = null;
  saveMetaState();
}

/**
 * Attempt to add one relic slot using RELIC_SLOT_UNLOCK_RULES for `relicSlotCount + 1`.
 * @param lifetimeWins session lifetime wins (for milestone unlocks)
 */
export function tryUnlockNextRelicSlot(
  lifetimeWins: number
): UnlockRelicSlotResult {
  if (relicSlotCount >= MAX_RELIC_SLOTS) return "max_slots";
  const targetCount = relicSlotCount + 1;
  const rule = RELIC_SLOT_UNLOCK_RULES[targetCount];
  if (!rule) return "no_rule";

  if (rule.kind === "credits") {
    if (officeCredits < rule.cost) return "not_enough_credits";
    officeCredits -= rule.cost;
    relicSlotCount = targetCount;
    normalizeEquippedLength();
    saveMetaState();
    return "unlocked";
  }

  if (lifetimeWins < rule.need) return "milestone_not_met";
  relicSlotCount = targetCount;
  normalizeEquippedLength();
  saveMetaState();
  return "unlocked";
}
