import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { RoutePlanResultComponent } from './route-plan-result.component';
import { RoutePlanStateService } from './route-plan-state.service';
import { PlanRouteResponse, RouteSampleDto } from './route-plan-api.model';

function sampleWithPrecipitation(distanceFromStartKm: number, precipitationMm: number): RouteSampleDto {
  return {
    latitude: 52.0,
    longitude: 21.0,
    distanceFromStartKm,
    etaAt: '2026-08-01T10:00:00',
    weather: {
      temperatureCelsius: 15,
      windSpeedKmh: 10,
      precipitationMm,
      windDirectionDegrees: 0,
      relativeHumidityPercent: 60,
      uvIndex: 2,
      windGustsKmh: 15
    },
    windRelativeDirection: null
  };
}

function sampleResult(): PlanRouteResponse {
  return {
    totalDistanceKm: 30,
    samples: [sampleWithPrecipitation(0, 0.5), sampleWithPrecipitation(15, 1.5), sampleWithPrecipitation(30, 3)],
    track: []
  };
}

describe('RoutePlanResultComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RoutePlanResultComponent],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(RoutePlanStateService).clearResult();
    localStorage.clear();
  });

  function rainBadgeText(fixture: ReturnType<typeof TestBed.createComponent<RoutePlanResultComponent>>): string | null {
    fixture.detectChanges();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('.precipitation-alert');
    return badge?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
  }

  it('SampleRows_RainGlyphAndWindArrow_HaveAccessibleNames', () => {
    const fixture = TestBed.createComponent(RoutePlanResultComponent);
    const state = TestBed.inject(RoutePlanStateService);
    const result = sampleResult();
    result.samples[0] = sampleWithPrecipitation(0, 0);
    result.samples[2] = { ...result.samples[2], windRelativeDirection: 'Headwind' };
    state.result.set(result);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const glyphs = Array.from(host.querySelectorAll('.sample-row .app-weather-glyph'));
    expect(glyphs.map((g) => g.getAttribute('aria-label'))).toEqual(['No rain', 'Rain', 'Rain']);
    expect(glyphs.every((g) => g.getAttribute('role') === 'img')).toBeTrue();

    const badge = host.querySelector('.wind-relative-badge');
    expect(badge?.getAttribute('role')).toBe('img');
    expect(badge?.getAttribute('aria-label')).toBe('Headwind');
  });

  it('ClearResult_NotConfirmed_KeepsTheResult', () => {
    const fixture = TestBed.createComponent(RoutePlanResultComponent);
    const state = TestBed.inject(RoutePlanStateService);
    state.result.set(sampleResult());
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.clearResult();

    expect(state.result()).not.toBeNull();
  });

  it('ClearResult_Confirmed_ClearsTheResult', () => {
    const fixture = TestBed.createComponent(RoutePlanResultComponent);
    const state = TestBed.inject(RoutePlanStateService);
    state.result.set(sampleResult());
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.clearResult();

    expect(state.result()).toBeNull();
  });

  it('RainAlert_DefaultThreshold_CountsSamplesAboveOneMmPerHour', () => {
    const fixture = TestBed.createComponent(RoutePlanResultComponent);
    TestBed.inject(RoutePlanStateService).result.set(sampleResult());

    expect(rainBadgeText(fixture)).toContain('2 of 3 points expect rain (> 1.0 mm/h)');
  });

  it('SetPrecipitationThreshold_HigherValue_RecountsTheBadge', () => {
    const fixture = TestBed.createComponent(RoutePlanResultComponent);
    TestBed.inject(RoutePlanStateService).result.set(sampleResult());

    fixture.componentInstance.setPrecipitationThreshold(2);

    expect(rainBadgeText(fixture)).toContain('1 of 3 points expect rain (> 2.0 mm/h)');
  });

  it('SetPrecipitationThreshold_OutOfRangeOrNaN_ClampsOrIgnores', () => {
    const fixture = TestBed.createComponent(RoutePlanResultComponent);
    const component = fixture.componentInstance;

    component.setPrecipitationThreshold(50);
    expect(component.precipitationThresholdMm()).toBe(5);

    component.setPrecipitationThreshold(-1);
    expect(component.precipitationThresholdMm()).toBe(0.2);

    component.setPrecipitationThreshold(Number.NaN);
    expect(component.precipitationThresholdMm()).toBe(0.2);
  });
});
