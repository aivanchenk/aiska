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

  const activeElement = document.activeElement;
  console.log("[Log First Textarea] Active element:", activeElement);
  console.log(
    "[Log First Textarea] Active element tag:",
    activeElement.tagName
  );
  console.log("[Log First Textarea] Active element type:", activeElement.type);
  console.log(
    "[Log First Textarea] Active element contentEditable:",
    activeElement.contentEditable
  );
  console.log(
    "[Log First Textarea] Active element isEditable:",
    isEditableElement(activeElement)
  );
});
