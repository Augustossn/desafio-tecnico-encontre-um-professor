using System.Text.Json;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Idiomas;

/// <summary>Exemplos do contrato HTTP exibidos no Swagger UI.</summary>
public sealed class BuscaDocumentation(BuscaService service) : IOperationFilter
{
    private static IOpenApiAny Example(string json) => OpenApiAnyFactory.CreateFromJson(json);

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (context.ApiDescription.RelativePath != "api/professores/busca") return;

        operation.RequestBody.Required = true;
        operation.RequestBody.Content["application/json"].Example = Example("""
            {"idioma":"Espanhol","dias":["segunda"],"inicioFaixa":"18:00","fimFaixa":"20:00","duracaoMinutos":60}
            """);

        // Deriva o exemplo de sucesso da própria regra e do arquivo oficial, evitando dados divergentes.
        var resultado = service.Buscar(new("Espanhol", ["segunda"], "18:00", "20:00", 60));
        operation.Responses["200"].Description = "Busca concluída. As listas podem estar vazias.";
        operation.Responses["200"].Content["application/json"].Example = Example(
            JsonSerializer.Serialize(resultado, new JsonSerializerOptions(JsonSerializerDefaults.Web)));

        operation.Responses["400"].Description = "Campos inválidos (errors) ou JSON malformado/tipos incorretos (mensagem).";
        operation.Responses["400"].Content["application/problem+json"].Example = Example("""
            {"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"Revise os campos informados.","status":400,"errors":{"dias":["Informe ao menos um dia."]}}
            """);
        operation.Responses["400"].Content["application/json"] = new OpenApiMediaType
        {
            Schema = context.SchemaGenerator.GenerateSchema(typeof(ErroRequisicao), context.SchemaRepository),
            Example = Example("""
                {"mensagem":"Corpo inválido. Envie um objeto JSON com os campos e tipos esperados."}
                """)
        };
    }
}
