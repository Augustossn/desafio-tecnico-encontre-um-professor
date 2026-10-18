using Idiomas;
using Xunit;

public class BuscaTests
{
    private static Professor CriarProfessor(
        int id = 1,
        string nome = "Ana",
        Bloco[]? blocos = null,
        Aula[]? aulas = null,
        bool bloqueada = false,
        string[]? idiomas = null)
    {
        return new Professor(
            id,
            nome,
            idiomas ?? ["Inglês"],
            bloqueada,
            blocos ?? [new Bloco("segunda", "18:00", "22:00")],
            aulas ?? []);
    }

    private static Busca CriarBusca(
        string[]? dias = null,
        string inicio = "18:00",
        string fim = "20:00",
        int duracao = 60)
    {
        return new Busca("Inglês", dias ?? ["segunda"], inicio, fim, duracao);
    }

    private static string[] BuscarHorarios(Professor professor, Busca busca)
    {
        var servico = new BuscaService([professor]);
        var resultado = servico.Buscar(busca);
        var professorElegivel = Assert.Single(resultado.Professores);

        return professorElegivel.Horarios;
    }

    [Fact]
    public void EncostarEmAmbosOsLimitesEPermitido()
    {
        var professor = CriarProfessor(aulas: [new Aula("segunda", "19:00", 60)]);
        var busca = CriarBusca(fim: "21:00");

        var horarios = BuscarHorarios(professor, busca);

        Assert.Equal(["18:00", "20:00"], horarios);
    }

    [Fact]
    public void SobreposicaoParcialERejeitada()
    {
        var professor = CriarProfessor(aulas: [new Aula("segunda", "18:30", 60)]);
        var busca = CriarBusca(fim: "20:30");

        var horarios = BuscarHorarios(professor, busca);

        Assert.Equal(["19:30"], horarios);
    }

    [Fact]
    public void ExigeMesmoInicioEmTodosOsDias()
    {
        var professor = CriarProfessor(blocos:
        [
            new Bloco("segunda", "18:00", "19:00"),
            new Bloco("quarta", "19:00", "20:00")
        ]);
        var busca = CriarBusca(dias: ["segunda", "quarta"]);
        var servico = new BuscaService([professor]);

        var resultado = servico.Buscar(busca);

        Assert.Empty(resultado.Professores);
    }

    [Fact]
    public void IntersectaDiasComHorariosComuns()
    {
        var professor = CriarProfessor(blocos:
        [
            new Bloco("segunda", "18:00", "20:00"),
            new Bloco("quarta", "19:00", "21:00")
        ]);
        var busca = CriarBusca(dias: ["segunda", "quarta"]);

        var horarios = BuscarHorarios(professor, busca);

        Assert.Equal(["19:00"], horarios);
    }

    [Fact]
    public void ArredondaInicioParaMeiaHora()
    {
        var professor = CriarProfessor(blocos: [new Bloco("segunda", "18:15", "20:00")]);
        var busca = CriarBusca(inicio: "18:16");

        var horarios = BuscarHorarios(professor, busca);

        Assert.Equal(["18:30", "19:00"], horarios);
    }

    [Fact]
    public void NaoJuntaBlocosSeparados()
    {
        var professor = CriarProfessor(blocos:
        [
            new Bloco("segunda", "18:00", "18:45"),
            new Bloco("segunda", "19:00", "19:45")
        ]);
        var busca = CriarBusca();
        var servico = new BuscaService([professor]);

        var resultado = servico.Buscar(busca);

        Assert.Empty(resultado.Professores);
    }

    [Fact]
    public void AulaInteiraCabeNaFaixa()
    {
        var professor = CriarProfessor();
        var busca = CriarBusca(fim: "19:00");

        var horarios = BuscarHorarios(professor, busca);

        Assert.Equal(["18:00"], horarios);
    }

    [Theory]
    [InlineData(30, 4)]
    [InlineData(60, 3)]
    [InlineData(90, 2)]
    public void DuracoesValidas(int duracao, int quantidadeEsperada)
    {
        var professor = CriarProfessor();
        var busca = CriarBusca(duracao: duracao);

        var horarios = BuscarHorarios(professor, busca);

        Assert.Equal(quantidadeEsperada, horarios.Length);
    }

    [Fact]
    public void PriorizaMotivos()
    {
        var professores = new[]
        {
            CriarProfessor(id: 1, idiomas: ["Francês"], bloqueada: true),
            CriarProfessor(id: 2, bloqueada: true),
            CriarProfessor(id: 3, blocos: [])
        };
        var busca = CriarBusca();
        var servico = new BuscaService(professores);

        var resultado = servico.Buscar(busca);
        var motivos = resultado.NaoElegiveis.Select(professor => professor.Motivo);

        Assert.Equal(
            ["Não ensina o idioma", "Agenda bloqueada", "Sem horário em comum nos dias pedidos"],
            motivos);
    }

    [Fact]
    public void OrdenaPorCargaEDepoisNome()
    {
        var professores = new[]
        {
            CriarProfessor(id: 1, nome: "Zeca"),
            CriarProfessor(id: 2, nome: "Ana", aulas: [new Aula("sexta", "09:00", 60)]),
            CriarProfessor(id: 3, nome: "Bia")
        };
        var servico = new BuscaService(professores);

        var resultado = servico.Buscar(CriarBusca());
        var idsOrdenados = resultado.Professores.Select(professor => professor.Id);

        Assert.Equal([3, 1, 2], idsOrdenados);
    }

    [Fact]
    public void NormalizaIdiomaEDeduplicaDias()
    {
        var professor = CriarProfessor();
        var busca = CriarBusca(dias: ["segunda", "segunda"]) with
        {
            Idioma = " inglês "
        };

        var horarios = BuscarHorarios(professor, busca);

        Assert.Equal(["18:00", "18:30", "19:00"], horarios);
    }

    [Theory]
    [InlineData("8:00")]
    [InlineData("24:00")]
    [InlineData("18:60")]
    [InlineData("18:00:00")]
    [InlineData(null)]
    public void RejeitaHoraInvalida(string? horario)
    {
        var busca = CriarBusca() with
        {
            InicioFaixa = horario
        };

        var erros = BuscaService.Validar(busca);

        Assert.Contains("inicioFaixa", erros.Keys);
    }

    [Fact]
    public void ValidaTodosOsCampos()
    {
        var buscaInvalida = new Busca(" ", ["Segunda"], "20:00", "19:00", 45);
        var buscaSemDias = CriarBusca() with
        {
            Dias = []
        };
        var buscaComFaixaIgual = CriarBusca(fim: "18:00");

        var erros = BuscaService.Validar(buscaInvalida);
        var errosSemDias = BuscaService.Validar(buscaSemDias);
        var errosDaFaixa = BuscaService.Validar(buscaComFaixaIgual);

        Assert.Equal(4, erros.Count);
        Assert.Contains("dias", errosSemDias.Keys);
        Assert.Contains("fimFaixa", errosDaFaixa.Keys);
    }
}
