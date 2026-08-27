using WeatherRide.Application.Weather;
using WeatherRide.Domain.Routes;

namespace WeatherRide.Application.Routes;

/// <summary>
/// Wspólny krok współdzielony przez use case'y planowania trasy (GPX i A-B): buduje plan
/// wyjazdu, próbkuje trasę i pobiera prognozę pogody dla próbek.
/// </summary>
public static class RouteWeatherPlanner
{
    public static async Task<TripPlanResult> PlanAsync(
        IWeatherClient weatherClient,
        Route route,
        DateTimeOffset departureAt,
        double? averageSpeedKmh,
        double? plannedDurationHours,
        int? sampleCount,
        CancellationToken cancellationToken)
    {
        var tripPlan = TripPlan.Create(departureAt, route.TotalDistanceKm, averageSpeedKmh, plannedDurationHours);

        var samples = RouteSampler.Sample(route, tripPlan, sampleCount ?? RouteSampler.MaxSamples);

        var forecasts = await weatherClient.GetForecastsAsync(samples, cancellationToken);

        return new TripPlanResult(route, samples.Select((sample, i) => new RouteSampleWeather(sample, forecasts[i])).ToList());
    }
}
