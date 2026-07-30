using WeatherRide.Domain.Routes;

namespace WeatherRide.Tests.Routes;

public class RouteSamplerTests
{
    private static readonly DateTimeOffset DepartureAt = new(2026, 7, 30, 8, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(1, RouteSampler.MinSamples)]
    [InlineData(0, RouteSampler.MinSamples)]
    [InlineData(-10, RouteSampler.MinSamples)]
    [InlineData(1000, RouteSampler.MaxSamples)]
    [InlineData(51, RouteSampler.MaxSamples)]
    public void Sample_RequestedCountOutsideBounds_ClampsToNearestBound(int requestedSampleCount, int expectedSampleCount)
    {
        var route = Route.Create(new[] { new GpsPoint(0, 0), new GpsPoint(0, 4) });
        var tripPlan = TripPlan.Create(DepartureAt, route.TotalDistanceKm, averageSpeedKmh: 50, plannedDurationMinutes: null);

        var samples = RouteSampler.Sample(route, tripPlan, requestedSampleCount);

        Assert.Equal(expectedSampleCount, samples.Count);
    }

    [Fact]
    public void Sample_ValidRequestedCount_ReturnsExactlyThatManySamples()
    {
        var route = Route.Create(new[] { new GpsPoint(0, 0), new GpsPoint(0, 4), new GpsPoint(1, 4) });
        var tripPlan = TripPlan.Create(DepartureAt, route.TotalDistanceKm, averageSpeedKmh: 30, plannedDurationMinutes: null);

        var samples = RouteSampler.Sample(route, tripPlan, requestedSampleCount: 12);

        Assert.Equal(12, samples.Count);
    }

    [Fact]
    public void Sample_AnyRoute_AlwaysIncludesStartAndFinishAtOriginalEndpoints()
    {
        var start = new GpsPoint(52.0, 21.0);
        var finish = new GpsPoint(52.5, 21.7);
        var route = Route.Create(new[] { start, new GpsPoint(52.2, 21.3), finish });
        var tripPlan = TripPlan.Create(DepartureAt, route.TotalDistanceKm, averageSpeedKmh: 20, plannedDurationMinutes: null);

        var samples = RouteSampler.Sample(route, tripPlan, requestedSampleCount: 10);

        var first = samples[0];
        var last = samples[^1];

        Assert.Equal(0.0, first.DistanceFromStartKm, precision: 9);
        Assert.Equal(start, first.Position);

        Assert.Equal(route.TotalDistanceKm, last.DistanceFromStartKm, precision: 9);
        Assert.Equal(finish, last.Position);
    }

    [Fact]
    public void Sample_TwoPointRoute_GeneratesEvenlySpacedSamplesAlongSingleSegment()
    {
        // Trasa złożona z 2 punktów na równiku (ten sam wzorzec redukcji Haversine co w
        // GpsPointTests) — pozwala przewidzieć dokładną długość geograficzną każdej próbki.
        var start = new GpsPoint(0, 0);
        var finish = new GpsPoint(0, 4);
        var route = Route.Create(new[] { start, finish });
        var tripPlan = TripPlan.Create(DepartureAt, route.TotalDistanceKm, averageSpeedKmh: 50, plannedDurationMinutes: null);

        const int sampleCount = 9;
        var samples = RouteSampler.Sample(route, tripPlan, sampleCount);

        Assert.Equal(sampleCount, samples.Count);

        for (var i = 0; i < sampleCount; i++)
        {
            var expectedLongitude = 4.0 * i / (sampleCount - 1);

            Assert.Equal(0.0, samples[i].Position.Latitude, precision: 9);
            Assert.Equal(expectedLongitude, samples[i].Position.Longitude, precision: 6);
        }
    }

    [Fact]
    public void Sample_ConstantSpeedEqualToTotalDistance_ComputesEtaAsFractionOfOneHour()
    {
        // Ustawiając AverageSpeedKmh = TotalDistanceKm, pokonanie całej trasy zajmuje
        // dokładnie 1h — niezależnie od tego, ile faktycznie wynosi TotalDistanceKm.
        var route = Route.Create(new[] { new GpsPoint(0, 0), new GpsPoint(0, 4) });
        var tripPlan = TripPlan.Create(DepartureAt, route.TotalDistanceKm, averageSpeedKmh: route.TotalDistanceKm, plannedDurationMinutes: null);

        var samples = RouteSampler.Sample(route, tripPlan, requestedSampleCount: RouteSampler.MinSamples);

        Assert.Equal(DepartureAt, samples[0].EtaAt);
        Assert.Equal(DepartureAt.AddMinutes(15), samples[1].EtaAt);
        Assert.Equal(DepartureAt.AddMinutes(30), samples[2].EtaAt);
        Assert.Equal(DepartureAt.AddMinutes(45), samples[3].EtaAt);
        Assert.Equal(DepartureAt.AddHours(1), samples[4].EtaAt);
    }
}
