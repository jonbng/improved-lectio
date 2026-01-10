/**
 * Blocks Lectio's SessionHelper from initializing.
 *
 * This prevents the "Din session udløber snart" popup from ever appearing.
 * The server-side session still renews on normal page navigation, so this
 * is safe for typical usage. Only edge case: leaving a tab completely idle
 * for 60+ minutes without any navigation will cause the server session to
 * expire (you'll need to refresh/re-login on next action).
 *
 * Alternative approach documented in: docs/session-renewal-alternative.md
 */
export default defineContentScript({
  matches: ["*://*.lectio.dk/*"],
  runAt: "document_start", // Must run before Lectio's scripts load
  world: "MAIN", // Run in page context to access window.SessionHelper

  main() {
    // Override SessionHelper before Lectio can initialize it
    Object.defineProperty(window, "SessionHelper", {
      value: {
        Initialize: () => {},
        Instance: null,
      },
      writable: false,
      configurable: false,
    });
  },
});
