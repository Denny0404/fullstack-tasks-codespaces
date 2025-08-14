const request = require('supertest');
const app = require('../app');

describe('API', () => {
  test('GET /api/health -> 200 + {status:"ok"}', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET / -> 200 + json message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('API online');
  });

  test('GET /api/version -> has version & service', async () => {
    const res = await request(app).get('/api/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('service');
  });

  test('GET /unknown -> returns json with path', async () => {
    const res = await request(app).get('/unknown');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('path', '/unknown');
  });

  test('Content-Type is application/json', async () => {
    const res = await request(app).get('/anything');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
