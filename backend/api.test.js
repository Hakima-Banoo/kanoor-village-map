// ════════════════════════════════════════════════════════
// Kanoor Village Map — API Integration Tests
// Tests the REAL server.js with its JSON file database.
// No MongoDB, no mocking — actual HTTP requests against actual code.
// Built by Hakima Banoo
// Run with: npm test
// ════════════════════════════════════════════════════════

const request = require('supertest');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.json');
const TEST_PASSWORD = 'kanoor2024';

let app;
let adminToken;
let createdPlaceId;
let createdAnnouncementId;

beforeAll(() => {
  // Start with a clean database for predictable tests
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.ADMIN_PASSWORD = TEST_PASSWORD;
  app = require('../server');
});

afterAll(() => {
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
});

// ════════════════════════════════════════════════════════
describe('GET /api/health', () => {
  it('returns ok status with seeded place count', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.village).toMatch(/Kanoor/);
    expect(res.body.placesCount).toBeGreaterThan(30);
  });
});

// ════════════════════════════════════════════════════════
describe('Authentication', () => {
  it('rejects login with missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });

  it('logs in with correct seeded credentials and returns a JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: TEST_PASSWORD });
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.').length).toBe(3); // real JWT has 3 parts
    expect(res.body.user.username).toBe('admin');
    adminToken = res.body.token;
  });

  it('GET /api/auth/me rejects requests with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/auth/me rejects an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.real.token');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/auth/me accepts a valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe('admin');
  });
});

