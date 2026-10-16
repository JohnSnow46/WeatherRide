import { PlanRouteResponse } from './route-plan-api.model';

const STORAGE_KEY = 'weatherride.routePlanResult';

export interface RoutePlanResultSnapshot {
  result: PlanRouteResponse;
  lastDepartureAtIso: string;
  lastAverageSpeedKmh: number | null;
  lastPlannedDurationHours: number | null;
  departureShiftHours: number;
}

/** The counterpart to route-plan-draft-storage (form fields only) -- this persists the
 * planned RESULT itself (roadmap #8's remaining "smaller next step"), so a refresh shows
 * the last computed route instead of a blank state. GPX mode still needs a fresh upload
 * to plan a NEW route after a reload (the File itself never survives JSON), but the
 * previous result stays visible/interactive (departure-shift, variant comparison) until
 * the user plans again or clears it. */
export function loadRoutePlanResult(): RoutePlanResultSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return isRoutePlanResultSnapshot(parsed) ? parsed : null;
  } catch {
    // Private browsing, disabled storage, or corrupted JSON — just skip the restore.
    return null;
  }
}

export function saveRoutePlanResult(snapshot: RoutePlanResultSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage unavailable or quota exceeded — the snapshot simply won't persist this time.
  }
}

export function clearRoutePlanResult(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

function isRoutePlanResultSnapshot(value: unknown): value is RoutePlanResultSnapshot {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>)['result'] !== undefined &&
    (value as Record<string, unknown>)['lastDepartureAtIso'] !== undefined
  );
}
