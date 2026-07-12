import { prisma } from '@/core/database/prisma';
import { logger } from '@/config/logger';

export interface AssetRiskScore {
  assetId: string;
  score: number;
  breakdown: {
    ageScore: number;
    maintenanceScore: number;
    conditionScore: number;
  };
}

/**
 * Compute risk scores for all assets in an org.
 *
 * Formula (plan.md §8.1):
 *   score = clamp(
 *     w1 * normalize(ageMonths / 60) +      // age: 5 years = max risk
 *     w2 * normalize(maintenanceCount / 5) + // 5+ maintenance events = max risk
 *     w3 * conditionFactor,                   // condition-based penalty
 *   , 0, 100)
 *
 * Weights are configurable per-org via Organization.settings.riskWeights.
 * Sane defaults: age=0.4, maintenance=0.35, condition=0.25
 */
export async function computeRiskScores(orgId: string): Promise<AssetRiskScore[]> {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
  const settings = (org?.settings as Record<string, unknown>) ?? {};
  const weights = (settings.riskWeights as Record<string, number>) ?? {};

  const wAge = weights.age ?? 0.4;
  const wMaintenance = weights.maintenance ?? 0.35;
  const wCondition = weights.condition ?? 0.25;

  // Fetch all active assets with their maintenance history
  const assets = await prisma.asset.findMany({
    where: {
      orgId,
      status: { notIn: ['RETIRED', 'DISPOSED'] },
    },
    include: {
      maintenanceRequests: {
        where: { status: 'RESOLVED' },
        select: { id: true, createdAt: true },
      },
    },
  });

  const now = Date.now();
  const scores: AssetRiskScore[] = [];

  for (const asset of assets) {
    // Age score: months since acquisition / 60 (5 years), capped at 1
    const ageMonths = asset.acquisitionDate
      ? Math.floor((now - new Date(asset.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;
    const ageScore = Math.min(ageMonths / 60, 1);

    // Maintenance score: count / 5, capped at 1
    const maintenanceCount = asset.maintenanceRequests.length;
    const maintenanceScore = Math.min(maintenanceCount / 5, 1);

    // Condition score: based on condition field
    let conditionScore = 0.3; // default medium risk
    const condition = asset.condition?.toLowerCase() ?? '';
    if (condition.includes('excellent') || condition.includes('new')) conditionScore = 0;
    else if (condition.includes('good')) conditionScore = 0.15;
    else if (condition.includes('fair') || condition.includes('okay')) conditionScore = 0.4;
    else if (condition.includes('poor') || condition.includes('worn')) conditionScore = 0.7;
    else if (condition.includes('bad') || condition.includes('damaged')) conditionScore = 1;

    // Weighted sum, clamped to 0-100
    const raw = wAge * ageScore + wMaintenance * maintenanceScore + wCondition * conditionScore;
    const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);

    scores.push({
      assetId: asset.id,
      score,
      breakdown: {
        ageScore: Math.round(ageScore * 100),
        maintenanceScore: Math.round(maintenanceScore * 100),
        conditionScore: Math.round(conditionScore * 100),
      },
    });
  }

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Run nightly predictive scoring job (plan.md §5.7).
 * Stores results in-memory for dashboard consumption; in production this
 * would write to an AssetRiskScore table, but for the prototype we compute
 * on-demand and cache the result.
 */
const cachedScores: Map<string, AssetRiskScore[]> = new Map();
const lastComputed: Map<string, Date> = new Map();

export async function runPredictiveScoring(): Promise<void> {
  logger.info('Running predictive maintenance scoring');
  try {
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    for (const org of orgs) {
      const scores = await computeRiskScores(org.id);
      cachedScores.set(org.id, scores);
      lastComputed.set(org.id, new Date());
    }
    logger.info({ orgCount: orgs.length }, 'Predictive scoring complete');
  } catch (err) {
    logger.error({ err }, 'Predictive scoring failed');
  }
}

export function getCachedScores(orgId: string): AssetRiskScore[] {
  return cachedScores.get(orgId) ?? [];
}

export function getLastComputed(orgId: string): Date | null {
  return lastComputed.get(orgId) ?? null;
}
