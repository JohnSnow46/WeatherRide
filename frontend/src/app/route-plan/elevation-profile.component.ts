import { Component, computed, input } from '@angular/core';

import { TrackPointDto } from './route-plan-api.model';
import { buildElevationProfile } from './elevation-profile';

@Component({
  selector: 'app-elevation-profile',
  imports: [],
  template: `
    @if (profile(); as profile) {
      <div class="elevation-profile">
        <div class="elevation-stats">
          <span>{{ profile.minElevationM.toFixed(0) }}–{{ profile.maxElevationM.toFixed(0) }} m</span>
          <span>&#8599; {{ profile.totalAscentM.toFixed(0) }} m ascent</span>
        </div>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="elevation-chart">
          <polyline [attr.points]="profile.points" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />
        </svg>
      </div>
    }
  `,
  host: { class: 'app-elevation-profile' },
  styles: `
    .app-elevation-profile {
      display: block;
    }

    .elevation-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--color-text-muted, #666);
      margin-bottom: 0.25rem;
    }

    .elevation-chart {
      width: 100%;
      height: 60px;
      color: var(--color-primary, #2563eb);
    }
  `
})
export class ElevationProfileComponent {
  readonly track = input.required<TrackPointDto[]>();

  protected readonly profile = computed(() => buildElevationProfile(this.track()));
}
