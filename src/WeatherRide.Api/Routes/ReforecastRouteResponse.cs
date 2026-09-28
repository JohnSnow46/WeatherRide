namespace WeatherRide.Api.Routes;

/// <summary>
/// Odpowiedź endpointu <c>POST /api/routes/reforecast</c>: te same próbki co w żądaniu,
/// z przeliczonym ETA i świeżą prognozą pogody.
/// </summary>
public sealed record ReforecastRouteResponse(IReadOnlyList<RouteSampleResponse> Samples);
