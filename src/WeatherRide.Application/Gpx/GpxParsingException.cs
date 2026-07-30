namespace WeatherRide.Application.Gpx;

/// <summary>
/// Rzucany, gdy plik GPX nie da się sparsować na poprawną <see cref="WeatherRide.Domain.Routes.Route"/> —
/// zarówno przy błędach technicznych XML, jak i przy trasach niespełniających minimalnej
/// poprawności (patrz ADR-0003). Zdefiniowany w Application (nie w Infrastructure), żeby
/// Api mogła go złapać bez referencji na Infrastructure.
/// </summary>
public sealed class GpxParsingException : Exception
{
    public GpxParsingException(string message) : base(message)
    {
    }

    public GpxParsingException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
