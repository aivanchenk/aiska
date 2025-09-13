// === Intercept form submissions (user-initiated and programmatic) ===

// One-shot allowlist for overridden submits
const sdgAllowOnce = new WeakSet();

document.addEventListener(
  "submit",
  function onSubmit(event) {
    const form = event.target;
    if (!form || form.tagName !== "FORM") return;

    // If we're in "override" mode for this form, let it through once.
    if (sdgAllowOnce.has(form)) {
      sdgAllowOnce.delete(form);
      return; // don't preventDefault; allow normal submission
    }

    // Gather values to scan
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
      event.preventDefault();

      console.warn(
        "SensitiveDataGuard: blocked form submission with findings:",
        findings
      );

      showWarningBanner(findings, () => {
        console.warn("SensitiveDataGuard: user chose to override and send.");
        // Allow exactly one subsequent submit to proceed.
        sdgAllowOnce.add(form);

        // Prefer requestSubmit (validates + fires submit like a real click).
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          // Fallback: programmatic submit (note: doesn't validate or fire submit by spec).
          form.submit();
        }
      });
    }
  },
  true // capture phase
);

// === Sensitive data detection ===
function detectSensitiveData(text, settings = {}) {
  const opts = {
    warnEmail: true,
    warnPhone: true,
    warnCard: true,
    warnIBAN: true,
    warnKeys: true,
    ...settings,
  };

  const findings = new Set();
  if (!text || typeof text !== "string") return [];

  // Email
  if (opts.warnEmail) {
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    if (emailRegex.test(text)) findings.add("email");
  }

  // Phone number
  if (opts.warnPhone) {
    const phoneRegex =
      /(?:\+?\d{1,3}[\s-]?)?(?:\(\d{1,4}\)|\d{1,4})[\s-]?\d{3,4}[\s-]?\d{3,4}/;
    if (phoneRegex.test(text)) findings.add("phone");
  }

  // Credit card using Luhn check
  if (opts.warnCard) {
    const ccRegex = /\b(?:\d[ -]*?){13,19}\b/g;
    const matches = text.match(ccRegex);
    if (matches) {
      for (const num of matches) {
        const normalized = num.replace(/[ -]/g, "");
        if (luhnCheck && luhnCheck(normalized)) {
          findings.add("creditCard");
          break;
        }
      }
    }
  }

  // IBAN numbers with mod-97 validation
  if (opts.warnIBAN) {
    const ibanRegex = /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b/g;
    const matches = text.match(ibanRegex);
    if (matches) {
      for (const candidate of matches) {
        if (isValidIBAN(candidate)) {
          findings.add("iban");
          break;
        }
      }
    }
  }

  // API keys or PEM blocks
  if (opts.warnKeys) {
    const apiKeyRegex =
      /(?:api[-_]?(?:key|secret)|x-api-key|access[-_]?token)\s*[=:\s]+[A-Za-z0-9-_]{16,}/i;
    const bearerRegex = /Bearer\s+[A-Za-z0-9-_]{20,}/i;
    const pemRegex = /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/;
    if (apiKeyRegex.test(text) || bearerRegex.test(text))
      findings.add("apiKey");
    if (pemRegex.test(text)) findings.add("pem");
  }

  return Array.from(findings);
}

function isValidIBAN(str) {
  const iban = str.replace(/\s+/g, "").toUpperCase();
  if (iban.length < 15 || iban.length > 34) return false;
  if (!/^[A-Z0-9]+$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let expanded = "";
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    expanded += code >= 65 && code <= 90 ? String(code - 55) : ch;
  }
  let remainder = 0;
  for (const digit of expanded) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }
  return remainder === 1;
}
