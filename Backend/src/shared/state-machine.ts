import { ApiError } from '@/core/errors/ApiError';

export interface Transition<S extends string> {
  from: S[];
  to: S;
  event: string;
}

/**
 * Generic finite-state-machine guard used for Asset lifecycle today and intended
 * for Approval/Booking status transitions as those modules land (plan.md §5.3).
 * Throws instead of returning a boolean so callers can't accidentally ignore
 * an illegal transition.
 */
export function assertTransition<S extends string>(
  transitions: Transition<S>[],
  current: S,
  event: string,
): S {
  const match = transitions.find((t) => t.event === event && t.from.includes(current));
  if (!match) {
    throw ApiError.invalidStateTransition(`Cannot apply event "${event}" from state "${current}"`, {
      current,
      event,
    });
  }
  return match.to;
}
