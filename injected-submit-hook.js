// injected-submit-hook.js
(() => {
  const orig = HTMLFormElement.prototype.submit;
  if (!orig || orig.__sdg_patched) return;

  const patched = function () {
    const ev = new Event("submit", { bubbles: true, cancelable: true });
    this.dispatchEvent(ev);
    if (!ev.defaultPrevented) {
      return orig.apply(this, arguments);
    }
  };

  Object.defineProperty(patched, "__sdg_patched", { value: true });
  HTMLFormElement.prototype.submit = patched;
})();
