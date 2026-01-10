# Alternative: Proactive Session Renewal

If the current approach (blocking SessionHelper entirely) causes issues with users getting logged out unexpectedly, use this alternative instead.

## When to Switch

Switch to this approach if users report:
- Getting logged out after leaving a Lectio tab open for a long time
- Session expired errors when returning to an idle tab

## How It Works

Instead of blocking the popup, this approach:
1. Lets SessionHelper run normally
2. Proactively calls `/ping.aspx` before the 50-minute warning threshold
3. Only renews when the tab is focused AND idle time > 45 minutes

This keeps the server session alive without spamming renewals.

## Implementation

**Delete** `entrypoints/session-block.content.ts` and **create** `entrypoints/session-renew.content.ts`:

```typescript
/**
 * Proactively renews the Lectio session before the warning popup appears.
 *
 * Checks every 60 seconds and on tab focus. Only renews if:
 * - Tab is visible (focused)
 * - Idle time > 45 minutes (warning shows at 50 min)
 */
export default defineContentScript({
  matches: ['*://*.lectio.dk/*'],
  runAt: 'document_idle',

  main() {
    const RENEW_BEFORE = 45 * 60 * 1000; // 45 min - renew 5 min before warning

    const shouldRenew = (): boolean => {
      if (document.hidden) return false;

      const match = document.cookie.match(/LastAuthenticatedPageLoad2=(\d+)/);
      if (!match) return false;

      const idleTime = Date.now() - parseInt(match[1]);
      return idleTime > RENEW_BEFORE;
    };

    const renewSession = async (): Promise<void> => {
      const schoolMatch = document.cookie.match(/BaseSchoolUrl=(\d+)/);
      if (!schoolMatch) return;

      try {
        await fetch(`/lectio/${schoolMatch[1]}/ping.aspx`);
        document.cookie = `LastAuthenticatedPageLoad2=${Date.now()};path=/`;
      } catch {
        // Network error - session will expire naturally
      }
    };

    const checkAndRenew = (): void => {
      if (shouldRenew()) renewSession();
    };

    // Check when tab regains focus
    document.addEventListener('visibilitychange', checkAndRenew);

    // Check every 60s for long continuous sessions
    setInterval(checkAndRenew, 60_000);
  }
});
```

## Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **Block SessionHelper** (current) | Simplest, no timers | Server session can expire if tab idle 60+ min |
| **Proactive Renewal** (this) | Keeps session alive indefinitely | Slightly more complex, runs periodic checks |
