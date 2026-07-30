import { Component, computed, inject } from '@angular/core';

import { RoutePlanStateService } from './route-plan-state.service';
import { interpolateWeather } from './route-interpolation';

@Component({
  selector: 'app-route-slider',
  imports: [],
  templateUrl: './route-slider.component.html',
  styleUrl: './route-slider.component.scss'
})
export class RouteSliderComponent {
  protected readonly routePlanStateService = inject(RoutePlanStateService);

  protected readonly weatherAtSelection = computed(() => {
    const result = this.routePlanStateService.result();
    if (!result) {
      return null;
    }
    return interpolateWeather(result.samples, this.routePlanStateService.selectedDistanceKm());
  });

  protected readonly sliderStepKm = computed(() => {
    const result = this.routePlanStateService.result();
    if (!result || result.totalDistanceKm <= 0) {
      return 0.1;
    }
    return Math.max(result.totalDistanceKm / 1000, 0.01);
  });

  onDistanceInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.routePlanStateService.selectedDistanceKm.set(value);
  }
}
