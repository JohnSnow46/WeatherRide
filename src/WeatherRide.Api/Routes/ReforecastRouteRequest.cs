namespace WeatherRide.Api.Routes;

/// <summary>
/// Wejście endpointu <c>POST /api/routes/reforecast</c> (application/json): już wyliczone
/// próbki trasy + nowe parametry wyjazdu, do przeliczenia ETA/pogody bez ponownego
/// próbkowania trasy.
/// </summary>
public sealed class ReforecastRouteRequest
{
    public List<ReforecastSampleRequest>? Samples { get; set; }

    public double TotalDistanceKm { get; set; }

    public DateTimeOffset DepartureAt { get; set; }

    public double? AverageSpeedKmh { get; set; }

    public double? PlannedDurationHours { get; set; }
}
