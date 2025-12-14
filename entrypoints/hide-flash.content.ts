// This script runs at document_start to hide the page before it renders
// Prevents the flash of unstyled content when navigating

export default defineContentScript({
  matches: ['*://*.lectio.dk/*'],
  runAt: 'document_start',
  main() {
    // Inject CSS immediately to hide body
    const style = document.createElement('style');
    style.id = 'il-hide-flash';
    style.textContent = `
      body {
        opacity: 0 !important;
        transition: opacity 0.15s ease-in-out !important;
      }
      body.il-ready {
        opacity: 1 !important;
      }
    `;

    // Append to documentElement since head might not exist yet
    (document.head || document.documentElement).appendChild(style);
  },
});
