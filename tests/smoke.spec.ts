import { expect, test, type Page } from "@playwright/test";

/** Must match OFFICE_DUNGEON_META_KEY in src/meta/metaStorage.ts */
const OFFICE_DUNGEON_META_KEY = "office-dungeon-meta-v2";
/** Legacy meta key — remove with v2 so migration does not resurrect old saves. */
const OFFICE_DUNGEON_META_KEY_V1 = "office-dungeon-meta-v1";

/** Must match OFFICE_DUNGEON_MONETIZATION_KEY in src/meta/monetizationStorage.ts */
const OFFICE_DUNGEON_MONETIZATION_KEY = "office-dungeon-monetization-v1";

/** Deterministic events + Original Office layout (matches pinned `layout=0`). */
const OD = "/?eventRandom=0&layout=0";

type GameState = {
  screenState:
    | "title"
    | "running"
    | "event"
    | "gameOver"
    | "victory";
  touchUi: {
    movement: boolean;
    event: boolean;
    start: boolean;
    restart: boolean;
    continueReward: boolean;
  };
  layout: { id: string; index: number; name: string };
  floor: {
    current: number;
    total: number;
    layoutSequence: number[];
    layoutIdSequence: string[];
  };
  playerPosition: { x: number; y: number };
  playerEnergy: number;
  playerEnergyMax: number;
  playerStress: number;
  enemies: Array<{
    name: string;
    x: number;
    y: number;
    hp: number;
    damage: number;
    alive: boolean;
  }>;
  reward: { x: number; y: number; available: boolean };
  currentEventId: string | null;
  currentEncounterId?: string | null;
  lastEventResult: string | null;
  events: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    available: boolean;
    active: boolean;
  }>;
  exit: { x: number; y: number };
  gameOver: boolean;
  gameOverReason: "burnout" | "no_energy" | null;
  gameWon: boolean;
  workDone: number;
  workTarget: number;
  runStats: {
    enemiesDefeated: number;
    eventsResolved: number;
    turnsTaken: number;
  };
  latestMessage?: string;
  meta: {
    officeCredits: number;
    equippedRelicIds: (string | null)[];
    unlockedRelicIds: string[];
    relicSlotCount: number;
    titleFocusedRelicSlot: number;
    creditsEarnedThisRun: number;
    metaLoadedFromStorage?: boolean;
    activeRunModifiers?: {
      energyDelta?: number;
      stressDelta?: number;
      damageBonus?: number;
    };
  };
  stats?: {
    runsStarted: number;
    wins: number;
    losses: number;
    runsCompleted: number;
    averageRunLengthSeconds: number;
  };
  audio: { muted: boolean };
  monetization: {
    premiumEnabled: boolean;
    continueAvailable: boolean;
    continueUsedThisRun: boolean;
  };
};

function eventAt(
  state: GameState | undefined,
  x: number,
  y: number
): GameState["events"][0] | undefined {
  return state?.events.find((e) => e.x === x && e.y === y);
}

function enemyAt(
  state: GameState | undefined,
  x: number,
  y: number
): GameState["enemies"][0] | undefined {
  return state?.enemies.find((e) => e.x === x && e.y === y);
}

/** Avoids parallel-test races where the scene has not published __gameState yet. */
async function focusGameAndWaitForState(page: Page): Promise<void> {
  await expect(page.locator("#game-root canvas")).toBeVisible();
  /** Top-left: center hits the middle relic catalog button (Calm Mind) on title. */
  await page.locator("#game-root canvas").click({ position: { x: 4, y: 4 } });
  await page.waitForFunction(
    () => {
      const w = window as Window & { __gameState?: GameState };
      return w.__gameState != null && w.__gameState.screenState === "title";
    },
    { timeout: 30000 }
  );
}

async function startRun(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const w = window as Window & { __odE2e?: OdE2e };
    return w.__odE2e != null;
  }, { timeout: 30000 });
  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.pressStart();
  });
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.screenState === "running";
    },
    { timeout: 5000 }
  );
}

type OdE2e = {
  pressStart: () => void;
  restartRun: () => void;
  step: (dx: number, dy: number) => void;
  eventChoice: (yes: boolean) => void;
  encounterChoice: (choiceIndex: 0 | 1 | 2) => void;
  setStressForTest: (n: number) => void;
  setEnergyForTest: (n: number, uncapped?: boolean) => void;
  rewardedContinue: () => void;
  titleAssignRelic: (catalogIndex: number) => void;
  titleEquipRelicByIdForTest: (relicId: string) => void;
  titleSelectRelicSlot: (slotIndex: number) => void;
  titleClearFocusedSlot: () => void;
  titleUnlockSlot: () => void;
  clearMetaState: () => void;
  togglePremiumDev: () => void;
};

const ARROW_TO_STEP: Record<
  "ArrowRight" | "ArrowDown" | "ArrowLeft" | "ArrowUp",
  [number, number]
> = {
  ArrowRight: [1, 0],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, -1],
};

/**
 * One grid step toward `expected`. Uses `__odE2e.step` so OS key-repeat cannot
 * fire multiple tryStep calls from a single Playwright keyboard.press.
 */
async function pressUntilPlayerAt(
  page: Page,
  key: "ArrowRight" | "ArrowDown" | "ArrowLeft" | "ArrowUp",
  expected: { x: number; y: number }
): Promise<void> {
  const [dx, dy] = ARROW_TO_STEP[key];
  await page.evaluate(
    ([sx, sy]) => {
      (window as Window & { __odE2e?: OdE2e }).__odE2e?.step(sx, sy);
    },
    [dx, dy] as [number, number]
  );
  await page.waitForFunction(
    (exp) => {
      const p = (window as Window & { __gameState?: GameState }).__gameState
        ?.playerPosition;
      return p?.x === exp.x && p?.y === exp.y;
    },
    expected,
    { timeout: 5000 }
  );
}

