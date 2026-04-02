import { PERKS } from "./perks";
import {
  applyPersistedMeta,
  getMetaPersistenceSnapshot,
  resetMetaToDefaults,
} from "./sessionMeta";

export const OFFICE_DUNGEON_META_KEY = "office-dungeon-meta-v1";

const VALID_PERK_IDS = new Set(PERKS.map((p) => p.id));
const MAX_CREDITS = 1e9;

let metaLoadedFromStorage = false;

export function wasMetaLoadedFromStorage(): boolean {
  return metaLoadedFromStorage;
}

type PersistedShape = {
  officeCredits: number;
  unlockedPerkIds: string[];
  equippedPerkId: string | null;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateAndNormalize(raw: unknown): PersistedShape | null {
  if (!isPlainObject(raw)) return null;

  const creditsRaw = raw.officeCredits;
  if (typeof creditsRaw !== "number" || !Number.isFinite(creditsRaw)) return null;
  let officeCredits = Math.floor(creditsRaw);
  if (officeCredits < 0 || officeCredits > MAX_CREDITS) return null;

  const arr = raw.unlockedPerkIds;
  if (!Array.isArray(arr)) return null;
  const unlocked = new Set<string>();
  for (const id of arr) {
    if (typeof id === "string" && VALID_PERK_IDS.has(id)) unlocked.add(id);
  }
  if (unlocked.size === 0) {
    unlocked.add("extra_coffee");
  }

  let equippedPerkId: string | null = null;
  const eq = raw.equippedPerkId;
  if (eq === null || eq === undefined) {
    equippedPerkId = pickDefaultEquipped(unlocked);
  } else if (typeof eq === "string" && VALID_PERK_IDS.has(eq) && unlocked.has(eq)) {
    equippedPerkId = eq;
  } else {
    equippedPerkId = pickDefaultEquipped(unlocked);
  }

  return {
    officeCredits,
    unlockedPerkIds: [...unlocked].sort(),
    equippedPerkId,
  };
}

function pickDefaultEquipped(unlocked: Set<string>): string {
  for (const p of PERKS) {
    if (unlocked.has(p.id)) return p.id;
  }
  return "extra_coffee";
}

export function loadMetaState(): void {
  metaLoadedFromStorage = false;
  try {
    const item = localStorage.getItem(OFFICE_DUNGEON_META_KEY);
    if (item === null) {
      resetMetaToDefaults();
      return;
    }
    const parsed: unknown = JSON.parse(item);
    const normalized = validateAndNormalize(parsed);
    if (!normalized) {
      resetMetaToDefaults();
      return;
    }
    applyPersistedMeta(normalized);
    metaLoadedFromStorage = true;
  } catch {
    resetMetaToDefaults();
  }
}

export function saveMetaState(): void {
  try {
    const snap = getMetaPersistenceSnapshot();
    const payload: PersistedShape = {
      officeCredits: snap.officeCredits,
      unlockedPerkIds: snap.unlockedPerkIds,
      equippedPerkId: snap.equippedPerkId,
    };
    localStorage.setItem(OFFICE_DUNGEON_META_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota — ignore */
  }
}

export function clearMetaState(): void {
  try {
    localStorage.removeItem(OFFICE_DUNGEON_META_KEY);
  } catch {
    /* ignore */
  }
  metaLoadedFromStorage = false;
  resetMetaToDefaults();
}
