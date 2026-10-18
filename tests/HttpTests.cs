using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Idiomas;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.UseContentRoot(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../api")));
    }
}

public class HttpTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Endpoint = "/api/professores/busca";
    private static Busca Example => new("Espanhol", ["segunda"], "18:00", "20:00", 60);

    [Fact]
    public async Task BuscaRetornaContratoEHorariosDoExemplo()
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync(Endpoint, Example);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        var result = (await response.Content.ReadFromJsonAsync<Resultado>())!;
        Assert.Equal(["Ana", "Diego"], result.Professores.Select(p => p.Nome));
        Assert.Equal(["18:00"], result.Professores[0].Horarios);
        Assert.Equal(["18:00", "18:30", "19:00"], result.Professores[1].Horarios);
        Assert.All(result.Professores, p => Assert.Equal(1, p.AulasNaSemana));
        Assert.Equal(6, result.NaoElegiveis.Length);
        Assert.All(result.NaoElegiveis, p => Assert.Equal("Não ensina o idioma", p.Motivo));
    }

    [Fact]
    public async Task FaixaMenorQueAulaRetornaListaVaziaComStatus200()
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync(Endpoint, Example with { FimFaixa = "18:30" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await response.Content.ReadFromJsonAsync<Resultado>())!.Professores);
    }

    public static IEnumerable<object[]> InvalidRequests()
    {
        yield return [Example with { Idioma = " " }, "idioma"];
        yield return [Example with { Dias = [] }, "dias"];
        yield return [Example with { Dias = ["feriado"] }, "dias"];
        yield return [Example with { InicioFaixa = "8:00" }, "inicioFaixa"];
        yield return [Example with { FimFaixa = "24:00" }, "fimFaixa"];
        yield return [Example with { FimFaixa = "18:00" }, "fimFaixa"];
        yield return [Example with { FimFaixa = "17:00" }, "fimFaixa"];
        yield return [Example with { DuracaoMinutos = 45 }, "duracaoMinutos"];
    }

    [Theory]
    [MemberData(nameof(InvalidRequests))]
    public async Task CamposInvalidosRetornam400ComMensagem(Busca query, string field)
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsJsonAsync(Endpoint, query);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(400, json.RootElement.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(json.RootElement.GetProperty("errors").GetProperty(field)[0].GetString()));
    }

    [Theory]
    [InlineData("{")]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("{\"duracaoMinutos\":\"sessenta\"}")]
    public async Task JsonInvalidoRetorna400ComMensagemClara(string body)
    {
        using var client = factory.CreateClient();
        using var response = await client.PostAsync(Endpoint, new StringContent(body, Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = (await response.Content.ReadFromJsonAsync<ErroRequisicao>())!;
        Assert.Contains("Corpo inválido", error.Mensagem);
    }

    [Fact]
    public async Task SwaggerExplicaSucessoEAsDuasRespostas400()
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/swagger/v1/swagger.json");
        response.EnsureSuccessStatusCode();
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var operation = json.RootElement.GetProperty("paths").GetProperty(Endpoint).GetProperty("post");
        var responses = operation.GetProperty("responses");
        Assert.True(responses.TryGetProperty("200", out _));
        var errors = responses.GetProperty("400").GetProperty("content");
        Assert.True(errors.TryGetProperty("application/problem+json", out _));
        Assert.True(errors.TryGetProperty("application/json", out _));
        using var ui = await client.GetAsync("/swagger/index.html");
        Assert.Contains("swagger-ui", await ui.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task RaizRedirecionaParaDocumentacao()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.GetAsync("/");
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/swagger", response.Headers.Location?.OriginalString);
    }
}
