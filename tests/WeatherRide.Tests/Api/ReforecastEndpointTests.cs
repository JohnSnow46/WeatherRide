using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using WeatherRide.Api.Routes;
using WeatherRide.Application.Weather;
using WeatherRide.Domain.Routes;
using WeatherRide.Domain.Weather;

namespace WeatherRide.Tests.Api;

/// <summary>
/// Test integracyjny <c>POST /api/routes/reforecast</c>: już wyliczone próbki trasy +
/// nowa godzina wyjazdu → przeliczone ETA i świeża pogoda, bez ponownego próbkowania.
/// <see cref="IWeatherClient"/> jest podmieniony na fake'a.
/// </summary>
public class ReforecastEndpointTests
{
    private static readonly DateTimeOffset OriginalDepartureAt = new(2026, 7, 30, 8, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset ShiftedDepartureAt = new(2026, 7, 30, 11, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Reforecast_ValidSamplesAndNewDepartureAt_ReturnsOkWithRecalculatedEtaAndWeather()
    {
        using var factory = CreateFactory(new FakeWeatherClient());
        using var client = factory.CreateClient();

        var request = new ReforecastRouteRequest
        {
            Samples =
            [
                new ReforecastSampleRequest { Latitude = 52.0, Longitude = 21.0, DistanceFromStartKm = 0 },
                new ReforecastSampleRequest { Latitude = 52.1, Longitude = 21.1, DistanceFromStartKm = 30 },
                new ReforecastSampleRequest { Latitude = 52.2, Longitude = 21.2, DistanceFromStartKm = 60 },
            ],
            TotalDistanceKm = 60,
            DepartureAt = ShiftedDepartureAt,
            AverageSpeedKmh = 30,
        };

        using var response = await client.PostAsJsonAsync("/api/routes/reforecast", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ReforecastRouteResponse>();
        Assert.NotNull(body);
        Assert.Equal(3, body!.Samples.Count);

        Assert.Equal(ShiftedDepartureAt, body.Samples[0].EtaAt);
        Assert.Equal(ShiftedDepartureAt + TimeSpan.FromHours(1), body.Samples[1].EtaAt);
        Assert.Equal(ShiftedDepartureAt + TimeSpan.FromHours(2), body.Samples[2].EtaAt);

        Assert.Equal(52.1, body.Samples[1].Latitude, precision: 6);
        Assert.Equal(21.1, body.Samples[1].Longitude, precision: 6);
        Assert.NotNull(body.Samples[0].Weather);
    }

    [Fact]
    public async Task Reforecast_EmptySamples_ReturnsBadRequestProblemDetails()
    {
        using var factory = CreateFactory(new FakeWeatherClient());
        using var client = factory.CreateClient();

        var request = new ReforecastRouteRequest
        {
            Samples = [],
            TotalDistanceKm = 60,
            DepartureAt = ShiftedDepartureAt,
            AverageSpeedKmh = 30,
        };

        using var response = await client.PostAsJsonAsync("/api/routes/reforecast", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(StatusCodes.Status400BadRequest, problem!.Status);
    }

    [Fact]
    public async Task Reforecast_BothSpeedAndDuration_ReturnsBadRequestProblemDetails()
    {
        using var factory = CreateFactory(new FakeWeatherClient());
        using var client = factory.CreateClient();

        var request = new ReforecastRouteRequest
        {
            Samples = [new ReforecastSampleRequest { Latitude = 52.0, Longitude = 21.0, DistanceFromStartKm = 0 }],
            TotalDistanceKm = 60,
            DepartureAt = ShiftedDepartureAt,
            AverageSpeedKmh = 30,
            PlannedDurationHours = 2,
        };

        using var response = await client.PostAsJsonAsync("/api/routes/reforecast", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Reforecast_OutOfRangeCoordinate_ReturnsBadRequestProblemDetails()
    {
        using var factory = CreateFactory(new FakeWeatherClient());
        using var client = factory.CreateClient();

        var request = new ReforecastRouteRequest
        {
            Samples = [new ReforecastSampleRequest { Latitude = 90.5, Longitude = 21.0, DistanceFromStartKm = 0 }],
            TotalDistanceKm = 60,
            DepartureAt = ShiftedDepartureAt,
            AverageSpeedKmh = 30,
        };

        using var response = await client.PostAsJsonAsync("/api/routes/reforecast", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static WebApplicationFactory<Program> CreateFactory(IWeatherClient fakeWeatherClient)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                var weatherClientDescriptor = services
                    .Where(d => d.ServiceType == typeof(IWeatherClient))
                    .ToList();

                foreach (var descriptor in weatherClientDescriptor)
                {
                    services.Remove(descriptor);
                }

                services.AddSingleton(fakeWeatherClient);
            }));
    }

    private sealed class FakeWeatherClient : IWeatherClient
    {
        public Task<IReadOnlyList<WeatherForecast?>> GetForecastsAsync(
            IReadOnlyList<RouteSample> samples,
            CancellationToken cancellationToken)
        {
            IReadOnlyList<WeatherForecast?> forecasts = samples
                .Select((_, i) => i % 2 == 0 ? new WeatherForecast(10 + i, 5 + i, 0.1 * i, 90 + i, 50 + i, 1 + i, 8 + i) : null)
                .ToList();

            return Task.FromResult(forecasts);
        }
    }
}
