import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '@/app';
import { prisma } from '@/core/database/prisma';
import { bootstrapOrg, cleanupOrg, createEmployee } from '../helpers/bootstrap';

const app = createApp();
let ctx: Awaited<ReturnType<typeof bootstrapOrg>>;
let orgSlug: string;

beforeAll(async () => {
  ctx = await bootstrapOrg(app);
  const org = await prisma.organization.findFirst({ where: { name: ctx.orgName } });
  orgSlug = org!.slug;
});

afterAll(async () => {
  await cleanupOrg(ctx.orgName);
  await prisma.$disconnect().catch(() => undefined);
});

function asAdmin() {
  return { Authorization: `Bearer ${ctx.adminToken}` };
}

describe('Employees — role assignment guardrails', () => {
  it('blocks an Admin from changing their own role (regression: used to compare id against orgId)', async () => {
    const res = await request(app)
      .patch(`/api/v1/employees/${ctx.adminId}/role`)
      .set(asAdmin())
      .send({ role: 'EMPLOYEE' });

    expect(res.status).toBe(400);

    // Confirm the role genuinely never changed.
    const me = await request(app).get('/api/v1/auth/me').set(asAdmin());
    expect(me.body.data.role).toBe('ADMIN');
  });

  it('lets an Admin promote a different employee', async () => {
    const employee = await createEmployee(app, orgSlug, ctx.runId);

    const res = await request(app)
      .patch(`/api/v1/employees/${employee.id}/role`)
      .set(asAdmin())
      .send({ role: 'ASSET_MANAGER' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ASSET_MANAGER');
  });

  it('forbids a non-Admin from promoting anyone, including themselves', async () => {
    const employee = await createEmployee(app, orgSlug, ctx.runId);

    const res = await request(app)
      .patch(`/api/v1/employees/${employee.id}/role`)
      .set({ Authorization: `Bearer ${employee.token}` })
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });

  it('keeps the Employee Directory Admin-only', async () => {
    const employee = await createEmployee(app, orgSlug, ctx.runId);

    const asEmployee = await request(app)
      .get('/api/v1/employees')
      .set({ Authorization: `Bearer ${employee.token}` });
    expect(asEmployee.status).toBe(403);

    const asAdminRes = await request(app).get('/api/v1/employees').set(asAdmin());
    expect(asAdminRes.status).toBe(200);
    expect(Array.isArray(asAdminRes.body.data)).toBe(true);
  });
});
