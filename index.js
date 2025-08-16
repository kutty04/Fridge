import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import webpush from "web-push";
import cron from "node-cron";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---- Storage (simple JSON file for demo) ----
const DB_PATH = path.join(__dirname, "storage.json");
function loadDB() {
  if (!fs.existsSync(DB_PATH)) return { users: {} };
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8") || "{\"users\":{}}");
}
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---- VAPID keys ----
const PUBLIC_VAPID_KEY = process.env.PUBLIC_VAPID_KEY;
const PRIVATE_VAPID_KEY = process.env.PRIVATE_VAPID_KEY;
if (!PUBLIC_VAPID_KEY || !PRIVATE_VAPID_KEY) {
  console.warn("⚠️  Missing VAPID keys. Run `npm run keys` and set .env before starting.");
}
webpush.setVapidDetails("mailto:you@example.com", PUBLIC_VAPID_KEY || "missing", PRIVATE_VAPID_KEY || "missing");

// Serve public key to client
app.get("/vapidPublicKey", (req, res) => {
  res.json({ publicKey: PUBLIC_VAPID_KEY });
});

// ---- Subscribe endpoint ----
app.post("/subscribe", (req, res) => {
  const { email, subscription } = req.body || {};
  if (!email || !subscription) return res.status(400).json({ error: "email and subscription required" });
  const db = loadDB();
  db.users[email] = db.users[email] || { items: [], subscription: null };
  db.users[email].subscription = subscription;
  saveDB(db);
  res.json({ ok: true });
});
  app.post("/notify", async (req, res) => {
  const { email, title, body } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });

  const db = loadDB();
  const user = db.users[email];
  if (!user || !user.subscription) {
    return res.status(404).json({ error: "No subscription found for this email" });
  }

  const payload = JSON.stringify({ title, body });

  try {
    await webpush.sendNotification(user.subscription, payload);
    res.json({ ok: true });
  } catch (err) {
    console.error("Push error:", err);
    res.status(500).json({ error: "Failed to send notification" });
  }
});



// ---- Upsert items for a user ----
app.post("/upsert-items", (req, res) => {
  const { email, items } = req.body || {};
  if (!email || !Array.isArray(items)) return res.status(400).json({ error: "email and items[] required" });
  const db = loadDB();
  db.users[email] = db.users[email] || { items: [], subscription: null };
  db.users[email].items = items;
  saveDB(db);
  res.json({ ok: true });
});

// ---- Send now (manual trigger) ----
app.post("/send-now", async (req, res) => {
  const { email } = req.body || {};
  const db = loadDB();
  try {
    if (email) {
      const user = db.users[email];
      if (!user || !user.subscription) return res.status(404).json({ error: "user or subscription not found" });
      const count = await sendNearExpiryForUser(email, user);
      return res.json({ ok: true, sent: count });
    } else {
      let total = 0;
      for (const [em, user] of Object.entries(db.users)) {
        total += await sendNearExpiryForUser(em, user);
      }
      return res.json({ ok: true, sent: total });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "send failed" });
  }
});

// ---- Utility: days until ----
function daysUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = Math.ceil((target - now) / (1000*60*60*24));
  return diff;
}

// ---- Push sender ----
async function sendNearExpiryForUser(email, user) {
  if (!user || !user.subscription) return 0;
  const items = (user.items || []).filter(i => !i.deleted && typeof i.expiry === "string");
  const nearExp = items.filter(i => daysUntil(i.expiry) <= 3);
  let sent = 0;
  for (const i of nearExp) {
    const payload = JSON.stringify({ title: "FridgeMind", body: `⚠️ ${i.name} is near expiry (${i.expiry})` });
    try {
      await webpush.sendNotification(user.subscription, payload);
      sent++;
    } catch (err) {
      console.warn(`Push failed for ${email}:`, err.statusCode, err.body || err.message);
    }
  }
  return sent;
}

// ---- Scheduler: 9:00 and 18:00 Asia/Kolkata ----
cron.schedule("0 9,18 * * *", async () => {
  console.log("⏰ Running scheduled push (Asia/Kolkata)");
  const db = loadDB();
  for (const [email, user] of Object.entries(db.users)) {
    await sendNearExpiryForUser(email, user);
  }
}, { timezone: "Asia/Kolkata" });

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Push server running on http://localhost:${PORT}`);
});
