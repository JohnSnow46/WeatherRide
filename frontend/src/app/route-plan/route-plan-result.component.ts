import { Component, computed, inject, signal } from '@angular/core';

import { RoutePlanStateService } from './route-plan-state.service';
import { RouteSampleDto, WeatherForecastDto } from './route-plan-api.model';
import { weatherIconKind } from './weather-icon';
import { WeatherGlyphComponent } from './weather-glyph.component';
import {
  DEFAULT_PRECIPITATION_ALERT_THRESHOLD_MM,
  summarizeHeadwindAlert,
  summarizePrecipitationAlert
} from './route-interpolation';
import { describeWindRelativeDirection } from './wind-relative-direction';
import { ElevationProfileComponent } from './elevation-profile.component';
import { DepartureShiftComponent } from './departure-shift.component';
import { VariantComparisonComponent } from './variant-comparison.component';
import { BestWindowComponent } from './best-window.component';

@Component({
  selector: 'app-route-plan-result',
  imports: [
    WeatherGlyphComponent,
    ElevationProfileComponent,
    DepartureShiftComponent,
    BestWindowComponent,
    VariantComparisonComponent
  ],
  templateUrl: './route-plan-result.component.html',
  styleUrl: './route-plan-result.component.scss'
})
export class RoutePlanResultComponent {
  protected readonly routePlanStateService = inject(RoutePlanStateService);

  /** Distance of the sample nearest the scrubber position, so the matching row can be
   * highlighted — connects the map/slider selection to the list below it. */
  protected readonly activeSampleDistanceKm = computed(() => {
    const result = this.routePlanStateService.result();
    if (!result || result.samples.length === 0) {
      return null;
    }
    const target = this.routePlanStateService.selectedDistanceKm();
    return result.samples.reduce((closest, s) =>
      Math.abs(s.distanceFromStartKm - target) < Math.abs(closest.distanceFromStartKm - target) ? s : closest
    ).distanceFromStartKm;
  });

  /* Hardcode 'en-US' rather than the runtime locale — the UI copy is English-only per
   * project convention, regardless of the browser/OS locale it happens to run under. */
  protected formatEta(etaAt: string): string {
    return new Date(etaAt).toLocaleString('en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** Bounds for the rain-alert threshold slider (mm/h) — roadmap #2 specified the
   * threshold as slider-configurable, the first implementation shipped it fixed at 1 mm/h. */
  protected readonly minPrecipitationThresholdMm = 0.2;
  protected readonly maxPrecipitationThresholdMm = 5;

  readonly precipitationThresholdMm = signal(DEFAULT_PRECIPITATION_ALERT_THRESHOLD_MM);

  /** One-glance rain summary for the header badge — "3 of 12 points expect rain". */
  protected readonly precipitationAlert = computed(() => {
    const result = this.routePlanStateService.result();
    if (!result) {
      return null;
    }
    return summarizePrecipitationAlert(result.samples, this.precipitationThresholdMm());
  });

  /** "Clear" sits in the result header and wiped the planned route together with every
   * compared variant (each one a separate reforecast) on one click -- and with the GPX file
   * not persisted, getting it back meant re-uploading and re-planning. Asks first. */
  clearResult(): void {
    if (window.confirm('Clear this route plan and all compared variants?')) {
      this.routePlanStateService.clearResult();
    }
  }

  setPrecipitationThreshold(thresholdMm: number): void {
    if (!Number.isFinite(thresholdMm)) {
      return;
    }
    this.precipitationThresholdMm.set(
      Math.min(this.maxPrecipitationThresholdMm, Math.max(this.minPrecipitationThresholdMm, thresholdMm))
    );
  }

  /** One-glance headwind summary for the header badge, mirroring precipitationAlert --
   * windRelativeDirection (roadmap #10) never got a top-level summary, only the per-row
   * badge in the results table and the per-variant count added to the comparison table. */
  protected readonly headwindAlert = computed(() => {
    const result = this.routePlanStateService.result();
    if (!result) {
      return null;
    }
    return summarizeHeadwindAlert(result.samples);
  });

  protected iconKind(weather: WeatherForecastDto) {
    return weatherIconKind(weather);
  }

  protected windRelativeDirection(sample: RouteSampleDto) {
    return describeWindRelativeDirection(sample.windRelativeDirection);
  }

  /** Surfaces the secondary weather variables (not worth a dedicated grid column) as a
   * hover tooltip on the forecast icon/temperature. */
  protected extraDetails(weather: WeatherForecastDto): string {
    return `Humidity: ${weather.relativeHumidityPercent.toFixed(0)}% · UV index: ${weather.uvIndex.toFixed(1)} · Gusts: ${weather.windGustsKmh.toFixed(1)} km/h`;
  }
}
