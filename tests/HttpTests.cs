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
        var caminhoDaApi = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "../../../../api"));

        builder.UseEnvironment("Production");
        builder.UseContentRoot(caminhoDaApi);
    }
}

public class HttpTests : IClassFixture<ApiFactory>
{
    private const string Endpoint = "/api/professores/busca";
    private readonly ApiFactory fabrica;

    public HttpTests(ApiFactory fabrica)
    {
        this.fabrica = fabrica;
    }

    private static Busca CriarBuscaValida()
    {
        return new Busca(
            Idioma: "Espanhol",
            Dias: ["segunda"],
            InicioFaixa: "18:00",
            FimFaixa: "20:00",
            DuracaoMinutos: 60);
    }

    [Fact]
    public async Task BuscaRetornaContratoEHorariosDoExemplo()
    {
        using var cliente = fabrica.CreateClient();
        var busca = CriarBuscaValida();

        using var resposta = await cliente.PostAsJsonAsync(Endpoint, busca);
        var resultado = await resposta.Content.ReadFromJsonAsync<Resultado>();

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Equal("application/json", resposta.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(resultado);

        var nomesDosProfessores = resultado.Professores.Select(professor => professor.Nome);
        Assert.Equal(["Ana", "Diego"], nomesDosProfessores);
        Assert.Equal(["18:00"], resultado.Professores[0].Horarios);
        Assert.Equal(["18:00", "18:30", "19:00"], resultado.Professores[1].Horarios);

        foreach (var professor in resultado.Professores)
        {
            Assert.Equal(1, professor.AulasNaSemana);
        }

        Assert.Equal(6, resultado.NaoElegiveis.Length);

        foreach (var professor in resultado.NaoElegiveis)
        {
            Assert.Equal("Não ensina o idioma", professor.Motivo);
        }
    }

    [Fact]
    public async Task FaixaMenorQueAulaRetornaListaVaziaComStatus200()
    {
        using var cliente = fabrica.CreateClient();
        var busca = CriarBuscaValida() with
        {
            FimFaixa = "18:30"
        };

        using var resposta = await cliente.PostAsJsonAsync(Endpoint, busca);
        var resultado = await resposta.Content.ReadFromJsonAsync<Resultado>();

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.NotNull(resultado);
        Assert.Empty(resultado.Professores);
    }

    public static IEnumerable<object[]> RequisicoesInvalidas()
    {
        yield return [CriarBuscaValida() with { Idioma = " " }, "idioma"];
        yield return [CriarBuscaValida() with { Dias = [] }, "dias"];
        yield return [CriarBuscaValida() with { Dias = ["feriado"] }, "dias"];
        yield return [CriarBuscaValida() with { InicioFaixa = "8:00" }, "inicioFaixa"];
        yield return [CriarBuscaValida() with { FimFaixa = "24:00" }, "fimFaixa"];
        yield return [CriarBuscaValida() with { FimFaixa = "18:00" }, "fimFaixa"];
        yield return [CriarBuscaValida() with { FimFaixa = "17:00" }, "fimFaixa"];
        yield return [CriarBuscaValida() with { DuracaoMinutos = 45 }, "duracaoMinutos"];
    }

    [Theory]
    [MemberData(nameof(RequisicoesInvalidas))]
    public async Task CamposInvalidosRetornam400ComMensagem(Busca busca, string campo)
    {
        using var cliente = fabrica.CreateClient();

        using var resposta = await cliente.PostAsJsonAsync(Endpoint, busca);
        var corpoDaResposta = await resposta.Content.ReadAsStringAsync();
        using var documento = JsonDocument.Parse(corpoDaResposta);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.Equal("application/problem+json", resposta.Content.Headers.ContentType?.MediaType);

        var status = documento.RootElement.GetProperty("status").GetInt32();
        var erros = documento.RootElement.GetProperty("errors");
        var mensagensDoCampo = erros.GetProperty(campo);
        var primeiraMensagem = mensagensDoCampo[0].GetString();

        Assert.Equal(400, status);
        Assert.False(string.IsNullOrWhiteSpace(primeiraMensagem));
    }

    [Theory]
    [InlineData("{")]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("{\"duracaoMinutos\":\"sessenta\"}")]
    public async Task JsonInvalidoRetorna400ComMensagemClara(string corpo)
    {
        using var cliente = fabrica.CreateClient();
        using var conteudo = new StringContent(corpo, Encoding.UTF8, "application/json");

        using var resposta = await cliente.PostAsync(Endpoint, conteudo);
        var erro = await resposta.Content.ReadFromJsonAsync<ErroRequisicao>();

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
        Assert.NotNull(erro);
        Assert.Contains("Corpo inválido", erro.Mensagem);
    }

    [Fact]
    public async Task SwaggerExplicaSucessoEAsDuasRespostas400()
    {
        using var cliente = fabrica.CreateClient();

        using var resposta = await cliente.GetAsync("/swagger/v1/swagger.json");
        resposta.EnsureSuccessStatusCode();

        var corpoDaResposta = await resposta.Content.ReadAsStringAsync();
        using var documento = JsonDocument.Parse(corpoDaResposta);
        var caminhos = documento.RootElement.GetProperty("paths");
        var operacaoDeBusca = caminhos.GetProperty(Endpoint).GetProperty("post");
        var respostas = operacaoDeBusca.GetProperty("responses");
        var conteudosDoErro = respostas.GetProperty("400").GetProperty("content");

        Assert.True(respostas.TryGetProperty("200", out _));
        Assert.True(conteudosDoErro.TryGetProperty("application/problem+json", out _));
        Assert.True(conteudosDoErro.TryGetProperty("application/json", out _));

        using var pagina = await cliente.GetAsync("/swagger/index.html");
        var htmlDaPagina = await pagina.Content.ReadAsStringAsync();

        Assert.Contains("swagger-ui", htmlDaPagina);
    }

    [Fact]
    public async Task RaizRedirecionaParaDocumentacao()
    {
        var opcoesDoCliente = new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        };
        using var cliente = fabrica.CreateClient(opcoesDoCliente);

        using var resposta = await cliente.GetAsync("/");

        Assert.Equal(HttpStatusCode.Redirect, resposta.StatusCode);
        Assert.Equal("/swagger", resposta.Headers.Location?.OriginalString);
    }
}
