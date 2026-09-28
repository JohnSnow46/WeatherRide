import { Injectable, signal } from '@angular/core';

import { PlanRouteResponse } from './route-plan-api.model';

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
}
