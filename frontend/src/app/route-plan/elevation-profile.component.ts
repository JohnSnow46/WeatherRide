import { Component, computed, ElementRef, input, viewChild } from '@angular/core';

import { TrackPointDto } from './route-plan-api.model';
import { buildElevationProfile } from './elevation-profile';

const EXPORT_WIDTH_PX = 800;
const EXPORT_HEIGHT_PX = 320;

@Component({
  selector: 'app-elevation-profile',
  imports: [],
  template: `
    @if (profile(); as profile) {
      <div class="elevation-profile">
        <div class="elevation-stats">
          <span>{{ profile.minElevationM.toFixed(0) }}–{{ profile.maxElevationM.toFixed(0) }} m</span>
          <span>&#8599; {{ profile.totalAscentM.toFixed(0) }} m ascent</span>
          <span>&#8600; {{ profile.totalDescentM.toFixed(0) }} m descent</span>
          <button type="button" class="elevation-download" (click)="downloadAsImage()">Download as image</button>
        </div>
        <svg #chart viewBox="0 0 100 40" preserveAspectRatio="none" class="elevation-chart">
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

    .elevation-download {
      font: inherit;
      font-size: 0.75rem;
      background: none;
      border: 1px solid currentColor;
      border-radius: 4px;
      padding: 0.1rem 0.4rem;
      cursor: pointer;
      color: inherit;
    }
  `
})
export class ElevationProfileComponent {
  readonly track = input.required<TrackPointDto[]>();
  private readonly chartRef = viewChild<ElementRef<SVGSVGElement>>('chart');

  protected readonly profile = computed(() => buildElevationProfile(this.track()));

  /**
   * Serializes the existing elevation SVG (no charting library, see `elevation-profile.ts`)
   * to a PNG the user can save/share — rasterized at a fixed, larger size than the
   * on-screen chart so the exported image isn't limited to display resolution.
   */
  protected downloadAsImage(): void {
    const svgElement = this.chartRef()?.nativeElement;
    if (!svgElement) {
      return;
    }

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    // `stroke="currentColor"` resolves against the live element's computed `color` on
    // screen; a detached SVG serialized to a data URL has no page stylesheet to inherit
    // that from, so bake the resolved color in as an inline style before serializing.
    clone.style.color = getComputedStyle(svgElement).color;
    clone.setAttribute('width', String(EXPORT_WIDTH_PX));
    clone.setAttribute('height', String(EXPORT_HEIGHT_PX));

    const svgString = new XMLSerializer().serializeToString(clone);
    const svgUrl = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_WIDTH_PX;
      canvas.height = EXPORT_HEIGHT_PX;
      const context = canvas.getContext('2d');

      if (context) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            return;
          }
          const link = document.createElement('a');
          link.href = URL.createObjectURL(pngBlob);
          link.download = 'elevation-profile.png';
          link.click();
          URL.revokeObjectURL(link.href);
        }, 'image/png');
      }

      URL.revokeObjectURL(svgUrl);
    };
    image.src = svgUrl;
  }
}
