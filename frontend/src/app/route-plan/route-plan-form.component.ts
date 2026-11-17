import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { RoutePlanApiService } from './route-plan-api.service';
import { loadRoutePlanDraft, saveRoutePlanDraft } from './route-plan-draft-storage';
import { RoutePlanStateService } from './route-plan-state.service';

interface TravelMode {
  readonly label: string;
  readonly speedKmh: number;
}

@Component({
  selector: 'app-route-plan-form',
  imports: [ReactiveFormsModule],
  templateUrl: './route-plan-form.component.html',
  styleUrl: './route-plan-form.component.scss'
})
export class RoutePlanFormComponent {
  private static readonly MAX_GPX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  /** Mirrors `forecast_days` in OpenMeteoWeatherClient. */
  private static readonly FORECAST_DAYS = 16;

  readonly travelModes: readonly TravelMode[] = [
    { label: 'Walking', speedKmh: 5 },
    { label: 'Cycling', speedKmh: 18 },
    { label: 'Driving', speedKmh: 50 }
  ];

  private readonly fb = inject(FormBuilder);
  private readonly routePlanApiService = inject(RoutePlanApiService);
  protected readonly routePlanStateService = inject(RoutePlanStateService);

  readonly selectedFile = signal<File | null>(null);
  readonly isDragging = signal(false);

