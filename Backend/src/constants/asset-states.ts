import { AssetStatus } from '@prisma/client';

/**
 * Explicit finite-state-machine definition for the Asset lifecycle (plan.md §5.3).
 * Every accepted transition must appear here. `shared/state-machine.ts` enforces
 * this table so illegal transitions never reach the database.
 */
export interface AssetTransition {
  from: AssetStatus[];
  to: AssetStatus;
  event: string;
}

export const ASSET_TRANSITIONS: AssetTransition[] = [
  { from: ['AVAILABLE'], to: 'ALLOCATED', event: 'allocate' },
  { from: ['AVAILABLE'], to: 'RESERVED', event: 'reserve' },
  { from: ['RESERVED'], to: 'ALLOCATED', event: 'confirm_reservation' },
  { from: ['ALLOCATED'], to: 'AVAILABLE', event: 'return' },
  { from: ['AVAILABLE', 'ALLOCATED'], to: 'UNDER_MAINTENANCE', event: 'approve_maintenance' },
  { from: ['UNDER_MAINTENANCE'], to: 'AVAILABLE', event: 'resolve_maintenance' },
  {
    from: ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE'],
    to: 'LOST',
    event: 'audit_missing',
  },
  { from: ['LOST'], to: 'AVAILABLE', event: 'recover' },
  {
    from: ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST'],
    to: 'RETIRED',
    event: 'retire',
  },
  { from: ['RETIRED'], to: 'DISPOSED', event: 'dispose' },
];
