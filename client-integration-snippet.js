// ---- Push Setup (add once to your main <script>) ----
async function ensureServiceWorkerAndPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push not supported in this browser.");
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    console.warn("Notification permission not granted.");
    return;
  }
  // Register SW
  await navigator.serviceWorker.register("sw.js");
  const reg = await navigator.serviceWorker.ready;

  // Get public VAPID key from server
  const { publicKey } = await (await fetch(SERVER_BASE + "/vapidPublicKey")).json();
  const key = urlBase64ToUint8Array(publicKey);

  // Subscribe
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key
  });

  // Send subscription with current user's email
  await fetch(SERVER_BASE + "/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userProfile.email, subscription })
  });
}

// Utility to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// ---- Sync local items to server whenever you save ----
const SERVER_BASE = "http://localhost:4000";

async function syncItemsToServer() {
  try {
    await fetch(SERVER_BASE + "/upsert-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userProfile.email, items: allItems })
    });
  } catch (e) {
    console.warn("Sync failed:", e);
  }
}

// Call once after renderProfile()/loadUserData()
ensureServiceWorkerAndPush();

// After saving user data, also sync
const _origSaveUserData = typeof saveUserData === "function" ? saveUserData : null;
window.saveUserData = function() {
  if (_origSaveUserData) _origSaveUserData();
  syncItemsToServer();
};
