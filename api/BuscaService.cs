using System.Globalization;

namespace Idiomas;

public class BuscaService
{
    private readonly IEnumerable<Professor> professores;

    public static readonly string[] DiasValidos =
    [
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado",
        "domingo"
    ];

    public BuscaService(IEnumerable<Professor> professores)
    {
        this.professores = professores;
    }

    public static bool HoraValida(string? horario)
    {
        if (horario is null || horario.Length != 5)
        {
            return false;
        }

        return TimeOnly.TryParseExact(
            horario,
            "HH:mm",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out _);
    }

    public static Dictionary<string, string[]> Validar(Busca busca)
    {
        var erros = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(busca.Idioma))
        {
            erros["idioma"] = ["Informe o idioma."];
        }

        if (busca.Dias is null || busca.Dias.Length == 0)
        {
            erros["dias"] = ["Informe ao menos um dia."];
        }
        else if (busca.Dias.Any(dia => !DiasValidos.Contains(dia)))
        {
            var diasAceitos = string.Join(", ", DiasValidos);
            erros["dias"] = [$"Dia inválido. Use: {diasAceitos}."];
        }

        var inicioValido = HoraValida(busca.InicioFaixa);
        var fimValido = HoraValida(busca.FimFaixa);

        if (!inicioValido)
        {
            erros["inicioFaixa"] = ["Use um horário válido no formato HH:mm."];
        }

        if (!fimValido)
        {
            erros["fimFaixa"] = ["Use um horário válido no formato HH:mm."];
        }

        if (inicioValido && fimValido)
        {
            var inicioEmMinutos = ConverterParaMinutos(busca.InicioFaixa!);
            var fimEmMinutos = ConverterParaMinutos(busca.FimFaixa!);

            if (fimEmMinutos <= inicioEmMinutos)
            {
                erros["fimFaixa"] = ["O fim da faixa deve ser posterior ao início."];
            }
        }

        if (busca.DuracaoMinutos is not (30 or 60 or 90))
        {
            erros["duracaoMinutos"] = ["A duração deve ser 30, 60 ou 90 minutos."];
        }

        return erros;
    }

    public Resultado Buscar(Busca busca)
    {
        var erros = Validar(busca);

        if (erros.Count > 0)
        {
            throw new ArgumentException("Busca inválida.", nameof(busca));
        }

        var professoresElegiveis = new List<Elegivel>();
        var professoresExcluidos = new List<NaoElegivel>();

        foreach (var professor in professores)
        {
            var motivo = ObterMotivoInicial(professor, busca.Idioma!.Trim());
            var horarios = new List<string>();

            if (motivo is null)
            {
                horarios = EncontrarHorarios(professor, busca);

                if (horarios.Count == 0)
                {
                    motivo = "Sem horário em comum nos dias pedidos";
                }
            }

            if (motivo is not null)
            {
                var professorExcluido = new NaoElegivel(
                    professor.Id,
                    professor.Nome,
                    motivo);

                professoresExcluidos.Add(professorExcluido);
            }
            else
            {
                var professorElegivel = new Elegivel(
                    professor.Id,
                    professor.Nome,
                    professor.AulasMarcadas.Length,
                    horarios.ToArray());

                professoresElegiveis.Add(professorElegivel);
            }
        }

        var comparadorDeNomes = StringComparer.Create(
            CultureInfo.GetCultureInfo("pt-BR"),
            ignoreCase: true);

        var professoresOrdenados = professoresElegiveis
            .OrderBy(professor => professor.AulasNaSemana)
            .ThenBy(professor => professor.Nome, comparadorDeNomes)
            .ThenBy(professor => professor.Id)
            .ToArray();

        return new Resultado(
            professoresOrdenados,
            professoresExcluidos.ToArray());
    }

    private static string? ObterMotivoInicial(Professor professor, string idiomaPedido)
    {
        var ensinaIdioma = professor.Idiomas.Any(idioma =>
            string.Equals(idioma, idiomaPedido, StringComparison.OrdinalIgnoreCase));

        if (!ensinaIdioma)
        {
            return "Não ensina o idioma";
        }

        if (professor.AgendaBloqueada)
        {
            return "Agenda bloqueada";
        }

        return null;
    }

    private static List<string> EncontrarHorarios(Professor professor, Busca busca)
    {
        var horarios = new List<string>();
        var inicioDaFaixa = ConverterParaMinutos(busca.InicioFaixa!);
        var fimDaFaixa = ConverterParaMinutos(busca.FimFaixa!);
        var diasPedidos = busca.Dias!.Distinct().ToArray();
        var primeiroInicio = ArredondarParaProximaMeiaHora(inicioDaFaixa);

        for (var inicio = primeiroInicio; inicio + busca.DuracaoMinutos <= fimDaFaixa; inicio += 30)
        {
            var fim = inicio + busca.DuracaoMinutos;
            var livreEmTodosOsDias = diasPedidos.All(dia =>
                EstaLivreNoDia(professor, dia, inicio, fim));

            if (livreEmTodosOsDias)
            {
                horarios.Add(FormatarHorario(inicio));
            }
        }

        return horarios;
    }

    private static bool EstaLivreNoDia(Professor professor, string dia, int inicio, int fim)
    {
        var cabeEmUmBloco = professor.Disponibilidade.Any(bloco =>
            bloco.Dia == dia
            && ConverterParaMinutos(bloco.Inicio) <= inicio
            && fim <= ConverterParaMinutos(bloco.Fim));

        if (!cabeEmUmBloco)
        {
            return false;
        }

        var temConflito = professor.AulasMarcadas.Any(aula =>
        {
            if (aula.Dia != dia)
            {
                return false;
            }

            var inicioDaAula = ConverterParaMinutos(aula.Inicio);
            var fimDaAula = inicioDaAula + aula.DuracaoMinutos;

            // Comparações estritas permitem que uma aula comece quando outra termina.
            return inicio < fimDaAula
                && inicioDaAula < fim;
        });

        return !temConflito;
    }

    private static int ConverterParaMinutos(string horario)
    {
        var hora = TimeOnly.ParseExact(horario, "HH:mm", CultureInfo.InvariantCulture);
        return hora.Hour * 60 + hora.Minute;
    }

    private static int ArredondarParaProximaMeiaHora(int minutos)
    {
        var minutosAposMeiaHora = minutos % 30;

        if (minutosAposMeiaHora == 0)
        {
            return minutos;
        }

        return minutos + (30 - minutosAposMeiaHora);
    }

    private static string FormatarHorario(int minutos)
    {
        var horas = minutos / 60;
        var minutosRestantes = minutos % 60;
        return $"{horas:00}:{minutosRestantes:00}";
    }
}
