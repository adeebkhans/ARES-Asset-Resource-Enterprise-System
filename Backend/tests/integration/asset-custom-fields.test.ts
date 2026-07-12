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

  await request(app)
    .post(`/api/v1/asset-categories/${categoryId}/fields`)
    .set(asAdmin())
    .send({ fieldKey: 'warrantyMonths', label: 'Warranty (months)', fieldType: 'NUMBER', isRequired: true });
  await request(app)
    .post(`/api/v1/asset-categories/${categoryId}/fields`)
    .set(asAdmin())
    .send({ fieldKey: 'vendor', label: 'Vendor', fieldType: 'SELECT', options: ['Dell', 'HP', 'Lenovo'] });
});

afterAll(async () => {
  await cleanupOrg(ctx.orgName);
  await prisma.$disconnect().catch(() => undefined);
});

function asAdmin() {
  return { Authorization: `Bearer ${ctx.adminToken}` };
}

describe('Asset registration — Layer 1 category custom fields (plan.md §7.1)', () => {
  it('lists the custom fields defined on a category', async () => {
    const res = await request(app).get(`/api/v1/asset-categories/${categoryId}/fields`).set(asAdmin());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('rejects asset registration missing a required category field', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set(asAdmin())
      .send({ name: 'Laptop without warranty', categoryId, customFieldValues: {} });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid SELECT value not in the configured options', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set(asAdmin())
      .send({ name: 'Laptop bad vendor', categoryId, customFieldValues: { warrantyMonths: 12, vendor: 'Apple' } });
    expect(res.status).toBe(400);
  });

  it('registers an asset with valid category custom field values', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set(asAdmin())
      .send({ name: 'Laptop valid', categoryId, customFieldValues: { warrantyMonths: 24, vendor: 'Dell' } });

    expect(res.status).toBe(201);
    expect(res.body.data.customFieldValues).toEqual({ warrantyMonths: 24, vendor: 'Dell' });
  });

  it('rejects a custom field key that is not defined on the category', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set(asAdmin())
      .send({ name: 'Laptop sneaky field', categoryId, customFieldValues: { warrantyMonths: 12, hackerField: 'x' } });
    expect(res.status).toBe(400);
  });

  it('re-validates custom fields on update', async () => {
    const create = await request(app)
      .post('/api/v1/assets')
      .set(asAdmin())
      .send({ name: 'Laptop to update', categoryId, customFieldValues: { warrantyMonths: 12 } });

    const badUpdate = await request(app)
      .patch(`/api/v1/assets/${create.body.data.id}`)
      .set(asAdmin())
      .send({ customFieldValues: { warrantyMonths: 'not-a-number' } });
    expect(badUpdate.status).toBe(400);

    const goodUpdate = await request(app)
      .patch(`/api/v1/assets/${create.body.data.id}`)
      .set(asAdmin())
      .send({ customFieldValues: { warrantyMonths: 36, vendor: 'HP' } });
    expect(goodUpdate.status).toBe(200);
    expect(goodUpdate.body.data.customFieldValues.warrantyMonths).toBe(36);
  });
});
