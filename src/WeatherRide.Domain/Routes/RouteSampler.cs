namespace WeatherRide.Domain.Routes;

/// <summary>
/// Próbkuje <see cref="Route"/> na równomiernie rozłożone punkty wg dystansu (nie czasu)
/// i wylicza ETA per punkt przy stałym tempie, patrz ADR-0001.
/// </summary>
public static class RouteSampler
{
    public const int MinSamples = 5;
    public const int MaxSamples = 50;

    /// <summary>
    /// Zwraca dokładnie <c>Clamp(requestedSampleCount, MinSamples, MaxSamples)</c> próbek,
    /// równomiernie rozłożonych wg dystansu wzdłuż <paramref name="route"/>, zawsze
    /// zawierających start (dystans 0) i metę (dystans = TotalDistanceKm).
    /// </summary>
    public static IReadOnlyList<RouteSample> Sample(Route route, TripPlan tripPlan, int requestedSampleCount)
    {
        var sampleCount = Math.Clamp(requestedSampleCount, MinSamples, MaxSamples);
        var cumulativeDistances = BuildCumulativeDistances(route.Points);
        var stepKm = route.TotalDistanceKm / (sampleCount - 1);

        var samples = new List<RouteSample>(sampleCount);

        for (var i = 0; i < sampleCount; i++)
        {
            // Ostatnia próbka to zawsze dokładnie meta trasy — unika błędów zaokrągleń
            // przy mnożeniu stepKm * (sampleCount - 1).
            var targetDistanceKm = i == sampleCount - 1
                ? route.TotalDistanceKm
                : stepKm * i;

            var position = InterpolatePosition(route.Points, cumulativeDistances, targetDistanceKm);
            var etaAt = tripPlan.DepartureAt + TimeSpan.FromHours(targetDistanceKm / tripPlan.AverageSpeedKmh);

            samples.Add(new RouteSample(position, targetDistanceKm, etaAt));
        }

        return samples;
    }

    private static double[] BuildCumulativeDistances(IReadOnlyList<GpsPoint> points)
    {
        var cumulativeDistances = new double[points.Count];

        for (var i = 1; i < points.Count; i++)
        {
            cumulativeDistances[i] = cumulativeDistances[i - 1] + points[i - 1].DistanceToKm(points[i]);
        }

        return cumulativeDistances;
    }

    private static GpsPoint InterpolatePosition(
        IReadOnlyList<GpsPoint> points,
        double[] cumulativeDistances,
        double targetDistanceKm)
    {
        var lastIndex = points.Count - 1;

        if (targetDistanceKm <= 0)
        {
            return points[0];
        }

        if (targetDistanceKm >= cumulativeDistances[lastIndex])
        {
            return points[lastIndex];
        }

        var segmentStart = 0;

        for (var i = 1; i <= lastIndex; i++)
        {
            if (cumulativeDistances[i] >= targetDistanceKm)
            {
                segmentStart = i - 1;
                break;
            }
        }

        var segmentStartDistance = cumulativeDistances[segmentStart];
        var segmentEndDistance = cumulativeDistances[segmentStart + 1];
        var segmentLengthKm = segmentEndDistance - segmentStartDistance;

        var t = segmentLengthKm <= 0
            ? 0.0
            : (targetDistanceKm - segmentStartDistance) / segmentLengthKm;

        var start = points[segmentStart];
        var end = points[segmentStart + 1];

        var latitude = start.Latitude + (end.Latitude - start.Latitude) * t;
        var longitude = start.Longitude + (end.Longitude - start.Longitude) * t;

        return new GpsPoint(latitude, longitude);
    }
}
