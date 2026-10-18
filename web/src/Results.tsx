import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./Icon";
import { EmptySearchResult, ExclusionSummary } from "./EmptySearchResult";
import {
  DAYS,
  type SearchQuery,
  type SearchState,
  type Teacher,
} from "./types";

type Selection = { teacher: Teacher; time: string; query: SearchQuery };
function endTime(time: string, duration: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + duration;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function SchedulePreview({
  selection,
  onClose,
}: {
  selection: Selection | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selection && !dialog.current?.open) dialog.current?.showModal();
    else if (!selection && dialog.current?.open) dialog.current?.close();
  }, [selection]);
  return (
    <dialog
      ref={dialog}
      className="schedule-dialog"
      aria-labelledby="preview-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {selection && (
        <div>
          <button
            type="button"
            className="close-dialog"
            onClick={onClose}
            aria-label="Fechar visualização"
          >
            <Icon name="close" />
          </button>
          <span className="dialog-icon">
            <Icon name="calendar" size={26} />
          </span>
          <p className="eyebrow">SUA ROTINA, EM PERSPECTIVA</p>
          <h2 id="preview-title">
            Seu próximo encontro
            <br />
            com o aprendizado.
          </h2>
          <p className="dialog-disclaimer">
            Visualização de um horário disponível. Nenhuma aula foi reservada.
          </p>
          <div className="preview-details">
            <div>
              <span>Professor</span>
              <strong>{selection.teacher.nome}</strong>
            </div>
            <div>
              <span>Idioma</span>
              <strong>{selection.query.idioma}</strong>
            </div>
            <div>
              <span>Horário</span>
              <strong>
                {selection.time} —{" "}
                {endTime(selection.time, selection.query.duracaoMinutos)}
              </strong>
            </div>
            <div>
              <span>Dias</span>
              <strong>
                {DAYS.filter((d) => selection.query.dias.includes(d.value))
                  .map((d) => d.short)
                  .join(" · ")}
              </strong>
            </div>
          </div>
          <button className="primary-button" onClick={onClose}>
            Continuar explorando
            <Icon name="arrow" />
          </button>
        </div>
      )}
    </dialog>
  );
}

function TeacherCard({
  teacher,
  index,
  query,
  onSelect,
}: {
  teacher: Teacher;
  index: number;
  query: SearchQuery;
  onSelect: (s: Selection) => void;
}) {
  return (
    <motion.article
      className="teacher-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="teacher-top">
        <div className={`avatar avatar-${teacher.id % 4}`}>
          {teacher.nome.slice(0, 1)}
          <span>
            <Icon name="check" size={10} />
          </span>
        </div>
        <span className="availability">
          <i /> Agenda aberta
        </span>
      </div>
      <h3>{teacher.nome}</h3>
      <p className="teacher-language">Ensina {query.idioma}</p>
      <div className="teacher-workload">
        <Icon name="calendar" size={14} />
        <span>
          {teacher.aulasNaSemana}{" "}
          {teacher.aulasNaSemana === 1 ? "aula marcada" : "aulas marcadas"} na
          semana
        </span>
      </div>
      <div className="teacher-slots">
        <p>
          ESCOLHA UM INÍCIO{" "}
          <span>
            {teacher.horarios.length}{" "}
            {teacher.horarios.length === 1 ? "opção" : "opções"}
          </span>
        </p>
        <div>
          {teacher.horarios.map((time) => (
            <motion.button
              key={time}
              type="button"
              whileTap={{ scale: 0.94 }}
              aria-label={`Visualizar ${teacher.nome} às ${time}`}
              onClick={() => onSelect({ teacher, time, query })}
            >
              {time}
              <Icon name="arrow" size={12} />
            </motion.button>
          ))}
        </div>
      </div>
      <p className="teacher-footer">
        <Icon name="check" size={12} /> Livre em todos os dias selecionados
      </p>
    </motion.article>
  );
}

function EmptyIllustration() {
  return (
    <div className="empty-illustration" aria-hidden="true">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="illustration-calendar">
        <div>
          <i />
          <i />
        </div>
        <span>SEU PRÓXIMO CAPÍTULO</span>
        <div className="calendar-dots">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} className={i === 5 || i === 8 ? "marked" : ""} />
          ))}
        </div>
        <b>
          <Icon name="spark" size={18} />
        </b>
      </div>
      <span className="floating-word word-one">hola.</span>
      <span className="floating-word word-two">hello.</span>
      <span className="floating-star">✳</span>
    </div>
  );
}