  readonly form = this.fb.group({
    routeMode: ['gpx' as 'gpx' | 'direct'],
    departureAt: ['', Validators.required],
    speedMode: ['speed'],
    averageSpeedKmh: [null as number | null],
    plannedDurationHours: [null as number | null],
    sampleCount: [20],
    pointALatitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    pointALongitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
    pointBLatitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    pointBLongitude: [null as number | null, [Validators.min(-180), Validators.max(180)]]
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  constructor() {
    const draft = loadRoutePlanDraft();
    if (draft) {
      this.form.patchValue(draft);
    }

    this.form.valueChanges.subscribe((value) => {
      saveRoutePlanDraft({
        routeMode: (value.routeMode as 'gpx' | 'direct') ?? 'gpx',
        departureAt: value.departureAt ?? '',
        speedMode: (value.speedMode as 'speed' | 'duration') ?? 'speed',
        averageSpeedKmh: value.averageSpeedKmh ?? null,
        plannedDurationHours: value.plannedDurationHours ?? null,
        sampleCount: value.sampleCount ?? 20,
        pointALatitude: value.pointALatitude ?? null,
        pointALongitude: value.pointALongitude ?? null,
        pointBLatitude: value.pointBLatitude ?? null,
        pointBLongitude: value.pointBLongitude ?? null
      });
    });
  }

  readonly routeMode = computed(() => this.formValue().routeMode ?? 'gpx');
  readonly speedMode = computed(() => this.formValue().speedMode ?? 'speed');
  readonly sampleCount = computed(() => this.formValue().sampleCount ?? 20);
  /** The travel-mode shortcuts never showed which one was in effect, unlike the route/pace
   * segmented controls right above them -- after picking "Cycling" the buttons all looked the
   * same again. Matches on the speed itself, so typing 18 by hand lights up "Cycling" too. */
  readonly averageSpeedKmh = computed(() => this.formValue().averageSpeedKmh ?? null);
  readonly sampleCountPercent = computed(() => ((this.sampleCount() - 5) / (50 - 5)) * 100);

  readonly canSubmit = computed(() => {
    const value = this.formValue();
    if (!value.departureAt) {
      return false;
    }
    if (value.speedMode === 'speed') {
      if (!this.isPositiveNumber(value.averageSpeedKmh)) {
        return false;
      }
    } else if (!this.isPositiveNumber(value.plannedDurationHours)) {
      return false;
    }

    if (value.routeMode === 'direct') {
      return (
        this.isValidLatitude(value.pointALatitude) &&
        this.isValidLongitude(value.pointALongitude) &&
        this.isValidLatitude(value.pointBLatitude) &&
        this.isValidLongitude(value.pointBLongitude) &&
        !this.isSamePoint()
      );
    }

    return !!this.selectedFile();
  });

  readonly isSamePoint = computed(() => {
    const value = this.formValue();
    return (
      value.routeMode === 'direct' &&
      value.pointALatitude != null &&
      value.pointALongitude != null &&
      value.pointALatitude === value.pointBLatitude &&
      value.pointALongitude === value.pointBLongitude
    );
  });

  /** A latitude of 95 (or a longitude of 200) only kept "Plan route" disabled -- nothing said
   * which field was wrong. Empty fields are left alone: they are unfinished, not invalid. */
  readonly outOfRange = computed(() => {
    const value = this.formValue();
    return {
      pointALatitude: value.pointALatitude != null && !this.isValidLatitude(value.pointALatitude),
      pointALongitude: value.pointALongitude != null && !this.isValidLongitude(value.pointALongitude),
      pointBLatitude: value.pointBLatitude != null && !this.isValidLatitude(value.pointBLatitude),
      pointBLongitude: value.pointBLongitude != null && !this.isValidLongitude(value.pointBLongitude)
    };
  });

  /** A departure in the past was planned without a word, and the points before "now" came back
   * with old or missing forecasts. Compared against the browser clock -- the entered time is
   * local to the route's start (ADR-0001), so this is only a heads-up, never a block. */
  readonly isDepartureInPast = computed(() => {
    const departure = this.parseDeparture(this.formValue().departureAt);
    return departure !== null && departure.getTime() < Date.now();
  });

  /** Open-Meteo is asked for `forecast_days=16` (today + 15 days), and points with an ETA after
   * that come back without weather (ADR-0002) -- a ride planned three weeks ahead used to return
   * an empty table with no hint why. The ride's end is only known up front in the planned-duration
   * mode; with an average speed the distance is unknown until the route is planned, so the
   * departure itself is checked instead. */
  readonly isBeyondForecastHorizon = computed(() => {
    const value = this.formValue();
    const departure = this.parseDeparture(value.departureAt);
    if (departure === null) {
      return false;
    }
    const durationHours =
      value.speedMode === 'duration' && this.isPositiveNumber(value.plannedDurationHours)
        ? value.plannedDurationHours!
        : 0;
    const rideEnd = departure.getTime() + durationHours * 60 * 60 * 1000;
    const now = new Date(Date.now());
    const horizonEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + RoutePlanFormComponent.FORECAST_DAYS);
    return rideEnd >= horizonEnd.getTime();
  });

  /** Only one of the two departure hints can show at a time (past vs. too far ahead). */
  readonly departureHintId = computed(() =>
    this.isDepartureInPast() ? 'departureAtPastHint' : this.isBeyondForecastHorizon() ? 'departureAtHorizonHint' : null
  );

  rangeHint(latitudeOutOfRange: boolean, longitudeOutOfRange: boolean): string | null {
    if (latitudeOutOfRange && longitudeOutOfRange) {
      return 'Latitude must be between -90 and 90, longitude between -180 and 180.';
    }
    if (latitudeOutOfRange) {
      return 'Latitude must be between -90 and 90.';
    }
    if (longitudeOutOfRange) {
      return 'Longitude must be between -180 and 180.';
    }
    return null;
  }

  /** Planning the ride back meant retyping all four coordinates in the other order. */
  swapPoints(): void {
    const { pointALatitude, pointALongitude, pointBLatitude, pointBLongitude } = this.form.getRawValue();
    this.form.patchValue({
      pointALatitude: pointBLatitude,
      pointALongitude: pointBLongitude,
      pointBLatitude: pointALatitude,
      pointBLongitude: pointALongitude
    });
  }

  setTravelMode(speedKmh: number): void {
    this.form.patchValue({ speedMode: 'speed', averageSpeedKmh: speedKmh });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setSelectedFile(input.files?.[0] ?? null);
    // The file lives in selectedFile from here on. Clearing the input lets the same file be
    // picked again after "Remove" -- otherwise its value is unchanged and no change event fires.
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) {
      this.setSelectedFile(file);
    }
  }

