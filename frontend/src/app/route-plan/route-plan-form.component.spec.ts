import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RoutePlanFormComponent } from './route-plan-form.component';
import { RoutePlanApiService } from './route-plan-api.service';
import { PlanRouteResponse } from './route-plan-api.model';

describe('RoutePlanFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoutePlanFormComponent],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  it('disables the submit button when no GPX file is selected', () => {
    const fixture = TestBed.createComponent(RoutePlanFormComponent);
    fixture.componentInstance.form.patchValue({
      departureAt: '2026-08-01T10:00',
      averageSpeedKmh: 20
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
  });

  it('sends departureAt as raw local clock digits, without timezone-offset conversion', () => {
    const fixture = TestBed.createComponent(RoutePlanFormComponent);
    const apiService = TestBed.inject(RoutePlanApiService);
    const planRouteSpy = spyOn(apiService, 'planRoute').and.returnValue(of({} as PlanRouteResponse));

    fixture.componentInstance.selectedFile.set(new File(['<gpx></gpx>'], 'route.gpx'));
    fixture.componentInstance.form.patchValue({
      departureAt: '2026-08-01T10:00',
      averageSpeedKmh: 20
    });
    fixture.detectChanges();

    fixture.componentInstance.onSubmit();

    expect(planRouteSpy).toHaveBeenCalledWith(
      jasmine.any(File),
      '2026-08-01T10:00:00',
      20,
      null,
      20
    );
  });

  it('switches to direct point A/B mode and disables submit until both points are valid', () => {
    const fixture = TestBed.createComponent(RoutePlanFormComponent);
    fixture.componentInstance.form.patchValue({
      routeMode: 'direct',
      departureAt: '2026-08-01T10:00',
      averageSpeedKmh: 20
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.canSubmit()).toBeFalse();

    fixture.componentInstance.form.patchValue({
      pointALatitude: 52.0,
      pointALongitude: 21.0,
      pointBLatitude: 52.5,
      pointBLongitude: 21.5
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.canSubmit()).toBeTrue();
  });

  it('submits direct point A/B mode by calling planDirectRoute with the entered coordinates', () => {
    const fixture = TestBed.createComponent(RoutePlanFormComponent);
    const apiService = TestBed.inject(RoutePlanApiService);
    const planDirectRouteSpy = spyOn(apiService, 'planDirectRoute').and.returnValue(of({} as PlanRouteResponse));

    fixture.componentInstance.form.patchValue({
      routeMode: 'direct',
      departureAt: '2026-08-01T10:00',
      averageSpeedKmh: 20,
      pointALatitude: 52.0,
      pointALongitude: 21.0,
      pointBLatitude: 52.5,
      pointBLongitude: 21.5
    });
    fixture.detectChanges();

    fixture.componentInstance.onSubmit();

    expect(planDirectRouteSpy).toHaveBeenCalledWith(
      { latitude: 52.0, longitude: 21.0 },
      { latitude: 52.5, longitude: 21.5 },
      '2026-08-01T10:00:00',
      20,
      null,
      20
    );
  });
});
