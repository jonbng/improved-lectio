import { render } from 'preact';
import { AppSidebar } from '@/components/AppSidebar';
import { StudentSearch } from '@/components/StudentSearch';
import { ViewingScheduleHeader } from '@/components/ViewingScheduleHeader';
import { ForsideGreeting } from '@/components/ForsideGreeting';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { initPreloading } from '@/lib/preload';
import { updateProfileCache, updateLoginState, getCachedProfile, extractViewedPerson, isViewingOwnPage } from '@/lib/profile-cache';
import { updatePageTitle, observeTitleChanges } from '@/lib/page-titles';
import '@/styles/globals.css';

export default defineContentScript({
  matches: ['*://*.lectio.dk/*'],
  main() {
    console.log('[BetterLectio] Content script loaded');

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initLayout);
    } else {
      initLayout();
    }
  },
});

function replaceFavicon() {
  // Remove existing favicons
  document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(el => el.remove());

  // Add our favicon
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/x-icon';
  favicon.href = browser.runtime.getURL('/assets/favicon.ico');
  document.head.appendChild(favicon);
}

function injectFont() {
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';

  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';

  const font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap';

  document.head.append(preconnect1, preconnect2, font);
}

function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <div id="il-lectio-content" className="flex-1 overflow-auto" />
      </SidebarInset>
    </SidebarProvider>
  );
}

