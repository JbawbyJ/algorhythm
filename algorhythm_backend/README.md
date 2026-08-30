# Algorhythm — Backend

Taste-driven fashion discovery engine. Local dev server.

---

## Stack

- **Node.js** (v18+) + Express
- **eBay Browse API** — primary resale data source (`EBAY_ENV=PRODUCTION` for live)
- **Luke’s** — optional Shopify `products.json` when `LUKES_ENABLED=true`
- **Profiles** — JSON file store (swap for Supabase later)

---

## Setup

### 1. Install Node.js (if you don't have it)
Download from https://nodejs.org — get the LTS version.

### 2. Get eBay API credentials
1. Go to https://developer.ebay.com
2. Sign in / create account
3. Go to "My Account" → "Application Keysets"
4. Create a new keyset → choose **Sandbox** first
5. Copy your **Client ID** and **Client Secret**

### 3. Configure environment
```bash
cd algorhythm_backend
cp .env.example .env
# Open .env and paste your eBay credentials (optional for local catalog)
```

### 4. Install dependencies
```bash
cd algorhythm_backend
npm install
```

### 5. Run the server
```bash
npm run dev
```

Server starts at **http://localhost:3001**

---

## Verify it's working

```bash
# Health check
curl http://localhost:3001/health

# Test eBay search (once credentials are set)
curl "http://localhost:3001/api/ebay/search?q=Acronym+jacket&limit=5"

# Ranked feed (live sources first; local catalog only if none configured or ALGORHYTHM_ALLOW_LOCAL=1)
curl -X POST http://localhost:3001/api/feed \
  -H "Content-Type: application/json" \
  -d '{"profile":{"aesthetics":["Gorpcore"],"priceRange":{"min":0,"max":500},"mode":"both"}}'
```

### Live-first env

| Variable | Role |
|----------|------|
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | Browse API. Set `EBAY_ENV=PRODUCTION` for `api.ebay.com` (not sandbox). |
| `LUKES_ENABLED` | Official Luke’s `collections/all/products.json` |
| `BROWSER_WORKER_URL` | Optional Harness worker for remaining HTML sources |
| `ALGORHYTHM_ALLOW_LOCAL` | `1` keeps the local catalog even when a live source is configured |
| `ALGORHYTHM_PROFILE_PATH` | JSON profile store (default `data/profiles.json`, gitignored) |

No live key → local catalog fallback. Source failures are isolated; one adapter cannot fail the feed.

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/health` | Server status + config check |
| GET    | `/api/ebay/search?q=...` | Raw eBay search, normalized |
| GET    | `/api/ebay/item/:id` | Single item detail |
| POST   | `/api/feed` | Ranked feed for a taste profile |
| POST   | `/api/feed/swipe` | Record swipe, update profile |
| POST   | `/api/compare` | Compare a listing against the catalog |
| POST   | `/api/compare/search` | Compare by free-text query |
| GET    | `/api/profile/:sessionId` | Get user profile |
| PUT    | `/api/profile/:sessionId` | Save user profile |
| POST   | `/api/profile/:sessionId/onboard` | Run L1 onboarding |
| DELETE | `/api/profile/:sessionId` | Reset profile |

---

## File Structure

```
algorhythm_backend/
├── index.js              # Express app entry point
├── .env.example          # Env template — copy to .env
├── package.json
├── routes/
│   ├── ebay.js           # eBay API endpoints (+ local fallback)
│   ├── feed.js           # Feed aggregation + ranking
│   ├── compare.js        # Price compare
│   └── profile.js        # Taste profile management
├── services/
│   ├── ebayService.js    # eBay OAuth + Browse API (SANDBOX | PRODUCTION)
│   ├── lukesService.js   # Luke’s products.json
│   ├── profileStore.js   # JSON profile persistence
│   └── sourceBroker.js   # live-first source selection
├── utils/
│   ├── normalizer.js     # Converts any source → standard schema
│   ├── tasteScorer.js    # Taste match scoring engine
│   └── priceCompare.js   # Compare grouping + deal score
└── data/
    ├── brands.js         # Brand registry + aesthetic mappings
    └── localCatalog.js   # Offline listings for the local core loop
```

---

## Next Steps (in order)

- [x] Persist taste profiles to a local JSON store
- [ ] Get eBay **Production** credentials (`EBAY_ENV=PRODUCTION`) and set `LUKES_ENABLED=true`
- [ ] Add Supabase for auth (file store already persists profiles)
- [ ] Add Yahoo Japan API
- [ ] Add SSENSE affiliate feed
