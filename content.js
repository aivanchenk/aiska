// Listen for the SW's request and do the DOM work entirely from this file.
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type !== "LOG_TEXTAREA") return;

  const areas = document.querySelectorAll("textarea");
  if (!areas.length) {
    console.warn(
      "[Log First Textarea] No <textarea> found on this page/frame."
    );
    return;
  }

  const el = areas[0];
  el.scrollIntoView({ block: "center", inline: "nearest" });
  el.focus();

  console.log("[Log First Textarea] Element:", el);
  console.log("[Log First Textarea] Value:", el.value);
});
