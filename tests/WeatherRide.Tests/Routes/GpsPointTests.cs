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

    [Fact]
    public void DistanceToKm_ExactlyAntipodalPoints_ReturnsHalfEarthCircumference()
    {
        var start = new GpsPoint(0, 0);
        var end = new GpsPoint(0, 180);
        var expectedKm = 6371.0088 * Math.PI;

        var actualKm = start.DistanceToKm(end);

        Assert.Equal(expectedKm, actualKm, precision: 6);
    }

    [Theory]
    [InlineData(-87.8339655966656, 107.211357693752, 87.8339655358451, -72.78864229275176)]
    [InlineData(-51.18112257736787, 32.998486204537784, 51.18112259020725, -147.00151330844062)]
    [InlineData(-65.6604161558954, 138.02241586056653, 65.66041584260317, -41.977584344665125)]
    public void DistanceToKm_NearAntipodalPoints_ReturnsFiniteDistance(
        double lat1, double lon1, double lat2, double lon2)
    {
        // Reprodukcja realnego przypadku: dla (prawie) antypodalnych punktów błąd
        // zaokrągleń w formule Haversine potrafił przesunąć `a` odrobinę powyżej 1,
        // co dawało Math.Sqrt(1 - a) = NaN zamiast dystansu bliskiego połowie obwodu Ziemi.
        var start = new GpsPoint(lat1, lon1);
        var end = new GpsPoint(lat2, lon2);

        var distanceKm = start.DistanceToKm(end);

        Assert.True(double.IsFinite(distanceKm));
        Assert.InRange(distanceKm, 0, 6371.0088 * Math.PI);
    }

    [Theory]
    [InlineData(-90, -180)]
    [InlineData(90, 180)]
    [InlineData(0, 0)]
    [InlineData(-90, 180)]
    [InlineData(90, -180)]
    public void IsValid_CoordinatesOnOrInsideBoundary_ReturnsTrue(double latitude, double longitude)
    {
        Assert.True(GpsPoint.IsValid(latitude, longitude));
    }

    [Theory]
    [InlineData(90.0000001, 0)]
    [InlineData(-90.0000001, 0)]
    [InlineData(0, 180.0000001)]
    [InlineData(0, -180.0000001)]
    [InlineData(double.NaN, 0)]
    [InlineData(0, double.NaN)]
    [InlineData(double.PositiveInfinity, 0)]
    [InlineData(double.NegativeInfinity, 0)]
    public void IsValid_CoordinatesOutsideBoundaryOrNonFinite_ReturnsFalse(double latitude, double longitude)
    {
        // Zakres jest sprawdzany jako warunek dodatni (`>=`/`<=`), nie negacja "poza
        // zakresem" — ten test pilnuje, żeby NaN/Infinity dalej trafiały tu jako
        // nieprawidłowe, a nie po cichu przechodziły przez porównania.
        Assert.False(GpsPoint.IsValid(latitude, longitude));
    }
}
