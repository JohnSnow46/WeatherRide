namespace WeatherRide.Domain.Routes;

/// <summary>
/// Współrzędne geograficzne punktu (bez wysokości — elevation z GPX na razie nieużywane
/// w domenie, patrz ADR-0001 "Poza zakresem").
/// </summary>
public readonly record struct GpsPoint(double Latitude, double Longitude)
{
    private const double EarthRadiusKm = 6371.0088;

    /// <summary>
    /// Odległość Haversine (po powierzchni Ziemi, w km) między tym punktem a <paramref name="other"/>.
    /// </summary>
    public double DistanceToKm(GpsPoint other)
    {
        var lat1Rad = DegreesToRadians(Latitude);
        var lat2Rad = DegreesToRadians(other.Latitude);
        var deltaLatRad = DegreesToRadians(other.Latitude - Latitude);
        var deltaLonRad = DegreesToRadians(other.Longitude - Longitude);

        var a = Math.Sin(deltaLatRad / 2) * Math.Sin(deltaLatRad / 2)
            + Math.Cos(lat1Rad) * Math.Cos(lat2Rad)
            * Math.Sin(deltaLonRad / 2) * Math.Sin(deltaLonRad / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return EarthRadiusKm * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180.0;
}
