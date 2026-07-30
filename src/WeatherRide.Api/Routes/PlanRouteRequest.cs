using Microsoft.AspNetCore.Mvc;

namespace WeatherRide.Api.Routes;

/// <summary>
/// Wejście endpointu <c>POST /api/routes/plan</c> (multipart/form-data): plik GPX +
/// parametry planu wyjazdu. Kształt zgodny z ADR-0004.
/// </summary>
public sealed class PlanRouteRequest
{
    [FromForm]
    public IFormFile? GpxFile { get; set; }

    [FromForm]
    public DateTimeOffset DepartureAt { get; set; }

    [FromForm]
    public double? AverageSpeedKmh { get; set; }

    [FromForm]
    public double? PlannedDurationMinutes { get; set; }

    [FromForm]
    public int? SampleCount { get; set; }
}
