import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '@/app';
import { prisma } from '@/core/database/prisma';

const app = createApp();
const runId = randomUUID().slice(0, 8);
const adminEmail = `admin-${runId}@test.ares`;
const employeeEmail = `employee-${runId}@test.ares`;
const orgName = `Test Org ${runId}`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, employeeEmail] } } });
  await prisma.organization.deleteMany({ where: { name: orgName } });
  await prisma.$disconnect();
});

describe('Auth flow', () => {
  it('bootstraps a new organization with an Admin user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-organization')
      .send({ organizationName: orgName, adminName: 'Test Admin', email: adminEmail, password: 'Passw0rd1' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('signs up a new employee under the org and never honors a client-supplied role', async () => {
    const org = await prisma.organization.findFirst({ where: { name: orgName } });
    expect(org).not.toBeNull();

    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        orgSlug: org!.slug,
        name: 'Test Employee',
        email: employeeEmail,
        password: 'Passw0rd1',
        role: 'ADMIN', // attempted privilege escalation — must be ignored
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('EMPLOYEE');
  });

  it('rejects login with a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: employeeEmail, password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('logs in, then refreshes to a new token pair while rotating the old one', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: employeeEmail, password: 'Passw0rd1' });
    expect(loginRes.status).toBe(200);

    const { refreshToken } = loginRes.body.data.tokens;

    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);

    // The rotated-out token must no longer be usable.
    const replayRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(replayRes.status).toBe(401);
  });

  it('returns the current session via /me once authenticated', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: employeeEmail, password: 'Passw0rd1' });

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.tokens.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(employeeEmail);
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
