namespace WeatherRide.Api.Routes;

/// <summary>
/// Jeden próbkowany punkt trasy z ETA i prognozą pogody (<c>null</c>, gdy ETA jest poza
/// horyzontem prognozy Open-Meteo).
/// </summary>
public sealed record RouteSampleResponse(
    double Latitude,
    double Longitude,
    double DistanceFromStartKm,
    DateTimeOffset EtaAt,
    WeatherForecastResponse? Weather);
