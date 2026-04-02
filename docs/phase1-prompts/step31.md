We are continuing the "Office Dungeon" Phaser 3 + TypeScript project.

Current state:

- Core gameplay, content, UI, mobile controls, persistence, sound, and lightweight monetization hooks are in place
- Capacitor packaging is planned / in progress
- The next goal is to prepare basic store-facing assets and metadata so the game is closer to a shippable mobile product

Goal of this task:

Add the minimum project structure and placeholder assets/config needed for store preparation, without overcommitting to final branding or release assets.

## Requirements

### 1) Confirm App Identity

Add a small config/source-of-truth file for app identity metadata.

Include fields such as:

- appName
- shortTagline
- packageId / appId
- version
- descriptionShort
- descriptionLong (placeholder draft is fine)

Use current working title:

- "Office Dungeon"

Keep this simple and editable.

### 2) Add Placeholder App Icon Support

Set up the project so placeholder icon assets can be dropped in and used later.

Requirements:

- create a clear folder for store / app branding assets
- include placeholder icon files if simple
- document expected sizes / purpose in a short README comment or asset note

If the Android/Capacitor pipeline expects a specific icon location, note that clearly.
Do NOT spend time generating polished final icons in this step.

### 3) Add Placeholder Splash / Feature Graphic Support

Create a simple place in the repo for:

- splash screen asset(s)
- feature graphic / promo art
- screenshots

Requirements:

- organize clearly
- document intended use briefly
- placeholders are acceptable

Do NOT build a full splash implementation unless already straightforward and low effort.

### 4) Add Store Listing Draft Content

Create a small markdown or text file with starter store-listing content, including:

- App name
- Short description
- Long description
- Key features list
- Optional promo tagline

Keep it practical and editable.
This is a draft, not final marketing polish.

### 5) Add Screenshot Checklist / Guidance

Create a small checklist file or section describing the screenshots we likely need later.

For example:

- title screen
- gameplay screen
- event choice screen
- run summary screen
- perk/progression screen
- premium/continue screen

This can just be documentation for now.
No need to automate screenshot capture yet.

### 6) Keep Branding Flexible

Do not hardcode the game title in too many new places beyond the existing UI.
Use the new app metadata source where reasonable, but do NOT perform a giant refactor.

### 7) No Real Store Submission Work Yet

Do NOT add:

- release signing
- final store assets
- privacy policy generation
- age rating forms
- real billing setup
- final package publishing steps

This step is only about organizing the project for store readiness.

### 8) Output

Provide all necessary updated files, such as:

- app metadata config file
- placeholder asset folders/files
- store listing draft markdown/text
- screenshot checklist documentation

Ensure the existing game still compiles and runs.
Do not break current web or mobile packaging flow.
