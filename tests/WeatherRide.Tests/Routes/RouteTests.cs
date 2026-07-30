using WeatherRide.Domain.Routes;

namespace WeatherRide.Tests.Routes;

public class RouteTests
{
    [Fact]
    public void Create_TwoDistinctPoints_ReturnsRouteWithCorrectTotalDistance()
    {
        var start = new GpsPoint(0, 0);
        var end = new GpsPoint(0, 4);
        var points = new[] { start, end };

        var route = Route.Create(points);

        Assert.Equal(2, route.Points.Count);
        Assert.Equal(start.DistanceToKm(end), route.TotalDistanceKm, precision: 9);
    }

    [Fact]
    public void Create_FewerThanTwoPoints_ThrowsRouteValidationException()
    {
        var points = new[] { new GpsPoint(0, 0) };

        Assert.Throws<RouteValidationException>(() => Route.Create(points));
    }

    [Fact]
    public void Create_NoPoints_ThrowsRouteValidationException()
    {
        var points = Array.Empty<GpsPoint>();

        Assert.Throws<RouteValidationException>(() => Route.Create(points));
    }

    [Fact]
    public void Create_AllPointsIdentical_ThrowsRouteValidationException()
    {
        var samePoint = new GpsPoint(52.2297, 21.0122);
        var points = new[] { samePoint, samePoint, samePoint };

        Assert.Throws<RouteValidationException>(() => Route.Create(points));
    }
}
