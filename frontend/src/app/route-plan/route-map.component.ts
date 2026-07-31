import { AfterViewInit, Component, ElementRef, OnDestroy, effect, inject, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';

import { RoutePlanStateService } from './route-plan-state.service';
import { PlanRouteResponse, RouteSampleDto, WeatherForecastDto } from './route-plan-api.model';
import { interpolatePosition } from './route-interpolation';

const PRECIPITATION_CAP_MM = 5;
const PRECIPITATION_COLOR_LOW: [number, number, number] = [0x93, 0xc5, 0xfd]; // #93c5fd, 0mm
const PRECIPITATION_COLOR_HIGH: [number, number, number] = [0x1e, 0x3a, 0x8a]; // #1e3a8a, >=5mm
const PRECIPITATION_COLOR_UNKNOWN = '#94a3b8';

/** Linear interpolation between the low/high precipitation colors, capped at PRECIPITATION_CAP_MM. */
function precipitationColor(mm: number): string {
  const t = Math.min(mm, PRECIPITATION_CAP_MM) / PRECIPITATION_CAP_MM;
  const [r, g, b] = PRECIPITATION_COLOR_LOW.map((low, i) => Math.round(low + (PRECIPITATION_COLOR_HIGH[i] - low) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Finds the sample whose distanceFromStartKm is closest to the given distance. */
function nearestSample(distanceKm: number, samples: RouteSampleDto[]): RouteSampleDto {
  return samples.reduce((closest, s) =>
    Math.abs(s.distanceFromStartKm - distanceKm) < Math.abs(closest.distanceFromStartKm - distanceKm) ? s : closest
  );
}

/** Open-Meteo's windDirectionDegrees is the direction the wind blows FROM, so the arrow
 * (pointing where the wind blows TO) needs a 180deg flip. The glyph itself points north (0deg
 * = up), matching the compass-bearing rotation convention (clockwise from north). */
function windArrowIcon(weather: WeatherForecastDto): L.DivIcon {
  const rotationDeg = weather.windDirectionDegrees + 180;
  const { size, opacity } = windArrowAppearance(weather.windSpeedKmh);
  return L.divIcon({
    className: 'route-map-wind-arrow',
    html: `<span style="display:inline-block; transform: rotate(${rotationDeg}deg); opacity: ${opacity}; font-size: ${Math.round(size * 0.6)}px;">&#8593;</span>`,
    iconSize: [size, size]
  });
}

function windArrowAppearance(windSpeedKmh: number): { size: number; opacity: number } {
  if (windSpeedKmh < 10) {
    return { size: 18, opacity: 0.75 };
  }
  if (windSpeedKmh < 30) {
    return { size: 24, opacity: 0.9 };
  }
  return { size: 32, opacity: 1 };
}

// Leaflet's IconDefault._getIconUrl prepends an auto-detected imagePath (parsed from the
// .leaflet-default-icon-path CSS rule) in front of iconUrl/shadowUrl, which breaks these
// relative paths once Angular's CSS asset pipeline rewrites that rule's url() to /media/.
// Deleting it falls back to the base Icon._getIconUrl, which uses iconUrl/shadowUrl as-is.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'leaflet/marker-icon-2x.png',
  iconUrl: 'leaflet/marker-icon.png',
  shadowUrl: 'leaflet/marker-shadow.png'
});

@Component({
  selector: 'app-route-map',
  imports: [],
  templateUrl: './route-map.component.html',
  styleUrl: './route-map.component.scss'
})
export class RouteMapComponent implements AfterViewInit, OnDestroy {
  protected readonly routePlanStateService = inject(RoutePlanStateService);
  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private readonly mapReady = signal(false);

  private map: L.Map | null = null;
  private trackLayer: L.Polyline | null = null;
  private precipitationSegmentsLayer: L.LayerGroup | null = null;
  private windArrowsLayer: L.LayerGroup | null = null;
  private sampleMarkersLayer: L.LayerGroup | null = null;
  private movingMarker: L.Marker | null = null;
  private readonly movingMarkerIcon = L.divIcon({ className: 'route-map-moving-marker', iconSize: [16, 16] });

  constructor() {
    effect(() => {
      const ready = this.mapReady();
      const result = this.routePlanStateService.result();
      if (!ready || !this.map) {
        return;
      }
      this.renderResult(result);
    });

    effect(() => {
      const ready = this.mapReady();
      const result = this.routePlanStateService.result();
      const distanceKm = this.routePlanStateService.selectedDistanceKm();
      if (!ready || !this.map || !result || !this.movingMarker) {
        return;
      }
      const position = interpolatePosition(result.track, distanceKm);
      this.movingMarker.setLatLng([position.latitude, position.longitude]);
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer().nativeElement).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);
    this.mapReady.set(true);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private renderResult(result: PlanRouteResponse | null): void {
    if (!this.map) {
      return;
    }
    this.trackLayer?.remove();
    this.precipitationSegmentsLayer?.remove();
    this.windArrowsLayer?.remove();
    this.sampleMarkersLayer?.remove();
    this.trackLayer = null;
    this.precipitationSegmentsLayer = null;
    this.windArrowsLayer = null;
    this.sampleMarkersLayer = null;
    this.movingMarker?.remove();
    this.movingMarker = null;

    if (!result) {
      return;
    }

    // Thin gray line: exact GPX shape (result.track has no weather attached to it).
    const trackLatLngs = result.track.map((p) => [p.latitude, p.longitude] as L.LatLngTuple);
    this.trackLayer = L.polyline(trackLatLngs, { color: '#94a3b8', weight: 2 }).addTo(this.map);

    // Thicker colored segments following the actual GPX track shape, colored by the
    // nearest sample's forecast (only samples carry weather).
    this.precipitationSegmentsLayer = L.layerGroup(
      result.track.slice(0, -1).map((point, i) => {
        const next = result.track[i + 1];
        const midDistanceKm = (point.distanceFromStartKm + next.distanceFromStartKm) / 2;
        const sample = nearestSample(midDistanceKm, result.samples);
        const color = sample.weather ? precipitationColor(sample.weather.precipitationMm) : PRECIPITATION_COLOR_UNKNOWN;
        const segmentLatLngs: L.LatLngTuple[] = [
          [point.latitude, point.longitude],
          [next.latitude, next.longitude]
        ];
        return L.polyline(segmentLatLngs, { color, weight: 5 });
      })
    ).addTo(this.map);

    this.windArrowsLayer = L.layerGroup(
      result.samples
        .filter((sample) => sample.weather !== null)
        .map((sample) => L.marker([sample.latitude, sample.longitude], { icon: windArrowIcon(sample.weather!) }))
    ).addTo(this.map);

    const endpointSamples =
      result.samples.length > 1
        ? [result.samples[0], result.samples[result.samples.length - 1]]
        : result.samples;

    this.sampleMarkersLayer = L.layerGroup(
      endpointSamples.map((sample) => {
        const popupText = sample.weather
          ? `${sample.distanceFromStartKm.toFixed(1)} km — ${sample.weather.temperatureCelsius.toFixed(1)}°C, wind ${sample.weather.windSpeedKmh.toFixed(1)} km/h`
          : `${sample.distanceFromStartKm.toFixed(1)} km — No forecast available`;
        return L.marker([sample.latitude, sample.longitude]).bindPopup(popupText);
      })
    ).addTo(this.map);

    this.movingMarker =
      result.track.length > 0
        ? L.marker([result.track[0].latitude, result.track[0].longitude], { icon: this.movingMarkerIcon }).addTo(this.map)
        : null;

    this.map.fitBounds(this.trackLayer.getBounds());
  }
}
