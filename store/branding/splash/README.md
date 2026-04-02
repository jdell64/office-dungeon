# Splash screen (source)

Optional **source** images if you add a Capacitor splash plugin or custom native splash later.

Typical considerations:

- Match **background color** to [`capacitor.config.ts`](../../capacitor.config.ts) `backgroundColor` (currently `#111111`) for a seamless handoff to the WebView.
- Export per platform/density as required by your chosen splash tooling—this repo does not implement a full splash flow in the current step.

Place final exported assets where your Capacitor/Android/iOS docs specify when you add that feature.
