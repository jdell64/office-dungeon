import type { GameDebugState } from "./debug/gameState";

/** E2E / automation only — forwards to GameScene touch paths (no keyboard). */
export type OfficeDungeonE2e = {
  pressStart: () => void;
  restartRun: () => void;
  step: (dx: number, dy: number) => void;
  eventChoice: (yes: boolean) => void;
  encounterChoice: (choiceIndex: 0 | 1 | 2) => void;
  setStressForTest: (n: number) => void;
  rewardedContinue: () => void;
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
