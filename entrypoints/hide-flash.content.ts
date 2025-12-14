// This script runs at document_start to hide the page before it renders
// Shows a skeleton sidebar and smooth transition for non-preloaded pages

export default defineContentScript({
  matches: ['*://*.lectio.dk/*'],
  runAt: 'document_start',
  main() {
    // Skip for prerendered pages - they're already ready
    // @ts-ignore - document.prerendering is a newer API
    if (document.prerendering) {
      (window as any).__IL_PRERENDERED__ = true;
      return;
    }

    // Inject styles immediately
    const style = document.createElement('style');
    style.id = 'il-hide-flash';
    style.textContent = `
      /* Hide body and fade in when ready */
      body {
        opacity: 0 !important;
      }
      body.il-ready {
        opacity: 1 !important;
        transition: opacity 0.1s ease-out !important;
      }

      /* Skeleton sidebar - shows instantly while page loads */
      #il-skeleton {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 16rem;
        background: hsl(0 0% 98%);
        border-right: 1px solid hsl(0 0% 90%);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        padding: 1rem;
        font-family: system-ui, -apple-system, sans-serif;
        opacity: 1;
        transition: opacity 0.1s ease-out;
      }

      #il-skeleton.il-hide {
        opacity: 0;
        pointer-events: none;
      }

      /* Skeleton header placeholder */
      #il-skeleton-header {
        height: 1.75rem;
        width: 70%;
        background: hsl(0 0% 90%);
        border-radius: 0.375rem;
        margin-bottom: 1.5rem;
      }

      /* Skeleton nav items */
      .il-skeleton-item {
        height: 2.5rem;
        background: hsl(0 0% 93%);
        border-radius: 0.375rem;
        margin-bottom: 0.25rem;
      }

      .il-skeleton-item:nth-child(2) { width: 60%; }
      .il-skeleton-item:nth-child(3) { width: 75%; }
      .il-skeleton-item:nth-child(4) { width: 55%; }
      .il-skeleton-item:nth-child(5) { width: 70%; }
      .il-skeleton-item:nth-child(6) { width: 65%; }
      .il-skeleton-item:nth-child(7) { width: 50%; }

      @media (max-width: 768px) {
        #il-skeleton { display: none; }
      }
    `;

    (document.head || document.documentElement).appendChild(style);

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

    // Listen for prerender activation
    document.addEventListener('prerenderingchange', () => {
      document.getElementById('il-hide-flash')?.remove();
      document.getElementById('il-skeleton')?.remove();
      document.body?.classList.add('il-ready');
    }, { once: true });
  },
});
