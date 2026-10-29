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

  /** Why "Add current as variant" is disabled -- it went grey with no explanation once the
   * table was full or the shown departure was already in it, which read as broken. */
  protected readonly addDisabledReason = computed(() => {
    const state = this.routePlanStateService;
    if (!state.result()) {
      return null;
    }
    const shift = state.departureShiftHours();
    if (state.comparisonVariants().some(v => v.departureShiftHours === shift)) {
      return 'This departure is already in the comparison.';
    }
    if (state.comparisonVariants().length >= MAX_VARIANTS) {
      return `Up to ${MAX_VARIANTS} variants — remove one to add another.`;
    }
    return null;
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

  /** Switches the active result/table/map below to this variant's samples -- same
   * `result.set({...result, samples})` + `departureShiftHours.set(...)` pair best-window's
   * `findBest()` already uses, since a variant is just a snapshot of samples at a shift
   * that's already been fetched (no new request). Without this, the comparison table was
   * the only way to see a variant's numbers -- there was no way to inspect it point-by-point
   * in the table/map below, only the currently "live" shift. */
  view(departureShiftHours: number): void {
    const state = this.routePlanStateService;
    const result = state.result();
    const variant = state.comparisonVariants().find(v => v.departureShiftHours === departureShiftHours);
    if (!result || !variant) {
      return;
    }
    state.result.set({ ...result, samples: variant.samples });
    state.departureShiftHours.set(variant.departureShiftHours);
  }
}
