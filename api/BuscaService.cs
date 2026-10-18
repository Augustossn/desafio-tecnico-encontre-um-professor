using System.Globalization;

namespace Idiomas;

public class BuscaService(IEnumerable<Professor> professores)
{
    public static readonly string[] DiasValidos = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    public static bool HoraValida(string? valor) => valor is { Length: 5 }
        && TimeOnly.TryParseExact(valor, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
    private static int Minutos(string valor) => TimeOnly.ParseExact(valor, "HH:mm", CultureInfo.InvariantCulture).Hour * 60
        + TimeOnly.ParseExact(valor, "HH:mm", CultureInfo.InvariantCulture).Minute;

    public static Dictionary<string, string[]> Validar(Busca busca)
    {
        var erros = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(busca.Idioma)) erros["idioma"] = ["Informe o idioma."];
        if (busca.Dias is null || busca.Dias.Length == 0) erros["dias"] = ["Informe ao menos um dia."];
        else if (busca.Dias.Any(d => !DiasValidos.Contains(d))) erros["dias"] = ["Dia inválido. Use: " + string.Join(", ", DiasValidos) + "."];
        if (!HoraValida(busca.InicioFaixa)) erros["inicioFaixa"] = ["Use um horário válido no formato HH:mm."];
        if (!HoraValida(busca.FimFaixa)) erros["fimFaixa"] = ["Use um horário válido no formato HH:mm."];
        if (HoraValida(busca.InicioFaixa) && HoraValida(busca.FimFaixa) && Minutos(busca.FimFaixa!) <= Minutos(busca.InicioFaixa!))
            erros["fimFaixa"] = ["O fim da faixa deve ser posterior ao início."];
        if (busca.DuracaoMinutos is not (30 or 60 or 90)) erros["duracaoMinutos"] = ["A duração deve ser 30, 60 ou 90 minutos."];
        return erros;
    }

    public Resultado Buscar(Busca busca)
    {
        if (Validar(busca).Count > 0) throw new ArgumentException("Busca inválida.", nameof(busca));
        var elegiveis = new List<Elegivel>();
        var excluidos = new List<NaoElegivel>();
        foreach (var p in professores)
        {
            string? motivo = null;
            var horarios = new List<string>();
            if (!p.Idiomas.Any(i => string.Equals(i, busca.Idioma!.Trim(), StringComparison.OrdinalIgnoreCase))) motivo = "Não ensina o idioma";
            else if (p.AgendaBloqueada) motivo = "Agenda bloqueada";
            else
            {
                var primeiro = ((Minutos(busca.InicioFaixa!) + 29) / 30) * 30;
                for (var inicio = primeiro; inicio + busca.DuracaoMinutos <= Minutos(busca.FimFaixa!); inicio += 30)
                {
                    var fim = inicio + busca.DuracaoMinutos;
                    var livre = busca.Dias!.Distinct().All(dia =>
                        p.Disponibilidade.Any(b => b.Dia == dia && Minutos(b.Inicio) <= inicio && fim <= Minutos(b.Fim))
                        && !p.AulasMarcadas.Any(a => a.Dia == dia && inicio < Minutos(a.Inicio) + a.DuracaoMinutos && Minutos(a.Inicio) < fim));
                    if (livre) horarios.Add($"{inicio / 60:00}:{inicio % 60:00}");
                }
                if (horarios.Count == 0) motivo = "Sem horário em comum nos dias pedidos";
            }
            if (motivo is not null) excluidos.Add(new(p.Id, p.Nome, motivo));
            else elegiveis.Add(new(p.Id, p.Nome, p.AulasMarcadas.Length, horarios.ToArray()));
        }
        return new(elegiveis.OrderBy(p => p.AulasNaSemana)
            .ThenBy(p => p.Nome, StringComparer.Create(CultureInfo.GetCultureInfo("pt-BR"), true)).ThenBy(p => p.Id).ToArray(), excluidos.ToArray());
    }
}
