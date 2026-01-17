const SETTINGS_KEY = 'il-feature-settings';

function isAutoRedirectEnabled(): boolean {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return true; // Default to enabled
    const settings = JSON.parse(stored);
    return settings?.behavior?.autoRedirectForside ?? true;
  } catch {
    return true; // Default to enabled on error
  }
}

export default defineContentScript({
  matches: ["*://www.lectio.dk/lectio/*/default.aspx*"],
  runAt: "document_start",
  main() {
    // Check if feature is enabled
    if (!isAutoRedirectEnabled()) {
      return;
    }

    const newUrl = window.location.href.replace("default.aspx", "forside.aspx");
    console.log("[BetterLectio] Redirecting from default.aspx to forside.aspx");
    window.location.replace(newUrl);
  },
});
