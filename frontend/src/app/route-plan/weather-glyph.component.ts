import { Component, input } from '@angular/core';

import { WeatherIconKind } from './weather-icon';

@Component({
  selector: 'app-weather-glyph',
  imports: [],
  template: `
    @if (kind() === 'rain') {
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M7.5 16.25a4.25 4.25 0 0 1 .4-8.48A5.75 5.75 0 0 1 19 9.25a3.75 3.75 0 0 1-.6 7"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path d="M8.5 19.5l-1 2M12.5 19.5l-1 2M16.5 19.5l-1 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    } @else {
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4.25" fill="currentColor" />
        <path
          d="M12 2.75v2.75M12 18.5v2.75M3.5 12h2.75M17.75 12h2.75M5.6 5.6l1.95 1.95M16.45 16.45l1.95 1.95M18.4 5.6l-1.95 1.95M7.55 16.45l-1.95 1.95"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
    }
  `,
  host: {
    class: 'app-weather-glyph',
    '[class.is-rain]': "kind() === 'rain'"
  },
  styles: `
    .app-weather-glyph {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--color-accent-sun);
    }

    .app-weather-glyph.is-rain {
      color: var(--color-primary);
    }

    .app-weather-glyph svg {
      width: 60%;
      height: 60%;
    }
  `
})
export class WeatherGlyphComponent {
  readonly kind = input.required<WeatherIconKind>();
}
