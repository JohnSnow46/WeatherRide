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
  minTemperatureCelsius: number | null;
  maxTemperatureCelsius: number | null;
  maxPrecipitationMm: number | null;
  maxWindGustsKmh: number | null;
  samplesWithRain: number;
  samplesWithForecast: number;
  samplesWithHeadwind: number;
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
    // Roadmap #6 asked for the "extreme temperature" per variant, not just the average --
    // a 15°C average can hide a 4°C pre-dawn start that matters more to the rider.
    minTemperatureCelsius: withWeather.length > 0 ? Math.min(...withWeather.map(s => s.weather.temperatureCelsius)) : null,
    maxTemperatureCelsius: withWeather.length > 0 ? Math.max(...withWeather.map(s => s.weather.temperatureCelsius)) : null,
    maxPrecipitationMm: withWeather.length > 0 ? Math.max(...withWeather.map(s => s.weather.precipitationMm)) : null,
    // Gusts (roadmap #4, "istotny dla rowerzystów") only ever reached the per-row hover
    // tooltip -- invisible on touch devices and never compared across variants.
    maxWindGustsKmh: withWeather.length > 0 ? Math.max(...withWeather.map(s => s.weather.windGustsKmh)) : null,
    samplesWithRain: withWeather.filter(s => s.weather.precipitationMm > 0).length,
    samplesWithForecast: withWeather.length,
    // windRelativeDirection (roadmap #10) never made it into this comparison --
    // a variant with less rain can still be the worse choice if it trades that
    // for more headwind, so surface the count alongside rain instead of silently
    // dropping data the main results table already has per sample.
    samplesWithHeadwind: variant.samples.filter(s => s.windRelativeDirection === 'Headwind').length
  };
}

export function variantLabel(departureShiftHours: number): string {
  return departureShiftHours === 0 ? 'Original' : `${departureShiftHours > 0 ? '+' : ''}${departureShiftHours}h`;
}

/** Picks the variant with the least rain, for the "find best departure hour" window
 * search (roadmap #12). Ties break in order: fewer rain samples, then more samples with
 * any forecast at all (a shift outside Open-Meteo's horizon has no data to judge by, so
 * it never beats one that does), then lower peak precipitation, then the smallest shift
 * from the original departure time (least disruptive). */
export function pickBestVariant(variants: RouteVariant[]): RouteVariant {
  return variants
    .map(variant => ({ variant, summary: summarizeVariant(variant) }))
    .reduce((best, current) => (isBetterVariant(current.summary, best.summary) ? current : best)).variant;
}

function isBetterVariant(candidate: VariantSummary, best: VariantSummary): boolean {
  if (candidate.samplesWithRain !== best.samplesWithRain) {
    return candidate.samplesWithRain < best.samplesWithRain;
  }
  if (candidate.samplesWithForecast !== best.samplesWithForecast) {
    return candidate.samplesWithForecast > best.samplesWithForecast;
  }
  const candidatePrecip = candidate.maxPrecipitationMm ?? Infinity;
  const bestPrecip = best.maxPrecipitationMm ?? Infinity;
  if (candidatePrecip !== bestPrecip) {
    return candidatePrecip < bestPrecip;
  }
  return Math.abs(candidate.departureShiftHours) < Math.abs(best.departureShiftHours);
}
