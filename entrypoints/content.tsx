import { render } from 'preact';
import { AppSidebar } from '@/components/AppSidebar';
import { StudentSearch } from '@/components/StudentSearch';
import { ViewingScheduleHeader } from '@/components/ViewingScheduleHeader';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { initPreloading } from '@/lib/preload';
import { updateProfileCache, getCachedProfile, extractViewedPerson, isViewingOwnPage } from '@/lib/profile-cache';
import '@/styles/globals.css';

export default defineContentScript({
  matches: ['*://*.lectio.dk/*'],
  main() {
    console.log('[Improved Lectio] Content script loaded');

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initLayout);
    } else {
      initLayout();
    }
  },
});

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

  // Don't inject on login page, print pages, or other non-app pages
  const isPrintPage = window.location.pathname.includes('print.aspx');
  if (!document.querySelector('.ls-master-header') || isPrintPage) {
    console.log('[Improved Lectio] Not on main app page or print page, skipping');
    // Still reveal the page
    document.body.classList.add('il-ready');
    return;
  }

  // Redirect messages page to "Nyeste" folder by default
  if (window.location.pathname.includes('beskeder2.aspx') && !window.location.search.includes('mappeid')) {
    window.location.href = window.location.pathname + '?mappeid=-70';
    return;
  }

  // Update profile cache with any data we can extract from this page
  updateProfileCache();

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

      // Hide skeleton with fade, then reveal the page
      const skeleton = document.getElementById('il-skeleton');
      if (skeleton) {
        skeleton.classList.add('il-hide');
        // Remove skeleton after transition
        setTimeout(() => skeleton.remove(), 150);
      }

      // Reveal the page now that everything is ready
      document.body.classList.add('il-ready');

      // Initialize preloading for faster navigation
      const schoolId = window.location.pathname.match(/\/lectio\/(\d+)\//)?.[1];
      if (schoolId) {
        initPreloading(schoolId);

        // Inject student search on FindSkema page
        if (window.location.pathname.toLowerCase().includes('findskema.aspx')) {
          injectStudentSearch(schoolId);
        }

        // Inject "viewing schedule" header when looking at someone else's schedule
        if (!isViewingOwnPage()) {
          injectViewingScheduleHeader(schoolId);
        }
      }

      console.log('[Improved Lectio] Dashboard layout injected');
    }
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
  render(<StudentSearch schoolId={schoolId} searchType={searchType || 'elev'} />, searchContainer);

  console.log('[Improved Lectio] Student search injected with type:', searchType || 'elev');
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

  console.log('[Improved Lectio] Viewing schedule header injected');
}
