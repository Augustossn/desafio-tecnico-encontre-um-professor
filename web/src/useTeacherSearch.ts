import { useEffect, useRef, useState } from "react";
import type { SearchQuery, SearchResult, SearchState } from "./types";

export function useTeacherSearch() {
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  async function search(query: SearchQuery) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState({ status: "loading" });
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/professores/busca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(query),
      });
      if (response.status === 400) {
        const problem: {
          errors?: Record<string, string[]>;
          mensagem?: string;
          title?: string;
        } = await response.json();
        if (active.current === controller)
          setState({
            status: "error",
            messages: problem.errors
              ? Object.values(problem.errors).flat()
              : [
                  problem.mensagem ??
                    problem.title ??
                    "Revise os campos informados.",
                ],
          });
        return;
      }
      if (!response.ok) throw new Error("Falha na busca");
      const data: SearchResult = await response.json();
      if (active.current === controller)
        setState({ status: "success", data, query });
    } catch {
      if (active.current === controller)
        setState({
          status: "error",
          messages: [
            "Não foi possível comunicar com a API. Confira a conexão e tente novamente.",
          ],
        });
    } finally {
      window.clearTimeout(timeout);
    }
  }
  return { state, search };
}
