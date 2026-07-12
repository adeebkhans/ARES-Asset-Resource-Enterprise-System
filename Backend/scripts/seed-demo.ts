/**
 * Demo data seeder for ARES — drives the running HTTP API exactly like a real
 * user would, rather than writing rows into Postgres directly. This matters:
 * going through the real endpoints guarantees the seeded data is internally
 * consistent with everything the service layer enforces (asset tag sequencing,
 * the approval engine's resolveApprover() wiring, audit-close discrepancy
 * generation + auto LOST transition, custom-field validation, event-driven
 * notifications/activity logs) instead of silently drifting from it.
 *
 * Requires the backend dev server already running (`npm run dev`) against an
 * empty-ish database — safe to re-run against a fresh DB, NOT idempotent
 * (re-running against data from a previous run will hit unique-constraint
 * conflicts on the org slug / asset tags / etc; wipe the DB first if re-seeding).
 *
 * Usage:  npm run seed        (from Backend/, with the dev server already up)
 */

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';
const PASSWORD = 'Demo1234';
const ORG_NAME = 'Northwind General Hospital';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

class ApiClient {
  token: string | null = null;

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (!res.ok || !json?.success) {
      const detail = json?.error ? `${json.error.code}: ${json.error.message}` : `HTTP ${res.status}`;
      throw new Error(`${method} ${path} failed — ${detail}${json?.error?.details ? ` — ${JSON.stringify(json.error.details)}` : ''}`);
    }
    return json.data as T;
  }

  get<T>(path: string) { return this.request<T>('GET', path); }
  post<T>(path: string, body?: unknown) { return this.request<T>('POST', path, body); }
  patch<T>(path: string, body?: unknown) { return this.request<T>('PATCH', path, body); }
  delete<T>(path: string) { return this.request<T>('DELETE', path); }

  /** Returns a second client authenticated as a different user, sharing the same base URL. */
  as(token: string): ApiClient {
    const client = new ApiClient();
    client.token = token;
    return client;
  }
}

interface AuthResult {
  user: { id: string; orgId: string; name: string; email: string; role: string };
  tokens: { accessToken: string; refreshToken: string };
}

function log(msg: string) {
  console.log(`  ${msg}`);
}
function heading(msg: string) {
  console.log(`\n${msg}`);
}

