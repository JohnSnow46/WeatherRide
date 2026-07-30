using WeatherRide.Api.ExceptionHandling;
using WeatherRide.Application.Routes;
using WeatherRide.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers(options => options.Filters.Add<DomainExceptionFilter>());
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddInfrastructure();
builder.Services.AddScoped<PlanTripUseCase>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

// Required so WebApplicationFactory<Program> can reference the class generated
// from top-level statements (Api integration tests).
public partial class Program { }
