namespace Idiomas;

public record Busca(
    string? Idioma,
    string[]? Dias,
    string? InicioFaixa,
    string? FimFaixa,
    int DuracaoMinutos);

public record Bloco(string Dia, string Inicio, string Fim);

public record Aula(string Dia, string Inicio, int DuracaoMinutos);

public record Professor(
    int Id,
    string Nome,
    string[] Idiomas,
    bool AgendaBloqueada,
    Bloco[] Disponibilidade,
    Aula[] AulasMarcadas);

public record Dados(Professor[] Professores);

public record Elegivel(
    int Id,
    string Nome,
    int AulasNaSemana,
    string[] Horarios);

public record NaoElegivel(int Id, string Nome, string Motivo);

public record Resultado(Elegivel[] Professores, NaoElegivel[] NaoElegiveis);

public record ErroRequisicao(string Mensagem);