/** E2E only: high energy for encounters; movement no longer costs energy (phase 3). */
async function setTestEnergy(page: Page, n: number): Promise<void> {
  await page.waitForFunction(() => {
    const w = window as Window & { __odE2e?: OdE2e };
    return w.__odE2e != null;
  }, { timeout: 10000 });
  await page.evaluate((energy) => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.setEnergyForTest(
      energy,
      true
    );
  }, n);
  await page.waitForFunction(
    (e) => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s != null && s.playerEnergy === e;
    },
    n,
    { timeout: 5000 }
  );
}

async function waitForRunningFloor(
  page: Page,
  floorOneBased: number
): Promise<void> {
  await page.waitForFunction(
    (f) => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return (
        s != null &&
        s.floor.current === f &&
        s.screenState === "running" &&
        !s.gameWon
      );
    },
    floorOneBased,
    { timeout: 20000 }
  );
}

/** From (0,0): coworker + manager events; ends at ~(8,2) with work +12 this floor. */
async function originalOfficeTwoEventsFromStart(page: Page): Promise<void> {
  await setTestEnergy(page, 500);
  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 1, y: 1 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 1, y: 2 });
  for (let x = 2; x <= 6; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 2 });
  }
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    const ev = s?.events.find((e) => e.x === 6 && e.y === 2);
    return s?.screenState === "event" && ev?.active === true;
  }, { timeout: 8000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (s?.workDone ?? 0) >= 8;
  }, { timeout: 8000 });

  await setTestEnergy(page, 500);
  await pressUntilPlayerAt(page, "ArrowRight", { x: 7, y: 2 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 8, y: 2 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 8, y: 3 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.screenState === "event" &&
      s?.currentEventId === "manager_compliment"
    );
  }, { timeout: 8000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (s?.workDone ?? 0) >= 12;
  }, { timeout: 8000 });
}

/**
 * After manager event (tile (8,3)): south corridor in column 8, then (9,8)→(9,9).
 * East strip y=1–6 is blocked in Original Office; do not walk x=9 until y≥8.
 */
async function walkOriginalOfficeExitFromManagerColumn(page: Page): Promise<void> {
  for (let y = 4; y <= 8; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 8, y });
  }
  await pressUntilPlayerAt(page, "ArrowRight", { x: 9, y: 8 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 9, y: 9 });
}

/**
 * Original Office (`/?eventRandom=0&layout=0`): three floors (pinned layout), two events per floor,
 * exit each floor with enough cumulative work; win only on final exit (phase 3).
 */
async function completeWorkDayOriginalOffice(page: Page): Promise<void> {
  await originalOfficeTwoEventsFromStart(page);
  await walkOriginalOfficeExitFromManagerColumn(page);
  await waitForRunningFloor(page, 2);

  await originalOfficeTwoEventsFromStart(page);
  await walkOriginalOfficeExitFromManagerColumn(page);
  await waitForRunningFloor(page, 3);

  await originalOfficeTwoEventsFromStart(page);
  await walkOriginalOfficeExitFromManagerColumn(page);

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameWon === true && (s?.workDone ?? 0) >= s.workTarget;
  }, { timeout: 45000 });
}

/** After coworker at (2,6), walk to Executive Row exit (7,7) without crossing (5,5). */
async function walkExecutiveExitFromCoworkerTile(page: Page): Promise<void> {
  await pressUntilPlayerAt(page, "ArrowRight", { x: 3, y: 6 });
  for (let x = 4; x <= 7; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 6 });
  }
  await pressUntilPlayerAt(page, "ArrowDown", { x: 7, y: 7 });
}

/**
 * Executive Row (`/?eventRandom=0&layout=2`): three pinned floors, exit-based progression (phase 3).
 */
async function completeWorkDayExecutiveRow(page: Page): Promise<void> {
  await setTestEnergy(page, 500);
  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 1, y: 1 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 2, y: 1 });
  for (let y = 2; y <= 6; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 2, y });
  }
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "event";
  }, { timeout: 8000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (s?.workDone ?? 0) >= 16;
  }, { timeout: 8000 });
  await walkExecutiveExitFromCoworkerTile(page);
  await waitForRunningFloor(page, 2);

  await setTestEnergy(page, 500);
  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 2, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 3, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 4, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 5, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 6, y: 0 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 6, y: 1 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 6, y: 2 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "reply_all_disaster";
  }, { timeout: 8000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (s?.workDone ?? 0) >= 22 && s?.runStats.enemiesDefeated === 1;
  }, { timeout: 8000 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 7, y: 2 });
  for (let y = 3; y <= 7; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 7, y });
  }
  await waitForRunningFloor(page, 3);

  await setTestEnergy(page, 500);
  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 2, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 3, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 4, y: 0 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 1 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 2 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 3 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 4 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "it_ticket_swarm";
  }, { timeout: 8000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (s?.workDone ?? 0) >= 28 && s?.runStats.enemiesDefeated === 2;
  }, { timeout: 8000 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 5, y: 4 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 5, y: 5 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "event";
  }, { timeout: 8000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (s?.workDone ?? 0) >= 32;
  }, { timeout: 8000 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 6, y: 5 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 7, y: 5 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 7, y: 6 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 7, y: 7 });

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameWon === true && (s?.workDone ?? 0) >= s.workTarget;
  }, { timeout: 45000 });
}

