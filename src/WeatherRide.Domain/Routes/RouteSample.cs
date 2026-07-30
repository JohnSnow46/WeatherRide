namespace WeatherRide.Domain.Routes;

/// <summary>
/// Jeden z próbkowanych punktów trasy do sprawdzenia pogody.
/// </summary>
public sealed class RouteSample
{
    public GpsPoint Position { get; }

    public double DistanceFromStartKm { get; }

    public DateTimeOffset EtaAt { get; }

    public RouteSample(GpsPoint position, double distanceFromStartKm, DateTimeOffset etaAt)
    {
        Position = position;
        DistanceFromStartKm = distanceFromStartKm;
        EtaAt = etaAt;
    }
}
