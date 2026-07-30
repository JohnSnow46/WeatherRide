import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { RoutePlanFormComponent } from './route-plan/route-plan-form.component';
import { RoutePlanResultComponent } from './route-plan/route-plan-result.component';
import { RouteMapComponent } from './route-plan/route-map.component';
import { RouteSliderComponent } from './route-plan/route-slider.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RoutePlanFormComponent, RouteMapComponent, RouteSliderComponent, RoutePlanResultComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('WeatherRide');
}
