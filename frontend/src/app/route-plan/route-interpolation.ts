import { RouteSampleDto, TrackPointDto } from './route-plan-api.model';

export interface InterpolatedPosition {
  latitude: number;
  longitude: number;
}

export interface InterpolatedWeather {
  temperatureCelsius: number;
  windSpeedKmh: number;
  precipitationMm: number;
  isEstimatedBeyondForecastRange: boolean;
}

export function interpolatePosition(track: TrackPointDto[], distanceKm: number): InterpolatedPosition {
  if (track.length === 0) {
    throw new Error('Track must contain at least one point.');
  }
  const first = track[0];
  const last = track[track.length - 1];

  if (track.length === 1 || distanceKm <= first.distanceFromStartKm) {
    return { latitude: first.latitude, longitude: first.longitude };
  }
  if (distanceKm >= last.distanceFromStartKm) {
    return { latitude: last.latitude, longitude: last.longitude };
  }

  for (let i = 1; i < track.length; i++) {
    if (track[i].distanceFromStartKm >= distanceKm) {
      const start = track[i - 1];
      const end = track[i];
      const segmentLengthKm = end.distanceFromStartKm - start.distanceFromStartKm;
      const t = segmentLengthKm <= 0 ? 0 : (distanceKm - start.distanceFromStartKm) / segmentLengthKm;
      return {
        latitude: start.latitude + (end.latitude - start.latitude) * t,
        longitude: start.longitude + (end.longitude - start.longitude) * t
      };
    }
  }

  return { latitude: last.latitude, longitude: last.longitude };
}

export function interpolateWeather(samples: RouteSampleDto[], distanceKm: number): InterpolatedWeather | null {
  const withWeather = samples
    .filter((s): s is RouteSampleDto & { weather: NonNullable<RouteSampleDto['weather']> } => s.weather !== null)
    .sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm);

  if (withWeather.length === 0) {
    return null;
  }

  const first = withWeather[0];
  const last = withWeather[withWeather.length - 1];

  if (distanceKm <= first.distanceFromStartKm) {
    return pickWeather(first.weather, distanceKm < first.distanceFromStartKm);
  }
  if (distanceKm >= last.distanceFromStartKm) {
    return pickWeather(last.weather, distanceKm > last.distanceFromStartKm);
  }

  for (let i = 1; i < withWeather.length; i++) {
    if (withWeather[i].distanceFromStartKm >= distanceKm) {
      const start = withWeather[i - 1];
      const end = withWeather[i];
      const segmentLengthKm = end.distanceFromStartKm - start.distanceFromStartKm;
      const t = segmentLengthKm <= 0 ? 0 : (distanceKm - start.distanceFromStartKm) / segmentLengthKm;
      return {
        temperatureCelsius: start.weather.temperatureCelsius + (end.weather.temperatureCelsius - start.weather.temperatureCelsius) * t,
        windSpeedKmh: start.weather.windSpeedKmh + (end.weather.windSpeedKmh - start.weather.windSpeedKmh) * t,
        precipitationMm: start.weather.precipitationMm + (end.weather.precipitationMm - start.weather.precipitationMm) * t,
        isEstimatedBeyondForecastRange: false
      };
    }
  }

  return pickWeather(last.weather, false);
}

function pickWeather(
  weather: NonNullable<RouteSampleDto['weather']>,
  isEstimatedBeyondForecastRange: boolean
): InterpolatedWeather {
  return {
    temperatureCelsius: weather.temperatureCelsius,
    windSpeedKmh: weather.windSpeedKmh,
    precipitationMm: weather.precipitationMm,
    isEstimatedBeyondForecastRange
  };
}
