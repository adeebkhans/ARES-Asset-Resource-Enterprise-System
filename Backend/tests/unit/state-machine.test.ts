import { describe, expect, it } from 'vitest';
import { assertTransition } from '@/shared/state-machine';
import { ASSET_TRANSITIONS } from '@/constants/asset-states';
import { ApiError } from '@/core/errors/ApiError';

describe('assertTransition (asset lifecycle FSM)', () => {
  it('allows Available -> Allocated via "allocate"', () => {
    expect(assertTransition(ASSET_TRANSITIONS, 'AVAILABLE', 'allocate')).toBe('ALLOCATED');
  });

  it('allows Allocated -> Available via "return"', () => {
    expect(assertTransition(ASSET_TRANSITIONS, 'ALLOCATED', 'return')).toBe('AVAILABLE');
  });

  it('rejects an illegal transition (Disposed cannot be allocated)', () => {
    expect(() => assertTransition(ASSET_TRANSITIONS, 'DISPOSED', 'allocate')).toThrow(ApiError);
  });

  it('rejects an unknown event from a valid state', () => {
    expect(() => assertTransition(ASSET_TRANSITIONS, 'AVAILABLE', 'teleport')).toThrow(ApiError);
  });

  it('allows retiring from multiple source states', () => {
    expect(assertTransition(ASSET_TRANSITIONS, 'LOST', 'retire')).toBe('RETIRED');
    expect(assertTransition(ASSET_TRANSITIONS, 'UNDER_MAINTENANCE', 'retire')).toBe('RETIRED');
  });
});
