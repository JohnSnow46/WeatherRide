import { Component, computed, inject } from '@angular/core';

import { RoutePlanStateService } from './route-plan-state.service';
import { RouteVariant, summarizeVariant, variantLabel } from './variant-comparison';

const MAX_VARIANTS = 3;

/** Lets the user snapshot the current (possibly shifted) result as a named variant and
 * compare a few of them side by side — extends route-plan #3 (departure-shift) with the
 * "which of these departure times has the best weather" use case. Reuses samples already
 * fetched by plan/reforecast calls; never issues its own HTTP request. */
@Component({
  selector: 'app-variant-comparison',
  templateUrl: './variant-comparison.component.html',
  styleUrl: './variant-comparison.component.scss'
})
export class VariantComparisonComponent {
  protected readonly routePlanStateService = inject(RoutePlanStateService);

  protected readonly summaries = computed(() => this.routePlanStateService.comparisonVariants().map(summarizeVariant));

  protected readonly canAddCurrent = computed(() => {
    const state = this.routePlanStateService;
    if (!state.result() || state.comparisonVariants().length >= MAX_VARIANTS) {
      return false;
    }
    const shift = state.departureShiftHours();
    return !state.comparisonVariants().some(v => v.departureShiftHours === shift);
  });

  addCurrent(): void {
    const state = this.routePlanStateService;
    const result = state.result();
    if (!result || !this.canAddCurrent()) {
      return;
    }

    const shift = state.departureShiftHours();
    const variant: RouteVariant = {
      label: variantLabel(shift),
      departureShiftHours: shift,
      samples: result.samples
    };
    state.comparisonVariants.update(variants => [...variants, variant]);
  }

  remove(departureShiftHours: number): void {
    this.routePlanStateService.comparisonVariants.update(variants =>
      variants.filter(v => v.departureShiftHours !== departureShiftHours)
    );
  }
}