// ════════════════════════════════════════════════════════
describe('Public place listing', () => {
  it('lists only approved places by default', async () => {
    const res = await request(app).get('/api/places');
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBeGreaterThan(30);
    res.body.places.forEach(p => expect(p.status).toBe('approved'));
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/places?category=mosque');
    expect(res.statusCode).toBe(200);
    res.body.places.forEach(p => expect(p.category).toBe('mosque'));
    expect(res.body.places.length).toBeGreaterThan(5); // Kanoor has 9 mosques
  });

  it('supports text search', async () => {
    const res = await request(app).get('/api/places?search=waterfall');
    expect(res.statusCode).toBe(200);
    expect(res.body.places.some(p => p.name.includes('Waterfall'))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════
describe('Place submission (public)', () => {
  it('rejects submission missing required fields', async () => {
    const res = await request(app).post('/api/places').send({ name: 'Incomplete' });
    expect(res.statusCode).toBe(400);
  });

  it('rejects out-of-range coordinates', async () => {
    const res = await request(app).post('/api/places').send({
      name: 'Bad Coords', category: 'shop', lat: 999, lng: 76
    });
    expect(res.statusCode).toBe(400);
  });

  it('accepts a valid submission with status=pending', async () => {
    const res = await request(app).post('/api/places').send({
      name: 'New Bakery', category: 'shop', description: 'Fresh bread daily',
      lat: 34.3133, lng: 76.0119, mohalla: 'Central', submitter: 'Test Villager'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBeDefined();
    createdPlaceId = res.body.id;
  });

  it('the new submission does NOT appear in public listing yet', async () => {
    const res = await request(app).get('/api/places');
    expect(res.body.places.find(p => p.id === createdPlaceId)).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════
describe('Admin authorization boundaries', () => {
  it('blocks viewing submissions without a token', async () => {
    const res = await request(app).get('/api/admin/submissions');
    expect(res.statusCode).toBe(401);
  });

  it('blocks approving without a token', async () => {
    const res = await request(app).put(`/api/admin/submissions/${createdPlaceId}/approve`);
    expect(res.statusCode).toBe(401);
  });

  it('blocks posting announcements without a token', async () => {
    const res = await request(app).post('/api/admin/announcements').send({ title: 'x', message: 'y' });
    expect(res.statusCode).toBe(401);
  });

  it('blocks deleting places without a token', async () => {
    const res = await request(app).delete(`/api/admin/places/${createdPlaceId}`);
    expect(res.statusCode).toBe(401);
  });
});

// ════════════════════════════════════════════════════════
describe('Admin approval workflow (authenticated)', () => {
  it('lists the pending submission for the admin', async () => {
    const res = await request(app).get('/api/admin/submissions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.stats.pending).toBeGreaterThanOrEqual(1);
    expect(res.body.pending.find(p => p.id === createdPlaceId)).toBeDefined();
  });

  it('approves the submission', async () => {
    const res = await request(app)
      .put(`/api/admin/submissions/${createdPlaceId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.place.status).toBe('approved');
  });

  it('the approved place now appears in the public listing', async () => {
    const res = await request(app).get('/api/places');
    const found = res.body.places.find(p => p.id === createdPlaceId);
    expect(found).toBeDefined();
    expect(found.name).toBe('New Bakery');
  });

  it('returns 404 approving a non-existent submission', async () => {
    const res = await request(app)
      .put('/api/admin/submissions/does-not-exist/approve')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(404);
  });
});

// ════════════════════════════════════════════════════════
describe('Reviews and ratings', () => {
  it('rejects an out-of-range rating', async () => {
    const res = await request(app).post(`/api/places/${createdPlaceId}/reviews`).send({ rating: 10 });
    expect(res.statusCode).toBe(400);
  });

  it('adds a review and computes the average', async () => {
    const res = await request(app).post(`/api/places/${createdPlaceId}/reviews`).send({
      user: 'Reviewer A', rating: 5, comment: 'Lovely place'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.rating).toEqual({ avg: 5, count: 1 });
  });

  it('averages a second review correctly', async () => {
    await request(app).post(`/api/places/${createdPlaceId}/reviews`).send({ user: 'B', rating: 3 });
    const res = await request(app).get(`/api/places/${createdPlaceId}`);
    expect(res.body.place.rating.count).toBe(2);
    expect(res.body.place.rating.avg).toBe(4); // (5+3)/2
  });
});

// ════════════════════════════════════════════════════════
describe('Announcements', () => {
  it('public list starts empty', async () => {
    const res = await request(app).get('/api/announcements');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.announcements)).toBe(true);
  });

  it('admin posts an announcement', async () => {
    const res = await request(app)
      .post('/api/admin/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Eid Prayers', message: 'Eid prayers at 6 AM at Kanoor Imambargah', type: 'prayer' });
    expect(res.statusCode).toBe(201);
    expect(res.body.announcement.title).toBe('Eid Prayers');
    createdAnnouncementId = res.body.announcement.id;
  });

  it('the announcement now appears publicly', async () => {
    const res = await request(app).get('/api/announcements');
    expect(res.body.announcements.some(a => a.id === createdAnnouncementId)).toBe(true);
  });

  it('admin can remove the announcement', async () => {
    const res = await request(app)
      .delete(`/api/admin/announcements/${createdAnnouncementId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
  });

  it('removed announcement no longer appears publicly', async () => {
    const res = await request(app).get('/api/announcements');
    expect(res.body.announcements.some(a => a.id === createdAnnouncementId)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════
describe('Stats endpoint', () => {
  it('returns category and mohalla breakdowns including the new bakery', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.byCategory.shop).toBeGreaterThanOrEqual(4); // 3 seeded + 1 new
  });
});

// ════════════════════════════════════════════════════════
describe('AI search endpoint (no API key configured in test env)', () => {
  it('gracefully reports it is not configured instead of crashing', async () => {
    const res = await request(app).post('/api/ai-search').send({ query: 'schools near Saserpo' });
    expect(res.statusCode).toBe(503);
    expect(res.body.fallback).toBe(true);
  });

  it('rejects a request with no query', async () => {
    const res = await request(app).post('/api/ai-search').send({});
    expect(res.statusCode).toBe(400);
  });
});
