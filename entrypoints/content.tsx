import { render } from 'preact';
import { AppSidebar } from '@/components/AppSidebar';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
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
  // Don't inject on login page or other non-app pages
  if (!document.querySelector('.ls-master-header')) {
    console.log('[Improved Lectio] Not on main app page, skipping');
    // Still reveal the page
    document.body.classList.add('il-ready');
    return;
  }

  // Redirect messages page to "Nyeste" folder by default
  if (window.location.pathname.includes('beskeder2.aspx') && !window.location.search.includes('mappeid')) {
    window.location.href = window.location.pathname + '?mappeid=-70';
    return;
  }

  // Extract profile picture URL before modifying DOM
  const profileImg = document.querySelector('#s_m_HeaderContent_picctrlthumbimage') as HTMLImageElement;
  if (profileImg?.src) {
    const url = new URL(profileImg.src, window.location.origin);
    url.searchParams.set('fullsize', '1');
    (window as any).__IL_PROFILE_PIC__ = url.toString();
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

      // Reveal the page now that everything is ready
      document.body.classList.add('il-ready');

      console.log('[Improved Lectio] Dashboard layout injected');
    }
  });
}
