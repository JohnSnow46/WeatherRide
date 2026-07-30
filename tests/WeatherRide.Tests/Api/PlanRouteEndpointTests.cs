using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using WeatherRide.Api.Routes;
using WeatherRide.Application.Weather;
using WeatherRide.Domain.Routes;
using WeatherRide.Domain.Weather;

namespace WeatherRide.Tests.Api;

/// <summary>
/// Test integracyjny całego przepływu HTTP <c>POST /api/routes/plan</c>: multipart upload
/// GPX → parsowanie → próbkowanie → ETA → pogoda → JSON response. <see cref="IWeatherClient"/>
/// jest podmieniony na fake'a — żadne żywe zapytanie do Open-Meteo nie jest wykonywane.
/// </summary>
public class PlanRouteEndpointTests
{
    private static readonly DateTimeOffset DepartureAt = new(2026, 7, 30, 8, 0, 0, TimeSpan.Zero);

    private const string ThreePointGpx = """
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

    private const string SinglePointGpx = """
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <trkseg>
              <trkpt lat="52.0" lon="21.0"></trkpt>
            </trkseg>
          </trk>
        </gpx>
        """;

    [Fact]
    public async Task Plan_ValidGpxAndSpeed_ReturnsOkWithSamplesMatchingRouteAndWeather()
    {
        using var factory = CreateFactory(new FakeWeatherClient());
        using var client = factory.CreateClient();

        using var response = await client.PostAsync("/api/routes/plan", BuildValidForm(sampleCount: 6));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<PlanRouteResponse>();
        Assert.NotNull(body);
        Assert.Equal(6, body!.Samples.Count);

        var first = body.Samples[0];
        var last = body.Samples[^1];
        Assert.Equal(52.0, first.Latitude, precision: 6);
        Assert.Equal(21.0, first.Longitude, precision: 6);
        Assert.Equal(52.2, last.Latitude, precision: 6);
        Assert.Equal(21.2, last.Longitude, precision: 6);

        for (var i = 0; i < body.Samples.Count; i++)
        {
            if (i % 2 == 0)
            {
                Assert.NotNull(body.Samples[i].Weather);
                Assert.Equal(10 + i, body.Samples[i].Weather!.TemperatureCelsius, precision: 6);
                Assert.Equal(5 + i, body.Samples[i].Weather!.WindSpeedKmh, precision: 6);
                Assert.Equal(0.1 * i, body.Samples[i].Weather!.PrecipitationMm, precision: 6);
            }
            else
            {
                Assert.Null(body.Samples[i].Weather);
            }
        }

        Assert.Equal(3, body.Track.Count);
        Assert.Equal(0.0, body.Track[0].DistanceFromStartKm, precision: 9);
        Assert.Equal(52.0, body.Track[0].Latitude, precision: 6);
        Assert.Equal(21.0, body.Track[0].Longitude, precision: 6);
        Assert.Equal(body.TotalDistanceKm, body.Track[^1].DistanceFromStartKm, precision: 9);
        Assert.Equal(52.2, body.Track[^1].Latitude, precision: 6);
        Assert.Equal(21.2, body.Track[^1].Longitude, precision: 6);
    }

    [Fact]
    public async Task Plan_BothSpeedAndDurationProvided_ReturnsBadRequestProblemDetails()
    {
        using var factory = CreateFactory(new FakeWeatherClient());
        using var client = factory.CreateClient();

        using var form = BuildValidForm(sampleCount: 6);
        form.Add(new StringContent("60"), "PlannedDurationMinutes");

        using var response = await client.PostAsync("/api/routes/plan", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(StatusCodes.Status400BadRequest, problem!.Status);
    }

    [Fact]
    public async Task Plan_MissingGpxFile_ReturnsBadRequestProblemDetails()
    {
        using var factory = CreateFactory(new FakeWeatherClient());
        using var client = factory.CreateClient();

        using var form = new MultipartFormDataContent
        {
            { new StringContent(DepartureAt.ToString("O")), "DepartureAt" },
            { new StringContent("30"), "AverageSpeedKmh" },
            { new StringContent("6"), "SampleCount" },
        };

        using var response = await client.PostAsync("/api/routes/plan", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(StatusCodes.Status400BadRequest, problem!.Status);
    }

    [Fact]
    public async Task Plan_GpxWithSinglePoint_ReturnsBadRequestProblemDetails()
    {
        using var factory = CreateFactory(new FakeWeatherClient());
        using var client = factory.CreateClient();

        using var form = BuildForm(SinglePointGpx, sampleCount: 6);

        using var response = await client.PostAsync("/api/routes/plan", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(StatusCodes.Status400BadRequest, problem!.Status);
    }

    private static MultipartFormDataContent BuildValidForm(int sampleCount) => BuildForm(ThreePointGpx, sampleCount);

    private static MultipartFormDataContent BuildForm(string gpxXml, int sampleCount)
    {
        var gpxContent = new StreamContent(new MemoryStream(Encoding.UTF8.GetBytes(gpxXml)));
        gpxContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/gpx+xml");

        return new MultipartFormDataContent
        {
            { gpxContent, "GpxFile", "route.gpx" },
            { new StringContent(DepartureAt.ToString("O")), "DepartureAt" },
            { new StringContent("30"), "AverageSpeedKmh" },
            { new StringContent(sampleCount.ToString()), "SampleCount" },
        };
    }

    private static WebApplicationFactory<Program> CreateFactory(IWeatherClient fakeWeatherClient)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                var weatherClientDescriptor = services
                    .Where(d => d.ServiceType == typeof(IWeatherClient))
                    .ToList();

                foreach (var descriptor in weatherClientDescriptor)
                {
                    services.Remove(descriptor);
                }

                services.AddSingleton(fakeWeatherClient);
            }));
    }

    private sealed class FakeWeatherClient : IWeatherClient
    {
        public Task<IReadOnlyList<WeatherForecast?>> GetForecastsAsync(
            IReadOnlyList<RouteSample> samples,
            CancellationToken cancellationToken)
        {
            IReadOnlyList<WeatherForecast?> forecasts = samples
                .Select((_, i) => i % 2 == 0 ? new WeatherForecast(10 + i, 5 + i, 0.1 * i) : null)
                .ToList();

            return Task.FromResult(forecasts);
        }
    }
}
