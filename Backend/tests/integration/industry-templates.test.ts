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

describe('Industry Templates — one-click org provisioning', () => {
  it('lists the available templates', async () => {
    const res = await request(app).get('/api/v1/industry-templates').set(asAdmin());
    expect(res.status).toBe(200);
    const tags = res.body.data.map((t: { tag: string }) => t.tag);
    expect(tags).toEqual(expect.arrayContaining(['SCHOOL', 'HOSPITAL', 'HOTEL', 'FACTORY']));
  });

  it('applies the Hospital template, provisioning categories and custom objects with a resolved relation', async () => {
    const res = await request(app).post('/api/v1/industry-templates/apply').set(asAdmin()).send({ tag: 'HOSPITAL' });

    expect(res.status).toBe(201);
    expect(res.body.data.categoriesCreated).toEqual(expect.arrayContaining(['Medical Devices', 'Beds']));
    expect(res.body.data.objectsCreated).toEqual(expect.arrayContaining(['ward', 'patient']));

    const categories = await request(app).get('/api/v1/asset-categories').set(asAdmin());
    expect(categories.body.data.map((c: { name: string }) => c.name)).toEqual(
      expect.arrayContaining(['Medical Devices', 'Beds']),
    );

    const objects = await request(app).get('/api/v1/custom-objects').set(asAdmin());
    const patient = objects.body.data.find((o: { key: string }) => o.key === 'patient');
    expect(patient).toBeTruthy();

    const patientFields = await request(app).get(`/api/v1/custom-objects/${patient.id}/fields`).set(asAdmin());
    const wardField = patientFields.body.data.find((f: { fieldKey: string }) => f.fieldKey === 'ward');
    expect(wardField).toBeTruthy();
    expect(wardField.relationTarget).toBe('CUSTOM_OBJECT');
    expect(wardField.relationObjectDefinitionId).toBeTruthy(); // resolved from the sibling "ward" object, not left dangling
  });

  it('is idempotent — re-applying the same template skips what already exists instead of erroring', async () => {
    const res = await request(app).post('/api/v1/industry-templates/apply').set(asAdmin()).send({ tag: 'HOSPITAL' });

    expect(res.status).toBe(201);
    expect(res.body.data.categoriesCreated).toEqual([]);
    expect(res.body.data.categoriesSkipped).toEqual(expect.arrayContaining(['Medical Devices', 'Beds']));
    expect(res.body.data.objectsCreated).toEqual([]);
    expect(res.body.data.objectsSkipped).toEqual(expect.arrayContaining(['ward', 'patient']));
  });

  it('rejects an unknown template tag', async () => {
    const res = await request(app).post('/api/v1/industry-templates/apply').set(asAdmin()).send({ tag: 'NOT_REAL' });
    expect(res.status).toBe(400);
  });

  it('is Admin-only', async () => {
    const other = await bootstrapOrg(app);
    // register-organization always creates an Admin, so instead sign up a plain employee
    const org = await prisma.organization.findFirst({ where: { name: other.orgName } });
    const employee = await request(app)
      .post('/api/v1/auth/signup')
      .send({ orgSlug: org!.slug, name: 'Plain Employee', email: `emp-${other.runId}@test.ares`, password: 'Passw0rd1' });

    const res = await request(app)
      .post('/api/v1/industry-templates/apply')
      .set({ Authorization: `Bearer ${employee.body.data.tokens.accessToken}` })
      .send({ tag: 'SCHOOL' });
    expect(res.status).toBe(403);

    await cleanupOrg(other.orgName);
  });
});
