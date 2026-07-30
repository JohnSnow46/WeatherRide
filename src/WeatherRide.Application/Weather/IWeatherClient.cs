using WeatherRide.Domain.Routes;
using WeatherRide.Domain.Weather;

namespace WeatherRide.Application.Weather;

/// <summary>
/// Pobiera prognozę pogody dla próbkowanych punktów trasy.
/// </summary>
public interface IWeatherClient
{
    /// <summary>
    /// Zwraca listę tej samej długości i w tej samej kolejności co <paramref name="samples"/>.
    /// Wartość <c>null</c> na pozycji <c>i</c> oznacza, że ETA punktu wykracza poza horyzont
    /// prognozy Open-Meteo — to oczekiwany stan, nie błąd.
    /// </summary>
    Task<IReadOnlyList<WeatherForecast?>> GetForecastsAsync(
        IReadOnlyList<RouteSample> samples,
        CancellationToken cancellationToken);
}
