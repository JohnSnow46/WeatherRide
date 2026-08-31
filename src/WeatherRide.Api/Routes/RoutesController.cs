using Microsoft.AspNetCore.Mvc;
using WeatherRide.Application.Routes;
using WeatherRide.Domain.Routes;

namespace WeatherRide.Api.Routes;

[ApiController]
[Route("api/routes")]
public sealed class RoutesController : ControllerBase
{
    private const string InvalidInputTitle = "Nieprawidłowe dane wejściowe";
    private const string SpeedXorDurationDetail = "Podaj albo średnią prędkość, albo czas trasy, nie oba.";
    private const string InvalidCoordinatesDetail = "Współrzędne punktu muszą mieścić się w zakresie: szerokość -90..90, długość -180..180.";

    private readonly PlanTripUseCase _planTripUseCase;
    private readonly PlanDirectTripUseCase _planDirectTripUseCase;

    public RoutesController(PlanTripUseCase planTripUseCase, PlanDirectTripUseCase planDirectTripUseCase)
    {
        _planTripUseCase = planTripUseCase;
        _planDirectTripUseCase = planDirectTripUseCase;
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
                title: InvalidInputTitle,
                detail: "Plik GPX jest wymagany.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (request.AverageSpeedKmh.HasValue == request.PlannedDurationHours.HasValue)
        {
            return Problem(
                title: InvalidInputTitle,
                detail: SpeedXorDurationDetail,
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

        return Ok(ToResponse(result));
    }

    /// <summary>
    /// Przyjmuje parę punktów A-B (bez pliku GPX) + parametry wyjazdu i zwraca próbkowane
    /// punkty trasy z ETA i prognozą pogody z Open-Meteo.
    /// </summary>
    [HttpPost("plan-direct")]
    public async Task<ActionResult<PlanRouteResponse>> PlanDirect([FromBody] PlanDirectRouteRequest request, CancellationToken ct)
    {
        if (request.PointA is null || request.PointB is null)
        {
            return Problem(
                title: InvalidInputTitle,
                detail: "Punkty A i B są wymagane.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (!IsValidCoordinate(request.PointA.Value) || !IsValidCoordinate(request.PointB.Value))
        {
            return Problem(
                title: InvalidInputTitle,
                detail: InvalidCoordinatesDetail,
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (request.AverageSpeedKmh.HasValue == request.PlannedDurationHours.HasValue)
        {
            return Problem(
                title: InvalidInputTitle,
                detail: SpeedXorDurationDetail,
                statusCode: StatusCodes.Status400BadRequest);
        }

        var result = await _planDirectTripUseCase.PlanAsync(
            request.PointA.Value,
            request.PointB.Value,
            request.DepartureAt,
            request.AverageSpeedKmh,
            request.PlannedDurationHours,
            request.SampleCount,
            ct);

        return Ok(ToResponse(result));
    }

    private static bool IsValidCoordinate(GpsPoint point) =>
        point.Latitude is >= -90 and <= 90 && point.Longitude is >= -180 and <= 180;

    private static PlanRouteResponse ToResponse(TripPlanResult result)
    {
        var track = result.Route.Points
            .Select((point, i) => new TrackPointResponse(point.Latitude, point.Longitude, result.Route.CumulativeDistancesKm[i]))
            .ToList();

        return new PlanRouteResponse(
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
    }
}
