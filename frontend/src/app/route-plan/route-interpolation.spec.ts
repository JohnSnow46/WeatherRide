import { RouteSampleDto, TrackPointDto } from './route-plan-api.model';
import { interpolatePosition, interpolateWeather, summarizePrecipitationAlert } from './route-interpolation';

describe('interpolatePosition', () => {
  const track: TrackPointDto[] = [
    { latitude: 0, longitude: 0, distanceFromStartKm: 0 },
    { latitude: 10, longitude: 20, distanceFromStartKm: 10 },
    { latitude: 20, longitude: 40, distanceFromStartKm: 20 }
  ];

  it('interpolatePosition_DistanceExactlyOnTrackPoint_ReturnsExactCoordinates', () => {
    const result = interpolatePosition(track, 10);

    expect(result).toEqual({ latitude: 10, longitude: 20 });
  });

  it('interpolatePosition_DistanceHalfwayBetweenTwoPoints_ReturnsLinearMidpoint', () => {
    const result = interpolatePosition(track, 5);

    expect(result.latitude).toBeCloseTo(5);
    expect(result.longitude).toBeCloseTo(10);
  });

  it('interpolatePosition_NegativeDistance_ReturnsFirstPoint', () => {
    const result = interpolatePosition(track, -5);

    expect(result).toEqual({ latitude: 0, longitude: 0 });
  });

  it('interpolatePosition_DistanceBeyondLastPoint_ReturnsLastPoint', () => {
    const result = interpolatePosition(track, 100);

    expect(result).toEqual({ latitude: 20, longitude: 40 });
  });
});

describe('interpolateWeather', () => {
  function sample(distanceFromStartKm: number, weather: RouteSampleDto['weather']): RouteSampleDto {
    return {
      latitude: 0,
      longitude: 0,
      distanceFromStartKm,
      etaAt: new Date().toISOString(),
      weather
    };
  }

  it('interpolateWeather_DistanceExactlyOnSampleWithWeather_ReturnsItsValuesNotEstimated', () => {
    const samples: RouteSampleDto[] = [
      sample(0, { temperatureCelsius: 10, windSpeedKmh: 5, precipitationMm: 0, windDirectionDegrees: 90, relativeHumidityPercent: 50, uvIndex: 1, windGustsKmh: 8 }),
      sample(10, { temperatureCelsius: 20, windSpeedKmh: 15, precipitationMm: 2, windDirectionDegrees: 180, relativeHumidityPercent: 55, uvIndex: 3, windGustsKmh: 20 })
    ];

    const result = interpolateWeather(samples, 10);

    expect(result).toEqual({
      temperatureCelsius: 20,
      windSpeedKmh: 15,
      precipitationMm: 2,
      isEstimatedBeyondForecastRange: false
    });
  });

  it('interpolateWeather_MiddleSampleIsNull_SkipsNullAndInterpolatesBetweenNearestWithWeather', () => {
    const samples: RouteSampleDto[] = [
      sample(0, { temperatureCelsius: 10, windSpeedKmh: 10, precipitationMm: 0, windDirectionDegrees: 45, relativeHumidityPercent: 50, uvIndex: 1, windGustsKmh: 8 }),
      sample(5, null),
      sample(10, { temperatureCelsius: 20, windSpeedKmh: 20, precipitationMm: 4, windDirectionDegrees: 225, relativeHumidityPercent: 60, uvIndex: 4, windGustsKmh: 25 })
    ];

    const result = interpolateWeather(samples, 5);

    expect(result?.temperatureCelsius).toBeCloseTo(15);
    expect(result?.windSpeedKmh).toBeCloseTo(15);
    expect(result?.precipitationMm).toBeCloseTo(2);
    expect(result?.isEstimatedBeyondForecastRange).toBeFalse();
  });

  it('interpolateWeather_DistanceBeyondLastSampleWithWeather_ReturnsItsValuesEstimated', () => {
    const samples: RouteSampleDto[] = [
      sample(0, { temperatureCelsius: 10, windSpeedKmh: 10, precipitationMm: 0, windDirectionDegrees: 45, relativeHumidityPercent: 50, uvIndex: 1, windGustsKmh: 8 }),
      sample(10, { temperatureCelsius: 20, windSpeedKmh: 20, precipitationMm: 4, windDirectionDegrees: 270, relativeHumidityPercent: 60, uvIndex: 4, windGustsKmh: 25 })
    ];

    const result = interpolateWeather(samples, 15);

    expect(result).toEqual({
      temperatureCelsius: 20,
      windSpeedKmh: 20,
      precipitationMm: 4,
      isEstimatedBeyondForecastRange: true
    });
  });

  it('interpolateWeather_AllSamplesNull_ReturnsNull', () => {
    const samples: RouteSampleDto[] = [sample(0, null), sample(10, null)];

    const result = interpolateWeather(samples, 5);

    expect(result).toBeNull();
  });
});

describe('summarizePrecipitationAlert', () => {
  function sampleWithPrecipitation(precipitationMm: number | null): RouteSampleDto {
    return {
      latitude: 0,
      longitude: 0,
      distanceFromStartKm: 0,
      etaAt: new Date().toISOString(),
      weather:
        precipitationMm === null
          ? null
          : {
              temperatureCelsius: 15,
              windSpeedKmh: 10,
              precipitationMm,
              windDirectionDegrees: 180,
              relativeHumidityPercent: 50,
              uvIndex: 2,
              windGustsKmh: 15
            }
    };
  }

  it('summarizePrecipitationAlert_SomeSamplesAboveDefaultThreshold_CountsOnlyThose', () => {
    const samples = [
      sampleWithPrecipitation(0),
      sampleWithPrecipitation(0.5),
      sampleWithPrecipitation(1.5),
      sampleWithPrecipitation(3),
      sampleWithPrecipitation(null)
    ];

    const result = summarizePrecipitationAlert(samples);

    expect(result).toEqual({ samplesAboveThreshold: 2, samplesWithForecast: 4 });
  });

  it('summarizePrecipitationAlert_CustomThreshold_UsesItInsteadOfDefault', () => {
    const samples = [sampleWithPrecipitation(2), sampleWithPrecipitation(4)];

    const result = summarizePrecipitationAlert(samples, 3);

    expect(result).toEqual({ samplesAboveThreshold: 1, samplesWithForecast: 2 });
  });

  it('summarizePrecipitationAlert_NoForecasts_ReturnsZeroCounts', () => {
    const result = summarizePrecipitationAlert([sampleWithPrecipitation(null)]);

    expect(result).toEqual({ samplesAboveThreshold: 0, samplesWithForecast: 0 });
  });
});
