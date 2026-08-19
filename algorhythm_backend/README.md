# Algorhythm — Backend

Taste-driven fashion discovery engine. Local dev server.

---

## Stack

- **Node.js** (v18+) + Express
- **eBay Browse API** — primary resale data source
- **Supabase** — auth + user profiles (coming next)

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
cd server
cp .env.example .env
# Open .env and paste your eBay credentials
```

### 4. Install dependencies
```bash
cd server
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

# Test feed with default profile
curl -X POST http://localhost:3001/api/feed \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/health` | Server status + config check |
| GET    | `/api/ebay/search?q=...` | Raw eBay search, normalized |
| GET    | `/api/ebay/item/:id` | Single item detail |
| POST   | `/api/feed` | Ranked feed for a taste profile |
| POST   | `/api/feed/swipe` | Record swipe, update profile |
| GET    | `/api/profile/:sessionId` | Get user profile |
| PUT    | `/api/profile/:sessionId` | Save user profile |
| POST   | `/api/profile/:sessionId/onboard` | Run L1 onboarding |
| DELETE | `/api/profile/:sessionId` | Reset profile |

---

## File Structure

```
server/
├── index.js              # Express app entry point
├── .env.example          # Env template — copy to .env
├── package.json
├── routes/
│   ├── ebay.js           # eBay API endpoints
│   ├── feed.js           # Feed aggregation + ranking
│   └── profile.js        # Taste profile management
├── services/
│   └── ebayService.js    # eBay OAuth + Browse API calls
├── utils/
│   ├── normalizer.js     # Converts any source → standard schema
│   └── tasteScorer.js    # Taste match scoring engine
└── data/
    └── brands.js         # Brand registry + aesthetic mappings
```

---

## Next Steps (in order)

- [ ] Get eBay credentials, test live search
- [ ] Add Supabase for persistent profiles + auth
- [ ] Wire frontend (React) to this backend
- [ ] Add Yahoo Japan API
- [ ] Add SSENSE affiliate feed
- [ ] Build onboarding swipe flow
