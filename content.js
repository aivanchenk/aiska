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

// === Remove the old inline injector ===
// DELETE the entire (function overrideFormSubmit(){ ... })() block you had before.
// The page-context prototype patch now comes from your service worker via
// chrome.scripting.executeScript({ world: "MAIN", files: ["injected-submit-hook.js"] }).
