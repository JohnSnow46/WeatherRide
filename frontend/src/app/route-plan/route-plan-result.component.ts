import { Component, computed, inject } from '@angular/core';

import { RoutePlanStateService } from './route-plan-state.service';
import { WeatherForecastDto } from './route-plan-api.model';
import { weatherIconKind } from './weather-icon';
import { WeatherGlyphComponent } from './weather-glyph.component';

@Component({
  selector: 'app-route-plan-result',
  imports: [WeatherGlyphComponent],
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

  protected iconKind(weather: WeatherForecastDto) {
    return weatherIconKind(weather);
  }
}
