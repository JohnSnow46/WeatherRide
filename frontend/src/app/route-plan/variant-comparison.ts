import { RouteSampleDto } from './route-plan-api.model';

/** A snapshot of a planned route's samples at a given departure-time shift, captured for
 * side-by-side comparison. Built from the already-fetched result (see route-plan #3,
 * departure-shift) — never triggers its own API call. */
export interface RouteVariant {
  label: string;
  departureShiftHours: number;
  samples: RouteSampleDto[];
}

export interface VariantSummary {
  label: string;
  departureShiftHours: number;
  avgTemperatureCelsius: number | null;
  maxPrecipitationMm: number | null;
  samplesWithRain: number;
  samplesWithForecast: number;
}

export function summarizeVariant(variant: RouteVariant): VariantSummary {
  const withWeather = variant.samples.filter(
    (s): s is RouteSampleDto & { weather: NonNullable<RouteSampleDto['weather']> } => s.weather !== null
  );

  return {
    label: variant.label,
    departureShiftHours: variant.departureShiftHours,
    avgTemperatureCelsius:
      withWeather.length > 0
        ? withWeather.reduce((sum, s) => sum + s.weather.temperatureCelsius, 0) / withWeather.length
        : null,
    maxPrecipitationMm: withWeather.length > 0 ? Math.max(...withWeather.map(s => s.weather.precipitationMm)) : null,
    samplesWithRain: withWeather.filter(s => s.weather.precipitationMm > 0).length,
    samplesWithForecast: withWeather.length
  };
}

export function variantLabel(departureShiftHours: number): string {
  return departureShiftHours === 0 ? 'Original' : `${departureShiftHours > 0 ? '+' : ''}${departureShiftHours}h`;
}
