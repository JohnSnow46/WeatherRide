namespace WeatherRide.Domain.Routes;

/// <summary>
/// Trasa wczytana z pliku GPX — lista punktów śladu i dystans całkowity. Nigdy nie
/// istnieje w niepoprawnym stanie, patrz <see cref="Create"/>.
/// </summary>
public sealed class Route
{
    public IReadOnlyList<GpsPoint> Points { get; }

    public double TotalDistanceKm { get; }

    public IReadOnlyList<double> CumulativeDistancesKm { get; }

    private Route(IReadOnlyList<GpsPoint> points, double totalDistanceKm, double[] cumulativeDistancesKm)
    {
        Points = points;
        TotalDistanceKm = totalDistanceKm;
        CumulativeDistancesKm = cumulativeDistancesKm;
    }

    /// <summary>
    /// Tworzy <see cref="Route"/> z punktów śladu GPX. Wymaga co najmniej 2 punktów i
    /// dodatniego dystansu całkowitego.
    /// </summary>
    /// <exception cref="RouteValidationException">
    /// Gdy <paramref name="points"/> ma mniej niż 2 elementy albo wyliczony
    /// <see cref="TotalDistanceKm"/> wychodzi <c>&lt;= 0</c>.
    /// </exception>
    public static Route Create(IReadOnlyList<GpsPoint> points)
    {
        if (points.Count < 2)
        {
            throw new RouteValidationException("Trasa musi mieć co najmniej 2 punkty.");
        }

        var cumulativeDistancesKm = CalculateCumulativeDistancesKm(points);
        var totalDistanceKm = cumulativeDistancesKm[^1];

        if (totalDistanceKm <= 0)
        {
            throw new RouteValidationException("Trasa jest zdegenerowana — dystans całkowity musi być większy od zera.");
        }

        return new Route(points, totalDistanceKm, cumulativeDistancesKm);
    }

    private static double[] CalculateCumulativeDistancesKm(IReadOnlyList<GpsPoint> points)
    {
        var cumulative = new double[points.Count];

        for (var i = 1; i < points.Count; i++)
        {
            cumulative[i] = cumulative[i - 1] + points[i - 1].DistanceToKm(points[i]);
        }

        return cumulative;
    }
}

public sealed class RouteValidationException : DomainException
{
    public RouteValidationException(string message) : base(message)
    {
    }
}
