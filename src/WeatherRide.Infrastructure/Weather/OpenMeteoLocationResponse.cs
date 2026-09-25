using System.Text.Json.Serialization;

namespace WeatherRide.Infrastructure.Weather;

/// <summary>
/// DTO deserializacji jednej lokalizacji z odpowiedzi Open-Meteo (<c>GET /v1/forecast</c>
/// z wieloma <c>latitude</c>/<c>longitude</c> zwraca tablicę takich obiektów, po jednym na
/// lokalizację, w kolejności żądania). Używane wyłącznie wewnątrz <c>Infrastructure</c>.
/// </summary>
public sealed class OpenMeteoLocationResponse
{
    [JsonPropertyName("hourly")]
    public HourlyData? Hourly { get; set; }

    public sealed class HourlyData
    {
        [JsonPropertyName("time")]
        public string[] Time { get; set; } = [];

        [JsonPropertyName("temperature_2m")]
        public double[] Temperature2m { get; set; } = [];

        [JsonPropertyName("wind_speed_10m")]
        public double[] WindSpeed10m { get; set; } = [];

        [JsonPropertyName("wind_direction_10m")]
        public double[] WindDirection10m { get; set; } = [];

        [JsonPropertyName("precipitation")]
        public double[] Precipitation { get; set; } = [];

        [JsonPropertyName("relative_humidity_2m")]
        public double[] RelativeHumidity2m { get; set; } = [];

        [JsonPropertyName("uv_index")]
        public double[] UvIndex { get; set; } = [];

        [JsonPropertyName("wind_gusts_10m")]
        public double[] WindGusts10m { get; set; } = [];
    }
}
