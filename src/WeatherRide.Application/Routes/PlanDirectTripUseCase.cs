using WeatherRide.Application.Weather;
using WeatherRide.Domain.Routes;

namespace WeatherRide.Application.Routes;

/// <summary>
/// Use case łączący parę punktów A-B (bez pliku GPX), próbkowanie trasy i pobranie
/// prognozy pogody: dwa punkty + parametry wyjazdu → lista <see cref="RouteSampleWeather"/>.
/// </summary>
public sealed class PlanDirectTripUseCase
{
    private readonly IWeatherClient _weatherClient;

    public PlanDirectTripUseCase(IWeatherClient weatherClient)
    {
        _weatherClient = weatherClient;
    }

    public Task<TripPlanResult> PlanAsync(
        GpsPoint pointA,
        GpsPoint pointB,
        DateTimeOffset departureAt,
        double? averageSpeedKmh,
        double? plannedDurationHours,
        int? sampleCount,
        CancellationToken cancellationToken)
    {
        var route = Route.Create(new[] { pointA, pointB });

        return RouteWeatherPlanner.PlanAsync(
            _weatherClient, route, departureAt, averageSpeedKmh, plannedDurationHours, sampleCount, cancellationToken);
    }
}
