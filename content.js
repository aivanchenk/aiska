// == Sensitive Data Guard: content.js ==

// Detection regex patterns and helpers
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const phoneRegex = /\b\+?\d[\d\s\-\.]{8,}\d\b/; // sequences of >=10 digits (optionally with +, spaces, - or .)
const ibanRegex = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/; // IBAN pattern: 2 letters, 2 digits, 10-30 alphanumeric
const awsKeyPattern = "AWS_SECRET_ACCESS_KEY";
const privateKeyPattern = "-----BEGIN PRIVATE KEY-----";

// Utility: Luhn checksum for credit card (function provided by utils/luhn.js)
function isLikelyCreditCard(numberStr) {
  // Remove non-digits and check length
  const digits = numberStr.replace(/\D/g, "");
  if (digits.length < 13) return false; // credit cards typically 13-19 digits
  return luhnCheck(digits); // luhnCheck is defined in luhn.js
}

// Utility: IBAN checksum (mod-97-10)
function isValidIBAN(iban) {
  // Remove spaces and to upper-case
  const cleaned = iban.replace(/\s+/g, "").toUpperCase();
  if (!ibanRegex.test(cleaned)) return false;
  // Move first four chars to end and replace letters with numbers (A=10, ..., Z=35)
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numericStr = rearranged.replace(/[A-Z]/g, (ch) =>
    (ch.charCodeAt(0) - 55).toString()
  );
  // Compute mod-97 on the large number by doing it in chunks to avoid overflow
  let remainder = 0;
  for (let i = 0; i < numericStr.length; i++) {
    // For each digit, incorporate it into the remainder calculation
    const digit = parseInt(numericStr.charAt(i), 10);
    if (isNaN(digit)) return false;
    remainder = (remainder * 10 + digit) % 97;
  }
  return remainder === 1; // Per IBAN spec, valid IBAN yields remainder 1:contentReference[oaicite:7]{index=7}
}

// Function to scan a string for any sensitive data patterns. Returns an array of findings.
function detectSensitiveData(text) {
  const findings = [];
  // Check patterns in priority order
  if (emailRegex.test(text)) {
    findings.push({ type: "Email address", value: text.match(emailRegex)[0] });
  }
  if (phoneRegex.test(text)) {
    findings.push({ type: "Phone number", value: text.match(phoneRegex)[0] });
  }
  // Credit card: find any digit sequence that looks like a card
  const ccMatch = text.match(/\b\d[\d\s\-]{11,}\d\b/);
  if (ccMatch) {
    const ccNumber = ccMatch[0];
    if (isLikelyCreditCard(ccNumber)) {
      findings.push({ type: "Credit Card", value: ccNumber });
    }
  }
  // IBAN: check pattern then checksum
  const ibanMatch = text.match(ibanRegex);
  if (ibanMatch) {
    const ibanCandidate = ibanMatch[0];
    if (isValidIBAN(ibanCandidate)) {
      findings.push({ type: "IBAN", value: ibanCandidate });
    }
  }
  // Secrets: look for key strings
  if (text.includes(awsKeyPattern) || text.includes("AWS_ACCESS_KEY_ID")) {
    findings.push({
      type: "AWS Secret Key",
      value: "(potential AWS credential)",
    });
  }
  if (text.includes(privateKeyPattern)) {
    findings.push({
      type: "Private Key",
      value: "(potential private key text)",
    });
  }
  return findings;
}

// Banner UI injection and removal
function showWarningBanner(findings, onOverride) {
  // If banner already exists, remove it (to replace with new)
  const existing = document.getElementById("sdg-banner");
  if (existing) existing.remove();

  // Compose warning message and masked details
  const types = findings.map((f) => f.type).join(", ");
  let detailsList = findings
    .map((f) => {
      let val = f.value;
      // Mask value for privacy: show only first and last 4 chars for context if it's long
      if (val.length > 8) {
        val = val.substring(0, 4) + "..." + val.slice(-4);
      }
      return `${f.type}: ${val}`;
    })
    .join("; ");

  // Create banner container
  const banner = document.createElement("div");
  banner.id = "sdg-banner";
  banner.className = "sdg-banner";
  banner.setAttribute("role", "alert");
  banner.innerHTML = `
        <strong>⚠ Sensitive data detected!</strong>
        <span class="sdg-details">${types} found.</span>
        <button id="sdg-send">Send Anyway</button>
        <button id="sdg-cancel">Cancel</button>
    `;
  document.body.appendChild(banner);

  // Focus the "Send Anyway" button for accessibility
  document.getElementById("sdg-send").focus();

  // Hook up button events
  document.getElementById("sdg-cancel").onclick = () => {
    banner.remove();
    // Submission remains prevented (user cancelled)
  };
  document.getElementById("sdg-send").onclick = () => {
    banner.remove();
    onOverride(); // call the saved original submission action
  };
}

// Intercept form submissions (user-initiated via submit button or Enter key)
document.addEventListener(
  "submit",
  function (event) {
    const form = event.target;
    if (!form || form.tagName !== "FORM") return;
    // Perform detection on all relevant form fields
    let combinedText = "";
    const inputs = form.querySelectorAll("input, textarea");
    inputs.forEach((input) => {
      if (
        input.type === "password" ||
        input.type === "hidden" ||
        input.disabled
      )
        return;
      if (input.value) combinedText += input.value + "\n";
    });
    const findings = detectSensitiveData(combinedText);
    if (findings.length > 0) {
      // Prevent the form from submitting
      event.preventDefault();
      console.warn(
        "SensitiveDataGuard: blocked form submission with findings:",
        findings
      );
      // Show banner with details; on override, submit the form for real
      showWarningBanner(findings, () => {
        console.warn("SensitiveDataGuard: user chose to override and send.");
        // Remove our submit event listener to avoid re-triggering detection on programmatic submit
        form.removeEventListener("submit", this, true);
        // Submit the form via the original method (bypass our override)
        form.__originalSubmit();
      });
    }
  },
  true
); // useCapture=true to catch event before page handlers

// Override programmatic form submissions by injecting a script into page context
(function overrideFormSubmit() {
  const scriptContent = `
        (function() {
            const origSubmit = HTMLFormElement.prototype.submit;
            HTMLFormElement.prototype.submit = function() {
                // Dispatch a submit event (allows extension content script to detect it)
                const event = new Event('submit', { bubbles: true, cancelable: true });
                this.dispatchEvent(event);
                if (!event.defaultPrevented) {
                    // If extension did NOT prevent it, call the original submit
                    origSubmit.apply(this);
                }
            };
        })();
    `;
  const injScript = document.createElement("script");
  injScript.textContent = scriptContent;
  document.documentElement.appendChild(injScript);
  injScript.remove();
})();

// Special handling for chat applications (e.g., ChatGPT)
if (window.location.host === "chat.openai.com") {
  const chatBox = document.querySelector("textarea#prompt-textarea");
  if (chatBox) {
    chatBox.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        // Enter pressed in chat box
        const message = chatBox.value || "";
        const findings = detectSensitiveData(message);
        if (findings.length > 0) {
          e.preventDefault();
          console.warn(
            "SensitiveDataGuard: blocked chat message with findings:",
            findings
          );
          showWarningBanner(findings, () => {
            console.warn("SensitiveDataGuard: override sending chat message.");
            // Trigger the actual send (simulate Enter key or click send button)
            const sendButton = document.querySelector("button[class*='send']");
            if (sendButton) {
              sendButton.click();
            } else {
              // Fallback: dispatch an Enter key event with no prevention
              chatBox.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
              );
            }
          });
        }
      }
    });
  }
}