/** From (0,0) to Endless Meeting at (4,4); avoids reward tile. */
async function walkToFirstEnemyOriginalOffice(page: Page): Promise<void> {
  await setTestEnergy(page, 11);
  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
  for (let y = 1; y <= 4; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 1, y });
  }
  for (let x = 2; x <= 4; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 4 });
  }
}

/** From (0,0) to Coworker Venting at (6,2). Batched steps (same as touch E2E). */
async function walkToCoworkerEventOriginalOffice(page: Page): Promise<void> {
  await page.evaluate(() => {
    const e = (window as Window & { __odE2e?: OdE2e }).__odE2e;
    e?.step(1, 0);
    e?.step(0, 1);
    e?.step(0, 1);
    for (let i = 0; i < 5; i++) e?.step(1, 0);
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    const p = s?.playerPosition;
    return p?.x === 6 && p?.y === 2;
  }, { timeout: 5000 });
}

/**
 * Set uncapped energy and walk to Coworker Venting in one evaluate (no round-trip between).
 * Returns published energies after set and after batched steps (same evaluate).
 */
async function setEnergyAndWalkToCoworkerVent(
  page: Page,
  energy: number
): Promise<{ afterSet: number; afterWalk: number }> {
  await page.waitForFunction(() => {
    const w = window as Window & { __odE2e?: OdE2e };
    return w.__odE2e != null;
  }, { timeout: 10000 });
  /** Manhattan path (0,0)→(6,2) that avoids reward tile (2,2) (pickup clamps uncapped test energy). */
  const publishedAfterSteps = await page.evaluate((n) => {
    const w = window as Window & { __odE2e?: OdE2e; __gameState?: GameState };
    w.__odE2e?.setEnergyForTest(n, true);
    const afterSet = w.__gameState?.playerEnergy ?? -2;
    const e = w.__odE2e;
    e?.step(1, 0);
    e?.step(0, 1);
    e?.step(0, 1);
    e?.step(0, 1);
    e?.step(1, 0);
    e?.step(1, 0);
    e?.step(0, -1);
    e?.step(1, 0);
    e?.step(1, 0);
    e?.step(1, 0);
    return {
      afterSet,
      afterWalk: w.__gameState?.playerEnergy ?? -1,
    };
  }, energy);
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    const ev = s?.events.find((e) => e.x === 6 && e.y === 2);
    return s?.screenState === "event" && ev?.active === true;
  }, { timeout: 8000 });
  return publishedAfterSteps;
}

function expectEnergyAfterCoworkerWalk(
  e: { afterSet: number; afterWalk: number },
  boosted: number
): void {
  expect(e.afterSet).toBe(boosted);
  // Phase 3: walking does not spend energy; only encounters/events do.
  expect(e.afterWalk).toBe(boosted);
}

async function clearMetaStorageAndGotoOD(page: Page): Promise<void> {
  await page.goto(OD);
  await page.evaluate(
    ([k2, k1]) => {
      localStorage.removeItem(k2);
      localStorage.removeItem(k1);
    },
    [OFFICE_DUNGEON_META_KEY, OFFICE_DUNGEON_META_KEY_V1] as [string, string]
  );
  await page.goto(OD);
  await focusGameAndWaitForState(page);
}

async function returnToTitleAfterVictory(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.restartRun();
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title";
  }, { timeout: 5000 });
}

test("smoke: starts on title; Start moves to running (window.__gameState)", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);

  const onTitle = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(onTitle?.screenState).toBe("title");
  expect(onTitle?.meta.officeCredits).toBe(0);
  expect(onTitle?.meta.equippedRelicIds).toEqual(["extra_coffee"]);
  expect(onTitle?.meta.unlockedRelicIds).toContain("extra_coffee");

  await startRun(page);

  const running = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(running?.screenState).toBe("running");
});

test("smoke: M toggles audio.muted in __gameState", async ({ page }) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await page.locator("#game-root").focus();

  const before = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState?.audio
      ?.muted;
  });
  expect(before).toBe(false);

  const dispatchM = () =>
    page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "m", code: "KeyM", bubbles: true })
      );
    });

  await dispatchM();
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.audio?.muted === true;
    },
    { timeout: 5000 }
  );

  await dispatchM();
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.audio?.muted === false;
    },
    { timeout: 5000 }
  );
});

test("smoke: debug state includes layout; ?layout= pins Executive Row", async ({
  page,
}) => {
  await page.goto("/?eventRandom=0&layout=2");
  await focusGameAndWaitForState(page);

  const onTitle = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(onTitle?.screenState).toBe("title");

  await startRun(page);

  const s = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(s?.screenState).toBe("running");
  expect(s?.layout).toEqual({
    id: "executive_row",
    index: 2,
    name: "Executive Row",
  });
  expect(s?.playerStress).toBe(1);
  expect(s?.exit).toEqual({ x: 7, y: 7 });
  // Extra Coffee: +2 energy and +2 max on this layout (6 -> 8)
  expect(s?.playerEnergy).toBe(8);
});

