export type SearchQuery = {
  idioma: string;
  dias: string[];
  inicioFaixa: string;
  fimFaixa: string;
  duracaoMinutos: number;
};
export type Teacher = {
  id: number;
  nome: string;
  aulasNaSemana: number;
  horarios: string[];
};
export type SearchResult = {
  professores: Teacher[];
  naoElegiveis: { id: number; nome: string; motivo: string }[];
};
export type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: SearchResult; query: SearchQuery }
  | { status: "error"; messages: string[] };
export const DAYS = [
  { value: "segunda", short: "Seg", label: "Segunda-feira" },
  { value: "terca", short: "Ter", label: "Terça-feira" },
  { value: "quarta", short: "Qua", label: "Quarta-feira" },
  { value: "quinta", short: "Qui", label: "Quinta-feira" },
  { value: "sexta", short: "Sex", label: "Sexta-feira" },
  { value: "sabado", short: "Sáb", label: "Sábado" },
  { value: "domingo", short: "Dom", label: "Domingo" },
];
export const DEFAULT_QUERY: SearchQuery = {
  idioma: "Espanhol",
  dias: ["segunda"],
  inicioFaixa: "18:00",
  fimFaixa: "20:00",
  duracaoMinutos: 60,
};
