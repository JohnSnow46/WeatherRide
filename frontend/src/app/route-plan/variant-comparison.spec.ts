import { RouteSampleDto } from './route-plan-api.model';
import { RouteVariant, pickBestVariant, summarizeVariant, variantLabel } from './variant-comparison';

function sample(
  temperatureCelsius: number,
  precipitationMm: number,
  windRelativeDirection: RouteSampleDto['windRelativeDirection'] = null
): RouteSampleDto {
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
    },
    windRelativeDirection
  };
}

function sampleWithoutForecast(): RouteSampleDto {
  return { latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0, etaAt: '2026-08-01T10:00:00', weather: null, windRelativeDirection: null };
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

  it('CountsSamplesWithHeadwind_IgnoringCrosswindAndTailwind', () => {
    const variant: RouteVariant = {
      label: 'Original',
      departureShiftHours: 0,
      samples: [
        sample(10, 0, 'Headwind'),
        sample(12, 0, 'Crosswind'),
        sample(14, 0, 'Tailwind'),
        sample(16, 0, 'Headwind'),
        sample(18, 0, null)
      ]
    };

    const summary = summarizeVariant(variant);

    expect(summary.samplesWithHeadwind).toBe(2);
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

describe('pickBestVariant', () => {
  function variant(departureShiftHours: number, samples: RouteSampleDto[]): RouteVariant {
    return { label: variantLabel(departureShiftHours), departureShiftHours, samples };
  }

  it('PrefersFewerRainSamples_OverAnyOtherFactor', () => {
    const dry = variant(2, [sample(5, 0), sample(5, 0)]);
    const rainy = variant(0, [sample(20, 10), sample(20, 0)]);

    expect(pickBestVariant([rainy, dry])).toBe(dry);
  });

  it('PrefersVariantWithForecastData_WhenRainCountsTie', () => {
    const noData = variant(5, [sampleWithoutForecast()]);
    const withData = variant(1, [sample(10, 0)]);

    expect(pickBestVariant([noData, withData])).toBe(withData);
  });

  it('PrefersLowerPeakPrecipitation_WhenRainCountsAndForecastCoverageTie', () => {
    const lightRain = variant(3, [sample(10, 1)]);
    const heavyRain = variant(-3, [sample(10, 8)]);

    expect(pickBestVariant([heavyRain, lightRain])).toBe(lightRain);
  });

  it('PrefersSmallestShift_WhenEverythingElseTies', () => {
    const closer = variant(1, [sample(10, 0)]);
    const farther = variant(-4, [sample(10, 0)]);

    expect(pickBestVariant([farther, closer])).toBe(closer);
  });
});
