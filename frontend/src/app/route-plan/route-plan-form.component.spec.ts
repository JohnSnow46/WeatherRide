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
});
