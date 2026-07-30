using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using WeatherRide.Application.Gpx;
using WeatherRide.Domain;

namespace WeatherRide.Api.ExceptionHandling;

/// <summary>
/// Mapuje znane wyjątki walidacyjne/parsowania (<see cref="DomainException"/>,
/// <see cref="GpxParsingException"/>) na 400 <see cref="ProblemDetails"/>, zgodnie z
/// ADR-0004. Wszystko inne zostaje nieobsłużone — trafia do domyślnego zachowania
/// ASP.NET Core (500 bez szczegółów technicznych).
/// </summary>
public sealed class DomainExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var detail = context.Exception switch
        {
            DomainException domainException => domainException.Message,
            GpxParsingException gpxParsingException => gpxParsingException.Message,
            _ => null,
        };

        if (detail is null)
        {
            return;
        }

        context.Result = new BadRequestObjectResult(new ProblemDetails
        {
            Title = "Nieprawidłowe dane wejściowe",
            Status = StatusCodes.Status400BadRequest,
            Detail = detail,
        });

        context.ExceptionHandled = true;
    }
}
