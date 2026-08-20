# Algorhythm

Taste-driven fashion discovery. Onboard a profile, get a ranked feed, compare prices.

The client talks to the Express API through the Vite `/api` proxy. A local listing catalog is included so the core loop works without live eBay credentials.

## Run locally

You need **Node.js 18+**. Use two terminals.

### 1. Backend — http://localhost:3001

```bash
cd algorhythm_backend
cp .env.example .env   # optional: add eBay keys later
npm install
npm run dev
```

Check: `curl http://localhost:3001/health`

### 2. Client — http://localhost:3000

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:3000**

## Core flow to exercise

1. Pick aesthetics + a budget on `/onboard`
2. Like / pass a few calibration listings (or skip)
3. Confirm `/feed` is ranked for that profile (match % on each card)
4. Click **⇄** on a card, or search on `/compare`
5. Open `/profile` to see liked brands and aesthetics

Without eBay keys the feed and compare use the local catalog (same listing schema as live sources). When `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` are set, eBay results are merged in.
