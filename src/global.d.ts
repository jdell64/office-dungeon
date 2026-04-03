import type { GameDebugState } from "./debug/gameState";

/** E2E / automation only — forwards to GameScene touch paths (no keyboard). */
export type OfficeDungeonE2e = {
  pressStart: () => void;
  restartRun: () => void;
  step: (dx: number, dy: number) => void;
  eventChoice: (yes: boolean) => void;
  encounterChoice: (choiceIndex: 0 | 1 | 2) => void;
  setStressForTest: (n: number) => void;
  /** E2E: set energy while in an active run (`uncapped` bypasses max for long movement tests). */
  setEnergyForTest: (n: number, uncapped?: boolean) => void;
  rewardedContinue: () => void;
  /** Title screen: assign catalog relic index to focused slot. */
  titleAssignRelic: (catalogIndex: number) => void;
  /** E2E / dev: equip by id without cost (for relics hidden from title catalog). */
  titleEquipRelicByIdForTest: (relicId: string) => void;
  titleSelectRelicSlot: (slotIndex: number) => void;
  titleClearFocusedSlot: () => void;
  titleUnlockSlot: () => void;
  clearMetaState: () => void;
  togglePremiumDev: () => void;
};

declare global {
  interface Window {
    __gameState?: GameDebugState;
    __odE2e?: OfficeDungeonE2e;
    /** E2E: if set, return value in 0–1 for instant-event stress rolls (e.g. always hit/miss). */
    __odStressRoll?: () => number;
  }
}

export {};
