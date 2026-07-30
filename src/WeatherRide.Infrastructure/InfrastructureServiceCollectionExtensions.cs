using Microsoft.Extensions.DependencyInjection;
using WeatherRide.Application.Gpx;
using WeatherRide.Application.Weather;
using WeatherRide.Infrastructure.Gpx;
using WeatherRide.Infrastructure.Weather;

namespace WeatherRide.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<IGpxParser, XDocumentGpxParser>();

        services.AddHttpClient<IWeatherClient, OpenMeteoWeatherClient>(
            client => client.BaseAddress = new Uri("https://api.open-meteo.com/"));

        return services;
    }
}
