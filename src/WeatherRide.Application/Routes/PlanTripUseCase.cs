using WeatherRide.Application.Gpx;
using WeatherRide.Application.Weather;
using WeatherRide.Domain.Routes;

namespace WeatherRide.Application.Routes;

/// <summary>
/// Use case łączący parsowanie GPX, próbkowanie trasy i pobranie prognozy pogody: plik
/// GPX + parametry wyjazdu → lista <see cref="RouteSampleWeather"/>.
/// </summary>
public sealed class PlanTripUseCase
{
    private readonly IGpxParser _gpxParser;
    private readonly IWeatherClient _weatherClient;

    public PlanTripUseCase(IGpxParser gpxParser, IWeatherClient weatherClient)
    {
        _gpxParser = gpxParser;
        _weatherClient = weatherClient;
    }

    public async Task<TripPlanResult> PlanAsync(
        Stream gpxContent,
        DateTimeOffset departureAt,
        double? averageSpeedKmh,
        double? plannedDurationMinutes,
        int? sampleCount,
        CancellationToken cancellationToken)
    {
        var route = await _gpxParser.ParseAsync(gpxContent, cancellationToken);

        var tripPlan = TripPlan.Create(departureAt, route.TotalDistanceKm, averageSpeedKmh, plannedDurationMinutes);

        var samples = RouteSampler.Sample(route, tripPlan, sampleCount ?? RouteSampler.MaxSamples);

        var forecasts = await _weatherClient.GetForecastsAsync(samples, cancellationToken);

        return new TripPlanResult(route, samples.Select((sample, i) => new RouteSampleWeather(sample, forecasts[i])).ToList());
    }
}
