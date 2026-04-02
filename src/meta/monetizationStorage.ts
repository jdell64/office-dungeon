export const OFFICE_DUNGEON_MONETIZATION_KEY =
  "office-dungeon-monetization-v1";

type PersistedShape = {
  premiumNoAds: boolean;
};

let premiumNoAdsEnabled = false;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function loadMonetizationState(): void {
  try {
    const item = localStorage.getItem(OFFICE_DUNGEON_MONETIZATION_KEY);
    if (item === null) {
      premiumNoAdsEnabled = false;
      return;
    }
    const parsed: unknown = JSON.parse(item);
    if (!isPlainObject(parsed)) {
      premiumNoAdsEnabled = false;
      return;
    }
    const flag = parsed.premiumNoAds;
    premiumNoAdsEnabled = flag === true;
  } catch {
    premiumNoAdsEnabled = false;
  }
}

function saveMonetizationState(): void {
  try {
    const payload: PersistedShape = { premiumNoAds: premiumNoAdsEnabled };
    localStorage.setItem(
      OFFICE_DUNGEON_MONETIZATION_KEY,
      JSON.stringify(payload)
    );
  } catch {
    /* private mode / quota */
  }
}

export function getPremiumNoAdsEnabled(): boolean {
  return premiumNoAdsEnabled;
}

export function setPremiumNoAdsEnabled(value: boolean): void {
  premiumNoAdsEnabled = value;
  saveMonetizationState();
}
