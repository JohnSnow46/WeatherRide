using WeatherRide.Domain.Routes;

namespace WeatherRide.Application.Routes;

/// <summary>
/// Jeden z już wyliczonych próbkowanych punktów trasy, przesyłany z powrotem przez
/// klienta (bezstanowe API — patrz CLAUDE.md) do <see cref="ReforecastTripUseCase"/>,
/// żeby przeliczyć ETA/pogodę dla nowej godziny wyjazdu bez ponownego próbkowania trasy.
/// </summary>
public sealed record ReforecastSample(GpsPoint Position, double DistanceFromStartKm);
