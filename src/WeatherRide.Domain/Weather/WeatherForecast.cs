namespace WeatherRide.Domain.Weather;

/// <summary>
/// Prognoza pogody dla jednego punktu trasy w konkretnym momencie (ETA).
/// </summary>
public sealed record WeatherForecast(
    double TemperatureCelsius,
    double WindSpeedKmh,
    double PrecipitationMm,
    double WindDirectionDegrees);
