using Idiomas;
using Xunit;

public class BuscaTests
{
    private static Professor P(int id = 1, string nome = "Ana", Bloco[]? blocos = null, Aula[]? aulas = null, bool bloqueada = false, string[]? idiomas = null)
        => new(id, nome, idiomas ?? ["Inglês"], bloqueada, blocos ?? [new("segunda", "18:00", "22:00")], aulas ?? []);
    private static Busca B(string[]? dias = null, string inicio = "18:00", string fim = "20:00", int duracao = 60)
        => new("Inglês", dias ?? ["segunda"], inicio, fim, duracao);
    private static string[] Horarios(Professor p, Busca b) => new BuscaService([p]).Buscar(b).Professores.Single().Horarios;

    [Fact] public void EncostarEmAmbosOsLimitesEPermitido() => Assert.Equal(["18:00", "20:00"], Horarios(P(aulas: [new("segunda", "19:00", 60)]), B(fim: "21:00")));
    [Fact] public void SobreposicaoParcialERejeitada() => Assert.Equal(["19:30"], Horarios(P(aulas: [new("segunda", "18:30", 60)]), B(fim: "20:30")));
    [Fact] public void ExigeMesmoInicioEmTodosOsDias()
    {
        var p = P(blocos: [new("segunda", "18:00", "19:00"), new("quarta", "19:00", "20:00")]);
        Assert.Empty(new BuscaService([p]).Buscar(B(["segunda", "quarta"])).Professores);
    }
    [Fact] public void IntersectaDiasComHorariosComuns() => Assert.Equal(["19:00"], Horarios(P(blocos: [new("segunda", "18:00", "20:00"), new("quarta", "19:00", "21:00")]), B(["segunda", "quarta"])));
    [Fact] public void ArredondaInicioParaMeiaHora() => Assert.Equal(["18:30", "19:00"], Horarios(P(blocos: [new("segunda", "18:15", "20:00")]), B(inicio: "18:16")));
    [Fact] public void NaoJuntaBlocosSeparados() => Assert.Empty(new BuscaService([P(blocos: [new("segunda", "18:00", "18:45"), new("segunda", "19:00", "19:45")])]).Buscar(B()).Professores);
    [Fact] public void AulaInteiraCabeNaFaixa() => Assert.Equal(["18:00"], Horarios(P(), B(fim: "19:00")));
    [Theory] [InlineData(30, 4)] [InlineData(60, 3)] [InlineData(90, 2)]
    public void DuracoesValidas(int duracao, int quantidade) => Assert.Equal(quantidade, Horarios(P(), B(duracao: duracao)).Length);
    [Fact] public void PriorizaMotivos()
    {
        var r = new BuscaService([P(idiomas: ["Francês"], bloqueada: true), P(2, bloqueada: true), P(3, blocos: [])]).Buscar(B());
        Assert.Equal(["Não ensina o idioma", "Agenda bloqueada", "Sem horário em comum nos dias pedidos"], r.NaoElegiveis.Select(p => p.Motivo));
    }
    [Fact] public void OrdenaPorCargaEDepoisNome()
    {
        var r = new BuscaService([P(1, "Zeca"), P(2, "Ana", aulas: [new("sexta", "09:00", 60)]), P(3, "Bia")]).Buscar(B());
        Assert.Equal([3, 1, 2], r.Professores.Select(p => p.Id));
    }
    [Fact] public void NormalizaIdiomaEDeduplicaDias() => Assert.Equal(["18:00", "18:30", "19:00"], Horarios(P(), B(["segunda", "segunda"]) with { Idioma = " inglês " }));
    [Theory] [InlineData("8:00")] [InlineData("24:00")] [InlineData("18:60")] [InlineData("18:00:00")] [InlineData(null)]
    public void RejeitaHoraInvalida(string? hora) => Assert.Contains("inicioFaixa", BuscaService.Validar(B() with { InicioFaixa = hora }).Keys);
    [Fact] public void ValidaTodosOsCampos()
    {
        var erros = BuscaService.Validar(new(" ", ["Segunda"], "20:00", "19:00", 45));
        Assert.Equal(4, erros.Count);
        Assert.Contains("dias", BuscaService.Validar(B() with { Dias = [] }).Keys);
        Assert.Contains("fimFaixa", BuscaService.Validar(B(fim: "18:00")).Keys);
    }
}
