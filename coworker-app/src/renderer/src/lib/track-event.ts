import type { EventType } from '@coworker/shared-services'

export function trackEvent(type: EventType, details?: Record<string, unknown>): void {
  window.api.events.track({ type, details }).catch((error) => {
    console.warn('[track-event] Failed to track event:', type, error)
  })
}
