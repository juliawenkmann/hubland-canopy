/*
 * Firebase sign-in and Firestore sync of tree records.
 * Every write goes through a localStorage outbox, so trees mapped without a
 * connection are kept and uploaded later. Trees found on this device that the
 * cloud has never seen are queued the same way, so nothing stays stranded.
 */
"use strict";

const CLOUD_BATCH_SIZE = 20;

function firebaseConfigIsReady() {
  const config = window.TREE_TRACKER_FIREBASE_CONFIG;
  return Boolean(window.firebase?.initializeApp && config?.apiKey && config?.projectId);
}

function setCloudStatus(state, badgeKey, messageKey, variables = {}, isError = false) {
  cloudStatus = { state, badgeKey, messageKey, variables, isError };
  renderCloudSyncUI();
}

function setIdleCloudStatus() {
  if (!cloudUser) {
    setCloudStatus(
      loadCloudOutbox().length ? "pending" : "online",
      "cloudViewOnly",
      loadCloudOutbox().length ? "cloudWriteNeedsLogin" : "cloudSignedOut",
    );
  } else {
    setCloudStatus("online", "cloudOnline", "cloudSignedIn", {
      email: cloudUser.email || "",
    });
  }
}

function renderCloudSyncUI() {
  const badge = document.getElementById("cloud-sync-badge");
  badge.dataset.state = cloudStatus.state;
  badge.textContent = t(cloudStatus.badgeKey, cloudStatus.variables);
  const message = document.getElementById("cloud-sync-message");
  message.textContent = t(cloudStatus.messageKey, cloudStatus.variables);
  message.classList.toggle("is-error", cloudStatus.isError);
  document.getElementById("cloud-auth-form").hidden = !cloudConfigured || Boolean(cloudUser);
  document.getElementById("cloud-sync-user").hidden = !cloudUser;
  document.getElementById("cloud-user-email").textContent = cloudUser?.email || "";
  renderAccountButton();
}

// Normalises a tree to the shape firebase/firestore.rules accepts, or null.
function prepareFeatureForCloud(feature) {
  const coordinates = feature?.geometry?.coordinates?.map(Number);
  if (
    feature?.type !== "Feature" ||
    feature.geometry.type !== "Point" ||
    coordinates?.length !== 2 ||
    !coordinates.every(Number.isFinite) ||
    !feature.properties?.id ||
    !pointInCampus(coordinates)
  ) {
    return null;
  }
  const properties = feature.properties;
  const now = new Date().toISOString();
  const text = (value, maxLength) => String(value || "").slice(0, maxLength);
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties: {
      ...properties,
      id: text(properties.id, 180),
      common_name: text(properties.common_name, 200),
      scientific_name: text(properties.scientific_name, 300),
      genus: text(properties.genus, 120),
      notes: text(properties.notes, 10000),
      photo_url: text(properties.photo_url, 2048),
      health: Object.hasOwn(HEALTH_COLORS, properties.health) ? properties.health : "good",
      review_status: properties.review_status === "reviewed" ? "reviewed" : "unreviewed",
      created_at: text(properties.created_at || now, 40),
      updated_at: text(properties.updated_at || now, 40),
    },
  };
}

function queueCloudOperations(type, features) {
  if (!cloudConfigured) return;
  const queuedAt = new Date().toISOString();
  const entries = features.map(prepareFeatureForCloud).filter(Boolean).map((feature) => ({
    operation_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    type,
    id: feature.properties.id,
    feature,
    queued_at: queuedAt,
    client_updated_at: queuedAt,
  }));
  if (!entries.length) return;
  const ids = new Set(entries.map((entry) => entry.id));
  persistCloudOutbox([...loadCloudOutbox().filter((entry) => !ids.has(entry.id)), ...entries]);
  if (cloudUser) flushCloudOutbox();
  else setIdleCloudStatus();
}

function queueCloudOperation(type, feature) {
  queueCloudOperations(type, [feature]);
}

function cloudDocumentData(entry) {
  const { Timestamp, FieldValue } = window.firebase.firestore;
  const clientDate = new Date(entry.client_updated_at || entry.queued_at);
  return {
    schema_version: 1,
    feature: entry.feature,
    deleted_at: entry.type === "delete" ? FieldValue.serverTimestamp() : null,
    client_updated_at: Timestamp.fromDate(
      Number.isNaN(clientDate.getTime()) || clientDate > new Date() ? new Date() : clientDate,
    ),
    updated_at: FieldValue.serverTimestamp(),
    updated_by: cloudUser.uid,
  };
}

// A write the rules rejected because the cloud already holds something newer.
async function cloudWriteIsStale(reference, entry) {
  try {
    const current = await reference.get();
    if (!current.exists) return false;
    const remote = current.data();
    return (
      Boolean(remote.deleted_at) ||
      (remote.client_updated_at?.toMillis?.() || 0) > Date.parse(entry.client_updated_at)
    );
  } catch {
    return false;
  }
}

// Returns "done", "conflict" or throws.
async function writeOutboxEntry(entry) {
  const reference = cloudDb.collection("trees").doc(entry.id);
  try {
    if (entry.type === "delete") await reference.update(cloudDocumentData(entry));
    else await reference.set(cloudDocumentData(entry));
    return "done";
  } catch (error) {
    if (entry.type === "delete" && error?.code === "not-found") return "done";
    if (error?.code === "permission-denied" && (await cloudWriteIsStale(reference, entry))) {
      return "conflict";
    }
    throw error;
  }
}

