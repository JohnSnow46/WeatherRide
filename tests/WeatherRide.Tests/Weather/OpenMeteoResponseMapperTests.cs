using WeatherRide.Infrastructure.Weather;

namespace WeatherRide.Tests.Weather;

public class OpenMeteoResponseMapperTests
{
    private static OpenMeteoLocationResponse BuildLocation() => new()
    {
        Hourly = new OpenMeteoLocationResponse.HourlyData
        {
            Time =
            [
                "2026-07-30T08:00",
                "2026-07-30T09:00",
                "2026-07-30T10:00",
            ],
            Temperature2m = [18.0, 20.5, 22.0],
            WindSpeed10m = [10.0, 12.5, 15.0],
            Precipitation = [0.0, 0.2, 1.0],
        },
    };

    [Fact]
    public void Map_EtaWithinHourlyRange_ReturnsClosestHourForecast()
    {
        var location = BuildLocation();
        var etaAt = new DateTimeOffset(2026, 7, 30, 9, 10, 0, TimeSpan.Zero);

        var forecast = OpenMeteoResponseMapper.Map(location, etaAt);

        Assert.NotNull(forecast);
        Assert.Equal(20.5, forecast!.TemperatureCelsius);
        Assert.Equal(12.5, forecast.WindSpeedKmh);
        Assert.Equal(0.2, forecast.PrecipitationMm);
    }

    [Fact]
    public void Map_EtaBeforeFirstAvailableHour_ReturnsNull()
    {
        var location = BuildLocation();
        var etaAt = new DateTimeOffset(2026, 7, 30, 5, 0, 0, TimeSpan.Zero);

        var forecast = OpenMeteoResponseMapper.Map(location, etaAt);

        Assert.Null(forecast);
    }

    [Fact]
    public void Map_EtaAfterLastAvailableHour_ReturnsNull()
    {
        var location = BuildLocation();
        var etaAt = new DateTimeOffset(2026, 7, 30, 23, 0, 0, TimeSpan.Zero);

        var forecast = OpenMeteoResponseMapper.Map(location, etaAt);

        Assert.Null(forecast);
    }
}
