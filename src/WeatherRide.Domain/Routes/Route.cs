namespace WeatherRide.Domain.Routes;

/// <summary>
/// Trasa wczytana z pliku GPX — lista punktów śladu i dystans całkowity. Nigdy nie
/// istnieje w niepoprawnym stanie, patrz <see cref="Create"/>.
/// </summary>
public sealed class Route
{
    public IReadOnlyList<GpsPoint> Points { get; }

    public double TotalDistanceKm { get; }

    private Route(IReadOnlyList<GpsPoint> points, double totalDistanceKm)
    {
        Points = points;
        TotalDistanceKm = totalDistanceKm;
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

        var totalDistanceKm = CalculateTotalDistanceKm(points);

        if (totalDistanceKm <= 0)
        {
            throw new RouteValidationException("Trasa jest zdegenerowana — dystans całkowity musi być większy od zera.");
        }

        return new Route(points, totalDistanceKm);
    }

    private static double CalculateTotalDistanceKm(IReadOnlyList<GpsPoint> points)
    {
        var total = 0.0;

        for (var i = 1; i < points.Count; i++)
        {
            total += points[i - 1].DistanceToKm(points[i]);
        }

        return total;
    }
}

public sealed class RouteValidationException : DomainException
{
    public RouteValidationException(string message) : base(message)
    {
    }
}
