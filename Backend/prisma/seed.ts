/**
 * Phase 7 — Seed script for ARES ERP demo data.
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *
 * Requires a running PostgreSQL instance and DATABASE_URL set in .env.
 * Idempotent: safe to re-run; uses upsert for org/user, skips if data exists.
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Demo1234!';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const ORG_NAME = 'Acme Corp';
const ORG_SLUG = 'acme-corp';

const USERS = [
  { name: 'Alice Admin', email: 'alice@acme.com', role: 'ADMIN' as const },
  { name: 'Bob Manager', email: 'bob@acme.com', role: 'ASSET_MANAGER' as const },
  { name: 'Carol Head', email: 'carol@acme.com', role: 'DEPARTMENT_HEAD' as const },
  { name: 'Dave Employee', email: 'dave@acme.com', role: 'EMPLOYEE' as const },
  { name: 'Eve Employee', email: 'eve@acme.com', role: 'EMPLOYEE' as const },
];

const DEPARTMENTS = ['Engineering', 'Operations', 'Finance', 'Human Resources', 'IT'];

const CATEGORIES = [
  { name: 'Laptops', description: 'Notebook computers' },
  { name: 'Monitors', description: 'Desktop displays' },
  { name: 'Office Furniture', description: 'Desks, chairs, etc.' },
  { name: 'Vehicles', description: 'Company cars and trucks' },
  { name: 'Machinery', description: 'Industrial equipment' },
  { name: 'Networking', description: 'Routers, switches, cabling' },
];

const LOCATIONS = ['HQ Floor 1', 'HQ Floor 2', 'HQ Floor 3', 'Warehouse A', 'Warehouse B', 'Remote'];

const ASSET_NAMES: Record<string, string[]> = {
  Laptops: ['MacBook Pro 14"', 'ThinkPad X1 Carbon', 'Dell XPS 15', 'HP Spectre x360', 'MacBook Air M2'],
  Monitors: ['LG UltraWide 34"', 'Dell U2723QE', 'Samsung ViewFinity', 'BenQ PD2725U'],
  'Office Furniture': ['Herman Miller Aeron', 'Standing Desk Pro', ' filing Cabinet', 'Conference Table'],
  Vehicles: ['Ford Transit Van', 'Tesla Model 3', 'Toyota Hilux', 'Ford F-150'],
  Machinery: ['CNC Router', '3D Printer', 'Welding Station', 'Hydraulic Press'],
  Networking: ['UniFi Dream Machine', 'Cisco Catalyst Switch', 'Meraki AP', 'Patch Panel'],
};

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

const MAINTENANCE_ISSUES = [
  'Screen flickering intermittently',
  'Battery drains in under 30 minutes',
  'Keyboard keys sticking',
  'Unusual fan noise under load',
  'Cracked display bezel',
  'USB-C port not charging',
  'Network connectivity drops',
  'Software crashes on boot',
  'Hard drive making clicking sounds',
  'Overheating during normal use',
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Seeding ARES demo data…');

  // ── Organization ──────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    create: {
      name: ORG_NAME,
      slug: ORG_SLUG,
      subscriptionTier: 'ENTERPRISE',
      maxUsers: 50,
      settings: {
        riskWeights: { age: 0.4, maintenance: 0.35, condition: 0.25 },
      },
    },
    update: {},
  });
  console.log(`  Organization: ${org.name} (${org.id})`);

  // ── Users ─────────────────────────────────────────────────────────────
  const hashedPw = await hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  const users: { id: string; name: string; email: string; role: string }[] = [];

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: hashedPw,
        role: u.role,
        orgId: org.id,
        status: 'ACTIVE',
      },
      update: { role: u.role },
    });
    users.push(user);
  }
  console.log(`  Users: ${users.length}`);

  // ── Departments ───────────────────────────────────────────────────────
  const departments: { id: string; name: string }[] = [];
  for (const name of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { orgId_name: { orgId: org.id, name } },
      create: {
        orgId: org.id,
        name,
        status: 'ACTIVE',
      },
      update: {},
    });
    departments.push(dept);
  }
  console.log(`  Departments: ${departments.length}`);

  // Assign department heads
  const carol = users.find((u) => u.role === 'DEPARTMENT_HEAD');
  if (carol) {
    await prisma.department.update({
      where: { id: departments[0].id },
      data: { headUserId: carol.id },
    });
  }

  // ── Asset Categories ──────────────────────────────────────────────────
  const categories: { id: string; name: string }[] = [];
  for (const cat of CATEGORIES) {
    const existing = await prisma.assetCategory.findFirst({
      where: { orgId: org.id, name: cat.name },
    });
    const category = existing
      ? await prisma.assetCategory.update({ where: { id: existing.id }, data: { description: cat.description } })
      : await prisma.assetCategory.create({
          data: {
            orgId: org.id,
            name: cat.name,
            description: cat.description,
            customFieldSchema: {},
          },
        });
    categories.push(category);
  }
  console.log(`  Categories: ${categories.length}`);

  // ── Assets ────────────────────────────────────────────────────────────
  const assetStatuses = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED'] as const;
  let assetSeq = 0;
  const assets: { id: string; assetTag: string; name: string; status: string }[] = [];

  for (const cat of categories) {
    const names = ASSET_NAMES[cat.name] ?? ['Generic Asset'];
    for (const name of names) {
      assetSeq++;
      const assetTag = `ACM-${String(assetSeq).padStart(4, '0')}`;
      const ageMonths = randomInt(1, 60);
      const status = randomElement([...assetStatuses]);

      const asset = await prisma.asset.upsert({
        where: { orgId_assetTag: { orgId: org.id, assetTag } },
        create: {
          orgId: org.id,
          assetTag,
          name,
          categoryId: cat.id,
          acquisitionDate: monthsAgo(ageMonths),
          acquisitionCost: randomInt(200, 50000),
          condition: randomElement(CONDITIONS),
          location: randomElement(LOCATIONS),
          isShared: Math.random() > 0.7,
          status,
        },
        update: { status },
      });
      assets.push(asset);
    }
  }
  console.log(`  Assets: ${assets.length}`);

  // ── Maintenance Requests ──────────────────────────────────────────────
  const maintenanceStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED'] as const;
  let maintenanceCount = 0;

  for (const asset of assets.filter((a) => Math.random() > 0.6)) {
    const daysOld = randomInt(1, 90);
    const status = randomElement([...maintenanceStatuses]);
    const priority = randomElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const);
    const raiser = randomElement(users);

    await prisma.maintenanceRequest.create({
      data: {
        orgId: org.id,
        assetId: asset.id,
        raisedById: raiser.id,
        issueDescription: randomElement(MAINTENANCE_ISSUES),
        priority,
        status,
        technicianName: status !== 'PENDING' ? randomElement(['John Tech', 'Mike Wrench', 'Sarah Fixit']) : null,
        resolvedAt: status === 'RESOLVED' ? daysAgo(randomInt(0, daysOld)) : null,
        resolutionNotes: status === 'RESOLVED' ? 'Issue resolved successfully.' : null,
        createdAt: daysAgo(daysOld),
      },
    });
    maintenanceCount++;
  }
  console.log(`  Maintenance requests: ${maintenanceCount}`);

  // ── Audit Cycles ──────────────────────────────────────────────────────
  const auditStatuses = ['PLANNED', 'IN_PROGRESS', 'CLOSED'] as const;
  let auditCycleCount = 0;

  for (let i = 0; i < 5; i++) {
    const status = randomElement([...auditStatuses]);
    const cycle = await prisma.auditCycle.create({
      data: {
        orgId: org.id,
        scopeDepartmentId: randomElement(departments).id,
        scopeLocation: randomElement(LOCATIONS),
        startDate: daysAgo(randomInt(30, 180)),
        endDate: daysAgo(randomInt(0, 29)),
        status,
        createdBy: users[0].id,
      },
    });

    // Assign auditors
    const auditor = randomElement(users);
    await prisma.auditAssignment.create({
      data: {
        auditCycleId: cycle.id,
        auditorId: auditor.id,
        assignedAt: daysAgo(randomInt(60, 180)),
      },
    });

    // Create records for some assets
    if (status !== 'PLANNED') {
      const sampledAssets = assets.sort(() => Math.random() - 0.5).slice(0, randomInt(3, 8));
      for (const asset of sampledAssets) {
        await prisma.auditRecord.create({
          data: {
            auditCycleId: cycle.id,
            assetId: asset.id,
            result: randomElement(['VERIFIED', 'MISSING', 'DAMAGED'] as const),
            notes: Math.random() > 0.5 ? 'Normal condition' : null,
            auditedById: auditor.id,
            auditedAt: daysAgo(randomInt(0, 30)),
          },
        });
      }

      // Discrepancy report for completed cycles
      if (status === 'CLOSED') {
        await prisma.discrepancyReport.create({
          data: {
            auditCycleId: cycle.id,
            itemCount: randomInt(0, 5),
            summary: {},
          },
        });
      }
    }

    auditCycleCount++;
  }
  console.log(`  Audit cycles: ${auditCycleCount}`);

  // ── Approval Rules ────────────────────────────────────────────────────
  await prisma.approvalRule.create({
    data: {
      orgId: org.id,
      approvalType: 'MAINTENANCE',
      slaHours: 48,
      escalateToRole: 'ADMIN',
      createdBy: users[0].id,
    },
  });
  console.log('  Approval rules: 1');

  // ── Notifications ─────────────────────────────────────────────────────
  const notificationTypes = ['MAINTENANCE_RAISED', 'MAINTENANCE_RESOLVED', 'APPROVAL_REQUIRED', 'AUDIT_ASSIGNED'];
  let notificationCount = 0;

  for (const user of users) {
    for (let i = 0; i < randomInt(2, 8); i++) {
      const type = randomElement(notificationTypes);
      await prisma.notification.create({
        data: {
          orgId: org.id,
          userId: user.id,
          type,
          title: type.replace(/_/g, ' '),
          message: `Demo notification for ${user.name}`,
          isRead: Math.random() > 0.4,
          createdAt: daysAgo(randomInt(0, 30)),
        },
      });
      notificationCount++;
    }
  }
  console.log(`  Notifications: ${notificationCount}`);

  console.log('\nSeed complete!');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
