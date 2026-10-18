import { Icon } from "./Icon";
import { TimePicker } from "./TimePicker";

const PERIODS = [
  { label: "Manhã", start: "08:00", end: "12:00", symbol: "◔" },
  { label: "Tarde", start: "13:00", end: "18:00", symbol: "☀" },
  { label: "Noite", start: "18:00", end: "22:00", symbol: "☾" },
];
const toMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

export function TimeRangeField({
  start,
  end,
  duration,
  disabled,
  onChange,
}: {
  start: string;
  end: string;
  duration: number;
  disabled: boolean;
  onChange: (start: string, end: string) => void;
}) {
  const length = toMinutes(end) - toMinutes(start);
  const invalid = length <= 0;
  const tooShort = length > 0 && length < duration;
  const hours = Math.floor(length / 60);
  const minutes = length % 60;
  const label = [hours ? `${hours}h` : "", minutes ? `${minutes}min` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <fieldset className="time-range-field">
      <legend>Em qual faixa você pode ter aula?</legend>
      <div className="period-presets" aria-label="Atalhos de período">
        {PERIODS.map((period) => (
          <button
            type="button"
            key={period.label}
            disabled={disabled}
            aria-pressed={start === period.start && end === period.end}
            title={`${period.start}–${period.end}`}
            onClick={() => onChange(period.start, period.end)}
          >
            <span aria-hidden="true">{period.symbol}</span>
            {period.label}
          </button>
        ))}
      </div>
      <div className="time-fields">
        <TimePicker
          id="start"
          label="A partir de"
          value={start}
          disabled={disabled}
          onChange={(value) => onChange(value, end)}
        />
        <span className="time-dash" aria-hidden="true">
          —
        </span>
        <TimePicker
          id="end"
          label="Até"
          value={end}
          disabled={disabled}
          onChange={(value) => onChange(start, value)}
        />
      </div>
      <p
        className={`range-summary${invalid || tooShort ? " range-warning" : ""}`}
        aria-live="polite"
      >
        <Icon name="clock" size={13} />
        {invalid
          ? "O fim precisa ser posterior ao início."
          : tooShort
            ? `A faixa de ${label} é menor que a aula de ${duration} min.`
            : `${label} de faixa disponível para aulas de ${duration} min.`}
      </p>
      <p className="range-explanation">
        A aula precisa caber inteira nessa faixa.
      </p>
    </fieldset>
  );
}
