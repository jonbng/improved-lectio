export default defineBackground(() => {
  console.log('[BetterLectio] Background script loaded');

  // Handle extension icon click - open settings modal
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id && tab.url?.includes('lectio.dk')) {
      await browser.tabs.sendMessage(tab.id, { action: 'openSettings' });
    } else {
      // If not on Lectio, open Lectio in a new tab
      await browser.tabs.create({ url: 'https://www.lectio.dk/' });
    }
  });
});
