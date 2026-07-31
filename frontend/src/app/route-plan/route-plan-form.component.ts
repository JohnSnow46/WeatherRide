import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { RoutePlanApiService } from './route-plan-api.service';
import { RoutePlanStateService } from './route-plan-state.service';

@Component({
  selector: 'app-route-plan-form',
  imports: [ReactiveFormsModule],
  templateUrl: './route-plan-form.component.html',
  styleUrl: './route-plan-form.component.scss'
})
export class RoutePlanFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly routePlanApiService = inject(RoutePlanApiService);
  protected readonly routePlanStateService = inject(RoutePlanStateService);

  readonly selectedFile = signal<File | null>(null);
  readonly isDragging = signal(false);

  readonly form = this.fb.group({
    departureAt: ['', Validators.required],
    speedMode: ['speed'],
    averageSpeedKmh: [null as number | null],
    plannedDurationMinutes: [null as number | null],
    sampleCount: [20]
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  readonly speedMode = computed(() => this.formValue().speedMode ?? 'speed');
  readonly sampleCount = computed(() => this.formValue().sampleCount ?? 20);
  readonly sampleCountPercent = computed(() => ((this.sampleCount() - 5) / (50 - 5)) * 100);

  readonly canSubmit = computed(() => {
    const value = this.formValue();
    if (!this.selectedFile()) {
      return false;
    }
    if (!value.departureAt) {
      return false;
    }
    if (value.speedMode === 'speed') {
      return this.isPositiveNumber(value.averageSpeedKmh);
    }
    return this.isPositiveNumber(value.plannedDurationMinutes);
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
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
      this.selectedFile.set(file);
    }
  }

  clearFile(event: Event): void {
    event.preventDefault();
    this.selectedFile.set(null);
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const file = this.selectedFile();
    if (!file) {
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
    const plannedDurationMinutes = value.speedMode === 'duration' ? value.plannedDurationMinutes : null;

    this.routePlanStateService.isLoading.set(true);
    this.routePlanStateService.error.set(null);

    this.routePlanApiService
      .planRoute(file, departureAtIso, averageSpeedKmh, plannedDurationMinutes, value.sampleCount ?? 20)
      .subscribe({
        next: (response) => {
          this.routePlanStateService.result.set(response);
          this.routePlanStateService.selectedDistanceKm.set(0);
          this.routePlanStateService.isLoading.set(false);
        },
        error: (err) => {
          const message = err?.error?.detail ?? 'Something went wrong while planning the route. Please try again.';
          this.routePlanStateService.error.set(message);
          this.routePlanStateService.isLoading.set(false);
        }
      });
  }

  private isPositiveNumber(value: number | null | undefined): boolean {
    return typeof value === 'number' && !Number.isNaN(value) && value > 0;
  }
}
