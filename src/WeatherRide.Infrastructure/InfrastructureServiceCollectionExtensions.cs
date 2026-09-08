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

        // Bez jawnego Timeout żądanie do Open-Meteo dziedziczy domyślne 100s HttpClienta —
        // przy zawieszonym upstreamie użytkownik czekałby na odpowiedź (błąd lub dane)
        // niewspółmiernie długo jak na pojedyncze żądanie w ramach jednego HTTP requestu.
        services.AddHttpClient<IWeatherClient, OpenMeteoWeatherClient>(client =>
        {
            client.BaseAddress = new Uri("https://api.open-meteo.com/");
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        return services;
    }
}
