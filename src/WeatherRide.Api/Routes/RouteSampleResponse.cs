namespace WeatherRide.Api.Routes;

/// <summary>
/// Jeden próbkowany punkt trasy z ETA i prognozą pogody (<c>null</c>, gdy ETA jest poza
/// horyzontem prognozy Open-Meteo).
/// </summary>
/// <param name="WindRelativeDirection">
/// "Headwind"/"Crosswind"/"Tailwind" (roadmap #10), <c>null</c> gdy brak pogody dla tego
/// punktu, brak kolejnego/poprzedniego punktu do wyliczenia kierunku jazdy, albo wiatr jest
/// za słaby, by mieć znaczenie — patrz <see cref="Domain.Weather.WindRelativeDirectionCalculator"/>.
/// </param>
public sealed record RouteSampleResponse(
    double Latitude,
    double Longitude,
    double DistanceFromStartKm,
    DateTimeOffset EtaAt,
    WeatherForecastResponse? Weather,
    string? WindRelativeDirection = null);
