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

describe('Custom Objects — the configurable object framework', () => {
  it('creates a custom object definition and rejects a duplicate key', async () => {
    const res = await request(app)
      .post('/api/v1/custom-objects')
      .set(asAdmin())
      .send({ key: 'patient', label: 'Patient', pluralLabel: 'Patients', icon: '🩺' });

    expect(res.status).toBe(201);
    expect(res.body.data.key).toBe('patient');

    const dup = await request(app)
      .post('/api/v1/custom-objects')
      .set(asAdmin())
      .send({ key: 'patient', label: 'Patient Again', pluralLabel: 'Patients' });
    expect(dup.status).toBe(409);
  });

  it('adds field definitions of every type, including a relation to another custom object', async () => {
    const ward = await request(app)
      .post('/api/v1/custom-objects')
      .set(asAdmin())
      .send({ key: 'ward', label: 'Ward', pluralLabel: 'Wards' });

    const patient = await request(app)
      .post('/api/v1/custom-objects')
      .set(asAdmin())
      .send({ key: `patient2_${ctx.runId}`, label: 'Patient2', pluralLabel: 'Patient2s' });

    const nameField = await request(app)
      .post(`/api/v1/custom-objects/${patient.body.data.id}/fields`)
      .set(asAdmin())
      .send({ fieldKey: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true });
    expect(nameField.status).toBe(201);

    const wardField = await request(app)
      .post(`/api/v1/custom-objects/${patient.body.data.id}/fields`)
      .set(asAdmin())
      .send({
        fieldKey: 'ward',
        label: 'Ward',
        fieldType: 'RELATION',
        relationTarget: 'CUSTOM_OBJECT',
        relationObjectDefinitionId: ward.body.data.id,
      });
    expect(wardField.status).toBe(201);

    // SELECT with no options must be rejected by the validator.
    const badSelect = await request(app)
      .post(`/api/v1/custom-objects/${patient.body.data.id}/fields`)
      .set(asAdmin())
      .send({ fieldKey: 'status', label: 'Status', fieldType: 'SELECT' });
    expect(badSelect.status).toBe(400);
  });

  it('rejects a record missing a required field, and unknown keys not in the schema', async () => {
    const obj = await request(app)
      .post('/api/v1/custom-objects')
      .set(asAdmin())
      .send({ key: `guest_${ctx.runId}`, label: 'Guest', pluralLabel: 'Guests' });
    await request(app)
      .post(`/api/v1/custom-objects/${obj.body.data.id}/fields`)
      .set(asAdmin())
      .send({ fieldKey: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true });

    const missingRequired = await request(app)
      .post(`/api/v1/custom-objects/${obj.body.data.id}/records`)
      .set(asAdmin())
      .send({ data: {} });
    expect(missingRequired.status).toBe(400);

    const unknownKey = await request(app)
      .post(`/api/v1/custom-objects/${obj.body.data.id}/records`)
      .set(asAdmin())
      .send({ data: { fullName: 'Bob', notAField: 'sneaky' } });
    expect(unknownKey.status).toBe(400);

    const valid = await request(app)
      .post(`/api/v1/custom-objects/${obj.body.data.id}/records`)
      .set(asAdmin())
      .send({ data: { fullName: 'Bob' } });
    expect(valid.status).toBe(201);
    expect(valid.body.data.data.fullName).toBe('Bob');
  });

  it('rejects a RELATION value that does not point to an existing record', async () => {
    const ward = await request(app)
      .post('/api/v1/custom-objects')
      .set(asAdmin())
      .send({ key: `ward2_${ctx.runId}`, label: 'Ward2', pluralLabel: 'Ward2s' });
    const patient = await request(app)
      .post('/api/v1/custom-objects')
      .set(asAdmin())
      .send({ key: `patient3_${ctx.runId}`, label: 'Patient3', pluralLabel: 'Patient3s' });
    await request(app)
      .post(`/api/v1/custom-objects/${patient.body.data.id}/fields`)
      .set(asAdmin())
      .send({
        fieldKey: 'ward',
        label: 'Ward',
        fieldType: 'RELATION',
        relationTarget: 'CUSTOM_OBJECT',
        relationObjectDefinitionId: ward.body.data.id,
      });

    const fakeWardId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .post(`/api/v1/custom-objects/${patient.body.data.id}/records`)
      .set(asAdmin())
      .send({ data: { ward: fakeWardId } });
    expect(res.status).toBe(400);
  });

  it('blocks deleting an object definition that still has records', async () => {
    const obj = await request(app)
      .post('/api/v1/custom-objects')
      .set(asAdmin())
      .send({ key: `room_${ctx.runId}`, label: 'Room', pluralLabel: 'Rooms' });
    await request(app)
      .post(`/api/v1/custom-objects/${obj.body.data.id}/records`)
      .set(asAdmin())
      .send({ data: {} });

    const del = await request(app).delete(`/api/v1/custom-objects/${obj.body.data.id}`).set(asAdmin());
    expect(del.status).toBe(400);
  });
});