export function Results({
  state,
  onSearch,
  onEdit,
}: {
  state: SearchState;
  onSearch: (query: SearchQuery) => void;
  onEdit: (query: SearchQuery, field: "idioma" | "dias") => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  useEffect(() => {
    setSelection(null);
  }, [state]);
  return (
    <section className="results" aria-busy={state.status === "loading"}>
      <div className="results-heading">
        <div>
          <span className="eyebrow">CONEXÕES POSSÍVEIS</span>
          <h2>
            Seu próximo professor<span>.</span>
          </h2>
        </div>
        <span className="result-icon">
          <Icon name="grid" size={18} />
        </span>
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {state.status === "loading"
          ? "Consultando as agendas."
          : state.status === "success"
            ? `${state.data.professores.length} professores disponíveis.`
            : state.status === "error"
              ? state.messages.join(" ")
              : "Preencha sua disponibilidade para buscar."}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state.status}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {state.status === "idle" && (
            <div className="empty-state">
              <EmptyIllustration />
              <p className="tiny-tag">BOAS CONVERSAS COMEÇAM AQUI</p>
              <h3>
                Existe um professor
                <br />
                no seu ritmo.
              </h3>
              <p>
                Conte um pouco sobre sua rotina.
                <br />A gente encontra os pontos em comum.
              </p>
              <div className="empty-steps">
                <span>
                  <i>1</i> Seu idioma
                </span>
                <b>→</b>
                <span>
                  <i>2</i> Sua rotina
                </span>
                <b>→</b>
                <span>
                  <i>3</i> Sua conexão
                </span>
              </div>
            </div>
          )}
          {state.status === "loading" && (
            <div className="loading-state">
              <div className="loading-label">
                <span className="loading-dot" />
                <p>Encontrando pontos em comum…</p>
              </div>
              <div className="teacher-grid">
                {[1, 2].map((i) => (
                  <div className="skeleton-card" key={i}>
                    <div className="skeleton-circle" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                    <div className="skeleton-chips">
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                ))}
              </div>
              <p className="loading-caption">
                Verificando idioma, dias e horários disponíveis.
              </p>
            </div>
          )}
          {state.status === "error" && (
            <div className="error-state" role="alert">
              <span className="error-symbol">!</span>
              <h3>Vamos ajustar um detalhe?</h3>
              <ul>
                {state.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <p>Revise sua busca e tente novamente.</p>
            </div>
          )}
          {state.status === "success" && (
            <>
              <div className="query-recap">
                <span>
                  <Icon name="globe" size={13} />
                  {state.query.idioma}
                </span>
                <span>
                  {DAYS.filter((d) => state.query.dias.includes(d.value))
                    .map((d) => d.short)
                    .join(", ")}
                </span>
                <span>
                  {state.query.inicioFaixa}–{state.query.fimFaixa}
                </span>
                <span>{state.query.duracaoMinutos} min</span>
              </div>
              <div className="match-count">
                <p>
                  <strong>
                    {String(state.data.professores.length).padStart(2, "0")}
                  </strong>{" "}
                  {state.data.professores.length === 1
                    ? "professor disponível"
                    : "professores disponíveis"}
                </p>
                <span>Menor carga semanal primeiro</span>
              </div>
              {state.data.professores.length === 0 ? (
                <EmptySearchResult
                  query={state.query}
                  data={state.data}
                  onSearch={onSearch}
                  onEdit={onEdit}
                />
              ) : (
                <div className="teacher-grid">
                  {state.data.professores.map((teacher, index) => (
                    <TeacherCard
                      key={teacher.id}
                      teacher={teacher}
                      index={index}
                      query={state.query}
                      onSelect={setSelection}
                    />
                  ))}
                </div>
              )}
              <ExclusionSummary data={state.data} />
              {state.data.naoElegiveis.length > 0 && (
                <details className="excluded">
                  <summary>
                    <span>
                      Transparência na busca{" "}
                      <small>
                        {state.data.naoElegiveis.length} fora dos critérios
                      </small>
                    </span>
                    <Icon name="chevron" size={15} />
                  </summary>
                  <div>
                    {state.data.naoElegiveis.map((t) => (
                      <div className="excluded-row" key={t.id}>
                        <span>{t.nome}</span>
                        <span>{t.motivo}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <SchedulePreview
        selection={selection}
        onClose={() => setSelection(null)}
      />
    </section>
  );
}
