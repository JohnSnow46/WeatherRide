namespace WeatherRide.Api.Routes;

/// <summary>
/// Odpowiedź endpointu <c>POST /api/routes/plan</c>: próbki trasy z ETA i prognozą pogody.
/// </summary>
public sealed record PlanRouteResponse(
    double TotalDistanceKm,
    IReadOnlyList<RouteSampleResponse> Samples,
    IReadOnlyList<TrackPointResponse> Track);
