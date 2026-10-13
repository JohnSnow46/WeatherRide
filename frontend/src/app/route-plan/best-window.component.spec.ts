import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { BestWindowComponent } from './best-window.component';
import { RoutePlanApiService } from './route-plan-api.service';
import { RoutePlanStateService } from './route-plan-state.service';
import { PlanRouteResponse, ReforecastRouteResponse } from './route-plan-api.model';

function sampleResult(): PlanRouteResponse {
  return {
    totalDistanceKm: 30,
    samples: [
      { latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0, etaAt: '2026-08-01T10:00:00', weather: null, windRelativeDirection: null },
      { latitude: 52.1, longitude: 21.1, distanceFromStartKm: 30, etaAt: '2026-08-01T11:00:00', weather: null, windRelativeDirection: null }
    ],
    track: []
  };
}

function responseWithRain(precipitationMm: number): ReforecastRouteResponse {
  return {
    samples: [
      {
        latitude: 52.0,
        longitude: 21.0,
        distanceFromStartKm: 0,
        etaAt: '2026-08-01T10:00:00',
        weather: {
          temperatureCelsius: 10,
          windSpeedKmh: 10,
          precipitationMm,
          windDirectionDegrees: 90,
          relativeHumidityPercent: 50,
          uvIndex: 3,
          windGustsKmh: 15
        },
        windRelativeDirection: null
      }
    ]
  };
}

describe('BestWindowComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BestWindowComponent],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  it('DoesNothing_WhenNoResultIsSet', () => {
    const fixture = TestBed.createComponent(BestWindowComponent);
    const apiService = TestBed.inject(RoutePlanApiService);
    const spy = spyOn(apiService, 'reforecastRoute');

    fixture.componentInstance.findBest();

    expect(spy).not.toHaveBeenCalled();
  });

  it('FindBest_AppliesDriestShift_AmongTheWindow', () => {
    const fixture = TestBed.createComponent(BestWindowComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    const apiService = TestBed.inject(RoutePlanApiService);

    stateService.result.set(sampleResult());
    stateService.lastDepartureAtIso.set('2026-08-01T10:00:00');
    stateService.lastAverageSpeedKmh.set(30);
    stateService.lastPlannedDurationHours.set(null);

    const spy = spyOn(apiService, 'reforecastRoute').and.callFake((_samples, _dist, departureAtIso) => {
      // The +2h shift (12:00) is the one dry call; everything else comes back rainy.
      return of(departureAtIso === '2026-08-01T12:00:00' ? responseWithRain(0) : responseWithRain(5));
    });

    fixture.componentInstance.findBest();

    expect(spy).toHaveBeenCalledTimes(13);
    expect(stateService.departureShiftHours()).toBe(2);
    expect(stateService.result()!.samples[0].weather!.precipitationMm).toBe(0);
  });

  it('FindBest_ApiError_SetsErrorMessageAndDoesNotChangeState', () => {
    const fixture = TestBed.createComponent(BestWindowComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    const apiService = TestBed.inject(RoutePlanApiService);

    stateService.result.set(sampleResult());
    stateService.lastDepartureAtIso.set('2026-08-01T10:00:00');
    stateService.lastAverageSpeedKmh.set(30);

    spyOn(apiService, 'reforecastRoute').and.returnValue(
      throwError(() => ({ error: { detail: 'Nieprawidlowe dane wejsciowe' } }))
    );

    fixture.componentInstance.findBest();

    expect(fixture.componentInstance['error']()).toBe('Nieprawidlowe dane wejsciowe');
    expect(stateService.departureShiftHours()).toBe(0);
  });
});
