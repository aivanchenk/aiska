// == Sensitive Data Guard: options.js ==
const defaultSettings = {
  warnEmail: true,
  warnPhone: true,
  warnCard: true,
  warnIBAN: true,
  warnKeys: true,
  excludeDomains: "",
};

function saveOptions() {
  const settings = {
    warnEmail: document.getElementById("optEmail").checked,
    warnPhone: document.getElementById("optPhone").checked,
    warnCard: document.getElementById("optCard").checked,
    warnIBAN: document.getElementById("optIBAN").checked,
    warnKeys: document.getElementById("optKeys").checked,
    excludeDomains: document.getElementById("optExclude").value.trim(),
  };
  chrome.storage.sync.set(settings, () => {
    const status = document.getElementById("statusMsg");
    status.textContent = "Options saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 2000);
  });
}

function restoreOptions() {
  chrome.storage.sync.get(defaultSettings, (settings) => {
    document.getElementById("optEmail").checked = settings.warnEmail;
    document.getElementById("optPhone").checked = settings.warnPhone;
    document.getElementById("optCard").checked = settings.warnCard;
    document.getElementById("optIBAN").checked = settings.warnIBAN;
    document.getElementById("optKeys").checked = settings.warnKeys;
    document.getElementById("optExclude").value = settings.excludeDomains;
  });
}

document.getElementById("saveBtn").addEventListener("click", saveOptions);
document.addEventListener("DOMContentLoaded", restoreOptions);
