# ♟ MKU Chess Tournament – Backend

Node.js + Express backend that triggers an M-Pesa STK Push when a player clicks **Deposit 100** on the registration page.

---

## Folder Structure

```
chess-backend/
├── server.js              ← Entry point
├── package.json
├── .env.example           ← Copy this to .env and fill in your keys
├── routes/
│   ├── stk.js             ← POST /api/stkpush  (triggers STK push)
│   └── callback.js        ← POST /api/callback (Safaricom posts result here)
│                             GET  /api/payments (admin view of registrations)
├── utils/
│   ├── auth.js            ← Gets Daraja OAuth token
│   └── storage.js         ← Reads/writes data/payments.json
├── data/
│   └── payments.json      ← Auto-created; stores all registrations
└── public/
    └── index.html         ← Drop your frontend here
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Open `.env` and fill in:
| Key | Where to find it |
|---|---|
| `CONSUMER_KEY` | Daraja portal → your app |
| `CONSUMER_SECRET` | Daraja portal → your app |
| `SHORTCODE` | Use `174379` for sandbox |
| `PASSKEY` | Use the sandbox passkey already in `.env.example` |
| `CALLBACK_URL` | Your ngrok URL (see step 3) |

### 3. Expose localhost with ngrok (required for callbacks)
Safaricom needs a public HTTPS URL to POST the payment result back to you.

```bash
# Install ngrok if you haven't: https://ngrok.com/download
ngrok http 3000
```
Copy the `https://xxxx.ngrok-free.app` URL and set it as:
```
CALLBACK_URL=https://xxxx.ngrok-free.app/api/callback
```

### 4. Place the frontend
```bash
cp path/to/index.html public/index.html
```

### 5. Start the server
```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

---

## API Endpoints

### `POST /api/stkpush`
Triggers the M-Pesa STK push to the player's phone.

**Request body:**
```json
{
  "name": "John Mwangi",
  "phone": "0712345678",
  "amount": 100
}
```
**Success response:**
```json
{
  "success": true,
  "message": "Success. Request accepted for processing",
  "checkoutRequestId": "ws_CO_..."
}
```

---

### `POST /api/callback`
Called automatically by Safaricom. Do not call this yourself.

---

### `GET /api/payments`
Admin endpoint — view all registrations.
```json
{
  "total": 5,
  "confirmed": 3,
  "pending": 1,
  "failed": 1,
  "players": [...]
}
```

---

## Sandbox Test Numbers
Use these Safaricom sandbox test credentials when prompted for a PIN:
- **Phone:** `254708374149`
- **PIN:** `any 6-digit number`

---

## Going Live (Production)
1. Change the Daraja URLs in `utils/auth.js` and `routes/stk.js` from `sandbox.safaricom.co.ke` → `api.safaricom.co.ke`
2. Replace sandbox `SHORTCODE` and `PASSKEY` with your production ones
3. Make sure `CALLBACK_URL` points to your real server (not ngrok)
# mku-chess
