import { Component, inject } from '@angular/core';

import { RoutePlanStateService } from './route-plan-state.service';

@Component({
  selector: 'app-route-plan-result',
  imports: [],
  templateUrl: './route-plan-result.component.html',
  styleUrl: './route-plan-result.component.scss'
})
export class RoutePlanResultComponent {
  protected readonly routePlanStateService = inject(RoutePlanStateService);

  protected formatEta(etaAt: string): string {
    return new Date(etaAt).toLocaleString();
  }
}