async function flushCloudOutboxNow() {
  let conflicts = 0;
  try {
    while (cloudUser && loadCloudOutbox().length) {
      setCloudStatus("pending", "cloudPending", "cloudWorking");
      const batch = loadCloudOutbox().slice(0, CLOUD_BATCH_SIZE);
      const results = await Promise.all(batch.map(writeOutboxEntry));
      conflicts += results.filter((result) => result === "conflict").length;
      const written = new Set(batch.map((entry) => entry.operation_id));
      persistCloudOutbox(loadCloudOutbox().filter((entry) => !written.has(entry.operation_id)));
    }
  } catch (error) {
    console.error("Cloud sync write failed:", error);
    const messageKey = error?.code === "permission-denied" ? "cloudNotEditor" : "cloudReadFailed";
    setCloudStatus("error", "cloudError", messageKey, {}, true);
    return false;
  }
  if (conflicts) {
    setCloudStatus("error", "cloudError", "cloudConflict", { count: conflicts, uploaded: 0 }, true);
  } else {
    setIdleCloudStatus();
  }
  return true;
}

function flushCloudOutbox() {
  if (!cloudConfigured || !cloudDb || !cloudUser) return Promise.resolve(false);
  cloudFlushPromise ||= flushCloudOutboxNow().finally(() => {
    cloudFlushPromise = null;
  });
  return cloudFlushPromise;
}

function applyCloudSnapshot(snapshot) {
  const cloudTrees = new Map();
  const deletedIds = new Set();
  snapshot.forEach((documentSnapshot) => {
    const data = documentSnapshot.data();
    if (data.deleted_at) {
      deletedIds.add(documentSnapshot.id);
      return;
    }
    const feature = prepareFeatureForCloud(data.feature);
    if (feature) cloudTrees.set(documentSnapshot.id, feature);
  });
  const localOnly = annotationData.features.filter(
    (feature) => !cloudTrees.has(feature.properties.id) && !deletedIds.has(feature.properties.id),
  );
  annotationData = { ...annotationData, features: [...cloudTrees.values(), ...localOnly] };
  persistAnnotations();
  if (map) syncAnnotationSource();

  // Only a server snapshot proves the cloud is missing these trees.
  if (!snapshot.metadata.fromCache) {
    const queued = new Set(loadCloudOutbox().map((entry) => entry.id));
    queueCloudOperations(
      "upsert",
      localOnly.filter((feature) => !queued.has(feature.properties.id)),
    );
  }
  if (snapshot.metadata.hasPendingWrites || cloudFlushPromise) {
    setCloudStatus("pending", "cloudPending", "cloudWorking");
  } else if (cloudStatus.state === "pending") {
    setIdleCloudStatus(); // leave results such as "Imported 592" or errors in place
  }
}

async function initialiseCloudSync() {
  cloudConfigured = firebaseConfigIsReady();
  if (!cloudConfigured) {
    setCloudStatus("offline", "cloudLocalOnly", "cloudNotConfigured");
    return;
  }
  try {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(window.TREE_TRACKER_FIREBASE_CONFIG);
    }
    cloudAuth = window.firebase.auth();
    cloudDb = window.firebase.firestore();
    if (window.TREE_TRACKER_USE_FIREBASE_EMULATORS) {
      cloudAuth.useEmulator("http://127.0.0.1:9099", { disableWarnings: true });
      cloudDb.useEmulator("127.0.0.1", 8080);
    }
    await cloudDb.enablePersistence({ synchronizeTabs: true }).catch((error) => {
      if (!["failed-precondition", "unimplemented"].includes(error?.code)) {
        console.warn("Firestore persistence unavailable:", error);
      }
    });

    cloudAuth.onAuthStateChanged((user) => {
      cloudUser = user || null;
      setIdleCloudStatus();
      if (cloudUser) flushCloudOutbox();
    });

    // Wait (briefly) for the first snapshot so the map opens with the trees.
    await new Promise((resolve) => {
      cloudDb.collection("trees").onSnapshot(
        { includeMetadataChanges: true },
        (snapshot) => {
          applyCloudSnapshot(snapshot);
          resolve();
        },
        (error) => {
          console.error("Cloud sync read failed:", error);
          setCloudStatus("error", "cloudError", "cloudReadFailed", {}, true);
          resolve();
        },
      );
      window.setTimeout(resolve, 5000);
    });
  } catch (error) {
    console.error("Could not initialize Firebase:", error);
    setCloudStatus("error", "cloudError", "cloudReadFailed", {}, true);
  }
}

async function importCloudGeoJson(file) {
  if (!cloudUser || !file) return;
  let features;
  try {
    const collection = JSON.parse(await file.text());
    features = (collection?.features || []).map(prepareFeatureForCloud).filter(Boolean);
    if (!features.length) throw new Error("No valid tree features");
  } catch (error) {
    console.error("GeoJSON import failed:", error);
    setAnnotationStatus("cloudImportInvalid", {}, true);
    return;
  }
  const imported = new Map(features.map((feature) => [feature.properties.id, feature]));
  annotationData = {
    ...annotationData,
    features: [
      ...annotationData.features.filter((feature) => !imported.has(feature.properties.id)),
      ...imported.values(),
    ],
  };
  persistAnnotations();
  syncAnnotationSource();
  setAnnotationStatus("cloudWorking");
  queueCloudOperations("upsert", features);
  if ((await flushCloudOutbox()) && !loadCloudOutbox().length) {
    setAnnotationStatus("cloudImportComplete", { count: integerFormatter.format(features.length) });
  } else {
    setAnnotationStatus(cloudStatus.messageKey, cloudStatus.variables, true);
  }
}
