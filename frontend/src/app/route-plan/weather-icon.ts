export type WeatherIconKind = 'rain' | 'sun';

const RAIN_THRESHOLD_MM = 0.2;

/** No weathercode is available from the API — precipitation is the only signal we have
 * to distinguish "rain" from "clear/dry" for the glyph shown next to each forecast. Accepts
 * both WeatherForecastDto and InterpolatedWeather since both carry precipitationMm. */
export function weatherIconKind(weather: { precipitationMm: number }): WeatherIconKind {
  return weather.precipitationMm >= RAIN_THRESHOLD_MM ? 'rain' : 'sun';
}
