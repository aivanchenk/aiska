// Listen for the SW's request and do the DOM work entirely from this file.
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type !== "LOG_TEXTAREA") return;

  const areas = document.querySelectorAll("textarea");
  if (!areas.length) {
    console.warn("[AIska] No <textarea> found on this page/frame.");
    return;
  }

  const activeElement = document.activeElement;
  console.log("[AIska] Active element:", activeElement);
  console.log("[AIska] Active element tag:", activeElement.tagName);
  console.log("[AIska] Active element type:", activeElement.type);
  console.log(
    "[AIska] Active element contentEditable:",
    activeElement.contentEditable
  );
  console.log(
    "[AIska] Active element isEditable:",
    isEditableElement(activeElement)
  );
});

// Global variable to track currently monitored element
let currentlyMonitoredElement = null;

// Function to add CSS styles for the monitoring indicator
function addMonitoringStyles() {
  if (document.getElementById("aiska-indicator-styles")) {
    return; // Styles already added
  }

  const style = document.createElement("style");
  style.id = "aiska-indicator-styles";
  style.textContent = `
    .aiska-monitored::before {
      content: "";
      display: inline-block;
      width: 12px;
      height: 12px;
      background-color: #ff4444;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      margin-right: 8px;
      vertical-align: middle;
      animation: aiska-pulse 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }
    
    @keyframes aiska-pulse {
      0% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 0.6; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// Function to show monitoring indicator using ::before pseudo-element
function showMonitoringIndicator(element) {
  if (!element) return;

  // Add the monitoring class to trigger the ::before pseudo-element
  element.classList.add("aiska-monitored");

  // Add CSS styles if not already added
  addMonitoringStyles();
}

// Function to hide monitoring indicator
function hideMonitoringIndicator() {
  if (currentlyMonitoredElement) {
    currentlyMonitoredElement.classList.remove("aiska-monitored");
  }
}

// Function to start monitoring an element
function startMonitoring(element) {
  if (!isEditableElement(element)) return;

  // Stop monitoring previous element
  stopMonitoring();

  currentlyMonitoredElement = element;
  showMonitoringIndicator(element);

  console.log("[AIska] Started monitoring element:", element);

  // Add a data attribute to mark the element as monitored
  element.setAttribute("data-aiska-monitored", "true");
}

// Function to stop monitoring
function stopMonitoring() {
  if (currentlyMonitoredElement) {
    currentlyMonitoredElement.removeAttribute("data-aiska-monitored");
    currentlyMonitoredElement.classList.remove("aiska-monitored");
    currentlyMonitoredElement = null;
  }

  console.log("[AIska] Stopped monitoring");
}

// Function to check if an element is truly editable and focusable
function isEditableElement(element) {
  if (!element) return false;

  // Check if element is focusable
  if (!isFocusable(element)) return false;

  // Check if element can accept text input
  return isTextInputElement(element);
}

// Function to check if an element can receive focus
function isFocusable(element) {
  if (!element) return false;

  // Check if element is visible and not disabled
  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    element.disabled
  ) {
    return false;
  }

  // Check tabindex
  const tabIndex = element.getAttribute("tabindex");
  if (tabIndex !== null) {
    return parseInt(tabIndex) >= 0;
  }

  // Check if element is naturally focusable
  const focusableTags = ["input", "textarea", "select", "button", "a", "area"];
  if (focusableTags.includes(element.tagName.toLowerCase())) {
    return true;
  }

  // Check contentEditable
  if (element.contentEditable === "true") {
    return true;
  }

  return false;
}

// Function to check if an element can accept text input
function isTextInputElement(element) {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();

  // Standard text input elements
  if (tagName === "textarea") return true;

  if (tagName === "input") {
    const type = element.type.toLowerCase();
    const textInputTypes = [
      "text",
      "email",
      "password",
      "search",
      "tel",
      "url",
      "number",
      "date",
      "datetime-local",
      "time",
      "month",
      "week",
    ];
    return textInputTypes.includes(type);
  }

  // ContentEditable elements
  if (element.contentEditable === "true") return true;

  // Check for role="textbox" or similar
  const role = element.getAttribute("role");
  if (role === "textbox" || role === "searchbox") return true;

  return false;
}

// Function to get the currently focused editable element
function getCurrentEditableElement() {
  const activeElement = document.activeElement;

  // Check if the active element is editable
  if (isEditableElement(activeElement)) {
    return activeElement;
  }

  // If active element is not editable, try to find the closest editable parent
  let parent = activeElement.parentElement;
  while (parent && parent !== document.body) {
    if (isEditableElement(parent)) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
}

// Listen for focus events to track the currently focused editable element
document.addEventListener("focusin", (event) => {
  const editableElement = getCurrentEditableElement();
  if (editableElement) {
    console.log("[AIska] Focused editable element:", editableElement);
    console.log("[AIska] Element type:", editableElement.tagName);
    console.log(
      "[AIska] Element value:",
      editableElement.value || editableElement.textContent
    );

    // Start monitoring this element
    startMonitoring(editableElement);

    // You can add your sensitive data detection logic here
    // detectSensitiveData(editableElement);
  }
});

// Listen for click events to detect when user clicks on editable elements
document.addEventListener("click", (event) => {
  const clickedElement = event.target;
  if (isEditableElement(clickedElement)) {
    console.log("[AIska] Clicked editable element:", clickedElement);
    console.log("[AIska] Element type:", clickedElement.tagName);
    console.log(
      "[AIska] Element value:",
      clickedElement.value || clickedElement.textContent
    );

    // Focus the element to make it the active element
    clickedElement.focus();

    // Start monitoring this element
    startMonitoring(clickedElement);

    // You can add your sensitive data detection logic here
    // detectSensitiveData(clickedElement);
  }
});

// Improved focusout handling - only stop monitoring if focus truly left the element
document.addEventListener("focusout", (event) => {
  // Only stop monitoring if the focus is leaving the currently monitored element
  if (currentlyMonitoredElement && event.target === currentlyMonitoredElement) {
    // Longer delay to handle complex focus scenarios
    setTimeout(() => {
      const currentElement = getCurrentEditableElement();

      // Only stop if:
      // 1. No element is focused, OR
      // 2. The focused element is different from what we're monitoring
      if (!currentElement || currentElement !== currentlyMonitoredElement) {
        console.log(
          "[AIska] Focus truly left monitored element, stopping monitoring"
        );
        stopMonitoring();
      } else {
        console.log(
          "[AIska] Focus still on monitored element, continuing monitoring"
        );
      }
    }, 200); // Increased delay from 100ms to 200ms
  }
});

// Additional event listener for when focus changes within the same element
document.addEventListener("focus", (event) => {
  // If focus is on a child of the monitored element, keep monitoring
  if (
    currentlyMonitoredElement &&
    currentlyMonitoredElement.contains(event.target)
  ) {
    console.log(
      "[AIska] Focus within monitored element, continuing monitoring"
    );
    return;
  }

  // If focus is on a different editable element, switch monitoring
  const editableElement = getCurrentEditableElement();
  if (editableElement && editableElement !== currentlyMonitoredElement) {
    console.log(
      "[AIska] Focus moved to different editable element, switching monitoring"
    );
    startMonitoring(editableElement);
  }
});

// Clean up when page unloads
window.addEventListener("beforeunload", () => {
  stopMonitoring();
});
