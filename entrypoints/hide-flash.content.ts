// This script runs at document_start to hide the page before it renders
// CSS is imported and registered in manifest for earliest possible injection
// JS handles prerender coordination and login page detection

import '@/styles/hide-flash.css';

const LOGIN_STATE_KEY = 'il-login-state';

interface LoginState {
  isLoggedIn: boolean;
  schoolId: string | null;
  lastChecked: number;
}

function getCachedLoginState(): LoginState | null {
  try {
    const stored = localStorage.getItem(LOGIN_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function isLoginPage(): boolean {
  const path = window.location.pathname;
  const host = window.location.host;

  // Main lectio.dk homepage
  if (host === 'www.lectio.dk' && (path === '/' || path === '/index.html')) {
    return true;
  }

  // Login list pages
  if (path.includes('login_list.aspx')) {
    return true;
  }

  // Session expired login page (e.g. /lectio/94/login.aspx)
  if (/\/lectio\/\d+\/login\.aspx/.test(path)) {
    return true;
  }

  return false;
}

export default defineContentScript({
  matches: ['*://*.lectio.dk/*'],
  runAt: 'document_start',
  main() {
    // Skip for print pages - reveal immediately
    if (window.location.pathname.includes('print.aspx')) {
      document.documentElement.classList.add('il-ready');
      return;
    }

    // Skip for login pages - they have their own UI, don't hide
    if (isLoginPage()) {
      document.documentElement.classList.add('il-ready');
      return;
    }

    // Check cached login state - if we know user was logged out, don't hide
    const loginState = getCachedLoginState();
    if (loginState && !loginState.isLoggedIn) {
      document.documentElement.classList.add('il-ready');
      return;
    }

    // For prerendered pages: mark as prerendered for instant reveal (no transition)
    // @ts-ignore - document.prerendering is a newer API
    if (document.prerendering) {
      (window as any).__IL_PRERENDERED__ = true;
      document.documentElement.classList.add('il-prerendered');
      return;
    }

    // Page will be hidden by CSS until content.tsx adds .il-ready after rendering sidebar
  },
});
