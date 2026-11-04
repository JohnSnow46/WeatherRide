import { TestBed } from '@angular/core/testing';

import { RouteSliderComponent } from './route-slider.component';
import { RoutePlanStateService } from './route-plan-state.service';
import { PlanRouteResponse } from './route-plan-api.model';

function sampleResult(): PlanRouteResponse {
  return {
    totalDistanceKm: 45,
    samples: [{ latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0, etaAt: '2026-08-01T10:00:00', weather: null, windRelativeDirection: null }],
    track: []
  };
}

describe('RouteSliderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RouteSliderComponent] }).compileComponents();
  });

  // Same cleanup as best-window.component.spec: detectChanges flushes the state service's
  // localStorage persistence, which would otherwise leak into other specs.
  afterEach(() => {
    TestBed.inject(RoutePlanStateService).clearResult();
    localStorage.clear();
  });

  it('Slider_SpeaksThePositionWithItsUnit', () => {
    const fixture = TestBed.createComponent(RouteSliderComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    stateService.result.set(sampleResult());
    stateService.selectedDistanceKm.set(12.345);
    fixture.detectChanges();

    const slider: HTMLInputElement = fixture.nativeElement.querySelector('input[type="range"]');
    expect(slider.getAttribute('aria-valuetext')).toBe('12.3 of 45.0 km');
  });

  it('Slider_IsNotRendered_WhenNoResult', () => {
    const fixture = TestBed.createComponent(RouteSliderComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input[type="range"]')).toBeNull();
  });
});
