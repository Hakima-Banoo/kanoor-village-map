// ════════════════════════════════════════════════════════
// KANOOR VILLAGE MAP — Backend Server
// Node.js + Express + JWT Auth + JSON file database
// (No external database required — works out of the box)
// Built by Hakima Banoo · hakimabanoo.jk.csrl@gmail.com
// ════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'kanoor-dev-secret-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kanoor2024';
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ── SEED PLACE DATA (same 40+ places shown on the map) ────
const SEED_PLACES = require('./seedData');

// ── FILE-BASED DATABASE ────────────────────────────────────
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return null;
  }
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
function initDB() {
  if (fs.existsSync(DB_PATH)) return;
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  writeDB({
    places: SEED_PLACES.map(p => ({ ...p, status: 'approved', reviews: [], rating: { avg: 0, count: 0 } })),
    submissions: [],
    rejected: [],
    announcements: [],
    users: [{ username: 'admin', passwordHash, role: 'admin' }],
  });
  console.log('✅ Database initialized with', SEED_PLACES.length, 'seed places');
}
initDB();

// ── AUTH MIDDLEWARE ────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Simple in-memory rate limiter for login (no extra dependency needed)
const loginAttempts = {};
function loginRateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  if (!loginAttempts[ip]) loginAttempts[ip] = [];
  loginAttempts[ip] = loginAttempts[ip].filter(t => now - t < windowMs);
  if (loginAttempts[ip].length >= 10) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  }
  loginAttempts[ip].push(now);
  next();
}

// ════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════
app.post('/api/auth/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const db = readDB();
  const user = db.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { username: user.username, role: user.role } });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ════════════════════════════════════════════════════════
// PLACES ROUTES
// ════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  const db = readDB();
  res.json({
    status: 'ok',
    village: 'Kanoor, Sankoo, Kargil, Ladakh',
    placesCount: db.places.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/places', (req, res) => {
  const db = readDB();
  const { category, search, mohalla } = req.query;
  let places = db.places.filter(p => p.status === 'approved');

  if (category && category !== 'all') places = places.filter(p => p.category === category);
  if (mohalla) places = places.filter(p => (p.mohalla || '').toLowerCase().includes(mohalla.toLowerCase()));
  if (search) {
    const q = search.toLowerCase();
    places = places.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.mohalla || '').toLowerCase().includes(q)
    );
  }
  res.json({ count: places.length, places });
});

app.get('/api/places/:id', (req, res) => {
  const db = readDB();
  const place = db.places.find(p => p.id === req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });
  res.json({ place });
});

app.post('/api/places', (req, res) => {
  const { name, category, description, lat, lng, mohalla, submitter, photos } = req.body;
  if (!name || !category || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'name, category, lat, lng are required' });
  }
  const latN = parseFloat(lat), lngN = parseFloat(lng);
  if (isNaN(latN) || isNaN(lngN) || latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
    return res.status(400).json({ error: 'lat/lng invalid or out of range' });
  }

  const db = readDB();
  const place = {
    id: 'p_' + Date.now(),
    name: name.trim(),
    category,
    description: (description || '').trim(),
    lat: latN, lng: lngN,
    mohalla: (mohalla || '').trim(),
    submitter: (submitter || 'Anonymous').trim(),
    photos: photos || [],
    icon: categoryIcon(category),
    status: 'pending',
    rating: { avg: 0, count: 0 },
    reviews: [],
    createdAt: new Date().toISOString(),
  };
  db.places.push(place);
  writeDB(db);
  res.status(201).json({ message: 'Submitted for review', id: place.id });
});

app.post('/api/places/:id/reviews', (req, res) => {
  const { user, rating, comment } = req.body;
  const r = parseInt(rating);
  if (!r || r < 1 || r > 5) return res.status(400).json({ error: 'rating must be 1-5' });

  const db = readDB();
  const place = db.places.find(p => p.id === req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });

  place.reviews = place.reviews || [];
  place.reviews.push({ user: user || 'Anonymous', rating: r, comment: comment || '', createdAt: new Date().toISOString() });
  const total = place.reviews.reduce((s, rv) => s + rv.rating, 0);
  place.rating = { avg: +(total / place.reviews.length).toFixed(1), count: place.reviews.length };
  writeDB(db);
  res.json({ message: 'Review added', rating: place.rating });
});

