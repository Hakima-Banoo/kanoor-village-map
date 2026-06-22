// ════════════════════════════════════════════════════════
// Kanoor Village Map — Unit Tests (pure functions, no server)
// Built by Hakima Banoo
// ════════════════════════════════════════════════════════

function categoryIcon(cat) {
  const icons = {
    bridge: '🌉', school: '🏫', mosque: '🕌', imambargah: '🏛️',
    health: '🏥', nature: '🌊', mohalla: '🏘️', shop: '🛍️',
    park: '🌿', govt: '🏛️', resort: '🏡'
  };
  return icons[cat] || '📍';
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCoordinate(lat, lng) {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function averageRating(reviews) {
  if (!reviews.length) return { avg: 0, count: 0 };
  const total = reviews.reduce((s, r) => s + r.rating, 0);
  return { avg: +(total / reviews.length).toFixed(1), count: reviews.length };
}

describe('categoryIcon()', () => {
  it('returns correct icon for known categories', () => {
    expect(categoryIcon('school')).toBe('🏫');
    expect(categoryIcon('mosque')).toBe('🕌');
    expect(categoryIcon('bridge')).toBe('🌉');
  });
  it('returns default pin for unknown category', () => {
    expect(categoryIcon('nope')).toBe('📍');
  });
});

describe('haversine() distance', () => {
  it('returns 0 for identical points', () => {
    expect(haversine(34.312, 76.012, 34.312, 76.012)).toBe(0);
  });
  it('calculates a sensible distance between two Kanoor mohallas', () => {
    const dist = haversine(34.3188, 76.0068, 34.3072, 76.0178); // Saltong → Bargong
    expect(dist).toBeGreaterThan(1000);
    expect(dist).toBeLessThan(2500);
  });
  it('is symmetric', () => {
    const d1 = haversine(34.312, 76.012, 34.32, 76.02);
    const d2 = haversine(34.32, 76.02, 34.312, 76.012);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

describe('isValidCoordinate()', () => {
  it('accepts valid Kanoor coordinates', () => {
    expect(isValidCoordinate(34.312, 76.012)).toBe(true);
  });
  it('rejects out-of-range values', () => {
    expect(isValidCoordinate(91, 76)).toBe(false);
    expect(isValidCoordinate(34, 200)).toBe(false);
  });
  it('rejects NaN', () => {
    expect(isValidCoordinate(NaN, 76)).toBe(false);
  });
});

describe('averageRating()', () => {
  it('returns 0/0 for no reviews', () => {
    expect(averageRating([])).toEqual({ avg: 0, count: 0 });
  });
  it('averages multiple reviews correctly', () => {
    expect(averageRating([{ rating: 5 }, { rating: 3 }])).toEqual({ avg: 4, count: 2 });
  });
  it('handles uneven averages', () => {
    expect(averageRating([{ rating: 5 }, { rating: 4 }]).avg).toBe(4.5);
  });
});

describe('Translation data integrity', () => {
  const fs = require('fs');
  const path = require('path');
  let content;
  beforeAll(() => {
    content = fs.readFileSync(path.join(__dirname, '../../frontend/translations.js'), 'utf-8');
  });
  it('contains all 4 supported languages', () => {
    expect(content).toMatch(/en:\s*{/);
    expect(content).toMatch(/ur:\s*{/);
    expect(content).toMatch(/hi:\s*{/);
    expect(content).toMatch(/bo:\s*{/);
  });
  it('contains real Urdu, Hindi, and Tibetan script', () => {
    expect(content).toMatch(/[\u0600-\u06FF]/); // Urdu
    expect(content).toMatch(/[\u0900-\u097F]/); // Hindi
    expect(content).toMatch(/[\u0F00-\u0FFF]/); // Tibetan
  });
});
