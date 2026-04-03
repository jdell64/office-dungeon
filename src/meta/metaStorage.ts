import { MAX_RELIC_SLOTS, RELICS } from "./relics";
import {
  applyPersistedMeta,
  getMetaPersistenceSnapshot,
  resetMetaToDefaults,
} from "./sessionMeta";

export const OFFICE_DUNGEON_META_KEY = "office-dungeon-meta-v2";
/** Legacy key — migrated once into v2 shape. */
const OFFICE_DUNGEON_META_KEY_V1 = "office-dungeon-meta-v1";

const MAX_CREDITS = 1e9;

let metaLoadedFromStorage = false;

export function wasMetaLoadedFromStorage(): boolean {
  return metaLoadedFromStorage;
}

type PersistedShapeV2 = {
  officeCredits: number;
  unlockedRelicIds: string[];
  relicSlotCount: number;
  equippedRelicIds: (string | null)[];
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const VALID_RELIC_IDS = new Set(RELICS.map((r) => r.id));

function pickDefaultEquipped(unlocked: Set<string>): string {
  for (const p of RELICS) {
    if (unlocked.has(p.id)) return p.id;
  }
  return "extra_coffee";
}

function validateAndNormalizeV2(raw: unknown): PersistedShapeV2 | null {
  if (!isPlainObject(raw)) return null;

  const creditsRaw = raw.officeCredits;
  if (typeof creditsRaw !== "number" || !Number.isFinite(creditsRaw)) return null;
  let officeCredits = Math.floor(creditsRaw);
  if (officeCredits < 0 || officeCredits > MAX_CREDITS) return null;

  const arr = raw.unlockedRelicIds;
  if (!Array.isArray(arr)) return null;
  const unlocked = new Set<string>();
  for (const id of arr) {
    if (typeof id === "string" && VALID_RELIC_IDS.has(id)) unlocked.add(id);
  }
  if (unlocked.size === 0) {
    unlocked.add("extra_coffee");
  }

  const scRaw = raw.relicSlotCount;
  let relicSlotCount = 1;
  if (typeof scRaw === "number" && Number.isFinite(scRaw)) {
    relicSlotCount = Math.max(1, Math.min(MAX_RELIC_SLOTS, Math.floor(scRaw)));
  }

  const eqArr = raw.equippedRelicIds;
  if (!Array.isArray(eqArr)) return null;
  const equippedRelicIds: (string | null)[] = [];
  for (let i = 0; i < relicSlotCount; i++) {
    const v = eqArr[i];
    if (v === null || v === undefined) {
      equippedRelicIds.push(null);
    } else if (typeof v === "string" && VALID_RELIC_IDS.has(v) && unlocked.has(v)) {
      equippedRelicIds.push(v);
    } else {
      equippedRelicIds.push(null);
    }
  }

  const seen = new Set<string>();
  for (let i = 0; i < equippedRelicIds.length; i++) {
    const id = equippedRelicIds[i];
    if (id === null) continue;
    if (seen.has(id)) equippedRelicIds[i] = null;
    else seen.add(id);
  }

  let anyEquipped = false;
  for (const id of equippedRelicIds) {
    if (id !== null) {
      anyEquipped = true;
      break;
    }
  }
  if (!anyEquipped) {
    const def = pickDefaultEquipped(unlocked);
    equippedRelicIds[0] = def;
  }

  return {
    officeCredits,
    unlockedRelicIds: [...unlocked].sort(),
    relicSlotCount,
    equippedRelicIds,
  };
}

function migrateV1ToV2(raw: unknown): PersistedShapeV2 | null {
  if (!isPlainObject(raw)) return null;
  const creditsRaw = raw.officeCredits;
  if (typeof creditsRaw !== "number" || !Number.isFinite(creditsRaw)) return null;
  let officeCredits = Math.floor(creditsRaw);
  if (officeCredits < 0 || officeCredits > MAX_CREDITS) return null;

  const arr = raw.unlockedPerkIds;
  if (!Array.isArray(arr)) return null;
  const unlocked = new Set<string>();
  for (const id of arr) {
    if (typeof id === "string" && VALID_RELIC_IDS.has(id)) unlocked.add(id);
  }
  if (unlocked.size === 0) unlocked.add("extra_coffee");

  let equippedPerkId: string | null = null;
  const eq = raw.equippedPerkId;
  if (eq === null || eq === undefined) {
    equippedPerkId = pickDefaultEquipped(unlocked);
  } else if (typeof eq === "string" && VALID_RELIC_IDS.has(eq) && unlocked.has(eq)) {
    equippedPerkId = eq;
  } else {
    equippedPerkId = pickDefaultEquipped(unlocked);
  }

  return {
    officeCredits,
    unlockedRelicIds: [...unlocked].sort(),
    relicSlotCount: 1,
    equippedRelicIds: [equippedPerkId],
  };
}

export function loadMetaState(): void {
  metaLoadedFromStorage = false;
  try {
    let item = localStorage.getItem(OFFICE_DUNGEON_META_KEY);
    let fromV1 = false;
    if (item === null) {
      item = localStorage.getItem(OFFICE_DUNGEON_META_KEY_V1);
      if (item !== null) fromV1 = true;
    }
    if (item === null) {
      resetMetaToDefaults();
      return;
    }
    const parsed: unknown = JSON.parse(item);
    const normalized = fromV1
      ? migrateV1ToV2(parsed)
      : validateAndNormalizeV2(parsed);
    if (!normalized) {
      resetMetaToDefaults();
      return;
    }
    applyPersistedMeta(normalized);
    metaLoadedFromStorage = true;

    if (fromV1) {
      try {
        localStorage.removeItem(OFFICE_DUNGEON_META_KEY_V1);
      } catch {
        /* ignore */
      }
      saveMetaState();
    }
  } catch {
    resetMetaToDefaults();
  }
}

export function saveMetaState(): void {
  try {
    const snap = getMetaPersistenceSnapshot();
    const payload: PersistedShapeV2 = {
      officeCredits: snap.officeCredits,
      unlockedRelicIds: snap.unlockedRelicIds,
      relicSlotCount: snap.relicSlotCount,
      equippedRelicIds: snap.equippedRelicIds,
    };
    localStorage.setItem(OFFICE_DUNGEON_META_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota — ignore */
  }
}

export function clearMetaState(): void {
  try {
    localStorage.removeItem(OFFICE_DUNGEON_META_KEY);
    localStorage.removeItem(OFFICE_DUNGEON_META_KEY_V1);
  } catch {
    /* ignore */
  }
  metaLoadedFromStorage = false;
  resetMetaToDefaults();
}
