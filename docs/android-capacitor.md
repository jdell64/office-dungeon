# Android app (Capacitor)

Office Dungeon is a Vite + Phaser web game packaged for Android with [Capacitor](https://capacitorjs.com/). Web development and Playwright tests are unchanged; Capacitor only wraps the production build.

## Prerequisites

- Node.js (same as for web development)
- [Android Studio](https://developer.android.com/studio) with Android SDK and a JDK (Studio usually bundles one)
- An emulator or USB-debugging-enabled device for running the app

## Install dependencies

```bash
npm install
```

## Web build and sync

After changing the game, rebuild the web assets and copy them into the Android project:

```bash
npm run cap:sync
```

This runs `npm run build` (TypeScript + Vite → `dist/`) then `npx cap sync`.

To only sync without rebuilding (if `dist/` is already up to date):

```bash
npx cap sync
```

## Open and run in Android Studio

```bash
npm run cap:open:android
```

In Android Studio, pick a device or emulator and use **Run** to install and launch the app.

## App id and name

- **Source of truth:** [`store/app-metadata.json`](../store/app-metadata.json) (`appId`, `appName`). [capacitor.config.ts](../capacitor.config.ts) reads those fields; run `npx cap sync` after edits so Android `strings.xml` updates.
- **Application id:** also appears in Gradle `applicationId` — keep aligned if you change the package id.
- **Display name:** propagated from Capacitor config to the native project on sync.

## Store assets (icons, listing drafts)

- **Identity + listing fields:** [`store/app-metadata.json`](../store/app-metadata.json)
- **Branding sources (icons, splash, feature graphic, screenshots):** [`store/branding/`](../store/branding/README.md)
- **Draft Play-style copy:** [`docs/store/listing-draft.md`](store/listing-draft.md)
- **Screenshot checklist:** [`docs/store/screenshot-checklist.md`](store/screenshot-checklist.md)

Runtime launcher mipmaps live under `android/app/src/main/res/` (see `store/branding/README.md`).

## Local saves

Meta progression uses **localStorage**, which persists in the WebView for the installed app like a normal browser origin.

## Web-only workflow

- **Develop:** `npm run dev` (port 5173)
- **Production web:** `npm run build` then `npm run preview`
- **E2E tests:** `npm run test:e2e` (uses the dev server, not Capacitor)
