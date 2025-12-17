// This script runs at document_start to hide the page before it renders
// CSS is imported and registered in manifest for earliest possible injection
// JS handles skeleton HTML and prerender coordination

import '@/styles/hide-flash.css';

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

    // For prerendered pages: mark as prerendered for instant reveal (no transition)
    // @ts-ignore - document.prerendering is a newer API
    if (document.prerendering) {
      (window as any).__IL_PRERENDERED__ = true;
      // Add il-prerendered class - CSS will show body instantly without transition
      document.documentElement.classList.add('il-prerendered');
      return;
    }

    // Inject skeleton HTML to documentElement (body doesn't exist yet)
    const skeleton = document.createElement('div');
    skeleton.id = 'il-skeleton';
    skeleton.innerHTML = `
      <div id="il-skeleton-header"></div>
      <div class="il-skeleton-item"></div>
      <div class="il-skeleton-item"></div>
      <div class="il-skeleton-item"></div>
      <div class="il-skeleton-item"></div>
      <div class="il-skeleton-item"></div>
      <div class="il-skeleton-item"></div>
    `;
    document.documentElement.appendChild(skeleton);

    // Store reference for cleanup
    (window as any).__IL_SKELETON__ = skeleton;
  },
});
