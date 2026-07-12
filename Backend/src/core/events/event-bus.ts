import { EventEmitter } from 'node:events';
import { logger } from '@/config/logger';
import { DomainEventMap, DomainEventName } from './event-types';

/**
 * Typed wrapper around Node's EventEmitter used to decouple modules (plan.md §5.1, §5.4).
 * A module publishes a domain event on state change; unrelated modules (activity logs,
 * notifications, dashboard cache invalidation, escalation timers) subscribe independently
 * instead of being called inline from the originating service.
 */
class EventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit<E extends DomainEventName>(event: E, payload: DomainEventMap[E]): void {
    logger.debug({ event, payload }, 'domain event emitted');
    this.emitter.emit(event, payload);
  }

  on<E extends DomainEventName>(event: E, listener: (payload: DomainEventMap[E]) => void | Promise<void>): void {
    this.emitter.on(event, (payload: DomainEventMap[E]) => {
      Promise.resolve(listener(payload)).catch((err) =>
        logger.error({ err, event }, 'domain event listener failed'),
      );
    });
  }
}

export const eventBus = new EventBus();