function initLayout() {
  // If this page was prerendered and is now activating, it's already set up
  // @ts-ignore
  const wasPrerendered = (window as any).__IL_PRERENDERED__ && !document.prerendering;

  // Check if this is the login.aspx page (session expired redirect, e.g. /lectio/94/login.aspx)
  const isLoginAspx = /\/lectio\/\d+\/login\.aspx/.test(window.location.pathname);
  if (isLoginAspx) {
    console.log('[BetterLectio] On login.aspx - session expired, clearing login state');
    updateLoginState(); // This will detect not logged in and clear the cache
    document.documentElement.classList.add('il-ready');
    return;
  }

  // Don't inject on login page, print pages, or other non-app pages
  const isPrintPage = window.location.pathname.includes('print.aspx');
  const hasMainHeader = !!document.querySelector('.ls-master-header');

  if (!hasMainHeader || isPrintPage) {
    console.log('[BetterLectio] Not on main app page or print page, skipping');

    // If we're on a school page (has /lectio/XX/) but no main header,
    // user is likely logged out - update the state
    const isSchoolPage = /\/lectio\/\d+\//.test(window.location.pathname);
    if (isSchoolPage && !hasMainHeader && !isPrintPage) {
      console.log('[BetterLectio] On school page but not logged in, clearing login state');
      updateLoginState(); // This will detect not logged in and clear the cache
    }

    // Still reveal the page
    document.documentElement.classList.add('il-ready');
    return;
  }

  // Redirect messages page to "Nyeste" folder by default
  if (window.location.pathname.includes('beskeder2.aspx') && !window.location.search.includes('mappeid')) {
    window.location.href = window.location.pathname + '?mappeid=-70';
    return;
  }

  // Update login state and profile cache
  updateLoginState();
  updateProfileCache();

  // Update page title to cleaner format
  updatePageTitle();

  // Set cached profile data on window for AppSidebar to use
  const cachedProfile = getCachedProfile();
  if (cachedProfile) {
    (window as any).__IL_CACHED_PROFILE__ = cachedProfile;
  }

  // Extract profile picture URL before modifying DOM (for immediate use)
  // Only do this when viewing our own page, not someone else's schedule
  if (isViewingOwnPage()) {
    const profileImg = document.querySelector('#s_m_HeaderContent_picctrlthumbimage') as HTMLImageElement;
    if (profileImg?.src) {
      const url = new URL(profileImg.src, window.location.origin);
      url.searchParams.set('fullsize', '1');
      (window as any).__IL_PROFILE_PIC__ = url.toString();
    }
  }

  // Replace Lectio's favicon with our logo
  replaceFavicon();

  // Inject Geist font
  injectFont();

  // Collect all original body children (as actual nodes, not innerHTML)
  // This preserves event handlers and form connections
  const originalNodes: Node[] = [];
  while (document.body.firstChild) {
    originalNodes.push(document.body.removeChild(document.body.firstChild));
  }

  // Add our wrapper class
  document.body.classList.add('il-dashboard-active');

  // Create our root container
  const root = document.createElement('div');
  root.id = 'il-root';
  document.body.appendChild(root);

  // Render the dashboard layout
  render(<DashboardLayout />, root);

  // Wait for the render and then move the original content into our content area
  requestAnimationFrame(() => {
    const contentContainer = document.getElementById('il-lectio-content');
    if (contentContainer) {
      // Create a wrapper for the original content
      const wrapper = document.createElement('div');
      wrapper.id = 'il-original-content';

      // Move actual DOM nodes (preserves event handlers and form connections)
      for (const node of originalNodes) {
        wrapper.appendChild(node);
      }

      contentContainer.appendChild(wrapper);

      // Reveal the page now that our UI is ready
      document.documentElement.classList.add('il-ready');

      // Initialize preloading for faster navigation
      const schoolId = window.location.pathname.match(/\/lectio\/(\d+)\//)?.[1];
      if (schoolId) {
        initPreloading(schoolId);

        // Inject student search on FindSkema page
        if (window.location.pathname.toLowerCase().includes('findskema.aspx')) {
          injectStudentSearch(schoolId);
        }

        // Inject greeting on forside page
        if (window.location.pathname.toLowerCase().includes('forside.aspx')) {
          injectForsideGreeting();
        }

        // Inject "viewing schedule" header when looking at someone else's schedule
        if (!isViewingOwnPage()) {
          injectViewingScheduleHeader(schoolId);
        }
      }

      // Set up title observer for dynamic updates (e.g., unread message count)
      observeTitleChanges();

      // Set up schedule table column widths and highlight today
      injectScheduleColgroup();
      highlightTodayInSchedule();
      injectCurrentTimeIndicator();

      // Remove redundant tooltip on activity page title
      removeActivityTitleTooltip();

      console.log('[BetterLectio] Dashboard layout injected');
    }
  });
}

function removeActivityTitleTooltip() {
  // On activity pages, the title has a tooltip that duplicates all info already shown on page
  const activityHeader = document.getElementById('s_m_Content_Content_tocAndToolbar_actHeader');
  if (!activityHeader) return;

  const tooltipElement = activityHeader.querySelector('[data-tooltip]');
  if (tooltipElement) {
    tooltipElement.removeAttribute('data-tooltip');
  }

  // Remove native browser tooltip from activity note textarea
  const activityNote = document.getElementById('s_m_Content_Content_tocAndToolbar_ActNoteTB_tb');
  if (activityNote) {
    activityNote.removeAttribute('title');
  }
}

function highlightTodayInSchedule() {
  const today = new Date();
  const isoDate = today.toISOString().split('T')[0]; // "YYYY-MM-DD"

  // Find all cells with today's date and mark them
  const todayCells = document.querySelectorAll(`.s2skema td[data-date="${isoDate}"]`);
  if (todayCells.length === 0) return;

  todayCells.forEach(td => {
    td.classList.add('is-today');

    // Find the column index to highlight the header too
    const cellIndex = (td as HTMLTableCellElement).cellIndex;
    const table = td.closest('table');
    if (!table) return;

    // Find and mark the day header cell in the same column
    const headerRow = table.querySelector('tr.s2dayHeader');
    if (headerRow) {
      const headerCell = headerRow.children[cellIndex] as HTMLTableCellElement;
      if (headerCell) {
        headerCell.classList.add('is-today');
        // Change text to "I dag" with the date
        const dateMatch = headerCell.textContent?.match(/\((\d+\/\d+)\)/);
        if (dateMatch) {
          headerCell.textContent = `I dag (${dateMatch[1]})`;
        }
      }
    }

    // Also mark the info header cell (row with announcements)
    const infoHeaderRow = table.querySelector('tr:has(.s2infoHeader)');
    if (infoHeaderRow) {
      const infoCell = infoHeaderRow.children[cellIndex] as HTMLTableCellElement;
      if (infoCell) {
        infoCell.classList.add('is-today');
      }
    }
  });
}

function injectCurrentTimeIndicator() {
  const today = new Date();
  const isoDate = today.toISOString().split('T')[0];
  const todayCell = document.querySelector(`.s2skema td[data-date="${isoDate}"]`);
  if (!todayCell) return;

  const container = todayCell.querySelector('.s2skemabrikcontainer');
  if (!container) return;

  // Create the time indicator line
  const indicator = document.createElement('div');
  indicator.id = 'il-time-indicator';
  // indicator.innerHTML = '<span class="il-time-label"></span><div class="il-time-dot"></div>';
  indicator.innerHTML = '<div class="il-time-dot"></div>';
  container.appendChild(indicator);

  // Update position immediately and every minute
  updateTimeIndicatorPosition();
  setInterval(updateTimeIndicatorPosition, 60000);
}

function updateTimeIndicatorPosition() {
  const indicator = document.getElementById('il-time-indicator');
  if (!indicator) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Schedule runs from 8:10 (490 min) to 20:00 (1200 min)
  const startMinutes = 490;
  const endMinutes = 1200;

  // Hide if outside schedule hours
  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    indicator.style.display = 'none';
    return;
  }

  // Calculate position using linear mapping
  // 8:10 (490 min) -> 0.636em, 20:00 (1200 min) -> 45.818em
  // Rate: (45.818 - 0.636) / (1200 - 490) = 0.0636 em/min
  const topEm = 0.636 + (currentMinutes - startMinutes) * 0.0636;

  indicator.style.display = '';
  indicator.style.top = `${topEm}em`;

  // Update time label (commented out - overlaps with schedule)
  // const timeLabel = indicator.querySelector('.il-time-label');
  // if (timeLabel) {
  //   const hours = now.getHours().toString().padStart(2, '0');
  //   const minutes = now.getMinutes().toString().padStart(2, '0');
  //   timeLabel.textContent = `${hours}:${minutes}`;
  // }
}

