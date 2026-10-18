import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { Icon } from "./Icon";

const ROW_HEIGHT = 40;
const pad = (value: number) => String(value).padStart(2, "0");
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

// CSS scroll-snap handles touch and wheel scrolling. One focusable listbox per column
// keeps all values reachable without adding 84 individual stops to the Tab sequence.
function TimeWheel({
  label,
  value,
  count,
  onChange,
  onConfirm,
}: {
  label: string;
  value: number;
  count: number;
  onChange: (value: number) => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typed = useRef({ text: "", time: 0 });

  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = value * ROW_HEIGHT;
  }, [value]);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const deltas: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      PageDown: 5,
      PageUp: -5,
    };
    if (event.key in deltas) {
      event.preventDefault();
      onChange(Math.min(count - 1, Math.max(0, value + deltas[event.key])));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onChange(event.key === "Home" ? 0 : count - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onConfirm();
    } else if (/^\d$/.test(event.key)) {
      event.preventDefault();
      const now = Date.now();
      const text =
        now - typed.current.time < 800
          ? (typed.current.text + event.key).slice(-2)
          : event.key;
      typed.current = { text, time: now };
      const number = Number(text);
      if (number < count) onChange(number);
    }
  }

  return (
    <div className="time-wheel-column">
      <span className="time-wheel-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="time-wheel-window">
        <div className="time-wheel-highlight" aria-hidden="true" />
        <div
          className="time-wheel"
          role="listbox"
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-${value}`}
          tabIndex={0}
          ref={scroller}
          onKeyDown={handleKey}
          onScroll={() => {
            if (timeout.current) clearTimeout(timeout.current);
            timeout.current = setTimeout(() => {
              if (!scroller.current) return;
              const next = Math.min(
                count - 1,
                Math.max(
                  0,
                  Math.round(scroller.current.scrollTop / ROW_HEIGHT),
                ),
              );
              if (next !== value) onChange(next);
            }, 140);
          }}
        >
          {Array.from({ length: count }, (_, number) => (
            <div
              key={number}
              id={`${id}-${number}`}
              role="option"
              aria-selected={value === number}
              className={
                value === number
                  ? "time-wheel-option selected"
                  : "time-wheel-option"
              }
              onClick={() => {
                onChange(number);
                scroller.current?.focus({ preventScroll: true });
              }}
            >
              {pad(number)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimePicker({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [text, setText] = useState(value);
  const titleId = useId();
  const descriptionId = useId();
  const exactId = useId();
  const content = useRef<HTMLDivElement>(null);
  const [hours, minutes] = draft.split(":").map(Number);
  const valid = validTime(text);

  function select(time: string) {
    setDraft(time);
    setText(time);
  }
  function apply() {
    if (!validTime(text)) return;
    onChange(text);
    setOpen(false);
  }

  return (
    <div className="time-picker">
      <label htmlFor={id}>{label}</label>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          if (next) select(value);
          setOpen(next);
        }}
      >
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            className="time-picker-trigger"
            disabled={disabled}
            aria-label={`${label}: ${value}`}
          >
            <Icon name="clock" size={17} />
            <span>{value}</span>
            <Icon name="chevron" size={13} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            ref={content}
            className="time-popover"
            align="start"
            sideOffset={9}
            collisionPadding={14}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              content.current
                ?.querySelector<HTMLElement>('[role="listbox"]')
                ?.focus({ preventScroll: true });
            }}
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <div className="time-popover-heading">
              <div>
                <p>SEU TEMPO, DO SEU JEITO</p>
                <h3 id={titleId}>{label}</h3>
              </div>
              <Popover.Close
                className="time-popover-close"
                aria-label="Fechar sem aplicar"
              >
                <Icon name="close" size={16} />
              </Popover.Close>
            </div>
            <div className="time-wheels">
              <TimeWheel
                label="Horas"
                value={hours}
                count={24}
                onChange={(hour) => select(`${pad(hour)}:${pad(minutes)}`)}
                onConfirm={apply}
              />
              <span className="wheel-colon" aria-hidden="true">
                :
              </span>
              <TimeWheel
                label="Minutos"
                value={minutes}
                count={60}
                onChange={(minute) => select(`${pad(hours)}:${pad(minute)}`)}
                onConfirm={apply}
              />
            </div>
            <p className="time-wheel-help" id={descriptionId}>
              Role, toque ou use ↑ e ↓ para escolher.
            </p>
            <div className="quick-minutes" aria-label="Atalhos de minutos">
              {[0, 15, 30, 45].map((minute) => (
                <button
                  key={minute}
                  type="button"
                  aria-label={`Usar minuto ${pad(minute)}`}
                  aria-pressed={minutes === minute}
                  onClick={() => select(`${pad(hours)}:${pad(minute)}`)}
                >
                  :{pad(minute)}
                </button>
              ))}
            </div>
            <div className="time-exact">
              <label htmlFor={exactId}>Ou digite</label>
              <input
                id={exactId}
                type="text"
                inputMode="text"
                placeholder="HH:mm"
                maxLength={5}
                value={text}
                aria-label={`Digitar horário — ${label}`}
                aria-invalid={!valid}
                aria-describedby={!valid ? `${exactId}-error` : undefined}
                onChange={(event) => {
                  const next = event.target.value;
                  setText(next);
                  if (validTime(next)) setDraft(next);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    apply();
                  }
                }}
              />
            </div>
            {!valid && (
              <p id={`${exactId}-error`} className="time-input-error">
                Use HH:mm, de 00:00 até 23:59.
              </p>
            )}
            <button
              type="button"
              className="time-apply"
              disabled={!valid}
              onClick={apply}
            >
              Aplicar horário <Icon name="check" size={16} />
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
