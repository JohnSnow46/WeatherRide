namespace WeatherRide.Domain.Routes;

/// <summary>
/// Plan wyjazdu znormalizowany do jednej reprezentacji przez Domain: data/godzina startu
/// + wyliczona średnia prędkość. Nigdy nie istnieje w niepoprawnym stanie, patrz
/// <see cref="Create"/>.
/// </summary>
public sealed class TripPlan
{
    public DateTimeOffset DepartureAt { get; }

    public double AverageSpeedKmh { get; }

    private TripPlan(DateTimeOffset departureAt, double averageSpeedKmh)
    {
        DepartureAt = departureAt;
        AverageSpeedKmh = averageSpeedKmh;
    }

    /// <summary>
    /// Tworzy <see cref="TripPlan"/> z dokładnie jednego z <paramref name="averageSpeedKmh"/>
    /// / <paramref name="plannedDurationHours"/>, normalizując wynik zawsze do
    /// <see cref="AverageSpeedKmh"/>.
    /// </summary>
    /// <exception cref="TripPlanValidationException">
    /// Gdy nie podano dokładnie jednego z pól wejściowych, <paramref name="plannedDurationHours"/>
    /// jest <c>&lt;= 0</c>, albo wynikowe <see cref="AverageSpeedKmh"/> wychodzi <c>&lt;= 0</c>.
    /// </exception>
    public static TripPlan Create(
        DateTimeOffset departureAt,
        double totalDistanceKm,
        double? averageSpeedKmh,
        double? plannedDurationHours)
    {
        if (averageSpeedKmh.HasValue == plannedDurationHours.HasValue)
        {
            throw new TripPlanValidationException(
                "Podaj dokładnie jedno z: AverageSpeedKmh albo PlannedDurationHours.");
        }

        double resolvedSpeedKmh;

        if (averageSpeedKmh.HasValue)
        {
            resolvedSpeedKmh = averageSpeedKmh.Value;
        }
        else
        {
            if (plannedDurationHours!.Value <= 0)
            {
                throw new TripPlanValidationException("PlannedDurationHours musi być większe od zera.");
            }

            resolvedSpeedKmh = totalDistanceKm / plannedDurationHours.Value;
        }

        if (resolvedSpeedKmh <= 0)
        {
            throw new TripPlanValidationException("AverageSpeedKmh musi być większe od zera.");
        }

        return new TripPlan(departureAt, resolvedSpeedKmh);
    }
}

public sealed class TripPlanValidationException : DomainException
{
    public TripPlanValidationException(string message) : base(message)
    {
    }
}
