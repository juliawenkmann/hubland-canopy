/*
 * The lock button in the top bar and its panel: sign in once per device,
 * see whether trees are saved, import a GeoJSON file or sign out.
 */
"use strict";

function accountPanelIsOpen() {
  return !document.getElementById("account-panel").hidden;
}

function setAccountPanelOpen(open) {
  const panel = document.getElementById("account-panel");
  panel.hidden = !open;
  document
    .getElementById("account-toggle")
    .setAttribute("aria-expanded", String(open));
  // On phones, don't pop the keyboard up before the person has read the panel.
  if (open && !cloudUser && window.matchMedia("(pointer: fine)").matches) {
    document.getElementById("cloud-email").focus({ preventScroll: true });
  }
}

// Editing needs an account; point to the lock instead of failing silently.
function requireSignIn() {
  if (!cloudConfigured || cloudUser) return false;
  setCloudStatus("online", "cloudViewOnly", "cloudSignedOut");
  setAccountPanelOpen(true);
  return true;
}

function renderAccountButton() {
  const toggle = document.getElementById("account-toggle");
  if (!toggle) return;
  toggle.hidden = !cloudConfigured;
  toggle.dataset.state = cloudStatus.state;
  toggle.dataset.signedIn = String(Boolean(cloudUser));
  toggle.title = t(cloudStatus.badgeKey, cloudStatus.variables);
}
