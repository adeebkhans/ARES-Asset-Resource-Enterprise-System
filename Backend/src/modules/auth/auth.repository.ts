import { User } from '@prisma/client';
import { prisma } from '@/core/database/prisma';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'org';
}

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findOrgBySlug(slug: string) {
    return prisma.organization.findUnique({ where: { slug } });
  }

  /** Generates a unique org slug from the display name, appending -2, -3, ... on collision. */
  async generateUniqueSlug(organizationName: string): Promise<string> {
    const base = slugify(organizationName);
    let candidate = base;
    let suffix = 1;
    // Collision volume is expected to be tiny; a loop is simpler and clearer than a clever query here.
    while (await prisma.organization.findUnique({ where: { slug: candidate }, select: { id: true } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  async createOrganizationWithAdmin(params: {
    organizationName: string;
    slug: string;
    adminName: string;
    email: string;
    passwordHash: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: params.organizationName, slug: params.slug },
      });
      const user = await tx.user.create({
        data: {
          orgId: org.id,
          name: params.adminName,
          email: params.email,
          passwordHash: params.passwordHash,
          role: 'ADMIN',
        },
      });
      return { org, user };
    });
  }

  async createEmployee(params: { orgId: string; name: string; email: string; passwordHash: string }): Promise<User> {
    return prisma.user.create({
      data: {
        orgId: params.orgId,
        name: params.name,
        email: params.email,
        passwordHash: params.passwordHash,
        role: 'EMPLOYEE',
      },
    });
  }

  async storeRefreshToken(params: { id: string; userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data: params });
  }

  async findRefreshTokenById(id: string) {
    return prisma.refreshToken.findUnique({ where: { id } });
  }

  async revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async revokeAllRefreshTokensForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
