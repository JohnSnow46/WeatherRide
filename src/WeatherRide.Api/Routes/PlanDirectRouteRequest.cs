using WeatherRide.Domain.Routes;

namespace WeatherRide.Api.Routes;

/// <summary>
/// Wejście endpointu <c>POST /api/routes/plan-direct</c> (application/json): para punktów
/// A-B (bez pliku GPX) + parametry planu wyjazdu.
/// </summary>
public sealed class PlanDirectRouteRequest
{
    public GpsPoint? PointA { get; set; }

    public GpsPoint? PointB { get; set; }

    public DateTimeOffset DepartureAt { get; set; }

    public double? AverageSpeedKmh { get; set; }

    public double? PlannedDurationHours { get; set; }

    public int? SampleCount { get; set; }
}
