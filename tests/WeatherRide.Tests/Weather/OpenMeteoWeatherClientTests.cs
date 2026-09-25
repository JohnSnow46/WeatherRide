using System.Net;
using System.Text;
using WeatherRide.Domain.Routes;
using WeatherRide.Infrastructure.Weather;

namespace WeatherRide.Tests.Weather;

public class OpenMeteoWeatherClientTests
{
    private static readonly DateTimeOffset EtaAt = new(2026, 7, 30, 9, 0, 0, TimeSpan.Zero);

    private const string OneLocationJson = """
        [
          { "hourly": { "time": ["2026-07-30T09:00"], "temperature_2m": [20.0], "wind_speed_10m": [10.0], "wind_direction_10m": [180.0], "precipitation": [0.0], "relative_humidity_2m": [55.0], "uv_index": [2.0], "wind_gusts_10m": [14.0] } }
        ]
        """;

    private const string TwoLocationsJson = """
        [
          { "hourly": { "time": ["2026-07-30T09:00"], "temperature_2m": [20.0], "wind_speed_10m": [10.0], "wind_direction_10m": [180.0], "precipitation": [0.0], "relative_humidity_2m": [55.0], "uv_index": [2.0], "wind_gusts_10m": [14.0] } },
          { "hourly": { "time": ["2026-07-30T09:00"], "temperature_2m": [22.0], "wind_speed_10m": [12.0], "wind_direction_10m": [190.0], "precipitation": [0.5], "relative_humidity_2m": [60.0], "uv_index": [4.0], "wind_gusts_10m": [16.0] } }
        ]
        """;

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly string? _content;

        public StubHandler(HttpStatusCode statusCode, string? content)
        {
            _statusCode = statusCode;
            _content = content;
        }

        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            var response = new HttpResponseMessage(_statusCode);
            if (_content is not null)
            {
                response.Content = new StringContent(_content, Encoding.UTF8, "application/json");
            }

            return Task.FromResult(response);
        }
    }

    private static OpenMeteoWeatherClient CreateClient(StubHandler handler)
    {
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.open-meteo.com/") };
        return new OpenMeteoWeatherClient(httpClient);
    }

    private static RouteSample BuildSample(double latitude, double longitude) =>
        new(new GpsPoint(latitude, longitude), distanceFromStartKm: 0, EtaAt);

    [Fact]
    public async Task GetForecastsAsync_NoSamples_ReturnsEmptyListWithoutCallingOpenMeteo()
    {
        var handler = new StubHandler(HttpStatusCode.OK, content: null);
        var client = CreateClient(handler);

        var forecasts = await client.GetForecastsAsync([], CancellationToken.None);

        Assert.Empty(forecasts);
        Assert.Null(handler.LastRequest);
    }

    [Fact]
    public async Task GetForecastsAsync_ResponseHasFewerLocationsThanSamples_ThrowsInvalidOperationException()
    {
        var handler = new StubHandler(HttpStatusCode.OK, OneLocationJson);
        var client = CreateClient(handler);
        var samples = new[] { BuildSample(52.0, 21.0), BuildSample(52.1, 21.1) };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => client.GetForecastsAsync(samples, CancellationToken.None));
    }

    [Fact]
    public async Task GetForecastsAsync_EmptyResponseBody_ThrowsInvalidOperationException()
    {
        var handler = new StubHandler(HttpStatusCode.OK, "null");
        var client = CreateClient(handler);
        var samples = new[] { BuildSample(52.0, 21.0) };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => client.GetForecastsAsync(samples, CancellationToken.None));
    }

    [Fact]
    public async Task GetForecastsAsync_MatchingLocationCount_MapsEachSampleToItsOwnForecastInOrder()
    {
        var handler = new StubHandler(HttpStatusCode.OK, TwoLocationsJson);
        var client = CreateClient(handler);
        var samples = new[] { BuildSample(52.0, 21.0), BuildSample(52.1, 21.1) };

        var forecasts = await client.GetForecastsAsync(samples, CancellationToken.None);

        Assert.Equal(2, forecasts.Count);
        Assert.Equal(20.0, forecasts[0]!.TemperatureCelsius);
        Assert.Equal(22.0, forecasts[1]!.TemperatureCelsius);
    }

    [Fact]
    public async Task GetForecastsAsync_MultipleSamples_BuildsRequestUriWithCommaSeparatedCoordinates()
    {
        var handler = new StubHandler(HttpStatusCode.OK, TwoLocationsJson);
        var client = CreateClient(handler);
        var samples = new[] { BuildSample(52.0, 21.0), BuildSample(52.1, 21.1) };

        await client.GetForecastsAsync(samples, CancellationToken.None);

        var query = handler.LastRequest?.RequestUri?.Query;
        Assert.NotNull(query);
        Assert.Contains("latitude=52%2C52.1", query);
        Assert.Contains("longitude=21%2C21.1", query);
    }
}
