/*
 * The lock button in the top bar and its panel: sign in or create an account
 * (once per device), see whether trees are saved, import a GeoJSON file or sign out.
 */
"use strict";

// Firebase error codes → the message shown in the panel.
const AUTH_ERROR_KEYS = {
  "auth/invalid-credential": "cloudSignInFailed",
  "auth/wrong-password": "cloudSignInFailed",
  "auth/user-not-found": "cloudSignInFailed",
  "auth/invalid-email": "cloudResetEmailRequired",
  "auth/email-already-in-use": "cloudEmailInUse",
  "auth/weak-password": "cloudWeakPassword",
  "auth/too-many-requests": "cloudTooManyAttempts",
  "auth/operation-not-allowed": "cloudSignupDisabled",
  "auth/admin-restricted-operation": "cloudSignupDisabled",
};

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

// The form's values, or null (after showing what's missing) if they're invalid.
function accountFormValues({ needsPassword = true } = {}) {
  const { email, password } = document.getElementById("cloud-auth-form").elements;
  email.value = email.value.trim();
  const invalid = [email, ...(needsPassword ? [password] : [])].find(
    (field) => !field.checkValidity(),
  );
  if (invalid) {
    invalid.reportValidity();
    return null;
  }
  return { email: email.value, password: password.value };
}

async function runAccountAction(action, fallbackKey) {
  if (!cloudAuth) return;
  const buttons = document.querySelectorAll("#cloud-auth-form button");
  buttons.forEach((button) => (button.disabled = true));
  setCloudStatus("pending", "cloudPending", "cloudWorking");
  try {
    await action();
  } catch (error) {
    console.warn("Account action failed:", error?.code || error);
    setCloudStatus("error", "cloudError", AUTH_ERROR_KEYS[error?.code] || fallbackKey, {}, true);
  } finally {
    buttons.forEach((button) => (button.disabled = false));
  }
}

function signIn() {
  const values = accountFormValues();
  if (!values) return;
  runAccountAction(async () => {
    await cloudAuth.signInWithEmailAndPassword(values.email, values.password);
    document.getElementById("cloud-auth-form").reset();
    setAccountPanelOpen(false);
  }, "cloudSignInFailed");
}

function createAccount() {
  const values = accountFormValues();
  if (!values) return;
  runAccountAction(async () => {
    await cloudAuth.createUserWithEmailAndPassword(values.email, values.password);
    document.getElementById("cloud-auth-form").reset();
    setAccountPanelOpen(false);
  }, "cloudCreateFailed");
}

function sendPasswordReset() {
  const values = accountFormValues({ needsPassword: false });
  if (!values) return;
  runAccountAction(async () => {
    cloudAuth.languageCode = currentLanguage;
    await cloudAuth.sendPasswordResetEmail(values.email);
    setCloudStatus("online", "cloudViewOnly", "cloudResetSent");
  }, "cloudResetFailed");
}