test("smoke: move to enemy tile opens office encounter (window.__gameState)", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);

  const initial = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(initial).toBeDefined();
  expect(initial!.screenState).toBe("title");
  await startRun(page);
  const initialRunning = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(initialRunning!.screenState).toBe("running");
  expect(initialRunning!.layout).toEqual({
    id: "original_office",
    index: 0,
    name: "Original Office",
  });
  expect(initialRunning!.playerPosition).toEqual({ x: 0, y: 0 });
  expect(initialRunning!.enemies.length).toBeGreaterThanOrEqual(3);
  expect(initialRunning!.events.length).toBeGreaterThanOrEqual(3);
  expect(enemyAt(initialRunning, 4, 4)).toMatchObject({
    alive: true,
    hp: 3,
    name: "Endless Meeting",
  });
  expect(initialRunning!.reward).toEqual({ x: 2, y: 2, available: true });
  expect(initialRunning!.playerStress).toBe(0);
  expect(initialRunning!.playerEnergy).toBe(8);
  expect(initialRunning!.meta.equippedRelicIds).toEqual(["extra_coffee"]);
  expect(initialRunning!.meta.activeRunModifiers).toMatchObject({
    energyDelta: 2,
  });
  expect(eventAt(initialRunning, 6, 2)).toMatchObject({
    name: "Coworker Venting",
    available: true,
    active: false,
  });
  expect(initialRunning!.exit).toEqual({ x: 9, y: 9 });
  expect(initialRunning!.gameOver).toBe(false);
  expect(initialRunning!.gameWon).toBe(false);
  expect(initialRunning!.runStats).toMatchObject({
    enemiesDefeated: 0,
    eventsResolved: 0,
    turnsTaken: 0,
  });

  await walkToFirstEnemyOriginalOffice(page);

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "surprise_meeting";
  }, { timeout: 5000 });

  await page.keyboard.press("n", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.screenState === "running" &&
      s.runStats.enemiesDefeated === 1 &&
      s.currentEncounterId == null
    );
  }, { timeout: 5000 });

  const after = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(after).toBeDefined();
  expect(after!.playerPosition).toEqual({ x: 4, y: 4 });
  const e44 = enemyAt(after, 4, 4);
  expect(e44?.alive).toBe(false);
  // Uncapped test energy 11, then encounter −1 → clamped to layout max 8 (Extra Coffee).
  expect(after!.playerEnergy).toBe(8);
  expect(after!.playerStress).toBe(1);
  expect(after!.runStats).toMatchObject({
    enemiesDefeated: 1,
    eventsResolved: 0,
  });
  expect(after!.runStats.turnsTaken).toBeGreaterThan(0);
  expect(after!.workDone).toBe(6);
  expect(after?.latestMessage).toMatch(/slipped away|Surprise Meeting/i);
  await expect(page.locator("#hud-test-mirror")).toContainText(/⚡\s*8\/8/);
});

test("smoke: reward tile collects after encounter and restores energy", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  const initial = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(initial).toBeDefined();
  expect(initial!.reward.available).toBe(true);
  expect(initial!.exit).toEqual({ x: 9, y: 9 });
  expect(initial!.gameWon).toBe(false);

  await walkToFirstEnemyOriginalOffice(page);

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "surprise_meeting";
  }, { timeout: 5000 });
  await page.keyboard.press("n", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.runStats.enemiesDefeated === 1;
  }, { timeout: 5000 });

  const afterCombat = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterCombat!.playerPosition).toEqual({ x: 4, y: 4 });
  expect(afterCombat!.playerEnergy).toBe(8);
  expect(afterCombat!.reward.available).toBe(true);

  await setTestEnergy(page, 80);
  await pressUntilPlayerAt(page, "ArrowLeft", { x: 3, y: 4 });
  await pressUntilPlayerAt(page, "ArrowLeft", { x: 2, y: 4 });
  await pressUntilPlayerAt(page, "ArrowUp", { x: 2, y: 3 });
  await pressUntilPlayerAt(page, "ArrowUp", { x: 2, y: 2 });

  const afterReward = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterReward!.playerPosition).toEqual({ x: 2, y: 2 });
  expect(afterReward!.reward.available).toBe(false);
  expect(afterReward!.playerEnergy).toBe(8);
  await expect(page.locator("#hud-test-mirror")).toContainText(/⚡\s*8\/8/);
});

test("smoke: at 0 energy movement is blocked and run ends", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.setEnergyForTest(0, true);
  });

  const posBefore = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState
      ?.playerPosition;
  });
  await page.keyboard.press("ArrowRight", { delay: 25 });
  await page.waitForTimeout(80);
  const after = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(after?.playerPosition).toEqual(posBefore);
  expect(after?.gameOver).toBe(true);
  expect(after?.gameOverReason).toBe("no_energy");
  expect(after?.latestMessage).toMatch(/Sent home early/i);
});

test("smoke: work target sets gameWon and disables movement", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  const initial = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(initial).toBeDefined();
  expect(initial!.exit).toEqual({ x: 9, y: 9 });
  expect(initial!.gameWon).toBe(false);
  expect(initial!.workTarget).toBe(32);

  await completeWorkDayOriginalOffice(page);

  const won = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(won!.playerPosition).toEqual({ x: 9, y: 9 });
  expect(won!.gameWon).toBe(true);
  expect(won!.workDone).toBeGreaterThanOrEqual(won!.workTarget);
  expect(won!.screenState).toBe("victory");
  expect(won!.floor.total).toBe(3);
  expect(won!.runStats).toMatchObject({
    enemiesDefeated: 0,
    eventsResolved: 6,
  });
  expect(won!.runStats.turnsTaken).toBeGreaterThan(0);
  expect(won!.meta.creditsEarnedThisRun).toBeGreaterThanOrEqual(2);
  expect(won!.meta.officeCredits).toBeGreaterThanOrEqual(2);
  await expect(page.locator("#footer-test-mirror")).toContainText(
    /Work Day Complete/
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /Work Day Complete/
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /You made it through the day\./
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    new RegExp(`Credits Earned:\\s*\\+${won!.meta.creditsEarnedThisRun}`)
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    new RegExp(`Total Office Credits:\\s*${won!.meta.officeCredits}`)
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /Tap here or Restart below to continue/
  );

  await page.keyboard.press("ArrowLeft", { delay: 25 });
  const afterKey = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterKey!.playerPosition).toEqual({ x: 9, y: 9 });
});

