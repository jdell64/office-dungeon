# Office Dungeon

Phaser 3 + TypeScript office-themed dungeon prototype.

## Web development

```bash
npm install
npm run dev          # Vite dev server (default http://localhost:5173)
npm run build        # Typecheck + production bundle → dist/
npm run preview      # Serve dist/ locally
npm run test:e2e     # Playwright (starts dev server automatically)
```

## Android (Capacitor)

Packaging uses [Capacitor](https://capacitorjs.com/) with the **Android** shell only (iOS not set up here).

**Prerequisites:** [Android Studio](https://developer.android.com/studio) with Android SDK and a device or emulator.

**One-shot flow (recommended):** build the web app and copy it into the native project:

```bash
npm run cap:sync
npm run cap:open:android
```

Then run the **app** configuration from Android Studio.

**Step-by-step (if you already built the web app):**

```bash
npm run build
npm run cap:copy       # npx cap sync — copies dist/ into android/…/assets/public
npm run cap:open:android
```

- **App id:** `com.example.officedungeon` (change in `capacitor.config.ts` and sync if you publish).
- **Fresh clone:** `dist/` and the copied web tree under `android/app/src/main/assets/public` are gitignored. Run `npm run cap:sync` (or `npm run build` + `npm run cap:copy`) at least once before running the Android project, or Studio will not have current game assets.

## Tech stack

- Vite 6, TypeScript, Phaser 3
- `@capacitor/core`, `@capacitor/android` for the mobile shell
