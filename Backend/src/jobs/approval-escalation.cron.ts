import { logger } from '@/config/logger';
import { ApprovalService } from '@/modules/approvals/approval.service';

const service = new ApprovalService();

/**
 * Run every 15 minutes (plan.md §5.7).
 * Finds approvals past dueAt, escalates to escalateToRole.
 */
export async function runApprovalEscalation(): Promise<void> {
  logger.info('Running approval escalation check');
  try {
    const escalated = await service.escalateOverdue();
    logger.info({ escalated }, 'Approval escalation complete');
  } catch (err) {
    logger.error({ err }, 'Approval escalation failed');
  }
}
