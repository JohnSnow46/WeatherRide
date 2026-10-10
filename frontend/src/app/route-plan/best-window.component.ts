import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { RoutePlanApiService } from './route-plan-api.service';
import { RoutePlanStateService } from './route-plan-state.service';
import { RouteVariant, pickBestVariant } from './variant-comparison';

const WINDOW_HOURS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;

/** "Find best departure hour" (roadmap #12): extends the manual departure-shift control
 * (#3) by reforecasting every hourly shift in a +/-6h window in parallel and jumping
 * straight to whichever has the least rain, instead of checking shift-by-shift by hand. */
@Component({
  selector: 'app-best-window',
  templateUrl: './best-window.component.html',
  styleUrl: './best-window.component.scss'
})
export class BestWindowComponent {
  protected readonly routePlanStateService = inject(RoutePlanStateService);
  private readonly routePlanApiService = inject(RoutePlanApiService);

  protected readonly isSearching = signal(false);
  protected readonly error = signal<string | null>(null);

  findBest(): void {
    const state = this.routePlanStateService;
    const result = state.result();
    const lastDepartureAtIso = state.lastDepartureAtIso();

    if (!result || !lastDepartureAtIso || this.isSearching()) {
      return;
    }

    const originalDepartureAt = new Date(lastDepartureAtIso);
    const samples = result.samples.map((s) => ({
      latitude: s.latitude,
      longitude: s.longitude,
      distanceFromStartKm: s.distanceFromStartKm
    }));

    this.isSearching.set(true);
    this.error.set(null);

    const requests = WINDOW_HOURS.map((shiftHours) => {
      const shiftedDepartureAt = new Date(originalDepartureAt.getTime());
      shiftedDepartureAt.setHours(shiftedDepartureAt.getHours() + shiftHours);

      return this.routePlanApiService.reforecastRoute(
        samples,
        result.totalDistanceKm,
        this.toLocalIso(shiftedDepartureAt),
        state.lastAverageSpeedKmh(),
        state.lastPlannedDurationHours()
      );
    });

    forkJoin(requests).subscribe({
      next: (responses) => {
        const variants: RouteVariant[] = responses.map((response, i) => ({
          label: `${WINDOW_HOURS[i]}h`,
          departureShiftHours: WINDOW_HOURS[i],
          samples: response.samples
        }));
        const best = pickBestVariant(variants);

        state.result.set({ ...result, samples: best.samples });
        state.departureShiftHours.set(best.departureShiftHours);
        this.isSearching.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Could not search the departure window.');
        this.isSearching.set(false);
      }
    });
  }

  /* Same "raw local clock digits, no UTC conversion" convention as departure-shift's
   * toLocalIso: reconstruct from Date's local getters, never toISOString(). */
  private toLocalIso(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  }
}
