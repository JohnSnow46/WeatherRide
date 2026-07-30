using WeatherRide.Domain.Routes;

namespace WeatherRide.Application.Routes;

public sealed record TripPlanResult(Route Route, IReadOnlyList<RouteSampleWeather> Samples);
