import { RouteSampleDto } from './route-plan-api.model';
import { RouteVariant, summarizeVariant, variantLabel } from './variant-comparison';

function sample(temperatureCelsius: number, precipitationMm: number): RouteSampleDto {
  return {
    latitude: 52.0,
    longitude: 21.0,
    distanceFromStartKm: 0,
    etaAt: '2026-08-01T10:00:00',
    weather: {
      temperatureCelsius,
      windSpeedKmh: 10,
      precipitationMm,
      windDirectionDegrees: 90,
      relativeHumidityPercent: 50,
      uvIndex: 3,
      windGustsKmh: 15
    }
  };
}

function sampleWithoutForecast(): RouteSampleDto {
  return { latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0, etaAt: '2026-08-01T10:00:00', weather: null };
}

describe('summarizeVariant', () => {
  it('AveragesTemperatureAndFindsMaxPrecipitation_AcrossSamplesWithForecast', () => {
    const variant: RouteVariant = {
      label: 'Original',
      departureShiftHours: 0,
      samples: [sample(10, 0), sample(20, 2.5), sample(30, 1)]
    };

    const summary = summarizeVariant(variant);

    expect(summary.avgTemperatureCelsius).toBeCloseTo(20, 5);
    expect(summary.maxPrecipitationMm).toBe(2.5);
    expect(summary.samplesWithRain).toBe(2);
    expect(summary.samplesWithForecast).toBe(3);
  });

  it('IgnoresSamplesWithoutForecast', () => {
    const variant: RouteVariant = {
      label: '+1h',
      departureShiftHours: 1,
      samples: [sample(10, 0), sampleWithoutForecast()]
    };

    const summary = summarizeVariant(variant);

    expect(summary.samplesWithForecast).toBe(1);
    expect(summary.avgTemperatureCelsius).toBe(10);
  });

  it('ReturnsNulls_WhenNoSampleHasForecast', () => {
    const variant: RouteVariant = {
      label: '-3h',
      departureShiftHours: -3,
      samples: [sampleWithoutForecast(), sampleWithoutForecast()]
    };

    const summary = summarizeVariant(variant);

    expect(summary.avgTemperatureCelsius).toBeNull();
    expect(summary.maxPrecipitationMm).toBeNull();
    expect(summary.samplesWithRain).toBe(0);
    expect(summary.samplesWithForecast).toBe(0);
  });
});

describe('variantLabel', () => {
  it('ReturnsOriginal_ForZeroShift', () => {
    expect(variantLabel(0)).toBe('Original');
  });

  it('ReturnsSignedHours_ForNonZeroShift', () => {
    expect(variantLabel(2)).toBe('+2h');
    expect(variantLabel(-3)).toBe('-3h');
  });
});
