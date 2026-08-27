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
        double? plannedDurationHours,
        int? sampleCount,
        CancellationToken cancellationToken)
    {
        var route = await _gpxParser.ParseAsync(gpxContent, cancellationToken);

        return await RouteWeatherPlanner.PlanAsync(
            _weatherClient, route, departureAt, averageSpeedKmh, plannedDurationHours, sampleCount, cancellationToken);
    }
}
