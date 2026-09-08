namespace WeatherRide.Domain.Routes;

/// <summary>
/// Współrzędne geograficzne punktu (bez wysokości — elevation z GPX na razie nieużywane
/// w domenie, patrz ADR-0001 "Poza zakresem").
/// </summary>
public readonly record struct GpsPoint(double Latitude, double Longitude)
{
    private const double EarthRadiusKm = 6371.0088;

    /// <summary>
    /// Czy podana para współrzędnych mieści się w geograficznie poprawnym zakresie:
    /// szerokość -90..90, długość -180..180. Wspólne dla wszystkich miejsc, które muszą
    /// zweryfikować współrzędne przed zbudowaniem <see cref="GpsPoint"/> (walidacja wejścia
    /// w Api, parsowanie GPX w Infrastructure) — jedno źródło prawdy zamiast zduplikowanego
    /// warunku w każdej warstwie.
    /// </summary>
    /// <remarks>
    /// Zakres jako warunek dodatni (nie "poza zakresem") — NaN nie spełnia żadnego z porównań
    /// <c>&gt;=</c>/<c>&lt;=</c>, więc trafia tu jako nieprawidłowe zamiast po cichu przejść
    /// dalej, tak jak działałoby odwrotne porównanie <c>&lt; -90 or &gt; 90</c>.
    /// </remarks>
    public static bool IsValid(double latitude, double longitude) =>
        latitude is >= -90 and <= 90 && longitude is >= -180 and <= 180;

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

        // Matematycznie 0<=a<=1, ale dla (prawie) antypodalnych punktów błąd zaokrągleń
        // potrafi przesunąć `a` odrobinę powyżej 1 — bez clampa Math.Sqrt(1 - a) liczy
        // sqrt z ujemnej liczby i cicho zwraca NaN zamiast poprawnego dystansu.
        a = Math.Clamp(a, 0.0, 1.0);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return EarthRadiusKm * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180.0;
}