test("smoke: summary dismiss restarts run after win and movement works again", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  const initial = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(initial).toBeDefined();
  expect(initial!.screenState).toBe("running");
  expect(initial!.playerPosition).toEqual({ x: 0, y: 0 });
  expect(initial!.playerEnergy).toBe(8);
  expect(enemyAt(initial, 4, 4)).toMatchObject({
    alive: true,
    hp: 3,
    name: "Endless Meeting",
  });
  expect(initial!.reward).toEqual({ x: 2, y: 2, available: true });
  expect(initial!.playerStress).toBe(0);
  expect(eventAt(initial, 6, 2)).toMatchObject({
    name: "Coworker Venting",
    available: true,
    active: false,
  });
  expect(initial!.exit).toEqual({ x: 9, y: 9 });
  expect(initial!.gameOver).toBe(false);
  expect(initial!.gameWon).toBe(false);

  await completeWorkDayOriginalOffice(page);

  const won = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(won!.gameWon).toBe(true);
  expect(won!.runStats).toMatchObject({
    enemiesDefeated: 0,
    eventsResolved: 6,
  });
  const creditsAfterWin = won!.meta.officeCredits;
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /Work Day Complete/
  );

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.restartRun();
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s != null &&
      s.screenState === "title" &&
      s.layout.index >= 0 &&
      s.layout.index < 7 &&
      typeof s.layout.id === "string" &&
      s.gameWon === false &&
      s.playerPosition.x === 0 &&
      s.playerPosition.y === 0 &&
      s.runStats.enemiesDefeated === 0 &&
      s.runStats.eventsResolved === 0 &&
      s.runStats.turnsTaken === 0
    );
  }, { timeout: 5000 });

  const afterRestart = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterRestart!.screenState).toBe("title");
  expect(afterRestart!.runStats).toMatchObject({
    enemiesDefeated: 0,
    eventsResolved: 0,
    turnsTaken: 0,
  });
  expect(afterRestart!.meta.officeCredits).toBe(creditsAfterWin);

  await page.goto("/?eventRandom=0&layout=1");
  await focusGameAndWaitForState(page);
  const breakRoomTitle = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(breakRoomTitle!.layout).toEqual({
    id: "break_room_sprint",
    index: 1,
    name: "Break Room Sprint",
  });
  expect(breakRoomTitle!.exit).toEqual({ x: 8, y: 8 });
  expect(breakRoomTitle!.reward).toMatchObject({ x: 4, y: 3, available: true });
  expect(breakRoomTitle!.exit).not.toEqual(initial!.exit);

  await startRun(page);
  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
});

test("smoke: event tile Coworker Venting — Y blocks movement then adds stress", async ({
  page,
}) => {
  await page.goto(OD);
  await page.reload();
  await focusGameAndWaitForState(page);
  await startRun(page);

  const en = await setEnergyAndWalkToCoworkerVent(page, 80);
  expectEnergyAfterCoworkerWalk(en, 80);

  await expect(page.locator("#footer-test-mirror")).toContainText(/Event/);

  const energyDuringEvent = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState?.playerEnergy;
  });
  expect(energyDuringEvent).toBe(en.afterWalk);

  await page.keyboard.press("ArrowRight", { delay: 25 });
  await page.waitForTimeout(50);
  const blocked = await page.evaluate(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.playerPosition.x === 6 && s?.playerPosition.y === 2;
  });
  expect(blocked).toBe(true);

  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    const ev = s?.events.find((e) => e.x === 6 && e.y === 2);
    return (
      ev?.active === false &&
      ev?.available === false &&
      s?.playerStress === 1
    );
  }, { timeout: 5000 });

  const after = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(after!.playerEnergy).toBe(8);
  expect(after!.playerStress).toBe(1);
  expect(after!.runStats).toMatchObject({
    enemiesDefeated: 0,
    eventsResolved: 1,
  });
  expect(after!.workDone).toBe(8);
  await expect(page.locator("#hud-test-mirror")).toContainText(/🤯\s*1\/8/);
  await expect(page.locator("#footer-test-mirror")).toContainText(/Running/);
});

test("smoke: run summary after game over shows stats and Result Game Over", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await page.locator("#game-root canvas").click();
  await startRun(page);

  await walkToFirstEnemyOriginalOffice(page);
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "surprise_meeting";
  }, { timeout: 5000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.runStats.enemiesDefeated === 1 && s.playerEnergy === 8;
  }, { timeout: 5000 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 5 });
  await pressUntilPlayerAt(page, "ArrowLeft", { x: 3, y: 5 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "reply_all_disaster";
  }, { timeout: 5000 });
  // Aggressive reply costs 7 energy; movement no longer drains, so set exactly 7 before choice B.
  await setTestEnergy(page, 7);
  await page.keyboard.press("b", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameOver === true && s?.screenState === "gameOver";
  }, { timeout: 5000 });

  const lost = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(lost!.runStats).toMatchObject({
    enemiesDefeated: 2,
    eventsResolved: 0,
  });
  expect(lost!.meta.creditsEarnedThisRun).toBe(6);
  expect(lost!.meta.officeCredits).toBe(6);
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /Sent Home Early/
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /You burned out before finishing\./
  );
  expect(lost!.gameOverReason).toBe("no_energy");
  expect(lost!.monetization.premiumEnabled).toBe(false);
  expect(lost!.monetization.continueAvailable).toBe(true);
  expect(lost!.monetization.continueUsedThisRun).toBe(false);
  await expect(page.getByText(/One more run\?/)).toBeVisible();
  const summaryAfterLoss = await page
    .locator("#summary-test-mirror")
    .textContent();
  expect(summaryAfterLoss).toMatch(/Next goal:/i);
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /Credits Earned:\s*\+6/
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /Continue:\s*available/
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /Tap Continue — Continue \(Ad\)/
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /Tap here or Restart below to continue/
  );
});

