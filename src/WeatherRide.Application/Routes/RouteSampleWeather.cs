using WeatherRide.Domain.Routes;
using WeatherRide.Domain.Weather;

namespace WeatherRide.Application.Routes;

/// <summary>
/// Próbka trasy wraz z jej prognozą pogody (<c>null</c>, gdy ETA jest poza horyzontem
/// prognozy Open-Meteo).
/// </summary>
public sealed record RouteSampleWeather(RouteSample Sample, WeatherForecast? Weather);
