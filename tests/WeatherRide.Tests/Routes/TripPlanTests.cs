using WeatherRide.Domain.Routes;

namespace WeatherRide.Tests.Routes;

public class TripPlanTests
{
    private static readonly DateTimeOffset DepartureAt = new(2026, 7, 30, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Create_BothSpeedAndDurationProvided_ThrowsTripPlanValidationException()
    {
        Assert.Throws<TripPlanValidationException>(
            () => TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: 20, plannedDurationHours: 5));
    }

    [Fact]
    public void Create_NeitherSpeedNorDurationProvided_ThrowsTripPlanValidationException()
    {
        Assert.Throws<TripPlanValidationException>(
            () => TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: null, plannedDurationHours: null));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Create_NonPositiveAverageSpeed_ThrowsTripPlanValidationException(double averageSpeedKmh)
    {
        Assert.Throws<TripPlanValidationException>(
            () => TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: averageSpeedKmh, plannedDurationHours: null));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_NonPositivePlannedDuration_ThrowsTripPlanValidationException(double plannedDurationHours)
    {
        Assert.Throws<TripPlanValidationException>(
            () => TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: null, plannedDurationHours: plannedDurationHours));
    }

    [Fact]
    public void Create_PlannedDurationProvided_CalculatesAverageSpeedFromDistanceAndDuration()
    {
        var tripPlan = TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: null, plannedDurationHours: 2);

        Assert.Equal(50.0, tripPlan.AverageSpeedKmh, precision: 9);
        Assert.Equal(DepartureAt, tripPlan.DepartureAt);
    }

    [Fact]
    public void Create_AverageSpeedProvidedDirectly_UsesItAsIs()
    {
        var tripPlan = TripPlan.Create(DepartureAt, totalDistanceKm: 100, averageSpeedKmh: 25, plannedDurationHours: null);

        Assert.Equal(25.0, tripPlan.AverageSpeedKmh, precision: 9);
    }
}
