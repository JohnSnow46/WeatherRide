namespace WeatherRide.Domain;

/// <summary>
/// Wspólna klasa bazowa dla wszystkich wyjątków domenowych WeatherRide.
/// </summary>
public abstract class DomainException : Exception
{
    protected DomainException(string message) : base(message)
    {
    }
}