function injectScheduleColgroup() {
  const tables = document.querySelectorAll('.s2skema');
  tables.forEach(table => {
    // Skip if colgroup already exists
    if (table.querySelector('colgroup')) return;

    // Count day columns (cells with data-date attribute in content row)
    const contentRow = table.querySelector('tr:has(td[data-date])');
    if (!contentRow) return;

    const dayColumns = contentRow.querySelectorAll('td[data-date]').length;

    // Create colgroup with proper widths
    const colgroup = document.createElement('colgroup');

    // First column (module times) - fixed narrow width
    const firstCol = document.createElement('col');
    firstCol.style.width = '7.5em';
    colgroup.appendChild(firstCol);

    // Day columns - equal distribution of remaining space
    for (let i = 0; i < dayColumns; i++) {
      const col = document.createElement('col');
      colgroup.appendChild(col);
    }

    // Insert colgroup at the beginning of the table
    table.insertBefore(colgroup, table.firstChild);
  });
}

function injectStudentSearch(schoolId: string) {
  // Find the content area where we want to inject the search
  const pageHeader = document.querySelector('#m_HeaderContent_pageHeader');
  if (!pageHeader) return;

  // Get search type from URL (e.g., ?type=lokale)
  const urlParams = new URLSearchParams(window.location.search);
  const searchType = urlParams.get('type') as 'elev' | 'laerer' | 'stamklasse' | 'lokale' | 'ressource' | 'hold' | 'gruppe' | undefined;

  // Create container for our search
  const searchContainer = document.createElement('div');
  searchContainer.id = 'il-student-search';
  searchContainer.style.padding = '0.4em 0.5em 0 0.5em';

  // Insert after the page header
  pageHeader.parentNode?.insertBefore(searchContainer, pageHeader.nextSibling);

  // Render the search component with the appropriate type
  // Default to 'all' (students, teachers, rooms) when no type specified
  render(<StudentSearch schoolId={schoolId} searchType={searchType || 'all'} />, searchContainer);

  console.log('[BetterLectio] Student search injected with type:', searchType || 'all');
}

function injectForsideGreeting() {
  // Add body class for forside-specific CSS
  document.body.classList.add('il-forside');

  // Find the content container
  const contentContainer = document.getElementById('il-lectio-content');
  if (!contentContainer) return;

  // Create container for the greeting
  const greetingContainer = document.createElement('div');
  greetingContainer.id = 'il-forside-greeting';

  // Insert at the beginning of the content container
  contentContainer.insertBefore(greetingContainer, contentContainer.firstChild);

  // Render the greeting component
  render(<ForsideGreeting />, greetingContainer);

  console.log('[BetterLectio] Forside greeting injected');
}

function injectViewingScheduleHeader(schoolId: string) {
  const viewedPerson = extractViewedPerson();
  if (!viewedPerson) return;

  // Find the content container
  const contentContainer = document.getElementById('il-lectio-content');
  if (!contentContainer) return;

  // Create container for the header
  const headerContainer = document.createElement('div');
  headerContainer.id = 'il-viewing-schedule-header';

  // Insert at the beginning of the content container
  contentContainer.insertBefore(headerContainer, contentContainer.firstChild);

  // Render the header component
  render(
    <ViewingScheduleHeader
      name={viewedPerson.name}
      className={viewedPerson.className}
      pictureUrl={viewedPerson.pictureUrl}
      type={viewedPerson.type}
      schoolId={schoolId}
    />,
    headerContainer
  );

  console.log('[BetterLectio] Viewing schedule header injected');
}
