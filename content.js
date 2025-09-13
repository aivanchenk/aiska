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
let monitoringIndicator = null;

// Function to create the monitoring indicator
function createMonitoringIndicator() {
  if (monitoringIndicator) {
    return monitoringIndicator;
  }

  const indicator = document.createElement("div");
  indicator.id = "aiska-monitoring-indicator";
  indicator.innerHTML = "🔴"; // Red circle emoji, or you can use CSS for a custom circle
  indicator.style.cssText = `
    position: absolute;
    width: 12px;
    height: 12px;
    background-color: #ff4444;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    flex-shrink: 0;
    display: none;
    font-size: 8px;
    line-height: 8px;
    align-self: center;
    `;

  return indicator;
}

// Function to show monitoring indicator next to an element
function showMonitoringIndicator(element) {
  if (!element) return;

  const indicator = createMonitoringIndicator();

  // element.appendChild(indicator);
  // wrapper.appendChild(element);
  // wrapper.insertBefore(indicator, wrapper.firstChild);

  // Position the indicator to the right of the element
  // indicator.style.left = rect.right + scrollLeft + 5 + "px";
  // indicator.style.top = rect.top + scrollTop + (rect.height - 12) / 2 + "px";
  // indicator.style.display = "block";

  // Add a subtle animation
  // indicator.style.animation = "aiska-pulse 1.5s ease-in-out infinite";

  // Add CSS animation if not already added
  if (!document.getElementById("aiska-indicator-styles")) {
    const style = document.createElement("style");
    style.id = "aiska-indicator-styles";
    style.textContent = `
      @keyframes aiska-pulse {
        0% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 0.6; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Function to hide monitoring indicator
function hideMonitoringIndicator() {
  if (monitoringIndicator) {
    monitoringIndicator.style.display = "none";
    monitoringIndicator.style.animation = "none";
  }
}

// Function to update indicator position (useful for scrolling or resizing)
function updateIndicatorPosition() {
  if (currentlyMonitoredElement && monitoringIndicator) {
    showMonitoringIndicator(currentlyMonitoredElement);
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

  // Listen for scroll and resize events to update indicator position
  window.addEventListener("scroll", updateIndicatorPosition);
  window.addEventListener("resize", updateIndicatorPosition);
}

// Function to stop monitoring
function stopMonitoring() {
  if (currentlyMonitoredElement) {
    currentlyMonitoredElement.removeAttribute("data-aiska-monitored");
    currentlyMonitoredElement = null;
  }

  hideMonitoringIndicator();

  // Remove event listeners
  window.removeEventListener("scroll", updateIndicatorPosition);
  window.removeEventListener("resize", updateIndicatorPosition);

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

// Listen for blur events to stop monitoring when user leaves the field
document.addEventListener("focusout", (event) => {
  // Small delay to check if focus moved to another editable element
  setTimeout(() => {
    const currentElement = getCurrentEditableElement();
    if (!currentElement || currentElement !== currentlyMonitoredElement) {
      stopMonitoring();
    }
  }, 100);
});

// Clean up when page unloads
window.addEventListener("beforeunload", () => {
  stopMonitoring();
  if (monitoringIndicator && monitoringIndicator.parentNode) {
    monitoringIndicator.parentNode.removeChild(monitoringIndicator);
  }
});
