import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '@/app';
import { prisma } from '@/core/database/prisma';
import { bootstrapOrg, cleanupOrg } from '../helpers/bootstrap';

const app = createApp();
let ctx: Awaited<ReturnType<typeof bootstrapOrg>>;

beforeAll(async () => {
  ctx = await bootstrapOrg(app);
});

afterAll(async () => {
  await cleanupOrg(ctx.orgName);
  await prisma.$disconnect().catch(() => undefined);
});

function asAdmin() {
  return { Authorization: `Bearer ${ctx.adminToken}` };
}

describe('Departments — hierarchy integrity', () => {
  it('rejects a department head from a different organization', async () => {
    const other = await bootstrapOrg(app);
    try {
      const res = await request(app)
        .post('/api/v1/departments')
        .set(asAdmin())
        .send({ name: `Eng-${ctx.runId}`, headUserId: other.adminId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    } finally {
      await cleanupOrg(other.orgName);
    }
  });

  it('rejects reassigning a head to a cross-org user on update too', async () => {
    const other = await bootstrapOrg(app);
    try {
      const create = await request(app)
        .post('/api/v1/departments')
        .set(asAdmin())
        .send({ name: `Sales-${ctx.runId}` });
      expect(create.status).toBe(201);

      const update = await request(app)
        .patch(`/api/v1/departments/${create.body.data.id}`)
        .set(asAdmin())
        .send({ headUserId: other.adminId });

      expect(update.status).toBe(400);
    } finally {
      await cleanupOrg(other.orgName);
    }
  });

  it('rejects a department being made its own parent', async () => {
    const create = await request(app)
      .post('/api/v1/departments')
      .set(asAdmin())
      .send({ name: `Ops-${ctx.runId}` });

    const res = await request(app)
      .patch(`/api/v1/departments/${create.body.data.id}`)
      .set(asAdmin())
      .send({ parentDepartmentId: create.body.data.id });

    expect(res.status).toBe(400);
  });

  it('rejects a deeper circular hierarchy (A -> B -> A)', async () => {
    const a = await request(app).post('/api/v1/departments').set(asAdmin()).send({ name: `A-${ctx.runId}` });
    const b = await request(app)
      .post('/api/v1/departments')
      .set(asAdmin())
      .send({ name: `B-${ctx.runId}`, parentDepartmentId: a.body.data.id });
    expect(b.status).toBe(201);

    // A -> parent = B, while B -> parent = A already. This must be rejected.
    const res = await request(app)
      .patch(`/api/v1/departments/${a.body.data.id}`)
      .set(asAdmin())
      .send({ parentDepartmentId: b.body.data.id });

    expect(res.status).toBe(400);
  });

  it('blocks deactivating a department that still has active sub-departments', async () => {
    const parent = await request(app)
      .post('/api/v1/departments')
      .set(asAdmin())
      .send({ name: `Parent-${ctx.runId}` });
    await request(app)
      .post('/api/v1/departments')
      .set(asAdmin())
      .send({ name: `Child-${ctx.runId}`, parentDepartmentId: parent.body.data.id });

    const res = await request(app).delete(`/api/v1/departments/${parent.body.data.id}`).set(asAdmin());

    expect(res.status).toBe(400);
  });
});
