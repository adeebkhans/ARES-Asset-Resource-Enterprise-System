import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '@/core/database/prisma';

/** Spins up a fresh org + Admin user for a test file and returns everything needed to drive requests as that Admin. */
export async function bootstrapOrg(app: Express) {
  const runId = randomUUID().slice(0, 8);
  const email = `admin-${runId}@test.ares`;
  const orgName = `Test Org ${runId}`;

  const res = await request(app)
    .post('/api/v1/auth/register-organization')
    .send({ organizationName: orgName, adminName: 'Test Admin', email, password: 'Passw0rd1' });

  return {
    runId,
    orgName,
    orgId: res.body.data.user.orgId as string,
    adminId: res.body.data.user.id as string,
    adminToken: res.body.data.tokens.accessToken as string,
    adminEmail: email,
  };
}

export async function createEmployee(app: Express, orgSlug: string, runId: string) {
  const email = `employee-${runId}-${randomUUID().slice(0, 6)}@test.ares`;
  const res = await request(app)
    .post('/api/v1/auth/signup')
    .send({ orgSlug, name: 'Test Employee', email, password: 'Passw0rd1' });

  return {
    id: res.body.data.user.id as string,
    email,
    token: res.body.data.tokens.accessToken as string,
  };
}

export async function cleanupOrg(orgName: string) {
  const org = await prisma.organization.findFirst({ where: { name: orgName } });
  if (org) {
    // ActivityLog has no FK to Organization (plain orgId string), so it isn't cascade-deleted.
    await prisma.activityLog.deleteMany({ where: { orgId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  }
}
