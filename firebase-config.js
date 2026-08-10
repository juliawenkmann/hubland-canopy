/*
 * Public Firebase web configuration for Tree Tracker.
 * Firebase web keys identify the project; Firestore Security Rules protect writes.
 * Never place a service-account key or private credential in this file.
 */
const treeTrackerUsesLocalEmulators =
  ["127.0.0.1", "localhost"].includes(window.location.hostname) &&
  new URLSearchParams(window.location.search).get("firebase-emulator") === "1";

window.TREE_TRACKER_USE_FIREBASE_EMULATORS = treeTrackerUsesLocalEmulators;
window.TREE_TRACKER_FIREBASE_CONFIG = treeTrackerUsesLocalEmulators
  ? {
      apiKey: "demo-tree-tracker-key",
      authDomain: "tree-tracker-rules-test.firebaseapp.com",
      projectId: "tree-tracker-rules-test",
      storageBucket: "tree-tracker-rules-test.firebasestorage.app",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:tree-tracker-test",
    }
  : {
      apiKey: "REPLACE_WITH_FIREBASE_WEB_API_KEY",
      authDomain: "REPLACE_WITH_PROJECT_ID.firebaseapp.com",
      projectId: "REPLACE_WITH_PROJECT_ID",
      storageBucket: "REPLACE_WITH_PROJECT_ID.firebasestorage.app",
      messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
      appId: "REPLACE_WITH_FIREBASE_APP_ID",
    };
