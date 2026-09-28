import { Component, inject, signal } from '@angular/core';

import { RoutePlanApiService } from './route-plan-api.service';
import { RoutePlanStateService } from './route-plan-state.service';

const SHIFT_STEPS_HOURS = [-3, -1, 1, 3] as const;

/** "What if I left at a different time" control: recomputes ETA/weather for the current
 * result against a shifted departure time, reusing the already-planned samples (no GPX
 * re-upload, no re-sampling) via POST /api/routes/reforecast. */
@Component({
  selector: 'app-departure-shift',
  templateUrl: './departure-shift.component.html',
  styleUrl: './departure-shift.component.scss'
})
export class DepartureShiftComponent {
  protected readonly routePlanStateService = inject(RoutePlanStateService);
  private readonly routePlanApiService = inject(RoutePlanApiService);

  protected readonly steps = SHIFT_STEPS_HOURS;
  protected readonly isShifting = signal(false);
  protected readonly error = signal<string | null>(null);

  shift(deltaHours: number): void {
    this.applyShift(this.routePlanStateService.departureShiftHours() + deltaHours);
  }

  reset(): void {
    this.applyShift(0);
  }

  private applyShift(newShiftHours: number): void {
    const state = this.routePlanStateService;
    const result = state.result();
    const lastDepartureAtIso = state.lastDepartureAtIso();

    if (!result || !lastDepartureAtIso || this.isShifting()) {
      return;
    }

    const originalDepartureAt = new Date(lastDepartureAtIso);
    const newDepartureAt = new Date(originalDepartureAt.getTime());
    newDepartureAt.setHours(newDepartureAt.getHours() + newShiftHours);

    const samples = result.samples.map((s) => ({
      latitude: s.latitude,
      longitude: s.longitude,
      distanceFromStartKm: s.distanceFromStartKm
    }));

    this.isShifting.set(true);
    this.error.set(null);

    this.routePlanApiService
      .reforecastRoute(
        samples,
        result.totalDistanceKm,
        this.toLocalIso(newDepartureAt),
        state.lastAverageSpeedKmh(),
        state.lastPlannedDurationHours()
      )
      .subscribe({
        next: (response) => {
          state.result.set({ ...result, samples: response.samples });
          state.departureShiftHours.set(newShiftHours);
          this.isShifting.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.detail ?? 'Could not reforecast for the shifted departure time.');
          this.isShifting.set(false);
        }
      });
  }

  /* Same "raw local clock digits, no UTC conversion" convention as route-plan-form's
   * departureAtIso: reconstruct from Date's local getters, never toISOString() (that would
   * shift by the browser's UTC offset and break the match against Open-Meteo's forecast). */
  private toLocalIso(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  }
}
