using Microsoft.AspNetCore.Mvc;
using WeatherRide.Application.Routes;

namespace WeatherRide.Api.Routes;

[ApiController]
[Route("api/routes")]
public sealed class RoutesController : ControllerBase
{
    private readonly PlanTripUseCase _planTripUseCase;

    public RoutesController(PlanTripUseCase planTripUseCase)
    {
        _planTripUseCase = planTripUseCase;
    }

    /// <summary>
    /// Przyjmuje plik GPX + parametry wyjazdu i zwraca próbkowane punkty trasy z ETA i
    /// prognozą pogody z Open-Meteo.
    /// </summary>
    [HttpPost("plan")]
    public async Task<ActionResult<PlanRouteResponse>> Plan([FromForm] PlanRouteRequest request, CancellationToken ct)
    {
        if (request.GpxFile is null || request.GpxFile.Length == 0)
        {
            return Problem(
                title: "Nieprawidłowe dane wejściowe",
                detail: "Plik GPX jest wymagany.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (request.AverageSpeedKmh.HasValue == request.PlannedDurationHours.HasValue)
        {
            return Problem(
                title: "Nieprawidłowe dane wejściowe",
                detail: "Podaj albo średnią prędkość, albo czas trasy, nie oba.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        await using var gpxStream = request.GpxFile.OpenReadStream();

        var result = await _planTripUseCase.PlanAsync(
            gpxStream,
            request.DepartureAt,
            request.AverageSpeedKmh,
            request.PlannedDurationHours,
            request.SampleCount,
            ct);

        var track = result.Route.Points
            .Select((point, i) => new TrackPointResponse(point.Latitude, point.Longitude, result.Route.CumulativeDistancesKm[i]))
            .ToList();

        var response = new PlanRouteResponse(
            result.Route.TotalDistanceKm,
            result.Samples
                .Select(x => new RouteSampleResponse(
                    x.Sample.Position.Latitude,
                    x.Sample.Position.Longitude,
                    x.Sample.DistanceFromStartKm,
                    x.Sample.EtaAt,
                    x.Weather is null
                        ? null
                        : new WeatherForecastResponse(
                            x.Weather.TemperatureCelsius,
                            x.Weather.WindSpeedKmh,
                            x.Weather.PrecipitationMm,
                            x.Weather.WindDirectionDegrees)))
                .ToList(),
            track);

        return Ok(response);
    }
}
