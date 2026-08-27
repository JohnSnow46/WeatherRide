import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { GpsPointDto, PlanDirectRouteRequestDto, PlanRouteResponse } from './route-plan-api.model';

@Injectable({ providedIn: 'root' })
export class RoutePlanApiService {
  constructor(private readonly http: HttpClient) {}

  planDirectRoute(
    pointA: GpsPointDto,
    pointB: GpsPointDto,
    departureAtIso: string,
    averageSpeedKmh: number | null,
    plannedDurationHours: number | null,
    sampleCount: number
  ): Observable<PlanRouteResponse> {
    const body: PlanDirectRouteRequestDto = {
      pointA,
      pointB,
      departureAt: departureAtIso,
      averageSpeedKmh,
      plannedDurationHours,
      sampleCount
    };

    return this.http.post<PlanRouteResponse>('/api/routes/plan-direct', body);
  }

  planRoute(
    gpxFile: File,
    departureAtIso: string,
    averageSpeedKmh: number | null,
    plannedDurationHours: number | null,
    sampleCount: number
  ): Observable<PlanRouteResponse> {
    const formData = new FormData();
    formData.append('GpxFile', gpxFile);
    formData.append('DepartureAt', departureAtIso);
    if (averageSpeedKmh !== null) {
      formData.append('AverageSpeedKmh', averageSpeedKmh.toString());
    }
    if (plannedDurationHours !== null) {
      formData.append('PlannedDurationHours', plannedDurationHours.toString());
    }
    formData.append('SampleCount', sampleCount.toString());

    return this.http.post<PlanRouteResponse>('/api/routes/plan', formData);
  }
}
