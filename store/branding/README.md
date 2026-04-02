# Store and app branding (source assets)

This folder holds **source art and notes** for store listings and native packaging. Nothing here is wired into the Vite or Phaser build unless you add scripts later.

## Version alignment

- **`store/app-metadata.json`** includes a `version` field for **marketing / listing** consistency. Keep it aligned with release intent alongside:
  - [`package.json`](../../package.json) `version` (npm / web)
  - [`android/app/build.gradle`](../../android/app/build.gradle) `versionCode` and `versionName` (Android binaries)

## Android / Capacitor launcher icons (runtime)

Icons that ship **inside the APK** live under the Android module, not under `store/branding/`:

- [`android/app/src/main/res/`](../../android/app/src/main/res)

Expected pieces:

- **`mipmap-mdpi` … `mipmap-xxxhdpi`** — density-specific launcher bitmaps (and legacy icons if used).
- **`mipmap-anydpi-v26/`** — adaptive icon XML (`ic_launcher.xml`, `ic_launcher_round.xml`) referencing foreground/background.

This repo’s adaptive icons reference **`@mipmap/ic_launcher_foreground`**. Export mipmaps from a master in **`icons/`** (or a vector asset) using Android Studio **Image Asset** (or your preferred pipeline), then place generated files under the `mipmap-*` folders above. Run `npm run cap:sync` after web changes; icon changes are native-only.

**Google Play** also wants a **512×512** high-res icon (upload in Play Console)—keep a master in `icons/`.

## Web (optional)

Favicon / PWA icons can live under `public/` later; not required for this step.

## Subfolders

| Folder | Purpose |
|--------|---------|
| [`icons/`](icons/) | Master launcher / Play icon sources |
| [`splash/`](splash/) | Optional splash screen source images |
| [`feature-graphic/`](feature-graphic/) | Play feature graphic (1024×500) and similar promo art |
| [`screenshots/`](screenshots/) | Phone/tablet store screenshots |
