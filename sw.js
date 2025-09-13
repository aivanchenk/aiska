// When the user clicks the toolbar icon, ask the active tab to log the textarea.
chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "LOG_TEXTAREA" });
});
