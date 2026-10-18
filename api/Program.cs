using System.Text.Json;
using Idiomas;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
});
var caminhoDosProfessores = Path.Combine(
    builder.Environment.ContentRootPath,
    "professores.json");

var json = File.ReadAllText(caminhoDosProfessores);
var opcoesJson = new JsonSerializerOptions(JsonSerializerDefaults.Web);
var dados = JsonSerializer.Deserialize<Dados>(json, opcoesJson)
    ?? throw new InvalidOperationException("Arquivo de professores inválido.");
builder.Services.AddSingleton(new BuscaService(dados.Professores));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Língua — API de professores",
        Version = "v1",
        Description = "Encontre professores que ensinam o idioma e possuem o mesmo horário livre em todos os dias solicitados. A busca não reserva aulas."
    });
    options.OperationFilter<BuscaDocumentation>();
});
builder.Services.Configure<Microsoft.AspNetCore.Routing.RouteHandlerOptions>(options =>
{
    options.ThrowOnBadRequest = true;
});

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});
var app = builder.Build();
app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (BadHttpRequestException) when (!context.Response.HasStarted)
    {
        context.Response.StatusCode = 400;
        var erro = new ErroRequisicao(
            "Corpo inválido. Envie um objeto JSON com os campos e tipos esperados.");

        await context.Response.WriteAsJsonAsync(erro);
    }
});
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Língua API v1");
    options.DocumentTitle = "Língua — Documentação da API";
});
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();
app.MapPost("/api/professores/busca", BuscarProfessores)
.WithName("BuscarProfessores")
.WithTags("Professores")
.WithSummary("Busca professores com horário fixo em comum")
.WithDescription("Informe idioma, dias semanais, faixa HH:mm e duração de 30, 60 ou 90 minutos. " +
    "A aula inteira precisa caber em um bloco livre, em todos os dias. Inícios são em :00 ou :30; " +
    "encostar em aulas existentes é permitido. Ordena por quantidade de aulas na semana e depois por nome. " +
    "Professores excluídos retornam um motivo, na prioridade: idioma, agenda bloqueada, ausência de horário comum.")
.Accepts<Busca>("application/json")
.Produces<Resultado>(StatusCodes.Status200OK)
.ProducesValidationProblem(StatusCodes.Status400BadRequest);
app.Run();

static IResult BuscarProfessores(Busca busca, BuscaService servico)
{
    var erros = BuscaService.Validar(busca);

    if (erros.Count > 0)
    {
        return Results.ValidationProblem(
            erros,
            title: "Revise os campos informados.");
    }

    var resultado = servico.Buscar(busca);
    return Results.Ok(resultado);
}

public partial class Program
{
}
