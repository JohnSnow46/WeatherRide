using System.Globalization;
using WeatherRide.Domain.Weather;

namespace WeatherRide.Infrastructure.Weather;

/// <summary>
/// Mapuje odpowiedź Open-Meteo dla jednej lokalizacji na <see cref="WeatherForecast"/> dla
/// konkretnego ETA, wybierając najbliższą dostępną godzinę (bez interpolacji). ETA poza
/// horyzontem prognozy → <c>null</c>.
/// </summary>
public static class OpenMeteoResponseMapper
{
    private static readonly TimeSpan HorizonTolerance = TimeSpan.FromMinutes(30);

    public static WeatherForecast? Map(OpenMeteoLocationResponse location, DateTimeOffset etaAt)
    {
        var hourly = location.Hourly;
        if (hourly is null || hourly.Time.Length == 0)
        {
            return null;
        }

        var target = RoundToNearestHour(etaAt.DateTime);
        var times = ParseTimes(hourly.Time);

        if (target < times[0] || target > times[^1] + HorizonTolerance)
        {
            return null;
        }

        var closestIndex = FindClosestIndex(times, target);

        return new WeatherForecast(
            hourly.Temperature2m[closestIndex],
            hourly.WindSpeed10m[closestIndex],
            hourly.Precipitation[closestIndex],
            hourly.WindDirection10m[closestIndex]);
    }

    private static DateTime[] ParseTimes(string[] time) =>
        time.Select(t => DateTime.Parse(t, CultureInfo.InvariantCulture, DateTimeStyles.NoCurrentDateDefault)).ToArray();

    private static int FindClosestIndex(DateTime[] times, DateTime target)
    {
        var closestIndex = 0;
        var smallestDifference = TimeSpan.MaxValue;

        for (var i = 0; i < times.Length; i++)
        {
            var difference = (times[i] - target).Duration();
            if (difference < smallestDifference)
            {
                smallestDifference = difference;
                closestIndex = i;
            }
        }

        return closestIndex;
    }

    private static DateTime RoundToNearestHour(DateTime value)
    {
        var truncated = new DateTime(value.Year, value.Month, value.Day, value.Hour, 0, 0, value.Kind);
        return value.Minute >= 30 ? truncated.AddHours(1) : truncated;
    }
}
