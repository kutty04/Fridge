# FridgeMind Push Notifications Template

This provides a minimal Node.js server using **web-push** + **Service Worker** so your app can show notifications even when the browser tab is closed.

## What’s inside
- `server/index.js` — Express server with endpoints:
  - `GET /vapidPublicKey` — serve public key to client
  - `POST /subscribe` — save `{ email, subscription }`
  - `POST /upsert-items` — save `{ email, items[] }`
  - `POST /send-now` — manually trigger near-expiry push (for all or one user)
- JSON storage at `server/storage.json` (for demo)
- Scheduler at **9:00 and 18:00 Asia/Kolkata** (node-cron) to push near-expiry items
- `public/sw.js` — Service Worker
- `client-integration-snippet.js` — code to drop into your HTML

## Quick start
1) `cd server`
2) `npm install`
3) Generate VAPID keys:
   ```
   npm run keys
   ```
   Copy the two values into a new `.env` file based on `.env.example`.
4) `npm run start`
5) Serve your FridgeMind HTML (same origin as `sw.js`) and add:
   - `public/sw.js` to your web root
   - The contents of `client-integration-snippet.js` into your `<script>` block (adjust `SERVER_BASE` if needed)
6) Open the app, allow notifications, add some items, and wait for 9:00/18:00 — or call `POST /send-now` to test immediately.

## Notes
- This demo stores everything in a JSON file. For production, replace with a database.
- Service workers must be served from the same origin and path scope as your page.
- If testing via `file://`, service workers won’t register. Use a local server (e.g., `npx serve .`).
