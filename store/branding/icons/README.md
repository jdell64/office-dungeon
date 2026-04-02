# App / launcher icons (source)

## Suggested masters

- **512×512 PNG** (or WebP)—typical **Google Play** high-res icon upload.
- **1024×1024** (or vector)—comfortable master for generating Android **adaptive** foreground/background and all `mipmap-*` densities.

Safe zone: adaptive icons crop to a circle; keep important art in the center ~66%.

## Placeholder

`placeholder-icon.png` is a tiny neutral bitmap so the folder is non-empty—**replace** before release.

## Where runtime icons go

See [`../README.md`](../README.md): mipmaps under `android/app/src/main/res/mipmap-*`.
