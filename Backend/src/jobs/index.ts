import { logger } from '@/config/logger';
import { runApprovalEscalation } from './approval-escalation.cron';
import { runPredictiveScoring } from './predictive-scoring';

const ESCALATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const SCORING_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours (nightly)

/**
 * Start all background jobs (plan.md §5.7).
 * Uses setInterval instead of BullMQ for prototype simplicity.
 */
export function startJobs(): void {
  logger.info('Starting background jobs');

  // Approval escalation — every 15 minutes
  setInterval(runApprovalEscalation, ESCALATION_INTERVAL_MS);
  runApprovalEscalation();

  // Predictive maintenance scoring — nightly
  setInterval(runPredictiveScoring, SCORING_INTERVAL_MS);
  runPredictiveScoring();

  logger.info('Background jobs started');
}
