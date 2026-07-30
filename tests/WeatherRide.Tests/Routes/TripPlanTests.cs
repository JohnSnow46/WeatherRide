using WeatherRide.Domain.Routes;

namespace WeatherRide.Tests.Routes;

public class TripPlanTests
{
    private static readonly DateTimeOffset DepartureAt = new(2026, 7, 30, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Create_BothSpeedAndDurationProvided_ThrowsTripPlanValidationException()
    {
        Assert.Throws<TripPlanValidationException>(
            () => TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: 20, plannedDurationMinutes: 300));
    }

    [Fact]
    public void Create_NeitherSpeedNorDurationProvided_ThrowsTripPlanValidationException()
    {
        Assert.Throws<TripPlanValidationException>(
            () => TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: null, plannedDurationMinutes: null));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Create_NonPositiveAverageSpeed_ThrowsTripPlanValidationException(double averageSpeedKmh)
    {
        Assert.Throws<TripPlanValidationException>(
            () => TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: averageSpeedKmh, plannedDurationMinutes: null));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-30)]
    public void Create_NonPositivePlannedDuration_ThrowsTripPlanValidationException(double plannedDurationMinutes)
    {
        Assert.Throws<TripPlanValidationException>(
            () => TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: null, plannedDurationMinutes: plannedDurationMinutes));
    }

    [Fact]
    public void Create_PlannedDurationProvided_CalculatesAverageSpeedFromDistanceAndDuration()
    {
        var tripPlan = TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: null, plannedDurationMinutes: 120);

        Assert.Equal(50.0, tripPlan.AverageSpeedKmh, precision: 9);
        Assert.Equal(DepartureAt, tripPlan.DepartureAt);
    }

    [Fact]
    public void Create_AverageSpeedProvidedDirectly_UsesItAsIs()
    {
        var tripPlan = TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: 25, plannedDurationMinutes: null);

        Assert.Equal(25.0, tripPlan.AverageSpeedKmh, precision: 9);
    }
}
