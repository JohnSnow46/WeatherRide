using WeatherRide.Domain.Routes;

namespace WeatherRide.Tests.Routes;

public class GpsPointTests
{
    [Fact]
    public void DistanceToKm_SameLongitudeOneDegreeLatitudeApart_ReturnsExpectedGreatCircleDistance()
    {
        // Dla punktów na tym samym południku odległość Haversine redukuje się dokładnie
        // do R * deltaLatRadians (kąt centralny), niezależnie od implementacji produkcyjnej.
        var start = new GpsPoint(0, 0);
        var end = new GpsPoint(1, 0);
        var expectedKm = 6371.0088 * (1.0 * Math.PI / 180.0);

        var actualKm = start.DistanceToKm(end);

        Assert.Equal(expectedKm, actualKm, precision: 6);
    }

    [Fact]
    public void DistanceToKm_SamePoint_ReturnsZero()
    {
        var point = new GpsPoint(52.2297, 21.0122);

        var distanceKm = point.DistanceToKm(point);

        Assert.Equal(0.0, distanceKm, precision: 9);
    }
}
