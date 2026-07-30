using System.Text;
using WeatherRide.Application.Gpx;
using WeatherRide.Infrastructure.Gpx;

namespace WeatherRide.Tests.Gpx;

public class XDocumentGpxParserTests
{
    private readonly XDocumentGpxParser _parser = new();

    [Fact]
    public async Task ParseAsync_ValidTrkGpx11_ReturnsRouteWithTrackPoints()
    {
        const string gpx = """
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
              <trk>
                <trkseg>
                  <trkpt lat="52.0" lon="21.0"></trkpt>
                  <trkpt lat="52.1" lon="21.1"></trkpt>
                  <trkpt lat="52.2" lon="21.2"></trkpt>
                </trkseg>
              </trk>
            </gpx>
            """;

        var route = await ParseAsync(gpx);

        Assert.Equal(3, route.Points.Count);
        Assert.True(route.TotalDistanceKm > 0);
    }

    [Fact]
    public async Task ParseAsync_ValidRteWithoutTrk_FallsBackToRoutePoints()
    {
        const string gpx = """
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
              <rte>
                <rtept lat="52.0" lon="21.0"></rtept>
                <rtept lat="52.5" lon="21.5"></rtept>
              </rte>
            </gpx>
            """;

        var route = await ParseAsync(gpx);

        Assert.Equal(2, route.Points.Count);
        Assert.True(route.TotalDistanceKm > 0);
    }

    [Fact]
    public async Task ParseAsync_Gpx10Namespace_ParsesSuccessfully()
    {
        const string gpx = """
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx version="1.0" xmlns="http://www.topografix.com/GPX/1/0">
              <trk>
                <trkseg>
                  <trkpt lat="10.0" lon="10.0"></trkpt>
                  <trkpt lat="10.1" lon="10.1"></trkpt>
                </trkseg>
              </trk>
            </gpx>
            """;

        var route = await ParseAsync(gpx);

        Assert.Equal(2, route.Points.Count);
    }

    [Fact]
    public async Task ParseAsync_MultipleTrksegInOneTrk_FlattensIntoSingleRoute()
    {
        const string gpx = """
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
              <trk>
                <trkseg>
                  <trkpt lat="1.0" lon="1.0"></trkpt>
                  <trkpt lat="1.1" lon="1.1"></trkpt>
                </trkseg>
                <trkseg>
                  <trkpt lat="1.2" lon="1.2"></trkpt>
                  <trkpt lat="1.3" lon="1.3"></trkpt>
                </trkseg>
              </trk>
            </gpx>
            """;

        var route = await ParseAsync(gpx);

        Assert.Equal(4, route.Points.Count);
    }

    [Fact]
    public async Task ParseAsync_OnlyWaypoints_ThrowsGpxParsingException()
    {
        const string gpx = """
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
              <wpt lat="52.0" lon="21.0">
                <name>Some POI</name>
              </wpt>
            </gpx>
            """;

        await Assert.ThrowsAsync<GpxParsingException>(() => ParseAsync(gpx));
    }

    [Fact]
    public async Task ParseAsync_SingleValidPoint_ThrowsGpxParsingException()
    {
        const string gpx = """
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
              <trk>
                <trkseg>
                  <trkpt lat="52.0" lon="21.0"></trkpt>
                </trkseg>
              </trk>
            </gpx>
            """;

        await Assert.ThrowsAsync<GpxParsingException>(() => ParseAsync(gpx));
    }

    [Fact]
    public async Task ParseAsync_AllPointsIdentical_ThrowsGpxParsingException()
    {
        const string gpx = """
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
              <trk>
                <trkseg>
                  <trkpt lat="52.0" lon="21.0"></trkpt>
                  <trkpt lat="52.0" lon="21.0"></trkpt>
                  <trkpt lat="52.0" lon="21.0"></trkpt>
                </trkseg>
              </trk>
            </gpx>
            """;

        await Assert.ThrowsAsync<GpxParsingException>(() => ParseAsync(gpx));
    }

    [Fact]
    public async Task ParseAsync_MalformedXml_ThrowsGpxParsingExceptionNotXmlException()
    {
        const string gpx = """
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
              <trk>
                <trkseg>
                  <trkpt lat="52.0" lon="21.0">
                </trkseg>
              </trk>
            """;

        await Assert.ThrowsAsync<GpxParsingException>(() => ParseAsync(gpx));
    }

    private async Task<WeatherRide.Domain.Routes.Route> ParseAsync(string gpxXml)
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(gpxXml));
        return await _parser.ParseAsync(stream, CancellationToken.None);
    }
}
