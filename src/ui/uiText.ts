import type { Types } from "phaser";

/** Loaded via Google Fonts in index.html; system fonts fallback offline. */
const UI_FONT =
  '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Higher internal canvas size for Text objects on retina / phone displays. */
export function uiTextResolution(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(2, window.devicePixelRatio || 1);
}

export function uiTextStyle(
  style: Types.GameObjects.Text.TextStyle
): Types.GameObjects.Text.TextStyle {
  return {
    ...style,
    fontFamily: UI_FONT,
    resolution: uiTextResolution(),
  };
}
