import { logger } from '@/config/logger';
import { runApprovalEscalation } from './approval-escalation.cron';

const ESCALATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Start all background jobs (plan.md §5.7).
 * Uses setInterval instead of BullMQ for prototype simplicity.
 */
export function startJobs(): void {
  logger.info('Starting background jobs');

  // Approval escalation — every 15 minutes
  setInterval(runApprovalEscalation, ESCALATION_INTERVAL_MS);
  // Run once immediately on boot
  runApprovalEscalation();

  logger.info('Background jobs started');
}
