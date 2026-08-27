using WeatherRide.Application.Routes;
using WeatherRide.Application.Weather;
using WeatherRide.Domain.Routes;
using WeatherRide.Domain.Weather;

namespace WeatherRide.Tests.Routes;

public class PlanDirectTripUseCaseTests
{
    private static readonly DateTimeOffset DepartureAt = new(2026, 7, 30, 8, 0, 0, TimeSpan.Zero);
    private static readonly GpsPoint PointA = new(52.0, 21.0);
    private static readonly GpsPoint PointB = new(52.0, 21.5);

    [Fact]
    public async Task PlanAsync_ValidPointsAndSpeed_ReturnsSamplesClampedToRequestedCountWithEndpointsPreserved()
    {
        var useCase = new PlanDirectTripUseCase(new FakeWeatherClient());

        var result = await useCase.PlanAsync(
            pointA: PointA,
            pointB: PointB,
            departureAt: DepartureAt,
            averageSpeedKmh: 30,
            plannedDurationHours: null,
            sampleCount: 12,
            cancellationToken: CancellationToken.None);

        Assert.Equal(12, result.Samples.Count);
        Assert.Equal(PointA.Latitude, result.Samples[0].Sample.Position.Latitude, precision: 6);
        Assert.Equal(PointA.Longitude, result.Samples[0].Sample.Position.Longitude, precision: 6);
        Assert.Equal(PointB.Latitude, result.Samples[^1].Sample.Position.Latitude, precision: 6);
        Assert.Equal(PointB.Longitude, result.Samples[^1].Sample.Position.Longitude, precision: 6);
        Assert.Equal(DepartureAt, result.Samples[0].Sample.EtaAt);
    }

    [Fact]
    public async Task PlanAsync_PlannedDurationInsteadOfSpeed_NormalizesToSpeedAndReturnsSamples()
    {
        var useCase = new PlanDirectTripUseCase(new FakeWeatherClient());

        var result = await useCase.PlanAsync(
            pointA: PointA,
            pointB: PointB,
            departureAt: DepartureAt,
            averageSpeedKmh: null,
            plannedDurationHours: 2,
            sampleCount: 5,
            cancellationToken: CancellationToken.None);

        Assert.Equal(5, result.Samples.Count);
        Assert.True(result.Samples[^1].Sample.EtaAt > DepartureAt);
    }

    [Fact]
    public async Task PlanAsync_WeatherClientReturnsForecasts_PairsSamplesWithForecastsByIndex()
    {
        var forecasts = new WeatherForecast?[]
        {
            new(18.0, 10.0, 0.0, 180.0),
            null,
            new(22.0, 15.0, 1.0, 220.0),
            new(19.5, 8.0, 0.5, 90.0),
            null,
        };
        var useCase = new PlanDirectTripUseCase(new FakeWeatherClient(forecasts));

        var result = await useCase.PlanAsync(
            pointA: PointA,
            pointB: PointB,
            departureAt: DepartureAt,
            averageSpeedKmh: 30,
            plannedDurationHours: null,
            sampleCount: 5,
            cancellationToken: CancellationToken.None);

        Assert.Equal(5, result.Samples.Count);
        for (var i = 0; i < result.Samples.Count; i++)
        {
            Assert.Same(forecasts[i], result.Samples[i].Weather);
        }
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
