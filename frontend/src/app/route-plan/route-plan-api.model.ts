export interface WeatherForecastDto {
  temperatureCelsius: number;
  windSpeedKmh: number;
  precipitationMm: number;
}

export interface RouteSampleDto {
  latitude: number;
  longitude: number;
  distanceFromStartKm: number;
  etaAt: string;
  weather: WeatherForecastDto | null;
}

export interface PlanRouteResponse {
  totalDistanceKm: number;
  samples: RouteSampleDto[];
}
