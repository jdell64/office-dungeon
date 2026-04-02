import { expect, test, type Page } from "@playwright/test";

/** Must match OFFICE_DUNGEON_META_KEY in src/meta/metaStorage.ts */
const OFFICE_DUNGEON_META_KEY = "office-dungeon-meta-v1";

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
  difficulty: "easy" | "normal" | "hard";
  touchUi: {
    movement: boolean;
    event: boolean;
    start: boolean;
    restart: boolean;
    continueReward: boolean;
  };
  layout: { id: string; index: number; name: string };
  playerPosition: { x: number; y: number };
  playerEnergy: number;
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
  runStats: { enemiesDefeated: number; eventsResolved: number };
  latestMessage?: string;
  meta: {
    officeCredits: number;
    equippedPerkId: string | null;
    unlockedPerkIds: string[];
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
  await page.locator("#game-root canvas").click();
  await page.waitForFunction(
    () => {
      const w = window as Window & { __gameState?: GameState };
      return w.__gameState != null && w.__gameState.screenState === "title";
    },
    { timeout: 30000 }
  );
}

async function startRun(page: Page): Promise<void> {
  await page.keyboard.press("Space", { delay: 25 });
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
  setStressForTest: (n: number) => void;
  rewardedContinue: () => void;
};

async function pressUntilPlayerAt(
  page: Page,
  key: "ArrowRight" | "ArrowDown" | "ArrowLeft" | "ArrowUp",
  expected: { x: number; y: number }
): Promise<void> {
  await page.keyboard.press(key, { delay: 25 });
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

/** Original Office (layout 0): path from (0,0) to exit (9,9) without extra moves. */
async function pacifistReachExitOriginalOffice(page: Page): Promise<void> {
  for (let x = 1; x <= 9; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 9; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 9, y });
  }
}

async function returnToTitleAfterVictory(page: Page): Promise<void> {
  await page.keyboard.press("r", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title";
  }, { timeout: 5000 });
}

test("smoke: starts on title; Space moves to running (window.__gameState)", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);

  const onTitle = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(onTitle?.screenState).toBe("title");
  expect(onTitle?.meta.officeCredits).toBe(0);
  expect(onTitle?.meta.equippedPerkId).toBe("extra_coffee");
  expect(onTitle?.meta.unlockedPerkIds).toContain("extra_coffee");

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

test("smoke: title difficulty defaults normal; ] cycles in __gameState", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);

  const initial = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(initial?.difficulty).toBe("normal");

  await page.keyboard.press("]", { delay: 25 });
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.difficulty === "hard";
    },
    { timeout: 5000 }
  );

  await page.keyboard.press("[", { delay: 25 });
  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.difficulty === "normal";
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

test("smoke: move to enemy tile triggers combat (window.__gameState)", async ({
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
  expect(initialRunning!.meta.equippedPerkId).toBe("extra_coffee");
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
  expect(initialRunning!.runStats).toEqual({
    enemiesDefeated: 0,
    eventsResolved: 0,
  });

  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 2, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 3, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 4, y: 0 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 1 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 2 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 3 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 4 });

  const after = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(after).toBeDefined();
  expect(after!.playerPosition).not.toEqual({ x: 0, y: 0 });
  expect(after!.playerPosition).toEqual({ x: 4, y: 4 });
  const e44 = enemyAt(after, 4, 4);
  expect(
    !e44?.alive || after!.playerEnergy !== initialRunning!.playerEnergy
  ).toBe(true);
  expect(after!.runStats).toEqual({ enemiesDefeated: 1, eventsResolved: 0 });
  expect(after?.latestMessage).toMatch(/Defeated Endless Meeting/i);
  await expect(page.getByText(/Energy:\s*6\/8/)).toBeVisible();
});

test("smoke: reward tile collects after combat and restores energy", async ({
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

  await pressUntilPlayerAt(page, "ArrowRight", { x: 1, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 2, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 3, y: 0 });
  await pressUntilPlayerAt(page, "ArrowRight", { x: 4, y: 0 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 1 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 2 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 3 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 4 });

  const afterCombat = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterCombat!.playerPosition).toEqual({ x: 4, y: 4 });
  expect(afterCombat!.playerEnergy).toBe(6);
  expect(afterCombat!.reward.available).toBe(true);

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
  await expect(page.getByText(/Energy:\s*8\/8/)).toBeVisible();
});