  clearFile(event: Event): void {
    event.preventDefault();
    this.selectedFile.set(null);
  }

  private setSelectedFile(file: File | null): void {
    // The input's accept=".gpx" only filters the file picker -- a file dropped onto the zone
    // bypasses it, so a dropped .jpg/.kml used to be accepted and only fail after the upload.
    if (file && !file.name.toLowerCase().endsWith('.gpx')) {
      this.routePlanStateService.error.set('Please choose a .gpx file.');
      this.selectedFile.set(null);
      return;
    }

    if (file && file.size > RoutePlanFormComponent.MAX_GPX_FILE_SIZE_BYTES) {
      this.routePlanStateService.error.set('The GPX file must not exceed 5 MB.');
      this.selectedFile.set(null);
      return;
    }

    this.routePlanStateService.error.set(null);
    this.selectedFile.set(file);
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const value = this.form.getRawValue();
    // DepartureAt is intentionally LOCAL time for the route's start coordinates (ADR-0001),
    // not UTC. `datetime-local` gives raw clock digits ("YYYY-MM-DDTHH:mm") with no timezone
    // offset — we only append seconds. Do NOT use `new Date(...).toISOString()`: that
    // interprets the entered time as the BROWSER's local time and shifts it by the browser's
    // offset to UTC, breaking the match against Open-Meteo's forecast (`timezone=auto`, see ADR-0002).
    const departureAtIso = `${value.departureAt}:00`;
    const averageSpeedKmh = value.speedMode === 'speed' ? value.averageSpeedKmh : null;
    const plannedDurationHours = value.speedMode === 'duration' ? value.plannedDurationHours : null;
    const sampleCount = value.sampleCount ?? 20;

    this.routePlanStateService.isLoading.set(true);
    this.routePlanStateService.error.set(null);

    const request$ =
      value.routeMode === 'direct'
        ? this.routePlanApiService.planDirectRoute(
            { latitude: value.pointALatitude!, longitude: value.pointALongitude! },
            { latitude: value.pointBLatitude!, longitude: value.pointBLongitude! },
            departureAtIso,
            averageSpeedKmh,
            plannedDurationHours,
            sampleCount
          )
        : this.routePlanApiService.planRoute(this.selectedFile()!, departureAtIso, averageSpeedKmh, plannedDurationHours, sampleCount);

    request$.subscribe({
      next: (response) => {
        this.routePlanStateService.result.set(response);
        this.routePlanStateService.selectedDistanceKm.set(0);
        this.routePlanStateService.lastDepartureAtIso.set(departureAtIso);
        this.routePlanStateService.lastAverageSpeedKmh.set(averageSpeedKmh);
        this.routePlanStateService.lastPlannedDurationHours.set(plannedDurationHours);
        this.routePlanStateService.departureShiftHours.set(0);
        this.routePlanStateService.comparisonVariants.set([]);
        this.routePlanStateService.isLoading.set(false);
      },
      error: (err) => {
        const message = err?.error?.detail ?? 'Something went wrong while planning the route. Please try again.';
        this.routePlanStateService.error.set(message);
        this.routePlanStateService.isLoading.set(false);
      }
    });
  }

  /** `datetime-local` gives "YYYY-MM-DDTHH:mm" without an offset; `new Date` reads it as
   * browser-local time, which is close enough for a warning. */
  private parseDeparture(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const departure = new Date(value);
    return Number.isNaN(departure.getTime()) ? null : departure;
  }

  private isPositiveNumber(value: number | null | undefined): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }

  private isValidLatitude(value: number | null | undefined): boolean {
    return typeof value === 'number' && !Number.isNaN(value) && value >= -90 && value <= 90;
  }

  private isValidLongitude(value: number | null | undefined): boolean {
    return typeof value === 'number' && !Number.isNaN(value) && value >= -180 && value <= 180;
  }
}
