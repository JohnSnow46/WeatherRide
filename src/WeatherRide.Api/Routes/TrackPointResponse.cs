namespace WeatherRide.Api.Routes;

/// <summary>
/// <see cref="Elevation"/> (metry n.p.m.) jest <c>null</c>, gdy plik GPX jej nie zawierał
/// (albo trasa pochodzi z trybu A-B bez pliku GPX, patrz <c>PlanDirectRouteRequest</c>).
/// </summary>
public sealed record TrackPointResponse(double Latitude, double Longitude, double DistanceFromStartKm, double? Elevation);
