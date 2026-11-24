"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Download,
  Flame,
  GitBranch,
  GitCommitHorizontal,
  Github,
  Heart,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Moon,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {
  analyze,
  breakdown,
  commitOfMonth,
  filterCommits,
  timeline,
} from "@/lib/sentiment";
import { MOODS, type Repository, type AnalyzedCommit } from "@/lib/types";
import { makeDemo } from "@/lib/demo";
import { exportCard, exportJSON } from "@/lib/export";
const Chart = dynamic(() => import("./timeline-chart"), {
  ssr: false,
  loading: () => <div className="chart skeleton" />,
});
const STORAGE = "codemood.repositories.v1";
type Tab = "overview" | "compare" | "highlights" | "about";
const nav = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "compare", label: "Comparar projetos", icon: BarChart3 },
  { id: "highlights", label: "Melhores commits", icon: Sparkles },
  { id: "about", label: "Como funciona", icon: BookOpen },
] as const;
function Badge({ commit }: { commit: AnalyzedCommit }) {
  const mood = MOODS[commit.mood];
  return (
    <span
      className="badge"
      style={{ color: mood.color, background: `${mood.color}15` }}
    >
      {mood.emoji} {mood.label}
    </span>
  );
}
function safeSaved(value: unknown): value is Repository[] {
  return (
    Array.isArray(value) &&
    value.length <= 8 &&
    value.every(
      (r) =>
        r &&
        typeof r.name === "string" &&
        typeof r.branch === "string" &&
        !r.demo &&
        Array.isArray(r.commits) &&
        r.commits.length <= 500 &&
        r.commits.every(
          (c: Record<string, unknown>) =>
            ["sha", "message", "date", "author", "repo"].every(
              (k) => typeof c[k] === "string",
            ) && !Number.isNaN(Date.parse(c.date as string)),
        ),
    )
  );
}
export default function Dashboard() {
  const [repos, setRepos] = useState<Repository[]>([]),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState<Tab>("overview"),
    [selected, setSelected] = useState("all"),
    [period, setPeriod] = useState<"week" | "month">("week"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [author, setAuthor] = useState(""),
    [mood, setMood] = useState("all"),
    [showFilters, setShowFilters] = useState(false),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [theme, setTheme] = useState("dark"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [repoInput, setRepoInput] = useState(""),
    [branch, setBranch] = useState(""),
    [session, setSession] = useState<{
      configured: boolean;
      login: string | null;
    }>({ configured: false, login: null }),
    [month, setMonth] = useState(""),
    [detail, setDetail] = useState<AnalyzedCommit | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    detailDialog = useRef<HTMLDialogElement>(null),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    let initial = makeDemo();
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const data = JSON.parse(raw);
        if (safeSaved(data) && data.length) initial = data;
      }
      const saved = localStorage.getItem("codemood.theme");
      if (saved === "light") setTheme("light");
    } catch {
      /* Storage may be disabled. */
    }
    setRepos(initial);
    setReady(true);
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(setSession)
      .catch(() => {});
    if (new URLSearchParams(location.search).get("auth") === "error") {
      setNotice(
        "Não foi possível conectar ao GitHub. Você ainda pode analisar repositórios públicos.",
      );
      history.replaceState(null, "", location.pathname);
    }
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("codemood.theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        STORAGE,
        JSON.stringify(repos.filter((r) => !r.demo)),
      );
    } catch {
      setNotice(
        "Não foi possível salvar neste navegador. Sua análise continua disponível nesta sessão.",
      );
    }
  }, [repos, ready]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  const all = useMemo(
    () => repos.flatMap((r) => r.commits.map(analyze)),
    [repos],
  );
  const commits = useMemo(
    () =>
      filterCommits(
        all.filter((c) => selected === "all" || c.repo === selected),
        from,
        to,
        author,
        mood,
      ).sort((a, b) => b.date.localeCompare(a.date)),
    [all, selected, from, to, author, mood],
  );
  const dist = useMemo(() => breakdown(commits), [commits]);
  const positive = commits.filter((c) => c.score > 0).length,
    negative = commits.filter((c) => c.score < 0).length,
    chaotic = commits.filter((c) => c.mood === "chaotic").length;
  const percent = (n: number) =>
    commits.length ? Math.round((n / commits.length) * 100) : 0;
  const months = [...new Set(commits.map((c) => c.date.slice(0, 7)))]
    .sort()
    .reverse();
  const activeMonth = months.includes(month) ? month : months[0] || "";
  const winner = commitOfMonth(commits, activeMonth);
  const searched = commits.filter((c) =>
    (c.message + " " + c.author + " " + c.sha)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const paged = searched.slice((page - 1) * 10, page * 10);
  useEffect(() => setPage(1), [selected, from, to, author, mood, query, repos]);
  const demo = repos.some((r) => r.demo);
  const activeFilters = Boolean(from || to || author || mood !== "all");
  function resetFilters() {
    setFrom("");
    setTo("");
    setAuthor("");
    setMood("all");
  }
  function openImport() {
    setError("");
    dialog.current?.showModal();
  }
  function closeImport() {
    controller.current?.abort();
    setLoading(false);
    dialog.current?.close();
  }
  async function importRepo(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    controller.current = new AbortController();
    try {
      const res = await fetch(
        "/api/commits?" + new URLSearchParams({ repo: repoInput, branch }),
        { signal: controller.current.signal },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRepos((prev) => {
        const real = prev.filter((r) => !r.demo && r.name !== data.name);
        return [...real.slice(-7), data];
      });
      setSelected(data.name);
      resetFilters();
      setTab("overview");
      setQuery("");
      dialog.current?.close();
      setNotice(`${data.commits.length} commits importados de ${data.name}.`);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function card(c?: AnalyzedCommit) {
    try {
      await exportCard(
        commits,
        selected === "all" ? "Todos os projetos" : selected,
        c,
      );
      setNotice("Cartão PNG exportado!");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function showDetail(c: AnalyzedCommit) {
    setDetail(c);
    detailDialog.current?.showModal();
  }
  function removeRepo(name: string) {
    setRepos((prev) => prev.filter((r) => r.name !== name));
    if (selected === name) setSelected("all");
    setNotice("Projeto removido deste navegador.");
  }
  const highlights = [...commits]
    .filter((c) => c.intensity > 0)
    .sort((a, b) => b.intensity - a.intensity || b.date.localeCompare(a.date))
    .slice(0, 12);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="CodeMood início">
          <img src="/icon.svg" alt="" width="38" height="38" />
          <span>
            Code<span className="brand-light">Mood</span>
            <small>YOUR CODE HAS FEELINGS.</small>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">
            <Code2 size={19} />
          </span>
          <div>
            Meu workspace<small>Um commit de cada vez</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="nav-label">EXPLORAR</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "nav-item active" : "nav-item"}
              onClick={() => setTab(n.id)}
              aria-current={tab === n.id ? "page" : undefined}
            >
              <n.icon size={18} />
              {n.label}
              {n.id === "highlights" && <span className="nav-new">✦</span>}
            </button>
          ))}
        </nav>
        <div className="repo-heading">
          <p className="nav-label">REPOSITÓRIOS</p>
          <button
            className="icon-button"
            aria-label="Adicionar repositório"
            onClick={openImport}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="repo-list">
          {repos.map((r, i) => (
            <div className="repo-item" key={r.name}>
              <button
                className={selected === r.name ? "selected" : ""}
                onClick={() => {
                  setSelected(r.name);
                  setTab("overview");
                }}
              >
                <span
                  className="repo-dot"
                  style={{ background: i % 2 ? "#83d9b4" : "#b69aff" }}
                />
                {r.name.split("/")[1]}
                {r.demo && <small>demo</small>}
              </button>
              <button
                className="remove-repo"
                aria-label={`Remover ${r.name}`}
                onClick={() => removeRepo(r.name)}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Heart size={19} />
            <strong>Você é mais que seu código.</strong>
            <p>Até os melhores projetos têm dias de “depois eu arrumo”.</p>
          </div>
          <a
            className="source-link"
            href="https://github.com/allyxzs/codemood"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={17} />
            CodeMood no GitHub
            <ArrowUpRight size={14} />
          </a>
          <div className="version">
            FEITO PARA HUMANOS QUE PROGRAMAM <span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>{nav.find((n) => n.id === tab)?.label}</strong>
          </div>
          <div className="top-actions">
            <span className="local-label">
              {demo ? "Dados demonstrativos" : "Salvo neste navegador"}
            </span>
            <button
              className="icon-button theme-toggle"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {session.login ? (
              <button
                className="button small"
                onClick={async () => {
                  try {
                    const r = await fetch("/api/auth/logout", {
                      method: "POST",
                    });
                    if (!r.ok) throw new Error();
                    setSession((s) => ({ ...s, login: null }));
                  } catch {
                    setNotice("Não foi possível encerrar a sessão.");
                  }
                }}
              >
                <LogOut size={15} />
                {session.login}
              </button>
            ) : (
              <button
                className="button small"
                onClick={() => {
                  if (session.configured) location.href = "/api/auth/login";
                  else
                    setNotice(
                      "OAuth opcional: configure as variáveis do .env.example. Você já pode importar repositórios públicos por URL.",
                    );
                }}
              >
                <Github size={16} />
                Conectar GitHub
              </button>
            )}
          </div>
        </header>
        <main>
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> THE HUMAN SIDE OF GIT
              </div>
              <h1>
                {tab === "compare"
                  ? "Projetos diferentes. Outras histórias."
                  : tab === "highlights"
                    ? "Pequenos commits. Grandes emoções."
                    : tab === "about"
                      ? "Por trás de cada sentimento."
                      : "Seu código conta uma história."}
              </h1>
              <p>
                {tab === "overview"
                  ? "Entre bugs, conquistas e cafés. Descubra o tom da sua jornada."
                  : tab === "compare"
                    ? "Compare o tom das mensagens dos seus projetos no mesmo período."
                    : tab === "highlights"
                      ? "As mensagens que merecem um lugar na retrospectiva."
                      : "Uma leitura divertida da linguagem. Com transparência em cada resultado."}
              </p>
            </div>
            <button className="button primary" onClick={openImport}>
              <Plus size={17} />
              Analisar repositório
            </button>
          </section>
          {demo && (
            <div className="demo-banner">
              <span className="demo-tag">DEMO</span>
              <p>
                Uma jornada de exemplo para você explorar.{" "}
                <strong>A sua começa com um repositório.</strong>
              </p>
              <button onClick={openImport}>
                Usar meus commits <Plus size={15} />
              </button>
            </div>
          )}
          {tab !== "about" && (
            <>
              <div className="toolbar">
                <div className="select-wrap">
                  <GitBranch size={16} />
                  <select
                    aria-label="Repositório"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="all">Todos os projetos</option>
                    {repos.map((r) => (
                      <option key={r.name}>{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
                <button
                  className={`button filter-button ${showFilters ? "is-active" : ""}`}
                  onClick={() => setShowFilters(!showFilters)}
                  aria-expanded={showFilters}
                >
                  <SlidersHorizontal size={16} />
                  Filtros{activeFilters && <span className="filter-dot" />}
                </button>
                <div className="toolbar-spacer" />
                <span className="period-label">
                  {commits.length
                    ? `${commits.at(-1)!.date.slice(0, 10)} — ${commits[0].date.slice(0, 10)}`
                    : "Sem commits no período"}
                </span>
                <button
                  className="button"
                  disabled={!commits.length}
                  onClick={() => card()}
                >
                  <Download size={16} />
                  Exportar cartão
                </button>
              </div>
              {showFilters && (
                <div className="filter-panel">
                  <label>
                    De
                    <input
                      type="date"
                      value={from}
                      max={to || undefined}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </label>
                  <label>
                    Até
                    <input
                      type="date"
                      value={to}
                      min={from || undefined}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </label>
                  <label>
                    Autor
                    <input
                      placeholder="Nome ou login"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                    />
                  </label>
                  <label>
                    Humor
                    <select
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                    >
                      <option value="all">Todos os humores</option>
                      {Object.entries(MOODS).map(([key, m]) => (
                        <option value={key} key={key}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="text-button" onClick={resetFilters}>
                    Limpar filtros
                  </button>
                </div>
              )}
              {repos
                .filter(
                  (r) =>
                    r.truncated && (selected === "all" || selected === r.name),
                )
                .map((r) => (
                  <p className="limit-note" key={r.name}>
                    {r.name}: exibindo os 500 commits mais recentes da branch{" "}
                    {r.branch}. As porcentagens se referem a essa amostra.
                  </p>
                ))}
            </>
          )}
          {tab === "overview" && (
            <>
              <section className="stats-grid">
                {[
                  {
                    label: "Commits analisados",
                    value: commits.length,
                    sub: "Cada mensagem, um pedacinho da jornada",
                    icon: GitCommitHorizontal,
                    color: "#b69aff",
                  },
                  {
                    label: "Boas vibrações",
                    value: `${percent(positive)}%`,
                    sub: `${positive} commits felizes ou orgulhosos`,
                    icon: Sparkles,
                    color: "#83d9b4",
                  },
                  {
                    label: "Dias difíceis",
                    value: `${percent(negative)}%`,
                    sub: `${negative} commits frustrados ou cansados`,
                    icon: Moon,
                    color: "#85b7f6",
                  },
                  {
                    label: "Energia caótica",
                    value: `${percent(chaotic)}%`,
                    sub: `${chaotic} momentos “depois eu arrumo”`,
                    icon: Flame,
                    color: "#f6c777",
                  },
                ].map((s) => (
                  <article className="stat-card" key={s.label}>
                    <div>
                      <span>{s.label}</span>
                      <s.icon size={18} color={s.color} />
                    </div>
                    <strong>{s.value}</strong>
                    <p>{s.sub}</p>
                  </article>
                ))}
              </section>
              <div className="charts-grid">
                <section className="panel timeline-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        Sua linha do tempo emocional <Activity size={17} />
                      </h2>
                      <p>O tom das mensagens, ao longo do caminho.</p>
                    </div>
                    <div className="segmented">
                      <button
                        className={period === "week" ? "chosen" : ""}
                        onClick={() => setPeriod("week")}
                      >
                        Semana
                      </button>
                      <button
                        className={period === "month" ? "chosen" : ""}
                        onClick={() => setPeriod("month")}
                      >
                        Mês
                      </button>
                    </div>
                  </div>
                  {commits.length ? (
                    <Chart commits={commits} period={period} />
                  ) : (
                    <div className="empty">
                      <Activity />
                      <h3>Nenhuma história por aqui. Ainda.</h3>
                      <p>Importe um projeto ou ajuste seus filtros.</p>
                      <button
                        className="button"
                        onClick={activeFilters ? resetFilters : openImport}
                      >
                        {activeFilters ? "Limpar filtros" : "Adicionar projeto"}
                      </button>
                    </div>
                  )}
                  <div className="chart-footer">
                    <span>
                      <i className="legend-dot" />
                      Tom médio das mensagens
                    </span>
                    <small>
                      −100 negativo · 0 neutro/caótico · +100 positivo
                    </small>
                  </div>
                </section>
                <section className="panel breakdown-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Um pouco de tudo</h2>
                      <p>Seu mix de sentimentos.</p>
                    </div>
                    <span className="tiny-icon">◔</span>
                  </div>
                  <div className="mood-bar" aria-hidden="true">
                    {dist.map((b) => (
                      <span
                        key={b.mood}
                        style={{ width: `${b.percent}%`, background: b.color }}
                      />
                    ))}
                  </div>
                  <div className="mood-list">
                    {dist.map((b) => (
                      <button
                        className="mood-row"
                        key={b.mood}
                        onClick={() => {
                          setMood(mood === b.mood ? "all" : b.mood);
                          setShowFilters(true);
                        }}
                      >
                        <span>
                          <i style={{ background: b.color }} />
                          {b.label}
                        </span>
                        <small>{b.count} commits</small>
                        <strong>{Math.round(b.percent)}%</strong>
                      </button>
                    ))}
                  </div>
                  <p className="panel-footnote">
                    Todo humor faz parte do processo.
                  </p>
                </section>
              </div>
              <section className="month-card">
                <div className="month-icon">✦</div>
                <div className="month-content">
                  <div className="month-heading">
                    <span>COMMIT DO MÊS</span>
                    <select
                      aria-label="Mês do destaque"
                      value={activeMonth}
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      {months.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  {winner ? (
                    <>
                      <h3>“{winner.message.split("\n")[0]}”</h3>
                      <div className="commit-meta">
                        <code>{winner.sha.slice(0, 7)}</code>
                        <span>{winner.repo}</span>
                        <Badge commit={winner} />
                      </div>
                    </>
                  ) : (
                    <h3>Nenhuma expressão emocional identificada neste mês.</h3>
                  )}
                </div>
                <button
                  className="button"
                  disabled={!winner}
                  onClick={() => winner && card(winner)}
                >
                  <Download size={16} />
                  Guardar esse momento
                </button>
              </section>
              <section className="panel commits-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      O diário dos seus commits{" "}
                      <span className="count-pill">{searched.length}</span>
                    </h2>
                    <p>Os bastidores que o código não mostra.</p>
                  </div>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Buscar commits"
                      placeholder="Buscar mensagem, autor, SHA…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Mensagem</th>
                        <th>Humor</th>
                        <th>Autor</th>
                        <th>Data (UTC)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((c) => (
                        <tr key={c.repo + c.sha}>
                          <td>
                            <button
                              className="commit-message"
                              onClick={() => showDetail(c)}
                            >
                              <code>{c.sha.slice(0, 7)}</code>
                              <span>{c.message.split("\n")[0]}</span>
                            </button>
                            <small className="commit-repo">{c.repo}</small>
                          </td>
                          <td>
                            <Badge commit={c} />
                          </td>
                          <td>{c.author}</td>
                          <td className="date-cell">
                            {new Date(c.date).toLocaleDateString("pt-BR", {
                              timeZone: "UTC",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!paged.length && (
                  <p className="empty-small">
                    Nenhum commit corresponde à busca.
                  </p>
                )}
                <div className="table-footer">
                  <button
                    className="text-button"
                    disabled={!commits.length}
                    onClick={() => exportJSON(commits)}
                  >
                    <Download size={14} />
                    Exportar JSON
                  </button>
                  <span>
                    {page} / {Math.max(1, Math.ceil(searched.length / 10))}
                  </span>
                  <button
                    className="button small"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="button small"
                    disabled={page * 10 >= searched.length}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </section>
            </>
          )}
          {tab === "compare" && (
            <section className="comparison-grid">
              {repos
                .filter((r) => selected === "all" || r.name === selected)
                .map((r) => {
                  const list = filterCommits(
                      r.commits.map(analyze),
                      from,
                      to,
                      author,
                      mood,
                    ),
                    d = breakdown(list),
                    dominant = [...d].sort((a, b) => b.count - a.count)[0];
                  return (
                    <article className="panel comparison-card" key={r.name}>
                      <div className="panel-heading">
                        <div>
                          <h2>
                            <GitBranch size={17} />
                            {r.name}
                          </h2>
                          <p>
                            {r.branch} · {list.length} commits{" "}
                            {r.demo ? "· demonstração" : ""}
                          </p>
                        </div>
                      </div>
                      {list.length ? (
                        <>
                          <Chart commits={list} period="week" />
                          <div className="compare-summary">
                            <span>Tom mais frequente</span>
                            <strong style={{ color: dominant.color }}>
                              {dominant.label} · {Math.round(dominant.percent)}%
                            </strong>
                          </div>
                          {d.map((b) => (
                            <div className="compare-bar" key={b.mood}>
                              <span>{b.label}</span>
                              <div>
                                <i
                                  style={{
                                    width: `${b.percent}%`,
                                    background: b.color,
                                  }}
                                />
                              </div>
                              <strong>{Math.round(b.percent)}%</strong>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="empty-small">Sem commits neste filtro.</p>
                      )}
                    </article>
                  );
                })}
              {repos.length < 2 && (
                <article className="panel empty">
                  <BarChart3 />
                  <h3>Dê outra perspectiva à sua história.</h3>
                  <p>Adicione um segundo repositório para comparar.</p>
                  <button className="button primary" onClick={openImport}>
                    <Plus size={16} />
                    Adicionar repositório
                  </button>
                </article>
              )}
            </section>
          )}
          {tab === "highlights" && (
            <div className="highlights-grid">
              {highlights.map((c) => (
                <article className="panel highlight-card" key={c.repo + c.sha}>
                  <Badge commit={c} />
                  <h2>“{c.message.split("\n")[0]}”</h2>
                  <p>
                    {c.repo} · {c.date.slice(0, 10)}
                  </p>
                  <div className="highlight-actions">
                    <button
                      className="text-button"
                      onClick={() => showDetail(c)}
                    >
                      Por que esse humor?
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Exportar ${c.sha.slice(0, 7)}`}
                      onClick={() => card(c)}
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </article>
              ))}
              {!highlights.length && (
                <div className="panel empty">
                  <Sparkles />
                  <h3>Nenhum destaque neste recorte.</h3>
                  <p>
                    Mensagens técnicas sem expressões emocionais ficam neutras.
                  </p>
                </div>
              )}
            </div>
          )}
          {tab === "about" && (
            <div className="about-grid">
              <article className="panel about-card">
                <span className="about-icon">
                  <Code2 />
                </span>
                <h2>Linguagem, não leitura da mente.</h2>
                <p>
                  CodeMood identifica expressões em português e inglês.
                  “Finalmente” sugere felicidade; “WIP” sugere caos; “fix”
                  sozinho permanece neutro.
                </p>
                <p>
                  Uma mensagem pode ser uma piada, ironia ou um hábito de
                  escrita. O resultado não mede saúde mental, produtividade ou
                  burnout, e não deve avaliar pessoas.
                </p>
                <h3>Como a pontuação funciona</h3>
                <p>
                  Feliz e orgulhoso: +1. Frustrado: −1. Cansado: −0,7. Neutro e
                  caótico: 0. A linha mostra a média por semana ou mês,
                  multiplicada por 100. Intervalos sem commits não recebem uma
                  pontuação inventada; a linha conecta períodos com dados.
                </p>
                <p>
                  O humor com maior peso de expressões vence. A intensidade
                  conta os pesos, não representa confiança estatística. O commit
                  do mês é o de maior intensidade no mês selecionado, com
                  desempate pelo mais recente.
                </p>
              </article>
              <article className="panel about-card">
                <span className="about-icon">
                  <Github />
                </span>
                <h2>Seus dados, sua retrospectiva.</h2>
                <p>
                  A importação consulta a API oficial do GitHub. Até 500 commits
                  por repositório, na branch selecionada. Filtros de data e
                  autor atuam sobre essa amostra, em UTC.
                </p>
                <p>
                  Os projetos ficam no armazenamento deste navegador, com até
                  oito repositórios. Não há banco de dados nem envio a modelos
                  de IA. OAuth é opcional e usa somente o escopo read:user; esta
                  versão analisa repositórios públicos.
                </p>
                <p>
                  Exportar cria um arquivo no seu dispositivo. Nenhum cartão é
                  publicado automaticamente. Revise as mensagens antes de
                  compartilhar.
                </p>
                <button
                  className="button"
                  onClick={() => {
                    setRepos([]);
                    setSelected("all");
                    resetFilters();
                    setNotice("Projetos locais apagados.");
                  }}
                >
                  <Trash2 size={16} />
                  Apagar projetos locais
                </button>
                <button
                  className="text-button demo-reset"
                  onClick={() => {
                    setRepos(makeDemo());
                    setSelected("all");
                    resetFilters();
                    setTab("overview");
                  }}
                >
                  Reabrir demonstração (substitui projetos locais)
                </button>
              </article>
            </div>
          )}
          <footer>
            <span>
              <img src="/icon.svg" width="19" height="19" alt="" />
              CodeMood <span className="footer-dot">·</span> Código tem
              história. Você também.
            </span>
            <small>Análise de linguagem, não diagnóstico emocional.</small>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button
            className="icon-button"
            onClick={() => setNotice("")}
            aria-label="Fechar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        onCancel={() => {
          controller.current?.abort();
          setLoading(false);
        }}
        className="modal"
      >
        <form onSubmit={importRepo}>
          <div className="modal-heading">
            <span className="about-icon">
              <GitBranch />
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar importação"
              onClick={closeImport}
            >
              <X />
            </button>
          </div>
          <h2>Qual história vamos descobrir?</h2>
          <p>
            Cole a URL de um repositório público do GitHub. Vamos ler até 500
            commits da branch escolhida.
          </p>
          <label>
            Repositório
            <input
              autoFocus
              required
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="https://github.com/owner/repository"
              maxLength={240}
            />
          </label>
          <label>
            Branch <span>(opcional)</span>
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Padrão do repositório"
              maxLength={200}
            />
          </label>
          <p className="form-note">
            Sem token? Sem problema. O GitHub aplica limites de requisição;
            conectar sua conta pode ampliar a cota.
          </p>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <button className="button primary full" disabled={loading}>
            {loading ? (
              <>
                <LoaderCircle className="spin" size={18} />
                Lendo sua jornada…
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Analisar commits
              </>
            )}
          </button>
        </form>
      </dialog>
      <dialog ref={detailDialog} className="modal detail-modal">
        <div className="modal-heading">
          <h2>Por trás da mensagem</h2>
          <button
            className="icon-button"
            aria-label="Fechar detalhes"
            onClick={() => detailDialog.current?.close()}
          >
            <X />
          </button>
        </div>
        {detail && (
          <>
            <Badge commit={detail} />
            <pre>{detail.message}</pre>
            <p>
              {detail.repo} · {detail.author} · {detail.date.slice(0, 10)}
            </p>
            <h3>Expressões identificadas</h3>
            <div className="evidence">
              {detail.matches.length ? (
                detail.matches.map((m) => <code key={m}>{m}</code>)
              ) : (
                <p>Sem correspondência explícita. Classificação neutra.</p>
              )}
            </div>
            <p>
              Intensidade: {detail.intensity} pontos de expressões. Essa leitura
              pode não refletir a intenção de quem escreveu.
            </p>
            <div className="modal-actions">
              <button className="button primary" onClick={() => card(detail)}>
                <Download size={16} />
                Exportar cartão
              </button>
              {detail.url?.startsWith("https://github.com/") && (
                <a
                  className="button"
                  href={detail.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver commit
                  <ArrowUpRight size={15} />
                </a>
              )}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