async function main() {
  console.log(`Seeding ARES demo data for "${ORG_NAME}" against ${BASE_URL}\n`);
  console.log('(requires the backend dev server to already be running)');

  const anon = new ApiClient();

  // ── Organization + Admin ─────────────────────────────────────────────
  heading('Organization & users');
  const adminEmail = 'admin@northwind.demo';
  const adminAuth = await anon.post<AuthResult>('/auth/register-organization', {
    organizationName: ORG_NAME,
    adminName: 'Priya Sharma',
    email: adminEmail,
    password: PASSWORD,
  });
  const admin = new ApiClient();
  admin.token = adminAuth.tokens.accessToken;
  const orgId = adminAuth.user.orgId;
  log(`Organization: ${ORG_NAME} (${orgId})`);
  log(`Admin: Priya Sharma <${adminEmail}>`);

  // Slug is derived from the org name server-side (lowercased, hyphenated) — fetch it via /auth/me isn't
  // exposed, so recompute the same way auth.repository does for a simple, well-known name like this one.
  const orgSlug = ORG_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const assetManagerAuth = await anon.post<AuthResult>('/auth/signup', {
    orgSlug,
    name: 'Raj Verma',
    email: 'assetmanager@northwind.demo',
    password: PASSWORD,
  });
  const deptHeadAuth = await anon.post<AuthResult>('/auth/signup', {
    orgSlug,
    name: 'Meera Iyer',
    email: 'depthead@northwind.demo',
    password: PASSWORD,
  });
  const employeeAuth = await anon.post<AuthResult>('/auth/signup', {
    orgSlug,
    name: 'Sam Patel',
    email: 'employee@northwind.demo',
    password: PASSWORD,
  });
  log('Signed up: Raj Verma, Meera Iyer, Sam Patel (all start as Employee)');

  // Promote roles — the ONLY place this happens, per the brief (Admin, from the Employee Directory).
  await admin.patch(`/employees/${assetManagerAuth.user.id}/role`, { role: 'ASSET_MANAGER' });
  await admin.patch(`/employees/${deptHeadAuth.user.id}/role`, { role: 'DEPARTMENT_HEAD' });
  log('Promoted: Raj Verma -> Asset Manager, Meera Iyer -> Department Head (Sam Patel stays Employee)');

  // The access tokens minted at signup still carry the pre-promotion "EMPLOYEE"
  // role claim — JWTs don't update themselves when the DB row changes. Refresh
  // to get a token that reflects the role Priya just assigned (this is real
  // app behavior, not a script-only concern: anyone promoted mid-session needs
  // their token to refresh — or to log in again — before new permissions apply).
  const assetManagerTokens = await anon.post<{ accessToken: string }>('/auth/refresh', {
    refreshToken: assetManagerAuth.tokens.refreshToken,
  });
  const deptHeadTokens = await anon.post<{ accessToken: string }>('/auth/refresh', {
    refreshToken: deptHeadAuth.tokens.refreshToken,
  });

  const assetManager = admin.as(assetManagerTokens.accessToken);
  const deptHead = admin.as(deptHeadTokens.accessToken);
  const employee = admin.as(employeeAuth.tokens.accessToken);

  // ── Departments ───────────────────────────────────────────────────────
  heading('Departments');
  const radiology = await admin.post<{ id: string }>('/departments', {
    name: 'Radiology',
    headUserId: deptHeadAuth.user.id,
  });
  await admin.post('/departments', { name: 'ICU' });
  await admin.post('/departments', { name: 'Facilities' });
  await admin.patch(`/employees/${deptHeadAuth.user.id}`, { departmentId: radiology.id });
  await admin.patch(`/employees/${employeeAuth.user.id}`, { departmentId: radiology.id });
  log('Radiology (headed by Meera Iyer), ICU, Facilities — Meera & Sam assigned to Radiology');

  // ── Approval rule (must exist before any maintenance request is raised —
  //    otherwise the created Approval has no resolvable approver at all) ──
  heading('Approval rules');
  await admin.post('/approvals/rules', {
    approvalType: 'MAINTENANCE',
    slaHours: 48,
    escalateToRole: 'ASSET_MANAGER',
  });
  log('Maintenance approvals route to Asset Manager, 48h SLA (matches the brief: "Asset Manager approves maintenance requests")');

  // ── Industry template: Hospital (plan.md §7.5) ───────────────────────
  heading('Industry template');
  const templateResult = await admin.post<{
    categoriesCreated: string[];
    objectsCreated: string[];
  }>('/industry-templates/apply', { tag: 'HOSPITAL' });
  log(`Applied Hospital template — categories: ${templateResult.categoriesCreated.join(', ')}; custom objects: ${templateResult.objectsCreated.join(', ')}`);

  // ── A manually-configured category, to show that path too (not just templates) ──
  const itEquipment = await admin.post<{ id: string }>('/asset-categories', {
    name: 'IT Equipment',
    description: 'Computers, peripherals, and office IT hardware',
  });
  await admin.post(`/asset-categories/${itEquipment.id}/fields`, {
    fieldKey: 'warrantyMonths',
    label: 'Warranty (months)',
    fieldType: 'NUMBER',
    isRequired: true,
  });
  await admin.post(`/asset-categories/${itEquipment.id}/fields`, {
    fieldKey: 'vendor',
    label: 'Vendor',
    fieldType: 'SELECT',
    options: ['Dell', 'HP', 'Lenovo', 'Apple'],
  });
  log('Manually created "IT Equipment" category with custom fields warrantyMonths + vendor');

  const categories = await admin.get<{ id: string; name: string }[]>('/asset-categories');
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));
  const medicalDevicesId = categoryByName.get('Medical Devices')!;
  const bedsId = categoryByName.get('Beds')!;
  const itEquipmentId = categoryByName.get('IT Equipment')!;

  // ── Assets ────────────────────────────────────────────────────────────
  heading('Assets');
  type SeededAsset = { id: string; assetTag: string; name: string };
  const assets: Record<string, SeededAsset> = {};

  async function registerAsset(name: string, categoryId: string, extra: Record<string, unknown> = {}) {
    const asset = await assetManager.post<SeededAsset>('/assets', { name, categoryId, ...extra });
    assets[name] = asset;
    log(`${asset.assetTag}  ${name}`);
    return asset;
  }

  await registerAsset('MRI Scanner Alpha', medicalDevicesId, { location: 'Radiology Wing' });
  await registerAsset('Ultrasound Unit 3', medicalDevicesId, { location: 'Radiology Wing' });
  await registerAsset('Defibrillator Cart 1', medicalDevicesId, { location: 'ICU' });
  await registerAsset('ICU Bed 101', bedsId, { location: 'ICU' });
  await registerAsset('ICU Bed 102', bedsId, { location: 'ICU' });
  await registerAsset('Ward Bed 201', bedsId, { location: 'Radiology Wing' });
  await registerAsset('Reception Laptop', itEquipmentId, {
    location: 'Front Desk',
    customFieldValues: { warrantyMonths: 24, vendor: 'Dell' },
  });
  await registerAsset('Nurse Station PC', itEquipmentId, {
    location: 'ICU',
    customFieldValues: { warrantyMonths: 36, vendor: 'HP' },
  });

  // Status variety so the KPI tiles and status filters have something to show.
  await assetManager.post(`/assets/${assets['Ultrasound Unit 3'].id}/transition`, { event: 'allocate' });
  await assetManager.post(`/assets/${assets['ICU Bed 101'].id}/transition`, { event: 'reserve' });
  await assetManager.post(`/assets/${assets['Nurse Station PC'].id}/transition`, { event: 'retire' });
  await assetManager.post(`/assets/${assets['Nurse Station PC'].id}/transition`, { event: 'dispose' });
  log('Ultrasound Unit 3 -> Allocated, ICU Bed 101 -> Reserved, Nurse Station PC -> Retired -> Disposed');

  // ── Maintenance + Approvals ──────────────────────────────────────────
  heading('Maintenance & approvals');

  // The approvals-engine listener that creates the Approval row runs off the
  // event bus, asynchronously from the POST /maintenance response — poll
  // briefly instead of assuming it has already landed.
  async function approvalIdFor(maintenanceId: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const approval = await assetManager.get<{ id: string } | null>(`/maintenance/${maintenanceId}/approval`).catch(() => null);
      if (approval?.id) return approval.id;
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error(`No approval appeared for maintenance request ${maintenanceId} after polling`);
  }

  // 1) Raised by Employee, approved, worked, resolved.
  const req1 = await employee.post<{ id: string }>('/maintenance', {
    assetId: assets['MRI Scanner Alpha'].id,
    issueDescription: 'Scanner making an unusual grinding noise during startup sequence.',
    priority: 'MEDIUM',
  });
  await assetManager.patch(`/approvals/${await approvalIdFor(req1.id)}/approve`, {
    comment: 'Approved — please schedule a technician this week.',
  });
  await assetManager.patch(`/maintenance/${req1.id}/status`, { status: 'IN_PROGRESS' });
  await assetManager.patch(`/maintenance/${req1.id}/status`, {
    status: 'RESOLVED',
    technicianName: 'Alex Tan',
    resolutionNotes: 'Replaced the startup relay; tested through three full cycles with no recurrence.',
  });
  log('MRI Scanner Alpha: raised by Sam -> approved by Raj -> resolved (technician: Alex Tan)');

  // 2) Raised by Dept Head, left pending — shows up in Raj's approval queue.
  await deptHead.post('/maintenance', {
    assetId: assets['Defibrillator Cart 1'].id,
    issueDescription: 'Battery status indicator is failing intermittently; needs inspection before next shift.',
    priority: 'HIGH',
  });
  log('Defibrillator Cart 1: raised by Meera, left PENDING (visible in Raj\'s Approvals queue)');

  // 3) Raised by Employee, rejected.
  const req3 = await employee.post<{ id: string }>('/maintenance', {
    assetId: assets['Reception Laptop'].id,
    issueDescription: 'Keyboard spacebar sticking occasionally.',
    priority: 'LOW',
  });
  await assetManager.patch(`/approvals/${await approvalIdFor(req3.id)}/reject`, {
    comment: 'Not urgent — bundling with the Q3 hardware refresh instead of a one-off repair.',
  });
  log('Reception Laptop: raised by Sam -> rejected by Raj (comment explains why)');

  // 4) Raised by Dept Head, approved, left in progress (asset now Under Maintenance).
  const req4 = await deptHead.post<{ id: string }>('/maintenance', {
    assetId: assets['Ultrasound Unit 3'].id,
    issueDescription: 'Unit is completely unresponsive — urgent, blocking Radiology schedule.',
    priority: 'CRITICAL',
  });
  await assetManager.patch(`/approvals/${await approvalIdFor(req4.id)}/approve`, {
    comment: 'Approved — treating as urgent.',
  });
  log('Ultrasound Unit 3: raised by Meera (CRITICAL) -> approved by Raj, left APPROVED/Under Maintenance');

  // ── Audit cycle ───────────────────────────────────────────────────────
  heading('Audit cycle');
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const cycle = await admin.post<{ id: string }>('/audits', {
    scopeDepartmentId: radiology.id,
    scopeLocation: 'Radiology Wing',
    startDate: now.toISOString(),
    endDate: inSevenDays.toISOString(),
    auditorUserIds: [assetManagerAuth.user.id, deptHeadAuth.user.id],
  });
  await admin.patch(`/audits/${cycle.id}/status`, { status: 'IN_PROGRESS' });
  log('Audit cycle created (Radiology Wing, 7-day window), auditors: Raj + Meera, started');

  await assetManager.post(`/audits/${cycle.id}/records`, { assetId: assets['ICU Bed 101'].id, result: 'VERIFIED' });
  await assetManager.post(`/audits/${cycle.id}/records`, { assetId: assets['ICU Bed 102'].id, result: 'MISSING' });
  await deptHead.post(`/audits/${cycle.id}/records`, {
    assetId: assets['Ward Bed 201'].id,
    result: 'DAMAGED',
    notes: 'Frame bent on one side — still usable but needs replacement soon.',
  });
  log('Records submitted: ICU Bed 101 Verified, ICU Bed 102 Missing, Ward Bed 201 Damaged');

  await admin.patch(`/audits/${cycle.id}/status`, { status: 'CLOSED' });
  log('Cycle closed -> discrepancy report auto-generated, ICU Bed 102 auto-transitioned to Lost');

  // ── Custom objects: Ward & Patient records (plan.md §7 demo payoff) ──
  heading('Custom object records');
  const objectDefs = await admin.get<{ id: string; key: string }[]>('/custom-objects');
  const wardDefId = objectDefs.find((o) => o.key === 'ward')!.id;
  const patientDefId = objectDefs.find((o) => o.key === 'patient')!.id;

  const icuWard = await admin.post<{ id: string }>(`/custom-objects/${wardDefId}/records`, {
    data: { wardName: 'ICU', floor: 3 },
  });
  const radiologyWard = await admin.post<{ id: string }>(`/custom-objects/${wardDefId}/records`, {
    data: { wardName: 'Radiology', floor: 1 },
  });
  log('Ward records: ICU (floor 3), Radiology (floor 1)');

  await admin.post(`/custom-objects/${patientDefId}/records`, {
    data: {
      fullName: 'John Smith',
      admissionDate: new Date().toISOString().slice(0, 10),
      ward: icuWard.id,
      assignedBed: assets['ICU Bed 101'].id,
    },
  });
  await admin.post(`/custom-objects/${patientDefId}/records`, {
    data: {
      fullName: 'Alice Brown',
      admissionDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      ward: radiologyWard.id,
      assignedBed: assets['Ward Bed 201'].id,
    },
  });
  log('Patient records: John Smith (ICU, Bed 101), Alice Brown (Radiology, Bed 201)');

  // ── Summary ───────────────────────────────────────────────────────────
  heading('Done. Demo credentials (all use the same password):');
  console.log(`
  Organization: ${ORG_NAME}  (slug: ${orgSlug})
  Password for every account below: ${PASSWORD}

  Admin              admin@northwind.demo
  Asset Manager      assetmanager@northwind.demo
  Department Head    depthead@northwind.demo
  Employee           employee@northwind.demo
`);
}

main().catch((err) => {
  console.error('\nSeed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
