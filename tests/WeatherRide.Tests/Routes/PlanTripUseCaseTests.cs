using WeatherRide.Application.Gpx;
using WeatherRide.Application.Routes;
using WeatherRide.Application.Weather;
using WeatherRide.Domain.Routes;
using WeatherRide.Domain.Weather;

namespace WeatherRide.Tests.Routes;

public class PlanTripUseCaseTests
{
    private static readonly DateTimeOffset DepartureAt = new(2026, 7, 30, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task PlanAsync_ValidGpxAndSpeed_ReturnsSamplesClampedToRequestedCount()
    {
        var route = Route.Create(new[] { new GpsPoint(0, 0), new GpsPoint(0, 4), new GpsPoint(1, 4) });
        var useCase = new PlanTripUseCase(new FakeGpxParser(route), new FakeWeatherClient());

        var result = await useCase.PlanAsync(
            gpxContent: Stream.Null,
            departureAt: DepartureAt,
            averageSpeedKmh: 30,
            plannedDurationMinutes: null,
            sampleCount: 12,
            cancellationToken: CancellationToken.None);

        Assert.Equal(12, result.Samples.Count);
    }

    [Fact]
    public async Task PlanAsync_GpxParserThrowsGpxParsingException_PropagatesExceptionUnchanged()
    {
        var useCase = new PlanTripUseCase(new ThrowingGpxParser(), new FakeWeatherClient());

        await Assert.ThrowsAsync<GpxParsingException>(() => useCase.PlanAsync(
            gpxContent: Stream.Null,
            departureAt: DepartureAt,
            averageSpeedKmh: 30,
            plannedDurationMinutes: null,
            sampleCount: 10,
            cancellationToken: CancellationToken.None));
    }

    [Fact]
    public async Task PlanAsync_WeatherClientReturnsForecasts_PairsSamplesWithForecastsByIndex()
    {
        var route = Route.Create(new[] { new GpsPoint(0, 0), new GpsPoint(0, 4), new GpsPoint(1, 4) });
        var forecasts = new WeatherForecast?[]
        {
            new(18.0, 10.0, 0.0),
            null,
            new(22.0, 15.0, 1.0),
            new(19.5, 8.0, 0.5),
            null,
        };
        var useCase = new PlanTripUseCase(new FakeGpxParser(route), new FakeWeatherClient(forecasts));

        var result = await useCase.PlanAsync(
            gpxContent: Stream.Null,
            departureAt: DepartureAt,
            averageSpeedKmh: 30,
            plannedDurationMinutes: null,
            sampleCount: 5,
            cancellationToken: CancellationToken.None);

        Assert.Equal(5, result.Samples.Count);
        for (var i = 0; i < result.Samples.Count; i++)
        {
            Assert.Same(forecasts[i], result.Samples[i].Weather);
        }
    }

    private sealed class FakeGpxParser : IGpxParser
    {
        private readonly Route _route;

        public FakeGpxParser(Route route)
        {
            _route = route;
        }

        public Task<Route> ParseAsync(Stream gpxContent, CancellationToken cancellationToken) => Task.FromResult(_route);
    }

    private sealed class ThrowingGpxParser : IGpxParser
    {
        public Task<Route> ParseAsync(Stream gpxContent, CancellationToken cancellationToken) =>
            throw new GpxParsingException("Uszkodzony plik XML.");
    }

    private sealed class FakeWeatherClient : IWeatherClient
    {
        private readonly IReadOnlyList<WeatherForecast?>? _forecasts;

        public FakeWeatherClient(IReadOnlyList<WeatherForecast?>? forecasts = null)
        {
            _forecasts = forecasts;
        }

        public Task<IReadOnlyList<WeatherForecast?>> GetForecastsAsync(
            IReadOnlyList<RouteSample> samples,
            CancellationToken cancellationToken) =>
            Task.FromResult(_forecasts ?? samples.Select(_ => (WeatherForecast?)null).ToList());
    }
}
