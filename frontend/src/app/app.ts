import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { RoutePlanFormComponent } from './route-plan/route-plan-form.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RoutePlanFormComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('WeatherRide');
}