test("smoke: exit tile sets gameWon and disables movement", async ({
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

  for (let x = 1; x <= 9; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 9; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 9, y });
  }

  const won = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(won!.playerPosition).toEqual({ x: 9, y: 9 });
  expect(won!.gameWon).toBe(true);
  expect(won!.screenState).toBe("victory");
  expect(won!.runStats).toEqual({ enemiesDefeated: 0, eventsResolved: 0 });
  expect(won!.meta.creditsEarnedThisRun).toBe(2);
  expect(won!.meta.officeCredits).toBe(2);
  await expect(page.getByText(/Status:\s*Victory/)).toBeVisible();
  await expect(page.getByText(/You made it through the office!/)).toBeVisible();
  await expect(page.getByText(/Result:\s*Victory/)).toBeVisible();
  await expect(page.getByText(/Reward:\s*\+2 Office Credits this run/)).toBeVisible();
  await expect(page.getByText(/Credits earned \(this run\):\s*2/)).toBeVisible();
  await expect(page.getByText(/Office Credits \(total\):\s*2/)).toBeVisible();
  await expect(page.getByText(/Press R or Space to Restart/)).toBeVisible();

  await page.keyboard.press("ArrowLeft", { delay: 25 });
  const afterKey = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterKey!.playerPosition).toEqual({ x: 9, y: 9 });
});

test("smoke: R key restarts run after win and movement works again", async ({
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

  for (let x = 1; x <= 9; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 9; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 9, y });
  }

  const won = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(won!.gameWon).toBe(true);
  expect(won!.runStats).toEqual({ enemiesDefeated: 0, eventsResolved: 0 });
  await expect(page.getByText(/Result:\s*Victory/)).toBeVisible();

  await page.keyboard.press("r", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s != null &&
      s.screenState === "title" &&
      s.layout.index >= 0 &&
      s.layout.index < 6 &&
      typeof s.layout.id === "string" &&
      s.gameWon === false &&
      s.playerPosition.x === 0 &&
      s.playerPosition.y === 0 &&
      s.runStats.enemiesDefeated === 0 &&
      s.runStats.eventsResolved === 0
    );
  }, { timeout: 5000 });

  const afterRestart = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterRestart!.screenState).toBe("title");
  expect(afterRestart!.runStats).toEqual({
    enemiesDefeated: 0,
    eventsResolved: 0,
  });
  expect(afterRestart!.meta.officeCredits).toBe(2);

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
  await focusGameAndWaitForState(page);
  await startRun(page);

  for (let x = 1; x <= 6; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  await pressUntilPlayerAt(page, "ArrowDown", { x: 6, y: 1 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 6, y: 2 });

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    const ev = s?.events.find((e) => e.x === 6 && e.y === 2);
    return (
      s?.screenState === "event" &&
      ev?.active === true &&
      s?.playerPosition.x === 6 &&
      s.playerPosition.y === 2
    );
  }, { timeout: 5000 });
  await expect(page.getByText(/Status:\s*Event Active/)).toBeVisible();

  const energyDuringEvent = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState?.playerEnergy;
  });
  expect(energyDuringEvent).toBe(8);

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
  expect(after!.runStats).toEqual({ enemiesDefeated: 0, eventsResolved: 1 });
  await expect(page.getByText(/Stress:\s*1/)).toBeVisible();
  await expect(page.getByText(/Status:\s*Running/)).toBeVisible();
});

test("smoke: run summary after game over shows stats and Result Game Over", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await page.locator("#game-root canvas").click();
  await startRun(page);

  for (let x = 1; x <= 4; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 4; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y });
  }
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 5 });
  await pressUntilPlayerAt(page, "ArrowLeft", { x: 3, y: 5 });
  // Passive Aggressive Email at (3,5): with Extra Coffee (8 energy) we still run out
  // before finishing that fight; game over blocks further moves toward the printer.
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameOver === true && s?.screenState === "gameOver";
  }, { timeout: 5000 });

  const lost = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(lost!.runStats).toEqual({ enemiesDefeated: 1, eventsResolved: 0 });
  expect(lost!.meta.creditsEarnedThisRun).toBe(2);
  expect(lost!.meta.officeCredits).toBe(2);
  await expect(page.getByText(/Result:\s*Game Over/)).toBeVisible();
  await expect(page.getByText(/Why:\s*You ran out of energy/)).toBeVisible();
  expect(lost!.gameOverReason).toBe("no_energy");
  expect(lost!.monetization.premiumEnabled).toBe(false);
  expect(lost!.monetization.continueAvailable).toBe(true);
  expect(lost!.monetization.continueUsedThisRun).toBe(false);
  await expect(page.getByText(/One more run\?/)).toBeVisible();
  await expect(
    page.getByText(/3 more credits to unlock Calm Mind/)
  ).toBeVisible();
  await expect(page.getByText(/Credits earned \(this run\):\s*2/)).toBeVisible();
  await expect(page.getByText(/Continue:\s*available/)).toBeVisible();
  await expect(page.getByText(/Press Enter — Continue \(Ad\)/)).toBeVisible();
  await expect(page.getByText(/Press R or Space to Restart/)).toBeVisible();
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

  await expect(page.getByText(/Why:\s*You burned out \(stress\)/)).toBeVisible();
  await expect(page.getByText(/Result:\s*Game Over/)).toBeVisible();
});

