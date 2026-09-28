using WeatherRide.Application.Weather;

namespace WeatherRide.Application.Routes;

/// <summary>
/// Use case przeliczający ETA/pogodę dla już wyliczonych próbek trasy po zmianie godziny
/// wyjazdu (lub prędkości/czasu), bez ponownego przesyłania GPX ani ponownego próbkowania.
/// </summary>
public sealed class ReforecastTripUseCase
{
    private readonly IWeatherClient _weatherClient;

    public ReforecastTripUseCase(IWeatherClient weatherClient)
    {
        _weatherClient = weatherClient;
    }

    public Task<IReadOnlyList<RouteSampleWeather>> ReforecastAsync(
        IReadOnlyList<ReforecastSample> existingSamples,
        double totalDistanceKm,
        DateTimeOffset departureAt,
        double? averageSpeedKmh,
        double? plannedDurationHours,
        CancellationToken cancellationToken)
    {
        return RouteWeatherPlanner.ReforecastAsync(
            _weatherClient, existingSamples, totalDistanceKm, departureAt, averageSpeedKmh, plannedDurationHours, cancellationToken);
    }
}
