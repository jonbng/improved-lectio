// This script runs at document_start to hide the page before it renders
// CSS is imported and registered in manifest for earliest possible injection
// JS handles sidebar HTML and prerender coordination

import '@/styles/hide-flash.css';

// Cache keys must match lib/profile-cache.ts
const PROFILE_CACHE_KEY = 'il-user-profile';
const LOGIN_STATE_KEY = 'il-login-state';

interface CachedProfile {
  name: string;
  fullName: string;
  className: string;
  pictureUrl: string | null;
  schoolId: string | null;
  schoolName: string | null;
}

interface LoginState {
  isLoggedIn: boolean;
  schoolId: string | null;
  lastChecked: number;
}

function getCachedProfile(): CachedProfile | null {
  try {
    const stored = localStorage.getItem(PROFILE_CACHE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return null;
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

function getSchoolIdFromUrl(): string {
  const match = window.location.pathname.match(/\/lectio\/(\d+)\//);
  return match ? match[1] : '94';
}

// SVG icons as strings (from lucide-react)
const icons = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  graduation: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  folder: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  bookMarked: '<path d="M10 2v8l3-3 3 3V2"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
};

function icon(name: keyof typeof icons): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="il-icon">${icons[name]}</svg>`;
}

function renderSidebar(cache: CachedProfile | null): string {
  const schoolId = cache?.schoolId || getSchoolIdFromUrl();
  const baseUrl = `/lectio/${schoolId}`;

  const schoolName = cache?.schoolName;
  const userName = cache?.name;
  const userClass = cache?.className;
  const pictureUrl = cache?.pictureUrl;

  // Navigation items - these never change
  const navMain = [
    { title: 'Forside', icon: 'home', page: 'forside' },
    { title: 'Skema', icon: 'calendar', page: 'skemany' },
    { title: 'Elever', icon: 'users', page: 'FindSkema' },
    { title: 'Opgaver', icon: 'fileText', page: 'opgaverelev' },
    { title: 'Lektier', icon: 'book', page: 'material_lektieoversigt' },
    { title: 'Beskeder', icon: 'message', page: 'beskeder2' },
  ];

  const navSecondary = [
    { title: 'Karakterer', icon: 'graduation', page: 'grades/grade_report' },
    { title: 'Fravær', icon: 'clock', page: 'subnav/fravaerelev_fravaersaarsager' },
    { title: 'Studieplan', icon: 'clipboard', page: 'studieplan' },
    { title: 'Dokumenter', icon: 'folder', page: 'dokumentoversigt' },
    { title: 'Spørgeskema', icon: 'help', page: 'spoergeskema/spoergeskema_rapport' },
    { title: 'UV-beskrivelser', icon: 'bookMarked', page: 'studieplan/uvb_list_off' },
  ];

  const renderNavItem = (item: { title: string; icon: string; page: string }) => `
    <a href="${baseUrl}/${item.page}.aspx" class="il-nav-item">
      ${icon(item.icon as keyof typeof icons)}
      <span>${item.title}</span>
    </a>
  `;

  // Header: show school name or skeleton
  const headerHtml = schoolName
    ? `<a href="${baseUrl}/skemany.aspx" class="il-header-title">${schoolName}</a>`
    : `<div class="il-skeleton-text il-skeleton-header"></div>`;

  // Footer: show user info or skeleton
  const footerHtml = userName
    ? `
      <div class="il-user-section">
        <div class="il-avatar">
          ${pictureUrl
            ? `<img src="${pictureUrl}" alt="${userName}" class="il-avatar-img" />`
            : `<span class="il-avatar-fallback">${userName.charAt(0).toUpperCase()}</span>`
          }
        </div>
        <div class="il-user-info">
          <span class="il-user-name">${userName}</span>
          <span class="il-user-class">${userClass || ''}</span>
        </div>
      </div>
    `
    : `
      <div class="il-user-section">
        <div class="il-avatar il-skeleton-avatar"></div>
        <div class="il-user-info">
          <div class="il-skeleton-text il-skeleton-name"></div>
          <div class="il-skeleton-text il-skeleton-class"></div>
        </div>
      </div>
    `;

  return `
    <div class="il-sidebar-header">
      ${headerHtml}
    </div>
    <div class="il-sidebar-content">
      <div class="il-nav-group">
        <span class="il-nav-label">Navigation</span>
        ${navMain.map(renderNavItem).join('')}
      </div>
      <div class="il-separator"></div>
      <div class="il-nav-group">
        <span class="il-nav-label">Mere</span>
        ${navSecondary.map(renderNavItem).join('')}
      </div>
    </div>
    <div class="il-sidebar-footer">
      <div class="il-separator"></div>
      ${footerHtml}
    </div>
  `;
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
    // Skip for print pages - don't show skeleton or modify
    if (window.location.pathname.includes('print.aspx')) {
      // Reveal immediately for print pages
      document.documentElement.classList.add('il-ready');
      return;
    }

    // Skip skeleton for login pages - they have their own UI
    if (isLoginPage()) {
      return;
    }

    // Check cached login state - if we know user was logged out, skip sidebar
    const loginState = getCachedLoginState();
    if (loginState && !loginState.isLoggedIn) {
      // User was logged out last we checked, don't show sidebar
      return;
    }

    // For prerendered pages: mark as prerendered for instant reveal (no transition)
    // @ts-ignore - document.prerendering is a newer API
    if (document.prerendering) {
      (window as any).__IL_PRERENDERED__ = true;
      // Add il-prerendered class - CSS will show body instantly without transition
      document.documentElement.classList.add('il-prerendered');
      return;
    }

    // Get cached profile data
    const cache = getCachedProfile();

    // Inject sidebar HTML to documentElement (body doesn't exist yet)
    const skeleton = document.createElement('div');
    skeleton.id = 'il-skeleton';
    skeleton.innerHTML = renderSidebar(cache);
    document.documentElement.appendChild(skeleton);

    // Store reference for cleanup
    (window as any).__IL_SKELETON__ = skeleton;
  },
});
