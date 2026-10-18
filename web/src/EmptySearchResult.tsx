import { Icon } from "./Icon";
import type { SearchQuery, SearchResult } from "./types";

const minutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};
const time = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export function EmptySearchResult({
  query,
  data,
  onSearch,
  onEdit,
}: {
  query: SearchQuery;
  data: SearchResult;
  onSearch: (query: SearchQuery) => void;
  onEdit: (query: SearchQuery, field: "idioma" | "dias") => void;
}) {
  const span = minutes(query.fimFaixa) - minutes(query.inicioFaixa);
  const short = span > 0 && span < query.duracaoMinutos;
  const exclusions = data.naoElegiveis;
  const noLanguage =
    exclusions.length > 0 &&
    exclusions.every((p) => p.motivo === "Não ensina o idioma");
  const noTime = exclusions.filter(
    (p) => p.motivo === "Sem horário em comum nos dias pedidos",
  ).length;
  const blocked = exclusions.filter(
    (p) => p.motivo === "Agenda bloqueada",
  ).length;
  const allBlocked = noTime === 0 && blocked > 0;
  const supported = [90, 60, 30].find(
    (duration) => duration < query.duracaoMinutos && duration <= span,
  );
  const isFullDay = query.inicioFaixa === "00:00" && query.fimFaixa === "23:59";

  function expand() {
    const end = Math.min(
      1439,
      minutes(query.inicioFaixa) + query.duracaoMinutos,
    );
    onSearch({
      ...query,
      inicioFaixa: time(end - query.duracaoMinutos),
      fimFaixa: time(end),
    });
  }

  let title: string;
  let explanation: string;
  if (short) {
    title = "A aula não cabe na faixa escolhida.";
    explanation = `Você selecionou ${span} minutos de disponibilidade, mas a aula dura ${query.duracaoMinutos} minutos. Amplie a faixa ou escolha uma duração menor.`;
  } else if (noLanguage) {
    title = `Ainda não temos professores de ${query.idioma}.`;
    explanation = `Nenhum professor cadastrado ensina ${query.idioma}. Experimente outro idioma para conhecer as opções atuais.`;
  } else if (allBlocked) {
    title = "As agendas desse idioma estão bloqueadas.";
    explanation = `Há professores que ensinam ${query.idioma}, mas todos estão com a agenda bloqueada para novos alunos. Alterar apenas o horário não resolve esse impedimento.`;
  } else if (noTime > 0) {
    title = "Há professores do idioma, mas sem encaixe nesta busca.";
    explanation = `${noTime === 1 ? "Há 1 professor que ensina" : `Há ${noTime} professores que ensinam`} ${query.idioma} e ${noTime === 1 ? "recebe" : "recebem"} novos alunos, mas nenhum tem o mesmo início livre em todos os dias e na faixa escolhida, para uma aula de ${query.duracaoMinutos} minutos.`;
  } else {
    title = "Nenhum professor encontrado nesta busca.";
    explanation =
      "Não encontramos professores com os critérios informados. Revise o idioma, os dias e a faixa de horário.";
  }

  return (
    <div
      className="empty-search-result"
      role="region"
      aria-labelledby="empty-result-title"
    >
      <span className="empty-result-icon">
        <Icon name={short ? "clock" : "search"} size={25} />
      </span>
      <p className="eyebrow">ENTENDA O RESULTADO</p>
      <h3 id="empty-result-title">{title}</h3>
      <p className="empty-result-explanation">{explanation}</p>
      <div className="empty-result-actions">
        {short && (
          <button type="button" onClick={expand}>
            Ampliar faixa e buscar
            <Icon name="arrow" size={15} />
          </button>
        )}
        {short && supported && (
          <button
            type="button"
            className="secondary"
            onClick={() => onSearch({ ...query, duracaoMinutos: supported })}
          >
            Testar aulas de {supported} min
          </button>
        )}
        {!short && !noLanguage && !allBlocked && !isFullDay && (
          <button
            type="button"
            onClick={() =>
              onSearch({ ...query, inicioFaixa: "00:00", fimFaixa: "23:59" })
            }
          >
            Buscar no dia inteiro
            <Icon name="arrow" size={15} />
          </button>
        )}
        {!noLanguage && !allBlocked && (
          <button
            type="button"
            className="secondary"
            onClick={() => onEdit(query, "dias")}
          >
            Rever dias escolhidos
          </button>
        )}
        {(noLanguage || allBlocked) && (
          <button type="button" onClick={() => onEdit(query, "idioma")}>
            Escolher outro idioma
            <Icon name="arrow" size={15} />
          </button>
        )}
      </div>
      {!noLanguage && !allBlocked && (
        <p className="empty-result-footnote">
          Os ajustes fazem uma nova busca. Não há garantia de disponibilidade.
        </p>
      )}
    </div>
  );
}

export function ExclusionSummary({ data }: { data: SearchResult }) {
  const counts = [
    "Não ensina o idioma",
    "Agenda bloqueada",
    "Sem horário em comum nos dias pedidos",
  ]
    .map((reason) => ({
      reason,
      count: data.naoElegiveis.filter((p) => p.motivo === reason).length,
    }))
    .filter((item) => item.count > 0);
  if (!counts.length) return null;
  return (
    <aside
      className="exclusion-summary"
      aria-label="Resumo dos professores fora da busca"
    >
      <h3>Por que os outros ficaram de fora?</h3>
      <ul>
        {counts.map((item) => (
          <li key={item.reason}>
            <strong>{item.count}</strong>
            <span>{item.reason}</span>
          </li>
        ))}
      </ul>
      <p>
        Veja os nomes e o motivo de cada professor em Transparência na busca.
      </p>
    </aside>
  );
}
