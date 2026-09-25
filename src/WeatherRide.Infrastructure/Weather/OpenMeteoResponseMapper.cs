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

        // Tablice godzinowe muszą być równoległe (ten sam indeks = ta sama godzina) — bez
        // tej kontroli niespójna odpowiedź Open-Meteo (np. skrócona jedna z tablic) trafiłaby
        // na IndexOutOfRangeException zamiast czytelnego "brak prognozy dla tej lokalizacji",
        // analogicznie do kontroli liczby lokalizacji w OpenMeteoWeatherClient.
        if (hourly.Temperature2m.Length != hourly.Time.Length
            || hourly.WindSpeed10m.Length != hourly.Time.Length
            || hourly.Precipitation.Length != hourly.Time.Length
            || hourly.WindDirection10m.Length != hourly.Time.Length
            || hourly.RelativeHumidity2m.Length != hourly.Time.Length
            || hourly.UvIndex.Length != hourly.Time.Length
            || hourly.WindGusts10m.Length != hourly.Time.Length)
        {
            return null;
        }

        var target = RoundToNearestHour(etaAt.DateTime);

        DateTime[] times;
        try
        {
            times = ParseTimes(hourly.Time);
        }
        catch (FormatException)
        {
            return null;
        }

        if (target < times[0] || target > times[^1] + HorizonTolerance)
        {
            return null;
        }

        var closestIndex = FindClosestIndex(times, target);

        return new WeatherForecast(
            hourly.Temperature2m[closestIndex],
            hourly.WindSpeed10m[closestIndex],
            hourly.Precipitation[closestIndex],
            hourly.WindDirection10m[closestIndex],
            hourly.RelativeHumidity2m[closestIndex],
            hourly.UvIndex[closestIndex],
            hourly.WindGusts10m[closestIndex]);
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
