# 🏔️ Kanoor Village Map

**Interactive full-stack web application for Kanoor Village, Sankoo, Kargil, Ladakh, India**

> Built by **Hakima Banoo** · hakimabanoo.jk.csrl@gmail.com

[![Frontend](https://img.shields.io/badge/Frontend-Leaflet.js-1a73e8)](https://leafletjs.com)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20+%20Express-339933)](https://expressjs.com)
[![Auth](https://img.shields.io/badge/Auth-JWT%20+%20bcrypt-orange)](#)
[![Tests](https://img.shields.io/badge/Tests-46%20passing-brightgreen)](#)
[![PWA](https://img.shields.io/badge/PWA-Installable-purple)](#)
[![Languages](https://img.shields.io/badge/Languages-EN%20%7C%20UR%20%7C%20HI%20%7C%20BO-blueviolet)](#)

---

## 🌍 Live Demo

- **Frontend:** https://kanoor-village-map.vercel.app
- **API Health:** https://kanoor-village-map-api.onrender.com/api/health

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🗺️ Interactive Map | Leaflet.js with Street, Satellite, Terrain, and Dark mode tiles |
| 📍 39 Real Places | All mohallas, mosques, schools, bridges, health centre, waterfall, panchayat |
| 🤖 AI Search | Natural language search via Claude API (backend proxy) |
| 🎤 Voice Search | Browser mic — say "show me mosques" and the map flies there |
| 🌐 4 Languages | English, اردو (Urdu + RTL), हिन्दी (Hindi), བོད་ཡིག (Ladakhi/Bodhi) |
| 📷 Photo Upload | Add real photos to any location — shown in markers, popups, sidebar |
| 🧭 Route Planner | Click two places → draws a route with distance and walking time |
| 📢 Announcements | Admin posts village-wide announcements (prayer times, events) |
| 📊 Stats Dashboard | Charts: places by category, mohalla breakdown, coverage analysis |
| 🔐 Real Auth | JWT login with bcrypt-hashed passwords, rate-limited login |
| 📱 PWA | Installable on phone home screen, works offline |
| 🧪 46 Tests | Jest + Supertest covering auth, CRUD, admin workflow, edge cases |

---

## 🗂️ Project Structure

```
kanoor-village-map/
├── frontend/
│   ├── index.html          # Main interactive map (Leaflet.js)
│   ├── admin.html          # Admin panel (JWT auth, approvals, announcements)
│   ├── stats.html          # Statistics dashboard (Chart.js)
│   ├── translations.js     # EN / UR / HI / BO translations + place names
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker (offline support)
├── backend/
│   ├── server.js           # Express REST API + JWT auth + AI proxy
│   ├── seedData.js         # 39 seed places for Kanoor village
│   ├── package.json
│   └── tests/
│       ├── api.test.js     # 33 integration tests (real HTTP requests)
│       └── unit.test.js    # 13 unit tests (pure functions)
└── README.md
```

---

## 🚀 Run Locally (2 steps, no database needed)

```bash
# Step 1 — Install dependencies
cd backend
npm install

# Step 2 — Start the server
npm start
```

Open **http://localhost:5000** — the map, admin panel, and stats page all work immediately.

Default admin login: **username:** `admin` **password:** `kanoor2024`

---

## 🧪 Run Tests

```bash
cd backend
npm test
```

```
PASS tests/api.test.js   (33 tests)
PASS tests/unit.test.js  (13 tests)

Test Suites: 2 passed
Tests:       46 passed
Time:        ~1.5s
```

Tests cover: JWT auth, wrong password rejection, place submission, admin approval workflow, announcements, ratings, stats endpoint, and AI search graceful fallback.

---

## 🌐 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | — | Health check |
| GET | `/api/places` | — | All approved places (`?category=` `?search=`) |
| GET | `/api/places/:id` | — | Single place details |
| POST | `/api/places` | — | Submit a new place (pending review) |
| POST | `/api/places/:id/reviews` | — | Add a rating/review |
| GET | `/api/announcements` | — | Active village announcements |
| GET | `/api/stats` | — | Category + mohalla breakdown |
| POST | `/api/auth/login` | — | Login → returns JWT |
| GET | `/api/auth/me` | JWT | Verify token |
| GET | `/api/admin/submissions` | JWT | View pending/approved/rejected |
| PUT | `/api/admin/submissions/:id/approve` | JWT | Approve submission |
| PUT | `/api/admin/submissions/:id/reject` | JWT | Reject submission |
| DELETE | `/api/admin/places/:id` | JWT | Delete a place |
| POST | `/api/admin/announcements` | JWT | Post announcement |
| DELETE | `/api/admin/announcements/:id` | JWT | Remove announcement |
| POST | `/api/ai-search` | — | Natural language search (Claude API proxy) |

---

## 🛠️ Tech Stack

**Frontend:** HTML5, CSS3, JavaScript ES6+, Leaflet.js, Chart.js, Web Speech API

**Backend:** Node.js, Express.js, bcryptjs, jsonwebtoken

**Auth:** JWT (24h expiry), bcrypt (salt rounds 10), rate-limited login (10 req/15 min)

**Database:** JSON file (`db.json`) — auto-created on first run, no setup needed

**AI:** Claude API (Anthropic) via backend proxy — API key stays server-side

**Testing:** Jest, Supertest

**PWA:** Service Worker, Web App Manifest, offline fallback

**Languages:** English · اردو Urdu (RTL) · हिन्दी Hindi · བོད་ཡིག Ladakhi/Bodhi

---

## 📍 Village Coverage

| Category | Places |
|----------|--------|
| Mohallas | 11 (Zambakha, Saserpo, Yourgo, Grong, Bargong, Saltong, Scarchey, Chanigund, Gongma Kanoor, Zanging...) |
| Bridges | 3 (Main Bridge, Kanoor–Trespone, Kanoor–Tambis) |
| Schools | 4 (2 Middle Schools, 2 Primary Schools) |
| Mosques | 9 (one per mohalla) |
| Imambargah | 1 (Kanoor Imambargah) |
| Health | 1 (Sub Medical Health Centre, Saserpo) |
| Nature | 3 (Rkong Saltong Waterfall, Picnic Spot, Suru River View Point) |
| Parks & Resorts | 2 |
| Government | 2 (Panchayat Office, Bus Stop) |
| Shops | 3 |

---

## 🚢 Deployment

### Frontend → Vercel (free, forever)
1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import `kanoor-village-map`
3. Set **Root Directory** to `frontend`, leave build command empty
4. Deploy → get `kanoor-village-map.vercel.app`

### Backend → Render (free, forever)
1. Go to render.com → New Web Service → connect this repo
2. Set **Root Directory** to `backend`
3. Build Command: `npm install` · Start Command: `node server.js`
4. Add environment variables: `JWT_SECRET`, `ADMIN_PASSWORD`, `PORT=10000`
5. Deploy → get `kanoor-village-map-api.onrender.com`

---

## 📄 Resume Description

```
Kanoor Village Interactive Map — Full Stack Web Application
Live: kanoor-village-map.vercel.app | GitHub: github.com/hakimabanoo/kanoor-village-map

• Built an interactive map of Kanoor village (Kargil, Ladakh) with Leaflet.js
  frontend and Node.js/Express REST API backend serving 39 geo-tagged landmarks
• Implemented JWT authentication with bcrypt password hashing, rate-limited
  login endpoint, and role-based admin access control
• Added multilingual support — English, Urdu (اردو + RTL layout), Hindi (हिन्दी),
  and Ladakhi/Bodhi script (བོད་ཡིག) — unique in Ladakh region
• Built AI-powered natural language search (Claude API via backend proxy),
  voice search, walking route planner with haversine distance calculation
• Converted to installable PWA with offline support via service workers
• Wrote 46 automated tests (Jest + Supertest) covering authentication, CRUD
  operations, admin approval workflow, and authorization boundaries
• Deployed: Vercel (frontend) + Render (backend)
• Stack: HTML5, CSS3, JavaScript ES6+, Leaflet.js, Node.js, Express, JWT, bcrypt
```

---

*Built with ❤️ for Kanoor Village, Sankoo, Kargil, Ladakh, India*
