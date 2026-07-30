import { Injectable, signal } from '@angular/core';

import { PlanRouteResponse } from './route-plan-api.model';

@Injectable({ providedIn: 'root' })
export class RoutePlanStateService {
  result = signal<PlanRouteResponse | null>(null);
  error = signal<string | null>(null);
  isLoading = signal(false);
  selectedDistanceKm = signal(0);
}