test("smoke: burnout ends run with Why line (E2E stress helper)", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  await page.evaluate(() => {
    const e = (window as Window & {
      __odE2e?: { setStressForTest: (n: number) => void };
    }).__odE2e;
    e?.setStressForTest(8);
  });

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameOver === true && s?.gameOverReason === "burnout";
  }, { timeout: 5000 });

  await expect(page.locator("#summary-test-mirror")).toContainText(
    /Sent Home Early/
  );
  await expect(page.locator("#summary-test-mirror")).toContainText(
    /You burned out before finishing\./
  );
});

test("smoke: event tile Coworker Venting — N costs energy", async ({ page }) => {
  await page.goto(OD);
  await page.reload();
  await focusGameAndWaitForState(page);
  await startRun(page);

  await setEnergyAndWalkToCoworkerVent(page, 80);

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.eventChoice(false);
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    const ev = s?.events.find((e) => e.x === 6 && e.y === 2);
    return (
      ev?.active === false &&
      ev?.available === false &&
      s?.playerStress === 0 &&
      s?.playerEnergy === 8
    );
  }, { timeout: 5000 });
});

test("smoke: event tile Free Snacks — instant +1 energy (no extra stress)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as Window & { __odStressRoll?: () => number }).__odStressRoll =
      () => 0.99;
  });
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  await setTestEnergy(page, 30);
  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
  for (let y = 1; y <= 5; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 1, y });
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    const ev = s?.events.find((e) => e.x === 1 && e.y === 5);
    return (
      s?.screenState === "running" &&
      ev?.available === false &&
      ev?.id === "free_snacks" &&
      s.playerPosition.x === 1 &&
      s.playerPosition.y === 5
    );
  }, { timeout: 5000 });

  const after = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(after!.runStats.eventsResolved).toBe(1);
  // Extra Coffee raises max to 8; snack +1 applies but clamps at max.
  expect(after!.playerEnergy).toBe(8);
  expect(after!.playerStress).toBe(0);
  expect(after!.lastEventResult).toMatch(/Free Snacks/i);
  expect(after!.currentEventId).toBeNull();
});

test("smoke: event tile Free Snacks — instant sugar crash +1 stress", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as Window & { __odStressRoll?: () => number }).__odStressRoll =
      () => 0;
  });
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  await setTestEnergy(page, 30);
  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
  for (let y = 1; y <= 5; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 1, y });
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    const ev = s?.events.find((e) => e.x === 1 && e.y === 5);
    return (
      s?.screenState === "running" &&
      ev?.available === false &&
      s?.playerStress === 1 &&
      s?.playerEnergy === 8
    );
  }, { timeout: 5000 });

  const after = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(after!.lastEventResult).toMatch(/stress/i);
});

test("meta: office credits saved to localStorage and restored after reload", async ({
  page,
}) => {
  await clearMetaStorageAndGotoOD(page);
  await startRun(page);

  await completeWorkDayOriginalOffice(page);

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameWon === true && (s?.meta.officeCredits ?? 0) >= 2;
  }, { timeout: 45000 });

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { officeCredits?: number };
    } catch {
      return null;
    }
  }, OFFICE_DUNGEON_META_KEY);
  expect(stored?.officeCredits).toBeGreaterThanOrEqual(2);

  await page.reload();
  await focusGameAndWaitForState(page);

  const afterReload = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterReload?.screenState).toBe("title");
  expect(afterReload?.meta.officeCredits).toBeGreaterThanOrEqual(2);
  expect(afterReload?.meta.metaLoadedFromStorage).toBe(true);
});

test("meta: unlocked perk and equip state restored after reload", async ({
  page,
}) => {
  await clearMetaStorageAndGotoOD(page);
  for (let w = 0; w < 3; w++) {
    await startRun(page);
    await completeWorkDayOriginalOffice(page);
    await page.waitForFunction(() => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.gameWon === true;
    }, { timeout: 45000 });
    await returnToTitleAfterVictory(page);
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title" && s.meta.officeCredits >= 5;
  }, { timeout: 45000 });

  const creditsBeforeCalmMind = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState?.meta
      .officeCredits;
  });
  expect(creditsBeforeCalmMind).toBeGreaterThanOrEqual(5);

  await page.locator("#game-root canvas").click();
  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.titleAssignRelic(1);
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.screenState === "title" &&
      s.meta.equippedRelicIds[0] === "calm_mind" &&
      s.meta.unlockedRelicIds.includes("calm_mind")
    );
  }, { timeout: 5000 });

  const creditsAfterCalmMind = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState?.meta
      .officeCredits;
  });
  expect(creditsAfterCalmMind).toBe(creditsBeforeCalmMind! - 5);

  await page.reload();
  await focusGameAndWaitForState(page);

  const restored = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(restored?.meta.equippedRelicIds).toEqual(["calm_mind"]);
  expect(restored?.meta.officeCredits).toBe(creditsAfterCalmMind);
  expect(restored?.meta.unlockedRelicIds).toContain("calm_mind");
  expect(restored?.meta.unlockedRelicIds).toContain("extra_coffee");
});

