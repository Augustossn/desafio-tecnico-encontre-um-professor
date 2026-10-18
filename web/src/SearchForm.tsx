import { motion } from "motion/react";
import type { SearchQuery } from "./types";
import { DAYS } from "./types";
import { Icon } from "./Icon";
import { TimeRangeField } from "./TimeRangeField";

export function SearchForm({
  query,
  onChange,
  onSearch,
  loading,
}: {
  query: SearchQuery;
  onChange: (q: SearchQuery) => void;
  onSearch: () => void;
  loading: boolean;
}) {
  function update<K extends keyof SearchQuery>(key: K, value: SearchQuery[K]) {
    onChange({ ...query, [key]: value });
  }
  return (
    <form
      className="search-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <fieldset disabled={loading}>
        <div className="panel-heading">
          <span className="icon-box">
            <Icon name="search" />
          </span>
          <div>
            <h2>Do seu jeito.</h2>
            <p>Uma aula que cabe na sua rotina.</p>
          </div>
          <span className="small-index">01 / 02</span>
        </div>
        <fieldset className="field-group">
          <legend>Qual idioma vamos explorar?</legend>
          <div className="language-options">
            {[
              ["Inglês", "EN"],
              ["Espanhol", "ES"],
              ["Francês", "FR"],
            ].map(([language, code]) => (
              <label className="language-option" key={code}>
                <input
                  type="radio"
                  name="idioma"
                  value={language}
                  checked={query.idioma === language}
                  onChange={() => update("idioma", language)}
                />
                <span className="language-content">
                  {query.idioma === language && (
                    <motion.span
                      className="language-active"
                      layoutId="language"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 32,
                      }}
                    />
                  )}
                  <span className="language-code">{code}</span>
                  <span>{language}</span>
                  <Icon name="check" size={13} />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="field-group">
          <legend>Quais dias funcionam para você?</legend>
          <div className="day-options">
            {DAYS.map((day) => (
              <label key={day.value} className="day-option">
                <input
                  type="checkbox"
                  aria-label={day.label}
                  checked={query.dias.includes(day.value)}
                  onChange={(e) =>
                    update(
                      "dias",
                      e.target.checked
                        ? [...query.dias, day.value]
                        : query.dias.filter((d) => d !== day.value),
                    )
                  }
                />
                <span>
                  {day.short}
                  <i />
                </span>
              </label>
            ))}
          </div>
          <p className="field-help">Pode escolher mais de um dia.</p>
        </fieldset>
        <TimeRangeField
          start={query.inicioFaixa}
          end={query.fimFaixa}
          duration={query.duracaoMinutos}
          disabled={loading}
          onChange={(inicioFaixa, fimFaixa) =>
            onChange({ ...query, inicioFaixa, fimFaixa })
          }
        />
        <fieldset className="field-group duration">
          <legend>Seu tempo de aprender</legend>
          <div className="duration-options">
            {[30, 60, 90].map((duration) => (
              <label key={duration}>
                <input
                  type="radio"
                  name="duracao"
                  aria-label={`${duration} minutos`}
                  checked={query.duracaoMinutos === duration}
                  onChange={() => update("duracaoMinutos", duration)}
                />
                <span>
                  {duration}
                  <small> min</small>
                  {query.duracaoMinutos === duration && (
                    <motion.i layoutId="duration" />
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="fixed-note">
          <Icon name="calendar" size={17} />
          <p>
            Um horário fixo, em todos os dias escolhidos.
            <br />
            <strong>Consistência faz parte do aprendizado.</strong>
          </p>
        </div>
        <motion.button
          className="primary-button"
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={loading}
        >
          <span>
            {loading ? "Cruzando agendas…" : "Encontrar meu professor"}
          </span>
          <Icon name={loading ? "clock" : "arrow"} size={19} />
        </motion.button>
      </fieldset>
    </form>
  );
}
