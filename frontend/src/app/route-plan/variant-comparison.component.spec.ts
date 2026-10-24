import { TestBed } from '@angular/core/testing';

import { VariantComparisonComponent } from './variant-comparison.component';
import { RoutePlanStateService } from './route-plan-state.service';
import { PlanRouteResponse } from './route-plan-api.model';

function sampleResult(): PlanRouteResponse {
  return {
    totalDistanceKm: 30,
    samples: [{ latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0, etaAt: '2026-08-01T10:00:00', weather: null, windRelativeDirection: null }],
    track: []
  };
}

describe('VariantComparisonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VariantComparisonComponent] }).compileComponents();
  });

  it('CanAddCurrent_IsFalse_WhenNoResult', () => {
    const fixture = TestBed.createComponent(VariantComparisonComponent);

    expect(fixture.componentInstance['canAddCurrent']()).toBeFalse();
  });

  it('AddCurrent_SnapshotsResultWithLabelFromCurrentShift', () => {
    const fixture = TestBed.createComponent(VariantComparisonComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    stateService.result.set(sampleResult());
    stateService.departureShiftHours.set(2);

    fixture.componentInstance.addCurrent();

    const variants = stateService.comparisonVariants();
    expect(variants.length).toBe(1);
    expect(variants[0].label).toBe('+2h');
    expect(variants[0].departureShiftHours).toBe(2);
    expect(variants[0].samples).toEqual(sampleResult().samples);
  });

  it('AddCurrent_DoesNothing_WhenSameShiftAlreadyAdded', () => {
    const fixture = TestBed.createComponent(VariantComparisonComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    stateService.result.set(sampleResult());
    stateService.departureShiftHours.set(0);

    fixture.componentInstance.addCurrent();
    fixture.componentInstance.addCurrent();

    expect(stateService.comparisonVariants().length).toBe(1);
  });

  it('AddCurrent_DoesNothing_AtMaxVariants', () => {
    const fixture = TestBed.createComponent(VariantComparisonComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    stateService.result.set(sampleResult());

    stateService.departureShiftHours.set(0);
    fixture.componentInstance.addCurrent();
    stateService.departureShiftHours.set(1);
    fixture.componentInstance.addCurrent();
    stateService.departureShiftHours.set(2);
    fixture.componentInstance.addCurrent();
    stateService.departureShiftHours.set(3);
    fixture.componentInstance.addCurrent();

    expect(stateService.comparisonVariants().length).toBe(3);
  });

  it('View_SwapsResultSamplesAndShiftToTheSelectedVariant_KeepingDistanceAndTrack', () => {
    const fixture = TestBed.createComponent(VariantComparisonComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    stateService.result.set(sampleResult());
    stateService.departureShiftHours.set(0);
    fixture.componentInstance.addCurrent();

    const shiftedSamples = [
      { latitude: 53.0, longitude: 22.0, distanceFromStartKm: 0, etaAt: '2026-08-01T12:00:00', weather: null, windRelativeDirection: null }
    ];
    stateService.result.set({ ...sampleResult(), samples: shiftedSamples });
    stateService.departureShiftHours.set(2);
    fixture.componentInstance.addCurrent();

    fixture.componentInstance.view(0);

    expect(stateService.result()?.samples).toEqual(sampleResult().samples);
    expect(stateService.result()?.totalDistanceKm).toBe(sampleResult().totalDistanceKm);
    expect(stateService.departureShiftHours()).toBe(0);
  });

  it('MarksTheRowMatchingTheCurrentShift_AndDisablesItsViewButton', () => {
    const fixture = TestBed.createComponent(VariantComparisonComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    stateService.comparisonVariants.set([]);
    stateService.result.set(sampleResult());
    stateService.departureShiftHours.set(0);
    fixture.componentInstance.addCurrent();
    stateService.departureShiftHours.set(2);
    fixture.componentInstance.addCurrent();

    fixture.componentInstance.view(0);
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].classList.contains('is-current')).toBeTrue();
    expect(rows[0].getAttribute('aria-current')).toBe('true');
    expect((rows[0].querySelector('button') as HTMLButtonElement).disabled).toBeTrue();
    expect(rows[1].classList.contains('is-current')).toBeFalse();
    expect((rows[1].querySelector('button') as HTMLButtonElement).disabled).toBeFalse();
  });

  it('View_DoesNothing_WhenNoVariantMatchesTheShift', () => {
    const fixture = TestBed.createComponent(VariantComparisonComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    stateService.result.set(sampleResult());
    stateService.departureShiftHours.set(0);

    fixture.componentInstance.view(5);

    expect(stateService.result()).toEqual(sampleResult());
    expect(stateService.departureShiftHours()).toBe(0);
  });

  it('Remove_DropsOnlyTheMatchingVariant', () => {
    const fixture = TestBed.createComponent(VariantComparisonComponent);
    const stateService = TestBed.inject(RoutePlanStateService);
    stateService.result.set(sampleResult());
    stateService.departureShiftHours.set(0);
    fixture.componentInstance.addCurrent();
    stateService.departureShiftHours.set(1);
    fixture.componentInstance.addCurrent();

    fixture.componentInstance.remove(0);

    const variants = stateService.comparisonVariants();
    expect(variants.length).toBe(1);
    expect(variants[0].departureShiftHours).toBe(1);
  });
});
