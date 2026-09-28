namespace WeatherRide.Api.Routes;

/// <summary>
/// Jeden z próbek trasy zwróconych wcześniej z <c>/plan</c> albo <c>/plan-direct</c>,
/// odsyłany z powrotem do <c>POST /api/routes/reforecast</c> (bezstanowe API).
/// </summary>
public sealed class ReforecastSampleRequest
{
    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public double DistanceFromStartKm { get; set; }
}
