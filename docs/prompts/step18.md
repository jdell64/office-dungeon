We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- The game has a playable loop with movement, combat, events, rewards, exit, restart/reset, HUD, title/start screen, run summary, predefined layouts, meta progression, and localStorage persistence
- Mobile-friendly on-screen controls and responsive layout support exist
- The project currently runs as a web game
- Playwright coverage exists
- The next goal is to package the game as a mobile app shell using Capacitor, starting with Android

Goal of this task:

Set up Capacitor so the Phaser web game can be packaged and run as an Android app, while keeping the setup minimal and maintainable.

## Requirements

### 1) Install and Configure Capacitor

Add Capacitor to the project with the minimal required configuration.

Requirements:

- initialize Capacitor for this app
- configure the app name and app id
- point Capacitor at the built web output directory
- keep the setup simple and conventional

Use a reasonable app id such as:

- `com.example.officedungeon`
  or another clearly editable placeholder if needed

### 2) Build Integration

Ensure the existing web build output is compatible with Capacitor.

Requirements:

- document or add the scripts needed so the expected flow is clear:
  - build web app
  - sync Capacitor
  - open Android project
- if needed, update `package.json` scripts with a few minimal commands

Example script intent:

- build the web game
- sync Capacitor assets
- open Android Studio project

Keep this simple.
Do NOT build a giant release pipeline.

### 3) Add Android Platform

Add Capacitor Android platform support.

Requirements:

- include the required Android platform files/config
- ensure the project is ready to open in Android Studio
- keep iOS out of scope for now unless it is trivial and does not add clutter

Android is the priority.

### 4) Runtime Compatibility

Make any small changes needed so the current game works correctly inside the Capacitor shell.

Focus on obvious issues only, such as:

- ensuring the app loads correctly from local bundled assets
- avoiding assumptions that require an external dev server at runtime
- keeping localStorage-based progression working in the app shell

Do NOT add native plugins unless clearly necessary.

### 5) Mobile App Shell Basics

Set a minimal Capacitor configuration that is sensible for a phone game prototype.

If straightforward, include small sensible defaults such as:

- fullscreen / immersive preference only if simple and safe
- app name matching the game title

Do NOT spend effort on advanced native customization yet.

### 6) Documentation

Add a small README section or concise project documentation describing the Android build/test flow.

Include:

- how to install dependencies
- how to build the web app
- how to sync Capacitor
- how to open/run Android project

Keep it short and practical.

### 7) Preserve Web Workflow

Do not break the existing web development flow.

Requirements:

- existing web dev/build commands should still work
- Capacitor should be an additional packaging target, not a replacement

### 8) Playwright / Test Compatibility

Do not overcomplicate automated tests around Capacitor.

Requirements:

- existing Playwright web tests should continue to work
- no need to add native mobile E2E tests in this step

### 9) Output

Provide all necessary updated files and configuration, including:

- Capacitor config
- package.json script updates if needed
- Android platform setup files if applicable
- concise documentation updates

Ensure the project still builds and runs as a web app.
Ensure the project is ready to be opened and run as an Android Capacitor app.

## Constraints

Do NOT add:

- backend services
- cloud save
- ad SDKs
- in-app purchases
- analytics SDKs
- iOS setup unless trivial
- release signing setup
- store listing assets
- native plugin complexity unless required

Keep this step focused on minimal Capacitor integration for Android packaging.
