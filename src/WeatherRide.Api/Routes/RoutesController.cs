using Microsoft.AspNetCore.Mvc;
using WeatherRide.Application.Routes;
using WeatherRide.Domain.Routes;
using WeatherRide.Domain.Weather;

namespace WeatherRide.Api.Routes;

[ApiController]
[Route("api/routes")]
public sealed class RoutesController : ControllerBase
{
    private const string InvalidInputTitle = "Nieprawidłowe dane wejściowe";
    private const string SpeedXorDurationDetail = "Podaj albo średnią prędkość, albo czas trasy, nie oba.";
    private const string InvalidCoordinatesDetail = "Współrzędne punktu muszą mieścić się w zakresie: szerokość -90..90, długość -180..180.";
    private const string DepartureAtRequiredDetail = "DepartureAt jest wymagane.";
    private const string SamplesRequiredDetail = "Samples są wymagane i nie mogą być puste.";
    private const long MaxGpxFileSizeBytes = 5 * 1024 * 1024;
    private const string GpxFileTooLargeDetail = "Plik GPX nie może przekraczać 5 MB.";

    private readonly PlanTripUseCase _planTripUseCase;
    private readonly PlanDirectTripUseCase _planDirectTripUseCase;
    private readonly ReforecastTripUseCase _reforecastTripUseCase;

    public RoutesController(
        PlanTripUseCase planTripUseCase,
        PlanDirectTripUseCase planDirectTripUseCase,
        ReforecastTripUseCase reforecastTripUseCase)
    {
        _planTripUseCase = planTripUseCase;
        _planDirectTripUseCase = planDirectTripUseCase;
        _reforecastTripUseCase = reforecastTripUseCase;
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

        if (request.GpxFile.Length > MaxGpxFileSizeBytes)
        {
            return Problem(
                title: InvalidInputTitle,
                detail: GpxFileTooLargeDetail,
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (request.DepartureAt == default)
        {
            return Problem(
                title: InvalidInputTitle,
                detail: DepartureAtRequiredDetail,
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

        if (request.DepartureAt == default)
        {
            return Problem(
                title: InvalidInputTitle,
                detail: DepartureAtRequiredDetail,
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

    /// <summary>
    /// Przyjmuje już wyliczone próbki trasy (z <c>/plan</c> albo <c>/plan-direct</c>) + nowe
    /// parametry wyjazdu i przelicza ETA/pogodę bez ponownego próbkowania trasy — pozwala
    /// "przesunąć" godzinę wyjazdu bez ponownego uploadu GPX.
    /// </summary>
    [HttpPost("reforecast")]
    public async Task<ActionResult<ReforecastRouteResponse>> Reforecast([FromBody] ReforecastRouteRequest request, CancellationToken ct)
    {
        if (request.Samples is null || request.Samples.Count == 0)
        {
            return Problem(
                title: InvalidInputTitle,
                detail: SamplesRequiredDetail,
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (request.Samples.Any(s => !GpsPoint.IsValid(s.Latitude, s.Longitude)))
        {
            return Problem(
                title: InvalidInputTitle,
                detail: InvalidCoordinatesDetail,
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (request.DepartureAt == default)
        {
            return Problem(
                title: InvalidInputTitle,
                detail: DepartureAtRequiredDetail,
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (request.AverageSpeedKmh.HasValue == request.PlannedDurationHours.HasValue)
        {
            return Problem(
                title: InvalidInputTitle,
                detail: SpeedXorDurationDetail,
                statusCode: StatusCodes.Status400BadRequest);
        }

        var existingSamples = request.Samples
            .Select(s => new ReforecastSample(new GpsPoint(s.Latitude, s.Longitude), s.DistanceFromStartKm))
            .ToList();

        var result = await _reforecastTripUseCase.ReforecastAsync(
            existingSamples,
            request.TotalDistanceKm,
            request.DepartureAt,
            request.AverageSpeedKmh,
            request.PlannedDurationHours,
            ct);

        return Ok(new ReforecastRouteResponse(MapSamples(result).ToList()));
    }

    private static bool IsValidCoordinate(GpsPoint point) =>
        GpsPoint.IsValid(point.Latitude, point.Longitude);

    private static PlanRouteResponse ToResponse(TripPlanResult result)
    {
        var track = result.Route.Points
            .Select((point, i) => new TrackPointResponse(point.Latitude, point.Longitude, result.Route.CumulativeDistancesKm[i], point.Elevation))
            .ToList();

        return new PlanRouteResponse(result.Route.TotalDistanceKm, MapSamples(result.Samples).ToList(), track);
    }

    /// <summary>
    /// Mapuje próbki trasy + pogodę na <see cref="RouteSampleResponse"/>, dopisując kierunek
    /// wiatru względem jazdy (roadmap #10). Kierunek jazdy w punkcie <c>i</c> to azymut do
    /// punktu <c>i+1</c> (albo, dla ostatniej próbki, azymut od punktu <c>i-1</c>) — współdzielone
    /// między <c>/plan</c>, <c>/plan-direct</c> i <c>/reforecast</c>, stąd jedna wspólna metoda
    /// zamiast powtarzania projekcji w każdym handlerze.
    /// </summary>
    private static IReadOnlyList<RouteSampleResponse> MapSamples(IReadOnlyList<RouteSampleWeather> samples)
    {
        var responses = new List<RouteSampleResponse>(samples.Count);

        for (var i = 0; i < samples.Count; i++)
        {
            var position = samples[i].Sample.Position;

            double? travelBearingDegrees = i + 1 < samples.Count
                ? position.BearingToDegrees(samples[i + 1].Sample.Position)
                : i > 0
                    ? samples[i - 1].Sample.Position.BearingToDegrees(position)
                    : null;

            var weather = samples[i].Weather;

            var windRelativeDirection = weather is not null && travelBearingDegrees is not null
                ? WindRelativeDirectionCalculator.Categorize(
                    travelBearingDegrees.Value, weather.WindDirectionDegrees, weather.WindSpeedKmh, weather.WindGustsKmh)
                : null;

            responses.Add(new RouteSampleResponse(
                position.Latitude,
                position.Longitude,
                samples[i].Sample.DistanceFromStartKm,
                samples[i].Sample.EtaAt,
                weather is null
                    ? null
                    : new WeatherForecastResponse(
                        weather.TemperatureCelsius,
                        weather.WindSpeedKmh,
                        weather.PrecipitationMm,
                        weather.WindDirectionDegrees,
                        weather.RelativeHumidityPercent,
                        weather.UvIndex,
                        weather.WindGustsKmh),
                windRelativeDirection?.ToString()));
        }

        return responses;
    }
}
