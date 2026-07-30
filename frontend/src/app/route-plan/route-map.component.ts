import { AfterViewInit, Component, ElementRef, OnDestroy, effect, inject, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';

import { RoutePlanStateService } from './route-plan-state.service';
import { PlanRouteResponse } from './route-plan-api.model';
import { interpolatePosition } from './route-interpolation';

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
    this.sampleMarkersLayer?.remove();
    this.trackLayer = null;
    this.sampleMarkersLayer = null;
    this.movingMarker?.remove();
    this.movingMarker = null;

    if (!result) {
      return;
    }

    const trackLatLngs = result.track.map((p) => [p.latitude, p.longitude] as L.LatLngTuple);
    this.trackLayer = L.polyline(trackLatLngs, { color: '#2563eb', weight: 4 }).addTo(this.map);

    this.sampleMarkersLayer = L.layerGroup(
      result.samples.map((sample) => {
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