test("smoke: event tile Coworker Venting — N costs energy", async ({ page }) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  for (let x = 1; x <= 6; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  await pressUntilPlayerAt(page, "ArrowDown", { x: 6, y: 1 });
  await pressUntilPlayerAt(page, "ArrowDown", { x: 6, y: 2 });

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.events.some((e) => e.x === 6 && e.y === 2 && e.active);
  }, { timeout: 5000 });

  await page.keyboard.press("n", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    const ev = s?.events.find((e) => e.x === 6 && e.y === 2);
    return (
      ev?.active === false &&
      ev?.available === false &&
      s?.playerStress === 0 &&
      s?.playerEnergy === 7
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
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  await pacifistReachExitOriginalOffice(page);

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameWon === true && s?.meta.officeCredits === 2;
  }, { timeout: 5000 });

  const stored = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { officeCredits?: number };
    } catch {
      return null;
    }
  }, OFFICE_DUNGEON_META_KEY);
  expect(stored?.officeCredits).toBe(2);

  await page.reload();
  await focusGameAndWaitForState(page);

  const afterReload = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(afterReload?.screenState).toBe("title");
  expect(afterReload?.meta.officeCredits).toBe(2);
  expect(afterReload?.meta.metaLoadedFromStorage).toBe(true);
});

test("meta: unlocked perk and equip state restored after reload", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  for (let w = 0; w < 3; w++) {
    await startRun(page);
    await pacifistReachExitOriginalOffice(page);
    await page.waitForFunction(() => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.gameWon === true;
    }, { timeout: 5000 });
    await returnToTitleAfterVictory(page);
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title" && s.meta.officeCredits >= 5;
  }, { timeout: 5000 });

  await page.keyboard.press("2", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.screenState === "title" &&
      s.meta.equippedPerkId === "calm_mind" &&
      s.meta.officeCredits === 1 &&
      s.meta.unlockedPerkIds.includes("calm_mind")
    );
  }, { timeout: 5000 });

  await page.reload();
  await focusGameAndWaitForState(page);

  const restored = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(restored?.meta.equippedPerkId).toBe("calm_mind");
  expect(restored?.meta.officeCredits).toBe(1);
  expect(restored?.meta.unlockedPerkIds).toContain("calm_mind");
  expect(restored?.meta.unlockedPerkIds).toContain("extra_coffee");
});

test("meta: C on title clears save and resets progression", async ({ page }) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  await startRun(page);

  for (let x = 1; x <= 9; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 9; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 9, y });
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameWon === true;
  }, { timeout: 5000 });

  await page.keyboard.press("r", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title" && s.meta.officeCredits === 2;
  }, { timeout: 5000 });

  await page.keyboard.press("c", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.screenState === "title" &&
      s.meta.officeCredits === 0 &&
      s.meta.equippedPerkId === "extra_coffee" &&
      s.meta.unlockedPerkIds.length === 1
    );
  }, { timeout: 5000 });

  const keyAfter = await page.evaluate((key) => localStorage.getItem(key), OFFICE_DUNGEON_META_KEY);
  expect(keyAfter).toBeNull();

  const cleared = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(cleared?.meta.metaLoadedFromStorage).toBe(false);
});

