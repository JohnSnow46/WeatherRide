using System.Globalization;
using System.Xml;
using System.Xml.Linq;
using WeatherRide.Application.Gpx;
using WeatherRide.Domain.Routes;

namespace WeatherRide.Infrastructure.Gpx;

/// <summary>
/// Parsuje plik GPX (1.0/1.1) na <see cref="Route"/> przez <see cref="XDocument"/>, bez
/// zewnętrznej biblioteki GPX — patrz ADR-0003.
/// </summary>
public sealed class XDocumentGpxParser : IGpxParser
{
    public async Task<Route> ParseAsync(Stream gpxContent, CancellationToken cancellationToken)
    {
        var document = await LoadDocumentAsync(gpxContent, cancellationToken);

        var root = document.Root
            ?? throw new GpxParsingException("Uszkodzony plik XML — brak elementu głównego.");

        var ns = root.Name.Namespace;
        var points = ExtractPoints(document, ns);

        return BuildRoute(points);
    }

    private static async Task<XDocument> LoadDocumentAsync(Stream gpxContent, CancellationToken cancellationToken)
    {
        try
        {
            return await XDocument.LoadAsync(gpxContent, LoadOptions.None, cancellationToken);
        }
        catch (XmlException ex)
        {
            throw new GpxParsingException("Uszkodzony plik XML.", ex);
        }
    }

    private static List<GpsPoint> ExtractPoints(XDocument document, XNamespace ns)
    {
        // Wszystkie <trk>/<trkseg>/<trkpt> w dokumencie, spłaszczone do jednej listy w
        // kolejności występowania — wiele <trk>/<trkseg> to jedna trasa (ADR-0003).
        var trackPoints = document.Descendants(ns + "trkpt").ToList();

        // Brak <trkpt> → fallback na <rte>/<rtept>. <wpt> zawsze ignorowane.
        var sourceElements = trackPoints.Count > 0
            ? trackPoints
            : document.Descendants(ns + "rtept").ToList();

        var points = new List<GpsPoint>(sourceElements.Count);

        foreach (var element in sourceElements)
        {
            if (TryParsePoint(element, out var point))
            {
                points.Add(point);
            }
        }

        return points;
    }

    private static bool TryParsePoint(XElement element, out GpsPoint point)
    {
        point = default;

        var latitudeAttribute = element.Attribute("lat");
        var longitudeAttribute = element.Attribute("lon");

        if (latitudeAttribute is null || longitudeAttribute is null)
        {
            return false;
        }

        if (!double.TryParse(latitudeAttribute.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var latitude))
        {
            return false;
        }

        if (!double.TryParse(longitudeAttribute.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var longitude))
        {
            return false;
        }

        point = new GpsPoint(latitude, longitude);
        return true;
    }

    private static Route BuildRoute(List<GpsPoint> points)
    {
        if (points.Count == 0)
        {
            throw new GpxParsingException("Plik GPX nie zawiera żadnych punktów trasy.");
        }

        try
        {
            return Route.Create(points);
        }
        catch (RouteValidationException ex)
        {
            throw new GpxParsingException($"Nieprawidłowa trasa w pliku GPX: {ex.Message}", ex);
        }
    }
}
