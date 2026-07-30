using WeatherRide.Domain.Routes;

namespace WeatherRide.Application.Gpx;

/// <summary>
/// Port do parsowania pliku GPX na <see cref="Route"/>. Implementacja w Infrastructure.
/// </summary>
public interface IGpxParser
{
    /// <summary>
    /// Parsuje zawartość pliku GPX na <see cref="Route"/>.
    /// </summary>
    /// <exception cref="GpxParsingException">
    /// Gdy plik jest uszkodzony albo nie zawiera wystarczającej liczby poprawnych punktów
    /// trasy — patrz ADR-0003.
    /// </exception>
    Task<Route> ParseAsync(Stream gpxContent, CancellationToken cancellationToken);
}
