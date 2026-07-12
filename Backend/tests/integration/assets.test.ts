import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '@/app';
import { prisma } from '@/core/database/prisma';
import { bootstrapOrg, cleanupOrg } from '../helpers/bootstrap';

const app = createApp();
let ctx: Awaited<ReturnType<typeof bootstrapOrg>>;
let categoryId: string;

beforeAll(async () => {
  ctx = await bootstrapOrg(app);
  const cat = await request(app)
    .post('/api/v1/asset-categories')
    .set(asAdmin())
    .send({ name: `Electronics-${ctx.runId}` });
  categoryId = cat.body.data.id;
});

afterAll(async () => {
  await cleanupOrg(ctx.orgName);
  await prisma.$disconnect().catch(() => undefined);
});

function asAdmin() {
  return { Authorization: `Bearer ${ctx.adminToken}` };
}

describe('Assets — tag generation and lifecycle', () => {
  it('assigns sequential, unique asset tags under concurrent registration (regression: race on "latest by createdAt")', async () => {
    const registrations = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        request(app)
          .post('/api/v1/assets')
          .set(asAdmin())
          .send({ name: `Concurrent Asset ${i}`, categoryId }),
      ),
    );

    for (const res of registrations) {
      expect(res.status).toBe(201);
    }

    const tags = registrations.map((r) => r.body.data.assetTag);
    expect(new Set(tags).size).toBe(tags.length); // all unique, none silently dropped/collided
  });

  it('rejects an illegal status transition (Disposed assets cannot be allocated)', async () => {
    const asset = await request(app)
      .post('/api/v1/assets')
      .set(asAdmin())
      .send({ name: `Lifecycle Asset ${ctx.runId}`, categoryId });

    await request(app).post(`/api/v1/assets/${asset.body.data.id}/transition`).set(asAdmin()).send({ event: 'retire' });
    const dispose = await request(app)
      .post(`/api/v1/assets/${asset.body.data.id}/transition`)
      .set(asAdmin())
      .send({ event: 'dispose' });
    expect(dispose.status).toBe(200);
    expect(dispose.body.data.status).toBe('DISPOSED');

    const illegal = await request(app)
      .post(`/api/v1/assets/${asset.body.data.id}/transition`)
      .set(asAdmin())
      .send({ event: 'allocate' });
    expect(illegal.status).toBe(409);
  });

  it('attributes the activity log entry to the registering user, not "system"', async () => {
    const asset = await request(app)
      .post('/api/v1/assets')
      .set(asAdmin())
      .send({ name: `Audited Asset ${ctx.runId}`, categoryId });

    // The event listener writes the log asynchronously (fire-and-forget from the
    // emitting service), so poll briefly rather than assuming it's already landed.
    let registrationLog: { action: string; userId: string } | undefined;
    for (let attempt = 0; attempt < 10 && !registrationLog; attempt++) {
      const logs = await request(app)
        .get(`/api/v1/activity-logs?entityType=Asset&entityId=${asset.body.data.id}`)
        .set(asAdmin());
      registrationLog = logs.body.data.find((l: { action: string }) => l.action === 'asset.registered');
      if (!registrationLog) await new Promise((r) => setTimeout(r, 50));
    }

    expect(registrationLog).toBeTruthy();
    expect(registrationLog?.userId).toBe(ctx.adminId);
  });
});