test("meta: C on title clears save and resets progression", async ({ page }) => {
  await clearMetaStorageAndGotoOD(page);
  await startRun(page);

  await completeWorkDayOriginalOffice(page);

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameWon === true;
  }, { timeout: 45000 });

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.restartRun();
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title" && (s.meta.officeCredits ?? 0) >= 2;
  }, { timeout: 10000 });

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.clearMetaState();
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.screenState === "title" &&
      s.meta.officeCredits === 0 &&
      s.meta.equippedRelicIds[0] === "extra_coffee" &&
      s.meta.unlockedRelicIds.length === 1
    );
  }, { timeout: 5000 });

  const keyAfter = await page.evaluate((key) => localStorage.getItem(key), OFFICE_DUNGEON_META_KEY);
  expect(keyAfter).toBeNull();

  const cleared = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(cleared?.meta.metaLoadedFromStorage).toBe(false);
});

test("meta: unlock Calm Mind with credits, re-equip Extra Coffee via __odE2e", async ({
  page,
}) => {
  await clearMetaStorageAndGotoOD(page);
  for (let w = 0; w < 3; w++) {
    await startRun(page);
    await completeWorkDayOriginalOffice(page);
    await page.waitForFunction(() => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.gameWon === true;
    }, { timeout: 45000 });
    await returnToTitleAfterVictory(page);
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title" && s.meta.officeCredits >= 5;
  }, { timeout: 45000 });

  const creditsBeforeSlot2 = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState?.meta
      .officeCredits;
  });
  expect(creditsBeforeSlot2).toBeGreaterThanOrEqual(5);

  await page.locator("#game-root canvas").click();
  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.titleAssignRelic(1);
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.meta.equippedRelicIds[0] === "calm_mind" &&
      s.meta.unlockedRelicIds.includes("calm_mind")
    );
  }, { timeout: 5000 });

  const creditsAfterSlot2 = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState?.meta
      .officeCredits;
  });
  expect(creditsAfterSlot2).toBe(creditsBeforeSlot2! - 5);

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.titleAssignRelic(0);
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.meta.equippedRelicIds[0] === "extra_coffee";
  }, { timeout: 5000 });
});

test("meta: Aggressive Reply — Executive Row encounter energy outcome", async ({
  page,
}) => {
  await page.goto("/?eventRandom=0&layout=2");
  await page.evaluate(
    ([k2, k1]) => {
      localStorage.removeItem(k2);
      localStorage.removeItem(k1);
    },
    [OFFICE_DUNGEON_META_KEY, OFFICE_DUNGEON_META_KEY_V1] as [string, string]
  );
  await page.goto("/?eventRandom=0&layout=2");
  await focusGameAndWaitForState(page);
  await startRun(page);

  await completeWorkDayExecutiveRow(page);
  await returnToTitleAfterVictory(page);

  await page.goto("/?eventRandom=0&layout=0");
  await focusGameAndWaitForState(page);
  for (let w = 0; w < 3; w++) {
    await startRun(page);
    await completeWorkDayOriginalOffice(page);
    await page.waitForFunction(() => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.gameWon === true;
    }, { timeout: 45000 });
    await returnToTitleAfterVictory(page);
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title" && s.meta.officeCredits >= 7;
  }, { timeout: 45000 });

  await page.goto("/?eventRandom=0&layout=0");
  await focusGameAndWaitForState(page);

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.titleEquipRelicByIdForTest(
      "aggressive_reply"
    );
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.screenState === "title" &&
      s?.meta.equippedRelicIds[0] === "aggressive_reply" &&
      s.meta.unlockedRelicIds.includes("aggressive_reply")
    );
  }, { timeout: 5000 });

  await page.goto("/?eventRandom=0&layout=2");
  await focusGameAndWaitForState(page);
  await startRun(page);
  expect(
    await page.evaluate(() => {
      return (window as Window & { __gameState?: GameState }).__gameState
        ?.layout.name;
    })
  ).toBe("Executive Row");

  await setTestEnergy(page, 14);
  for (let x = 1; x <= 4; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 4; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y });
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "it_ticket_swarm";
  }, { timeout: 5000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.runStats.enemiesDefeated === 1;
  }, { timeout: 5000 });

  const afterCombat = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(enemyAt(afterCombat, 4, 4)?.alive).toBe(false);
  expect(afterCombat?.meta.equippedRelicIds).toEqual(["aggressive_reply"]);
  // Uncapped test energy 14; first IT choice is −2 but clamps to layout max (6) — no movement tax (phase 3).
  expect(afterCombat?.playerEnergy).toBe(6);
});

test("touch: title exposes touchUi, mirror, and start without keyboard (__odE2e)", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);

  await expect(page.locator("#touch-ui-test-mirror")).toHaveText("Start");

  const onTitle = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(onTitle?.touchUi).toEqual({
    movement: false,
    event: false,
    start: true,
    restart: false,
    continueReward: false,
  });

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.pressStart();
  });
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.screenState === "running";
    },
    { timeout: 5000 }
  );

  const running = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(running?.touchUi).toMatchObject({
    movement: true,
    event: false,
    start: false,
    restart: false,
    continueReward: false,
  });
});

