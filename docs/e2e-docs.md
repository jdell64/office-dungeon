# E2E testing on HTML5 canvas

## Overview

You can perform end-to-end (E2E) testing on HTML5 canvas elements with frameworks such as Cypress, Playwright, or Selenium. Because canvas content is rendered as pixels rather than DOM nodes, testing usually combines **simulating user input** (clicks, drags) at coordinates with **visual regression** (screenshots compared to a baseline).

### Key techniques

| Technique | Description |
|-----------|-------------|
| **Interaction simulation** | Fire mouse events (click, move, down, up) at specific coordinates on the canvas. |
| **Visual regression** | Capture screenshots of the canvas and compare them to a baseline; Cypress and Playwright have built-in or plugin support. |
| **AI / visual agents** | Tools such as Midscene.js can interpret screenshots and locate elements on the canvas, reducing brittle coordinate-only tests. |
| **Mocking** | Mock images or game state to avoid flaky tests when animations or timing are hard to stabilize. |

### Challenges

- **Flakiness** — Snapshots taken before animations finish can pass or fail unpredictably.
- **Accessibility** — Canvas is not structured like the DOM, so traditional a11y testing is limited; AI-assisted tooling can help on complex canvas UIs.

---

## Playwright and canvas

You can E2E test an HTML canvas with Playwright. The canvas is a single element with no internal DOM for its drawn content, so **normal CSS/DOM selectors do not target pixels inside the canvas**.

### 1. Visual regression

The most direct approach is **visual testing**: compare a screenshot of the canvas to a baseline.

- **How:** `expect(page.locator('canvas')).toHaveScreenshot()`
- **Best for:** Complex static graphics and consistent UI layout

### 2. Coordinate-based interactions

To simulate drawing, clicking in-app “buttons” drawn on the canvas, etc., use **pixel coordinates**.

- **Interaction:** `page.mouse` — click, move, down/up at specific `x` / `y`
- **Coordinates:** Derive from app state exposed on `window`, or use `getBoundingClientRect()` on the canvas element to map screen space to canvas space

### 3. Exposing internal state (white-box)

For more reliable tests, expose application state (e.g. list of shapes, game entities) on `window` and assert from tests with `page.evaluate()` before clicking at derived coordinates.

### 4. Advanced: AI / object detection

For highly dynamic canvases (e.g. games), you can screenshot and run **object detection** (e.g. YOLO, TensorFlow) to obtain coordinates for targets, then drive Playwright clicks from those results.

### Comparison of methods

| Method | Ease of setup | Maintenance | Best for |
|--------|---------------|-------------|----------|
| Visual comparison | Easy | Medium (sensitive to small visual changes) | Static layouts, pixel-perfect UI |
| Coordinate clicks | Medium | High (breaks if layout/canvas size changes) | Simple canvas UIs |
| Internal state | Higher initial effort | Lower ongoing | Complex logic and data validation |
| AI / object detection | Highest | Medium | Games or highly dynamic graphics |
