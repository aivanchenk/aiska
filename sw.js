// sw.js (MV3 service worker)
const MATCHES = [
  "https://httpbin.org/",
  "https://example.com/",
  "https://chat.openai.com/",
];

function urlMatches(url) {
  return MATCHES.some((base) => url && url.startsWith(base));
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab?.url || !urlMatches(tab.url))
    return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: "MAIN", // run in page's JS context
      files: ["injected-submit-hook.js"], // inject packaged file
    });
  } catch (e) {
    console.warn("SDG inject failed:", e);
  }
});

// Optional: also inject when a pinned tab becomes active, etc.
// chrome.tabs.onActivated.addListener(async ({ tabId }) => { ... });