test("touch: movement and event choice via __odE2e (no keyboard)", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.pressStart();
  });
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.screenState === "running";
    },
    { timeout: 5000 }
  );

  await setTestEnergy(page, 120);

  await page.evaluate(() => {
    const e = (window as Window & { __odE2e?: OdE2e }).__odE2e;
    e?.step(1, 0);
    e?.step(0, 1);
    e?.step(0, 1);
    for (let i = 0; i < 5; i++) e?.step(1, 0);
  });

  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      const ev = s?.events.find((x) => x.x === 6 && x.y === 2);
      return s?.screenState === "event" && ev?.active === true;
    },
    { timeout: 5000 }
  );

  await expect(page.locator("#touch-ui-test-mirror")).toHaveText("Event");

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.eventChoice(true);
  });
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.playerStress === 1 && s.screenState === "running";
    },
    { timeout: 5000 }
  );
});

test("touch: restart after victory via __odE2e (no keyboard)", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.pressStart();
  });
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.screenState === "running";
    },
    { timeout: 5000 }
  );

  // Reach work-based victory with keyboard; touch coverage is start + restart below.
  await completeWorkDayOriginalOffice(page);

  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.gameWon === true && s.touchUi.restart === true;
    },
    { timeout: 30000 }
  );

  await expect(page.locator("#touch-ui-test-mirror")).toHaveText("Restart");

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.restartRun();
  });
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return (
        s?.screenState === "title" &&
        s.layout.index === 0 &&
        s.touchUi.start === true
      );
    },
    { timeout: 5000 }
  );
});

test("smoke: P toggles premium and persists in localStorage", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await page.evaluate((key) => localStorage.removeItem(key), OFFICE_DUNGEON_MONETIZATION_KEY);
  await page.reload();
  await focusGameAndWaitForState(page);

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.togglePremiumDev();
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.monetization?.premiumEnabled === true;
  }, { timeout: 3000 });

  const raw = await page.evaluate((key) => localStorage.getItem(key), OFFICE_DUNGEON_MONETIZATION_KEY);
  expect(raw).toBeTruthy();
  expect(JSON.parse(raw!).premiumNoAds).toBe(true);

  await page.reload();
  await focusGameAndWaitForState(page);
  const afterReload = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterReload?.monetization.premiumEnabled).toBe(true);

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.togglePremiumDev();
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.monetization?.premiumEnabled === false;
  }, { timeout: 3000 });
});

test("smoke: rewarded continue restores run and allows only one use per run", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await page.evaluate((key) => localStorage.removeItem(key), OFFICE_DUNGEON_MONETIZATION_KEY);
  await page.reload();
  await focusGameAndWaitForState(page);
  await page.locator("#game-root canvas").click();
  await startRun(page);

  await walkToFirstEnemyOriginalOffice(page);
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "surprise_meeting";
  }, { timeout: 5000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.runStats.enemiesDefeated === 1;
  }, { timeout: 5000 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 5 });
  await pressUntilPlayerAt(page, "ArrowLeft", { x: 3, y: 5 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "reply_all_disaster";
  }, { timeout: 5000 });
  await setTestEnergy(page, 7);
  await page.keyboard.press("b", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameOver === true && s?.screenState === "gameOver";
  }, { timeout: 5000 });

  await page.evaluate(() => {
    (window as Window & { __odE2e?: OdE2e }).__odE2e?.rewardedContinue();
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.screenState === "running" &&
      s?.gameOver === false &&
      s?.monetization?.continueUsedThisRun === true
    );
  }, { timeout: 5000 });

  const playing = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(playing!.playerEnergy).toBe(playing!.playerEnergyMax);
  expect(playing!.monetization.continueAvailable).toBe(false);
  expect(playing!.monetization.continueUsedThisRun).toBe(true);

  await page.keyboard.press("ArrowRight", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.playerPosition.x === 4 && s?.playerPosition.y === 5;
  }, { timeout: 3000 });

  await page.evaluate(() => {
    const e = (window as Window & { __odE2e?: OdE2e }).__odE2e;
    e?.setStressForTest(8);
  });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameOver === true && s?.gameOverReason === "burnout";
  }, { timeout: 5000 });

  await expect(page.getByText(/Continue:\s*used this run/)).toBeVisible();
  await expect(page.getByText(/^Tap Continue/)).toHaveCount(0);
});

test("smoke: premium summary shows Continue without Ad label", async ({
  page,
}) => {
  await page.goto(OD);
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ premiumNoAds: true }));
  }, OFFICE_DUNGEON_MONETIZATION_KEY);
  await page.reload();
  await focusGameAndWaitForState(page);
  await page.locator("#game-root canvas").click();
  await startRun(page);

  await walkToFirstEnemyOriginalOffice(page);
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "surprise_meeting";
  }, { timeout: 5000 });
  await page.keyboard.press("y", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.runStats.enemiesDefeated === 1;
  }, { timeout: 5000 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 5 });
  await pressUntilPlayerAt(page, "ArrowLeft", { x: 3, y: 5 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.currentEncounterId === "reply_all_disaster";
  }, { timeout: 5000 });
  await setTestEnergy(page, 7);
  await page.keyboard.press("b", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameOver === true;
  }, { timeout: 5000 });

  const lost = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(lost!.monetization.premiumEnabled).toBe(true);
  const summaryMirror = await page.locator("#summary-test-mirror").textContent();
  expect(summaryMirror).toContain("Tap Continue — Continue");
  expect(summaryMirror).not.toContain("Continue (Ad)");
});
