using WeatherRide.Domain.Weather;

namespace WeatherRide.Tests.Weather;

public class WindRelativeDirectionCalculatorTests
{
    [Theory]
    [InlineData(0, 0, WindRelativeDirection.Headwind)] // wiatr z północy, jedziemy na północ -- wiatr w twarz
    [InlineData(0, 40, WindRelativeDirection.Headwind)] // na granicy progu 45°
    [InlineData(0, 90, WindRelativeDirection.Crosswind)]
    [InlineData(0, 135, WindRelativeDirection.Tailwind)] // na granicy progu 135°
    [InlineData(0, 180, WindRelativeDirection.Tailwind)] // wiatr z południa, jedziemy na północ -- wiatr w plecy
    [InlineData(10, 190, WindRelativeDirection.Tailwind)] // ta sama relacja, inny azymut bazowy
    public void Categorize_SignificantWind_ReturnsExpectedCategory(
        double travelBearingDegrees, double windFromDirectionDegrees, WindRelativeDirection expected)
    {
        var category = WindRelativeDirectionCalculator.Categorize(
            travelBearingDegrees, windFromDirectionDegrees, windSpeedKmh: 30, windGustsKmh: 30);

        Assert.Equal(expected, category);
    }

    [Theory]
    [InlineData(24.9, 24.9)] // oba poniżej progu
    [InlineData(10, 24.9)] // prędkość poniżej, porywy też poniżej
    public void Categorize_NeitherSpeedNorGustsReachThreshold_ReturnsNull(double windSpeedKmh, double windGustsKmh)
    {
        // Wiatr czołowy "na papierze" (kierunek idealnie przeciwny), ale za słaby, by miał
        // praktyczne znaczenie dla jazdy.
        var category = WindRelativeDirectionCalculator.Categorize(
            travelBearingDegrees: 0, windFromDirectionDegrees: 0, windSpeedKmh, windGustsKmh);

        Assert.Null(category);
    }

    [Fact]
    public void Categorize_OnlyGustsReachThreshold_StillCategorizes()
    {
        // Poryw, nie utrzymana prędkość, wystarcza -- Math.Max(speed, gusts) w implementacji.
        var category = WindRelativeDirectionCalculator.Categorize(
            travelBearingDegrees: 0, windFromDirectionDegrees: 0, windSpeedKmh: 10, windGustsKmh: 25);

        Assert.Equal(WindRelativeDirection.Headwind, category);
    }

    [Theory]
    [InlineData(350, 10)] // różnica 20° przez "0"
    [InlineData(10, 350)]
    public void Categorize_AngleWrapsAroundNorth_StillComputesSmallestDifference(
        double travelBearingDegrees, double windFromDirectionDegrees)
    {
        var category = WindRelativeDirectionCalculator.Categorize(
            travelBearingDegrees, windFromDirectionDegrees, windSpeedKmh: 30, windGustsKmh: 30);

        Assert.Equal(WindRelativeDirection.Headwind, category);
    }
}
