const STORAGE_KEY = 'weatherride.routePlanDraft';

export interface RoutePlanDraft {
  routeMode: 'gpx' | 'direct';
  departureAt: string;
  speedMode: 'speed' | 'duration';
  averageSpeedKmh: number | null;
  plannedDurationHours: number | null;
  sampleCount: number;
  pointALatitude: number | null;
  pointALongitude: number | null;
  pointBLatitude: number | null;
  pointBLongitude: number | null;
}

/** The GPX file itself is intentionally not part of the draft — a File can't survive
 * JSON serialization, so GPX mode always needs a fresh upload after a reload. */
export function loadRoutePlanDraft(): RoutePlanDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return isRoutePlanDraft(parsed) ? parsed : null;
  } catch {
    // Private browsing, disabled storage, or corrupted JSON — just skip the restore.
    return null;
  }
}

export function saveRoutePlanDraft(draft: RoutePlanDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable or quota exceeded — the draft simply won't persist this time.
  }
}

function isRoutePlanDraft(value: unknown): value is RoutePlanDraft {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>)['routeMode'] !== undefined &&
    (value as Record<string, unknown>)['departureAt'] !== undefined
  );
}
