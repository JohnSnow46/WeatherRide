namespace WeatherRide.Domain.Weather;

/// <summary>
/// Wiatr względem kierunku jazdy w danym punkcie trasy (roadmap #10).
/// </summary>
public enum WindRelativeDirection
{
    Headwind,
    Crosswind,
    Tailwind
}

/// <summary>
/// Kategoryzuje <see cref="WindRelativeDirection"/> na podstawie kierunku jazdy (azymut,
/// <see cref="Routes.GpsPoint.BearingToDegrees"/>) i kierunku, z którego wiatr wieje
/// (<see cref="WeatherForecast.WindDirectionDegrees"/>, konwencja meteorologiczna "z").
/// </summary>
public static class WindRelativeDirectionCalculator
{
    /// <summary>
    /// Próg prędkości/porywów wiatru (km/h), od którego kierunek względny zaczyna mieć
    /// praktyczne znaczenie dla jazdy — poniżej niego kategoria nie jest liczona (<c>null</c>),
    /// zamiast oznaczać jako "czołowy" wiatr, który i tak jest za słaby, by coś zmienić.
    /// </summary>
    public const double SignificantWindSpeedKmh = 25.0;

    /// <summary>
    /// Zwraca <c>null</c>, gdy ani <paramref name="windSpeedKmh"/>, ani
    /// <paramref name="windGustsKmh"/> nie sięgają <see cref="SignificantWindSpeedKmh"/>.
    /// Inaczej: wiatr wiejący z kierunku zbliżonego do kierunku jazdy (&lt;=45°) to wiatr
    /// czołowy (jedzie się "w wiatr"), z kierunku przeciwnego (&gt;=135°) to wiatr w plecy,
    /// pośrodku — boczny.
    /// </summary>
    public static WindRelativeDirection? Categorize(
        double travelBearingDegrees, double windFromDirectionDegrees, double windSpeedKmh, double windGustsKmh)
    {
        if (Math.Max(windSpeedKmh, windGustsKmh) < SignificantWindSpeedKmh)
        {
            return null;
        }

        var angleDifference = AbsoluteAngleDifference(travelBearingDegrees, windFromDirectionDegrees);

        return angleDifference switch
        {
            <= 45.0 => WindRelativeDirection.Headwind,
            >= 135.0 => WindRelativeDirection.Tailwind,
            _ => WindRelativeDirection.Crosswind
        };
    }

    /// <summary>Najmniejszy kąt (0-180°) między dwoma azymutami, niezależny od kierunku obrotu.</summary>
    private static double AbsoluteAngleDifference(double a, double b)
    {
        var diff = Math.Abs(a - b) % 360.0;
        return diff > 180.0 ? 360.0 - diff : diff;
    }
}
