using System.Globalization;
using System.Net.Http.Json;
using WeatherRide.Application.Weather;
using WeatherRide.Domain.Routes;
using WeatherRide.Domain.Weather;

namespace WeatherRide.Infrastructure.Weather;

/// <summary>
/// Klient Open-Meteo (<c>GET /v1/forecast</c>, bez klucza API): jedno zapytanie na całą
/// trasę, batched po wielu lokalizacjach — patrz ADR-0002.
/// </summary>
public sealed class OpenMeteoWeatherClient : IWeatherClient
{
    private readonly HttpClient _httpClient;

    public OpenMeteoWeatherClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<WeatherForecast?>> GetForecastsAsync(
        IReadOnlyList<RouteSample> samples,
        CancellationToken cancellationToken)
    {
        if (samples.Count == 0)
        {
            return [];
        }

        var requestUri = BuildRequestUri(samples);

        var locations = await _httpClient.GetFromJsonAsync<List<OpenMeteoLocationResponse>>(requestUri, cancellationToken)
            ?? throw new InvalidOperationException("Open-Meteo zwróciło pustą odpowiedź.");

        return samples
            .Select((sample, i) => OpenMeteoResponseMapper.Map(locations[i], sample.EtaAt))
            .ToList();
    }

    private static string BuildRequestUri(IReadOnlyList<RouteSample> samples)
    {
        var latitude = string.Join(',', samples.Select(s => s.Position.Latitude.ToString(CultureInfo.InvariantCulture)));
        var longitude = string.Join(',', samples.Select(s => s.Position.Longitude.ToString(CultureInfo.InvariantCulture)));

        var query = new (string Key, string Value)[]
        {
            ("latitude", latitude),
            ("longitude", longitude),
            ("hourly", "temperature_2m,wind_speed_10m,precipitation"),
            ("wind_speed_unit", "kmh"),
            ("timezone", "auto"),
        };

        var queryString = string.Join('&', query.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));

        return $"v1/forecast?{queryString}";
    }
}
