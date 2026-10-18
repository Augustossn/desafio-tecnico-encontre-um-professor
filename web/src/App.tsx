import { useState } from "react";
import { motion } from "motion/react";
import { DEFAULT_QUERY, type SearchQuery } from "./types";
import { useTeacherSearch } from "./useTeacherSearch";
import { SearchForm } from "./SearchForm";
import { Results } from "./Results";
import { Icon } from "./Icon";

export function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const { state, search } = useTeacherSearch();
  function searchWith(next: SearchQuery) {
    setQuery(next);
    void search(next);
  }
  function editSearch(previous: SearchQuery, field: "idioma" | "dias") {
    setQuery(previous);
    // Restore the criteria that produced this result before moving keyboard focus.
    requestAnimationFrame(() => {
      const selector =
        field === "dias"
          ? ".day-options input"
          : ".language-option input:checked";
      const input = document.querySelector<HTMLInputElement>(selector);
      input?.scrollIntoView({ behavior: "instant", block: "center" });
      input?.focus({ preventScroll: true });
    });
  }
  return (
    <div className="app-shell">
      <a href="#search" className="skip-link">
        Ir para a busca
      </a>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Língua, início">
          <span className="brand-mark">
            l<span>í</span>
          </span>
          língua<span className="brand-dot">®</span>
        </a>
        <div className="sidebar-content">
          <p className="nav-label">SEU ESPAÇO DE APRENDER</p>
          <a className="nav-item active" href="#search">
            <Icon name="search" size={18} />
            Encontrar professor<span>↗</span>
          </a>
          <div className="sidebar-line" />
          <div className="sidebar-manifesto">
            <span className="manifesto-star">✳</span>
            <p>
              Novas palavras.
              <br />
              Outras perspectivas.
              <br />
              <em>Mais possibilidades.</em>
            </p>
          </div>
        </div>
        <div className="sidebar-bottom">
          <span className="sidebar-status">
            <i /> O mundo está esperando.
          </span>
          <p>Um encontro pode mudar tudo.</p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Seu aprendizado <Icon name="chevron" size={12} />
            <strong>Encontre sua conexão</strong>
          </span>
          <a href="#how-it-works">
            Como funciona
            <Icon name="arrow" size={14} />
          </a>
        </header>
        <main>
          <motion.section
            className="hero"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="hero-copy">
              <p className="eyebrow">
                <span /> UM NOVO IDIOMA. NOVAS POSSIBILIDADES.
              </p>
              <h1>
                Seu mundo,
                <br />
                em{" "}
                <span>
                  outras palavras
                  <svg
                    viewBox="0 0 400 20"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path d="M3 12Q180-5 395 10M20 17Q220 5 370 16" />
                  </svg>
                </span>
                .
              </h1>
              <p>
                O professor certo. O horário que funciona.
                <br />O primeiro passo para ir mais longe.
              </p>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-grid" />
              <div className="hero-orbit" />
              <span className="hero-asterisk">✳</span>
              <div className="speech speech-dark">
                hello<span>↗</span>
              </div>
              <div className="speech speech-orange">
                hola<span>✦</span>
              </div>
              <div className="speech speech-white">
                bonjour<span>↗</span>
              </div>
            </div>
          </motion.section>
          <div className="workspace" id="search">
            <SearchForm
              query={query}
              onChange={setQuery}
              onSearch={() => void search(query)}
              loading={state.status === "loading"}
            />
            <Results state={state} onSearch={searchWith} onEdit={editSearch} />
          </div>
          <section className="how-it-works" id="how-it-works">
            <div>
              <span className="eyebrow">SIMPLES DESDE O COMEÇO</span>
              <h2>Mais conexão. Menos complicação.</h2>
            </div>
            <div className="how-step">
              <span>01</span>
              <p>
                <strong>Escolha seu idioma</strong>Uma nova forma de ver o
                mundo.
              </p>
            </div>
            <div className="how-step">
              <span>02</span>
              <p>
                <strong>Encontre seu ritmo</strong>Dias e horários que cabem na
                vida.
              </p>
            </div>
            <div className="how-step">
              <span>03</span>
              <p>
                <strong>Conheça as possibilidades</strong>Professores com
                horários em comum.
              </p>
            </div>
          </section>
          <footer>
            <span className="footer-brand">língua®</span>
            <p>O mundo começa com uma conversa.</p>
            <span>
              Feito para conectar <Icon name="spark" size={13} />
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
