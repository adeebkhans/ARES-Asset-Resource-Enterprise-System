/**
 * Domain event catalog. New modules should subscribe to existing events instead
 * of the emitting module needing to know they exist — see plan.md §5.4 and
 * docs/event-catalog.md for the full, documented list and payload shapes.
 *
 * Phase 0 only defines identity/asset lifecycle events; later phases append
 * their own event map entries here rather than creating parallel buses.
 */
import { AssetStatus, AssetStatusChangeSource } from '@prisma/client';

export interface DomainEventMap {
  'user.registered': { userId: string; orgId: string; email: string };
  'asset.status.changed': {
    assetId: string;
    orgId: string;
    fromStatus: AssetStatus | null;
    toStatus: AssetStatus;
    changedBy: string | null;
    source: AssetStatusChangeSource;
    reason?: string;
  };
  'asset.registered': { assetId: string; orgId: string; categoryId: string; registeredBy: string };
}

export type DomainEventName = keyof DomainEventMap;
