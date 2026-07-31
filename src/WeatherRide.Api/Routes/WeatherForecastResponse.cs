namespace WeatherRide.Api.Routes;

/// <summary>
/// Prognoza pogody dla jednego punktu trasy.
/// </summary>
public sealed record WeatherForecastResponse(
    double TemperatureCelsius,
    double WindSpeedKmh,
    double PrecipitationMm,
    double WindDirectionDegrees);