// ════════════════════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════════════════════
app.get('/api/admin/submissions', requireAuth, (req, res) => {
  const db = readDB();
  const pending = db.places.filter(p => p.status === 'pending');
  const approved = db.places.filter(p => p.status === 'approved');
  res.json({
    pending, approved, rejected: db.rejected,
    stats: { pending: pending.length, approved: approved.length, rejected: db.rejected.length },
  });
});

app.put('/api/admin/submissions/:id/approve', requireAuth, (req, res) => {
  const db = readDB();
  const place = db.places.find(p => p.id === req.params.id);
  if (!place) return res.status(404).json({ error: 'Submission not found' });
  place.status = 'approved';
  writeDB(db);
  res.json({ message: 'Approved', place });
});

app.put('/api/admin/submissions/:id/reject', requireAuth, (req, res) => {
  const db = readDB();
  const idx = db.places.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Submission not found' });
  const [place] = db.places.splice(idx, 1);
  place.status = 'rejected';
  db.rejected.push(place);
  writeDB(db);
  res.json({ message: 'Rejected', place });
});

app.delete('/api/admin/places/:id', requireAuth, (req, res) => {
  const db = readDB();
  const idx = db.places.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Place not found' });
  db.places.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Deleted' });
});

// ════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ════════════════════════════════════════════════════════
app.get('/api/announcements', (req, res) => {
  const db = readDB();
  const now = new Date();
  const active = db.announcements.filter(a => a.active !== false && (!a.expiresAt || new Date(a.expiresAt) > now));
  res.json({ announcements: active });
});

app.post('/api/admin/announcements', requireAuth, (req, res) => {
  const { title, message, type, expiresInDays } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'title and message required' });

  const db = readDB();
  const ann = {
    id: 'a_' + Date.now(),
    title: title.trim(), message: message.trim(),
    type: type || 'info', active: true,
    createdAt: new Date().toISOString(),
    expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null,
    postedBy: req.user.username,
  };
  db.announcements.unshift(ann);
  writeDB(db);
  res.status(201).json({ message: 'Announcement posted', announcement: ann });
});

app.delete('/api/admin/announcements/:id', requireAuth, (req, res) => {
  const db = readDB();
  const ann = db.announcements.find(a => a.id === req.params.id);
  if (!ann) return res.status(404).json({ error: 'Not found' });
  ann.active = false;
  writeDB(db);
  res.json({ message: 'Removed' });
});

// ════════════════════════════════════════════════════════
// STATS
// ════════════════════════════════════════════════════════
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const places = db.places.filter(p => p.status === 'approved');
  const byCategory = {}, byMohalla = {};
  places.forEach(p => {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    if (p.mohalla) byMohalla[p.mohalla] = (byMohalla[p.mohalla] || 0) + 1;
  });
  res.json({ total: places.length, byCategory, byMohalla });
});

// ════════════════════════════════════════════════════════
// AI SEARCH PROXY — keeps API key server-side, never in browser
// ════════════════════════════════════════════════════════
app.post('/api/ai-search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI search not configured on this server',
      fallback: true,
    });
  }

  try {
    const db = readDB();
    const places = db.places.filter(p => p.status === 'approved');
    const summary = places.map(p => `${p.name} (${p.category}, ${p.mohalla || ''})`).join('; ');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: `You are a helpful assistant for Kanoor Village Map, Kargil, Ladakh. Places: ${summary}. Answer briefly (2-3 sentences), mention specific place names. If asked to find/show something, start with "FILTER: <term>".`,
        messages: [{ role: 'user', content: query }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'AI service error', fallback: true });
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text || '';
    res.json({ text });
  } catch (err) {
    console.error('AI search error:', err.message);
    res.status(500).json({ error: 'AI search failed', fallback: true });
  }
});

// ── CATCH ALL → FRONTEND ───────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

function categoryIcon(cat) {
  const icons = { bridge:'🌉', school:'🏫', mosque:'🕌', imambargah:'🏛️', health:'🏥', nature:'🌊', mohalla:'🏘️', shop:'🛍️', park:'🌿', govt:'🏛️', resort:'🏡' };
  return icons[cat] || '📍';
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
  🏔️  Kanoor Village Map — Backend Running
  ──────────────────────────────────────────
  Server  : http://localhost:${PORT}
  Health  : http://localhost:${PORT}/api/health
  Admin   : http://localhost:${PORT}/admin.html
  Login   : username=admin, password=${ADMIN_PASSWORD}
  Database: db.json (auto-created, no MongoDB needed)
  AI      : ${process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled (set ANTHROPIC_API_KEY env var to enable)'}
  ──────────────────────────────────────────
    `);
  });
}

module.exports = app;
