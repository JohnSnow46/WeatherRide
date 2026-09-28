import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { DepartureShiftComponent } from './departure-shift.component';
import { RoutePlanApiService } from './route-plan-api.service';
import { RoutePlanStateService } from './route-plan-state.service';
import { PlanRouteResponse, ReforecastRouteResponse } from './route-plan-api.model';

function sampleResult(): PlanRouteResponse {
  return {
    totalDistanceKm: 30,
    samples: [
      { latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0, etaAt: '2026-08-01T10:00:00', weather: null },
      { latitude: 52.1, longitude: 21.1, distanceFromStartKm: 30, etaAt: '2026-08-01T11:00:00', weather: null }
    ],
    track: []
  };
}

describe('DepartureShiftComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartureShiftComponent],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  it('DoesNothing_WhenNoResultIsSet', () => {
    const fixture = TestBed.createComponent(DepartureShiftComponent);
    const apiService = TestBed.inject(RoutePlanApiService);
    const spy = spyOn(apiService, 'reforecastRoute');

    fixture.componentInstance.shift(1);

    expect(spy).not.toHaveBeenCalled();
  });

  it('Shift_PositiveHours_CallsReforecastWithShiftedLocalDepartureTime', () => {
    const fixture = TestBed.createComponent(DepartureShiftComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    const apiService = TestBed.inject(RoutePlanApiService);

    stateService.result.set(sampleResult());
    stateService.lastDepartureAtIso.set('2026-08-01T10:00:00');
    stateService.lastAverageSpeedKmh.set(30);
    stateService.lastPlannedDurationHours.set(null);

    const response: ReforecastRouteResponse = {
      samples: [
        { latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0, etaAt: '2026-08-01T12:00:00', weather: null },
        { latitude: 52.1, longitude: 21.1, distanceFromStartKm: 30, etaAt: '2026-08-01T13:00:00', weather: null }
      ]
    };
    const spy = spyOn(apiService, 'reforecastRoute').and.returnValue(of(response));

    fixture.componentInstance.shift(2);

    expect(spy).toHaveBeenCalledWith(
      [
        { latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0 },
        { latitude: 52.1, longitude: 21.1, distanceFromStartKm: 30 }
      ],
      30,
      '2026-08-01T12:00:00',
      30,
      null
    );
    expect(stateService.departureShiftHours()).toBe(2);
    expect(stateService.result()!.samples).toEqual(response.samples);
    expect(stateService.result()!.totalDistanceKm).toBe(30);
  });

  it('Reset_AfterShift_RestoresZeroShiftAndOriginalDepartureTime', () => {
    const fixture = TestBed.createComponent(DepartureShiftComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    const apiService = TestBed.inject(RoutePlanApiService);

    stateService.result.set(sampleResult());
    stateService.lastDepartureAtIso.set('2026-08-01T10:00:00');
    stateService.lastAverageSpeedKmh.set(30);
    stateService.departureShiftHours.set(3);

    const spy = spyOn(apiService, 'reforecastRoute').and.returnValue(
      of({ samples: sampleResult().samples } as ReforecastRouteResponse)
    );

    fixture.componentInstance.reset();

    expect(spy).toHaveBeenCalledWith(jasmine.any(Array), 30, '2026-08-01T10:00:00', 30, null);
    expect(stateService.departureShiftHours()).toBe(0);
  });

  it('Shift_ApiError_SetsErrorMessageAndDoesNotChangeState', () => {
    const fixture = TestBed.createComponent(DepartureShiftComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    const apiService = TestBed.inject(RoutePlanApiService);

    stateService.result.set(sampleResult());
    stateService.lastDepartureAtIso.set('2026-08-01T10:00:00');
    stateService.lastAverageSpeedKmh.set(30);

    spyOn(apiService, 'reforecastRoute').and.returnValue(
      throwError(() => ({ error: { detail: 'Nieprawidłowe dane wejściowe' } }))
    );

    fixture.componentInstance.shift(1);

    expect(fixture.componentInstance['error']()).toBe('Nieprawidłowe dane wejściowe');
    expect(stateService.departureShiftHours()).toBe(0);
  });
});
