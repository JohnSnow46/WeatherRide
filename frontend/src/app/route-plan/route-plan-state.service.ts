import { effect, Injectable, signal } from '@angular/core';

import { PlanRouteResponse } from './route-plan-api.model';
import { RouteVariant } from './variant-comparison';
import { clearRoutePlanResult, loadRoutePlanResult, saveRoutePlanResult } from './route-plan-result-storage';

@Injectable({ providedIn: 'root' })
export class RoutePlanStateService {
  result = signal<PlanRouteResponse | null>(null);
  error = signal<string | null>(null);
  isLoading = signal(false);
  selectedDistanceKm = signal(0);

  /** Original request params of the current result, kept so the departure-shift control
   * can recompute against them without asking the user to resubmit the form. */
  lastDepartureAtIso = signal<string | null>(null);
  lastAverageSpeedKmh = signal<number | null>(null);
  lastPlannedDurationHours = signal<number | null>(null);
  departureShiftHours = signal(0);

  /** Snapshots of the result at different departure-time shifts, kept in memory only for
   * side-by-side comparison — cleared whenever a brand new route is planned (see
   * route-plan-form's onSubmit), never persisted across visits. */
  comparisonVariants = signal<RouteVariant[]>([]);

  constructor() {
    // Counterpart to route-plan-form's draft storage (form fields only) -- roadmap #8's
    // remaining "smaller next step": persist the planned RESULT itself so a reload shows
    // the last computed route instead of a blank state, GPX re-upload only required to
    // plan a NEW route. Restored once on construction (this service is a root singleton).
    const snapshot = loadRoutePlanResult();
    if (snapshot) {
      this.result.set(snapshot.result);
      this.lastDepartureAtIso.set(snapshot.lastDepartureAtIso);
      this.lastAverageSpeedKmh.set(snapshot.lastAverageSpeedKmh);
      this.lastPlannedDurationHours.set(snapshot.lastPlannedDurationHours);
      this.departureShiftHours.set(snapshot.departureShiftHours);
    }

    effect(() => {
      const result = this.result();
      const lastDepartureAtIso = this.lastDepartureAtIso();
      if (result && lastDepartureAtIso) {
        saveRoutePlanResult({
          result,
          lastDepartureAtIso,
          lastAverageSpeedKmh: this.lastAverageSpeedKmh(),
          lastPlannedDurationHours: this.lastPlannedDurationHours(),
          departureShiftHours: this.departureShiftHours()
        });
      } else {
        clearRoutePlanResult();
      }
    });
  }

  /** Clears the current result (in memory and from storage) — the "Wyczyść" (start over)
   * action roadmap #8 originally called for alongside the persistence itself. */
  clearResult(): void {
    this.result.set(null);
    this.lastDepartureAtIso.set(null);
    this.lastAverageSpeedKmh.set(null);
    this.lastPlannedDurationHours.set(null);
    this.departureShiftHours.set(0);
    this.comparisonVariants.set([]);
  }
}