test("meta: unlock Calm Mind with credits, re-equip Extra Coffee with key 1", async ({
  page,
}) => {
  await page.goto(OD);
  await focusGameAndWaitForState(page);
  for (let w = 0; w < 3; w++) {
    await startRun(page);
    await pacifistReachExitOriginalOffice(page);
    await page.waitForFunction(() => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.gameWon === true;
    }, { timeout: 10000 });
    await returnToTitleAfterVictory(page);
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title" && s.meta.officeCredits >= 5;
  }, { timeout: 10000 });

  await page.keyboard.press("2", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.meta.equippedPerkId === "calm_mind" &&
      s.meta.unlockedPerkIds.includes("calm_mind") &&
      s.meta.officeCredits === 1
    );
  }, { timeout: 5000 });

  await page.keyboard.press("1", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.meta.equippedPerkId === "extra_coffee";
  }, { timeout: 5000 });
});

test("meta: Aggressive Reply increases damage (Executive Row combat)", async ({
  page,
}) => {
  await page.goto("/?eventRandom=0&layout=2");
  await focusGameAndWaitForState(page);
  await startRun(page);

  for (let x = 1; x <= 7; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 7; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 7, y });
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameWon === true;
  }, { timeout: 15000 });
  await returnToTitleAfterVictory(page);

  await page.goto("/?eventRandom=0&layout=0");
  await focusGameAndWaitForState(page);
  for (let w = 0; w < 3; w++) {
    await startRun(page);
    await pacifistReachExitOriginalOffice(page);
    await page.waitForFunction(() => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.gameWon === true;
    }, { timeout: 15000 });
    await returnToTitleAfterVictory(page);
  }

  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.screenState === "title" && s.meta.officeCredits >= 7;
  }, { timeout: 15000 });

  await page.goto("/?eventRandom=0&layout=0");
  await focusGameAndWaitForState(page);

  await page.keyboard.press("3", { delay: 25 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return (
      s?.meta.equippedPerkId === "aggressive_reply" &&
      s.meta.unlockedPerkIds.includes("aggressive_reply")
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

  for (let x = 1; x <= 4; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 4; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y });
  }

  const afterCombat = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(enemyAt(afterCombat, 4, 4)?.alive).toBe(false);
  expect(afterCombat?.meta.equippedPerkId).toBe("aggressive_reply");
  expect(afterCombat?.playerEnergy).toBe(4);
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

  await page.evaluate(() => {
    const e = (window as Window & { __odE2e?: OdE2e }).__odE2e;
    for (let i = 0; i < 6; i++) e?.step(1, 0);
    for (let j = 0; j < 2; j++) e?.step(0, 1);
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

  await page.evaluate(() => {
    const e = (window as Window & { __odE2e?: OdE2e }).__odE2e;
    for (let i = 0; i < 9; i++) e?.step(1, 0);
    for (let j = 0; j < 9; j++) e?.step(0, 1);
  });

  await page.waitForFunction(
    () => {
      const s = (window as Window & { __gameState?: GameState }).__gameState;
      return s?.gameWon === true && s.touchUi.restart === true;
    },
    { timeout: 10000 }
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

  await page.keyboard.press("p", { delay: 25 });
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

  await page.keyboard.press("p", { delay: 25 });
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

  for (let x = 1; x <= 4; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 4; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y });
  }
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 5 });
  await pressUntilPlayerAt(page, "ArrowLeft", { x: 3, y: 5 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameOver === true && s?.screenState === "gameOver";
  }, { timeout: 5000 });

  const atLoss = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  const energyAtLoss = atLoss!.playerEnergy;

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
  expect(playing!.playerEnergy).toBe(energyAtLoss + 2);
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
  await expect(page.getByText(/^Press Enter/)).toHaveCount(0);
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

  for (let x = 1; x <= 4; x++) {
    await pressUntilPlayerAt(page, "ArrowRight", { x, y: 0 });
  }
  for (let y = 1; y <= 4; y++) {
    await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y });
  }
  await pressUntilPlayerAt(page, "ArrowDown", { x: 4, y: 5 });
  await pressUntilPlayerAt(page, "ArrowLeft", { x: 3, y: 5 });
  await page.waitForFunction(() => {
    const s = (window as Window & { __gameState?: GameState }).__gameState;
    return s?.gameOver === true;
  }, { timeout: 5000 });

  const lost = await page.evaluate(() => {
    return (window as Window & { __gameState?: GameState }).__gameState;
  });
  expect(lost!.monetization.premiumEnabled).toBe(true);
  const summaryMirror = await page.locator("#summary-test-mirror").textContent();
  expect(summaryMirror).toContain("Press Enter — Continue");
  expect(summaryMirror).not.toContain("Continue (Ad)");
});
