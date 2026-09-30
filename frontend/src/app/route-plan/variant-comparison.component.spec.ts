import { TestBed } from '@angular/core/testing';

import { VariantComparisonComponent } from './variant-comparison.component';
import { RoutePlanStateService } from './route-plan-state.service';
import { PlanRouteResponse } from './route-plan-api.model';

function sampleResult(): PlanRouteResponse {
  return {
    totalDistanceKm: 30,
    samples: [{ latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0, etaAt: '2026-08-01T10:00:00', weather: null }],
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
