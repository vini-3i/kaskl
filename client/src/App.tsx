import React, { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  AlertCircle,
  Backpack,
  BarChart3,
  Box,
  ChevronLeft,
  Edit3,
  ExternalLink,
  Eye,
  Lock,
  MousePointerClick,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UsersRound,
  Bell,
  Download,
  Settings,
  Wand2,
  CalendarClock,
  BadgeCheck,
  FileText,
} from "lucide-react";
import "./index.css";
const API = "/api";
type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  short_description: string;
  description: string;
  image_url?: string;
  old_price?: number | null;
  price?: number | null;
  checkout_url: string;
  active: boolean;
  featured: boolean;
  badge?: string | null;
  scheduled_at?: string | null;
  score?: string;
  views: number;
  clicks: number;
  checkout_clicks?: number;
  created_at?: string;
  updated_at?: string;
};
type ChangeLog = {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
};
type Dash = {
  totals: {
    products: number;
    active: number;
    inactive: number;
    views: number;
    clicks: number;
    checkoutClicks: number;
  };
  topViews: Product[];
  topClicks: Product[];
  recent: Product[];
  lowPerformance?: Product[];
  activity?: ChangeLog[];
  traffic?: {source:string; views:number; checkout:number}[];
};
const emptyForm = {
  name: "",
  slug: "",
  category: "Eletrônicos",
  short_description: "",
  description: "",
  image_url: "",
  old_price: "",
  price: "",
  checkout_url: "",
  active: true,
  featured: false,
  badge: "Oferta",
  scheduled_at: "",
};
function money(v?: number | null) {
  return typeof v === "number"
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v)
    : "";
}
function priceLabel(v?: number | null) {
  return typeof v === 'number' ? money(v) : 'Preço no checkout';
}
function dateBR(v?: string) {
  return v
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(v))
    : "";
}
function num(v: any) {
  return Number(v || 0).toLocaleString("pt-BR");
}
async function req(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("token");
  let r: Response;
  try {
    r = await fetch(API + path, {
      credentials: "include",
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "API offline. Confirme se o backend está rodando em http://localhost:3001 e reinicie com npm run dev.",
    );
  }
  const data = await r.json().catch(() => ({ message: "Erro inesperado" }));
  if (!r.ok) throw new Error(data.message || "Erro");
  return data;
}
function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-black text-green-500">
          Kaskl Vendas
        </Link>
        <nav className="flex text-sm font-semibold items-center gap-6 justify-center">
          <Link to="/" className="hover:text-green-400">
            Produtos
          </Link>
          <Link
            to="/novidades"
            className="hover:text-green-400 border border-green-500/20 rounded-xl p-3 items-center flex text-green-400 font-black text-sm hover:bg-green-500/10 transition"
          >
            <UsersRound className="inline-block" size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
function EmptyProducts() {
  return (
    <div className="glass rounded-3xl p-10 text-center">
      <Box className="mx-auto text-green-500" size={42} />
      <h2 className="mt-4 text-2xl font-black">
        Nenhum produto disponível no momento
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-white/60">
        Ainda não há produtos cadastrados para venda. Volte em breve para
        conferir novas ofertas selecionadas.
      </p>
    </div>
  );
}
function Home() {
  const [items, setItems] = useState<Product[]>([]),
    [q, setQ] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let ok = true;
    setLoading(true);
    req("/products?q=" + encodeURIComponent(q))
      .then((d) => ok && setItems(d))
      .catch(() => ok && setItems([]))
      .finally(() => ok && setLoading(false));
    return () => {
      ok = false;
    };
  }, [q]);
  const has = items.length > 0;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-green-500/20 bg-gradient-to-br from-green-600/25 via-white/5 to-black p-8 text-center shadow-2xl md:p-14">
        <p className="font-extrabold uppercase tracking-wide text-green-400">
          🔥 Ofertas selecionadas
        </p>
        <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
          Encontre produtos com preço especial e compra rápida
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          Veja os detalhes do produto, confira o preço e finalize sua compra
          pelo botão de oferta.
        </p>
        <div className="mx-auto mt-7 flex max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-3">
          <Search className="text-white/50" size={20} />
          <input
            className="w-full bg-transparent text-base outline-none"
            placeholder="Buscar produto, categoria ou oferta..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </section>
      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Produtos disponíveis</h2>
            <p className="text-sm text-white/55">
              Escolha uma oferta e veja todos os detalhes antes de comprar.
            </p>
          </div>
          {has && (
            <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm font-bold text-green-300">
              {items.length} item(ns)
            </span>
          )}
        </div>
        {loading ? (
          <p className="py-12 text-center text-white/60">
            Carregando ofertas...
          </p>
        ) : !has ? (
          <EmptyProducts />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link
                key={p.id}
                to={`/p/${p.slug}`}
                className="glass group overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:border-green-500/60"
              >
                <div className="h-48 bg-white/5">
                  <img
                    src={p.image_url || "/icon.svg"}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2"><span className="text-xs font-black uppercase text-green-400">{p.category}</span>{p.badge && <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-green-300">{p.badge}</span>}</div>
                  <h3 className="mt-2 text-xl font-black">{p.name}</h3>
                  <p className="mt-2 min-h-12 text-sm text-white/65">
                    {p.short_description}
                  </p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      {p.old_price && (
                        <p className="text-sm text-white/40 line-through">
                          {money(p.old_price)}
                        </p>
                      )}
                      <p className="text-3xl font-black text-green-500">
                        {priceLabel(p.price)}
                      </p>
                    </div>
                    <span className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black uppercase">
                      Ver oferta
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
function ProductPage() {
  const { slug } = useParams();
  const [p, setP] = useState<Product | null>(null),
    [err, setErr] = useState("");
  useEffect(() => {
    setErr("");
    req("/products/" + slug)
      .then(setP)
      .catch((e) => setErr(e.message));
  }, [slug]);
  if (err)
    return (
      <main className="mx-auto max-w-3xl p-10 text-center">
        <AlertCircle className="mx-auto text-red-300" />
        <h1 className="mt-3 text-2xl font-black">Produto não encontrado</h1>
        <p className="mt-2 text-white/60">{err}</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-xl bg-green-600 px-5 py-3 font-bold"
        >
          Voltar aos produtos
        </Link>
      </main>
    );
  if (!p)
    return (
      <main className="p-10 text-center text-white/60">
        Carregando produto...
      </main>
    );
  async function click() {
    try {
      await req("/products/" + p!.slug + "/click", { method: "POST" });
    } finally {
      location.href = p!.checkout_url;
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2">
      <Link
        to="/"
        className="md:hidden flex text-sm font-black text-white items-center text-center bg-white/10 hover:text-green-400 hover:bg-green-400/10 px-6 py-2 rounded-xl transition"
      >
        <ChevronLeft className="inline-block mr-2" size={16} /> Voltar
      </Link>
      <img
        src={p.image_url || "/icon.svg"}
        className="h-[420px] w-full rounded-3xl border border-white/10 object-cover"
      />
      <section className="glass rounded-3xl p-7">
        <div className="flex justify-between items-center gap-2 mb-12">
          <Link
            to="/"
            className="hidden md:flex text-sm font-black text-white items-center text-center hover:text-green-400 hover:bg-green-400/10 px-6 py-2 rounded-xl transition"
          >
            <ChevronLeft className="inline-block mr-2" size={16} /> Voltar
          </Link>
          <p className="font-black uppercase text-green-400">{p.category}</p>
        </div>
        <h1 className="mt-2 text-4xl font-black">{p.name}</h1>
        <div className="mt-8">
          {p.old_price && (
            <p className="text-white/45 line-through">{money(p.old_price)}</p>
          )}
          <p className="text-5xl font-black text-green-500">{priceLabel(p.price)}</p>
        </div>
        <button
          onClick={click}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 p-4 font-black uppercase hover:bg-green-500"
        >
          Comprar agora <ExternalLink size={18} />
        </button>
        <br className="my-8" />
        <p className="mt-4 whitespace-pre-wrap text-white/70">
          {p.description}
        </p>
      </section>
    </main>
  );
}
function News() {
  const [products, setProducts] = useState<Product[]>([]),
    [logs, setLogs] = useState<ChangeLog[]>([]),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([req("/products"), req("/changelog")])
      .then(([p, l]) => {
        setProducts(p);
        setLogs(l);
      })
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="glass rounded-3xl p-8">
        <Sparkles className="text-green-500" size={32} />
        <h1 className="mt-3 text-3xl font-black">Produtos recentes</h1>
        <p className="mt-3 max-w-3xl text-white/65">
          Acompanhe os produtos disponibilizados na loja e as melhorias feitas
          para deixar sua compra mais simples.
          <i className="text-white/45">
            {" "}
            (Clique no produto para ver detalhes e finalizar a compra)
          </i>
        </p>
      </section>
      {loading ? (
        <p className="py-10 text-center text-white/60">
          Carregando novidades...
        </p>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="mb-4 text-2xl font-black">
              Histórico de produtos postados
            </h2>
            {products.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-white/60">
                Nenhum produto foi postado ainda.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {products.map((p) => (
                  <Link
                    to={`/p/${p.slug}`}
                    key={p.id}
                    className="glass flex gap-4 rounded-3xl p-4 hover:border-green-500/50"
                  >
                    <img
                      src={p.image_url || "/icon.svg"}
                      className="h-24 w-24 rounded-2xl object-cover"
                    />
                    <div>
                      <p className="text-xs font-black uppercase text-green-400">
                        {p.category}
                      </p>
                      <h3 className="font-black">{p.name}</h3>
                      <p className="text-sm text-white/55">
                        Publicado em{" "}
                        {dateBR(p.created_at) || "data não informada"}
                      </p>
                      <p className="mt-1 font-black text-green-500">
                        {priceLabel(p.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
function Card({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/90">
      {icon}
      <h3 className="mt-3 font-black">{title}</h3>
      <p className="mt-2 text-sm text-white/60">{text}</p>
    </div>
  );
}
function AdminLoginEntry() {
  const nav = useNavigate();
  useEffect(() => {
    req("/admin/login-challenge")
      .then((r) => nav("/admin/login/" + r.token, { replace: true }))
      .catch((e) => alert(e.message));
  }, [nav]);
  return <main className="p-10 text-center">Gerando token seguro...</main>;
}
function AdminLogin() {
  const { token } = useParams();
  const nav = useNavigate();
  const [login, setLogin] = useState({ email: "", password: "" });
  const [time, setTime] = useState(10);
  const [err, setErr] = useState("");
  const inactive = useRef<number>();
  function refresh() {
    req("/admin/login-challenge")
      .then((r) => nav("/admin/login/" + r.token, { replace: true }))
      .catch((e) => setErr(e.message));
  }
  function resetIdle() {
    setTime(10);
    if (inactive.current) clearInterval(inactive.current);
    inactive.current = window.setInterval(
      () =>
        setTime((t) => {
          if (t <= 1) {
            refresh();
            return 10;
          }
          return t - 1;
        }),
      1000,
    );
  }
  useEffect(() => {
    resetIdle();
    const ev = ["mousemove", "keydown", "touchstart", "click"];
    ev.forEach((e) => addEventListener(e, resetIdle));
    return () => {
      ev.forEach((e) => removeEventListener(e, resetIdle));
      if (inactive.current) clearInterval(inactive.current);
    };
  }, [token]);
  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const r = await req("/auth/login", {
        method: "POST",
        body: JSON.stringify({ ...login, challenge: token }),
      });
      localStorage.setItem("token", r.token);
      nav(r.mustChangePassword ? "/admin/reset-password" : "/admin/dashboard", {
        replace: true,
      });
    } catch (e: any) {
      setErr(e.message);
      refresh();
    }
  }
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={doLogin} className="glass rounded-3xl p-6">
        <ShieldCheck className="text-green-500" />
        <h1 className="mt-3 text-2xl font-black">Login administrativo</h1>
        <p className="mt-2 text-sm text-white/60">
          Token da sessão: <b className="text-green-400">{token}</b>. Se ficar
          parado por 10 segundos, um novo token será gerado.
        </p>
        <div className="mt-4 h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-green-500"
            style={{ width: `${time * 10}%` }}
          />
        </div>
        <input
          className="mt-4 w-full rounded-xl bg-white/10 p-3 outline-none"
          placeholder="E-mail do administrador"
          value={login.email}
          onChange={(e) => setLogin({ ...login, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Senha"
          className="mt-3 w-full rounded-xl bg-white/10 p-3 outline-none"
          value={login.password}
          onChange={(e) => setLogin({ ...login, password: e.target.value })}
        />
        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 p-3 font-bold hover:bg-green-500">
          <Lock size={17} /> Entrar
        </button>
        <button
          type="button"
          onClick={refresh}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 p-3 text-sm"
        >
          <RefreshCw size={15} /> Gerar outro token
        </button>
      </form>
    </main>
  );
}
function ResetPassword() {
  const nav = useNavigate();
  const [p, setP] = useState(""),
    [msg, setMsg] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const r = await req("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword: p }),
      });
      localStorage.setItem("token", r.token);
      nav("/admin/dashboard", { replace: true });
    } catch (e: any) {
      setMsg(e.message);
    }
  }
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={save} className="glass rounded-3xl p-6">
        <Lock className="text-green-500" />
        <h1 className="mt-3 text-2xl font-black">Troca de senha obrigatória</h1>
        <p className="mt-2 text-sm text-white/60">
          Use 12+ caracteres com maiúscula, minúscula, número e símbolo.
        </p>
        <input
          type="password"
          className="mt-4 w-full rounded-xl bg-white/10 p-3 outline-none"
          placeholder="Nova senha forte"
          value={p}
          onChange={(e) => setP(e.target.value)}
        />
        {msg && <p className="mt-3 text-sm text-red-300">{msg}</p>}
        <button className="mt-4 w-full rounded-xl bg-green-600 p-3 font-bold">
          Salvar nova senha
        </button>
      </form>
    </main>
  );
}
function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[250px_1fr]">
      <aside className="glass h-fit rounded-3xl p-4 md:sticky md:top-24">
        <h2 className="mb-1 text-lg font-black text-green-400">Admin Kaskl</h2>
        <p className="mb-4 text-xs text-white/45">
          Gestão de produtos e métricas
        </p>
        <nav className="grid gap-2 text-sm font-bold">
          <Link
            className="rounded-xl bg-white/10 p-3 hover:bg-green-600"
            to="/admin/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="rounded-xl bg-white/10 p-3 hover:bg-green-600"
            to="/admin/products"
          >
            Produtos
          </Link>
          <Link
            className="rounded-xl bg-white/10 p-3 hover:bg-green-600"
            to="/admin/analytics"
          >
            Analytics
          </Link>
          <Link
            className="rounded-xl bg-white/10 p-3 hover:bg-green-600"
            to="/admin/operation"
          >
            Operação
          </Link>
          <Link
            className="rounded-xl bg-white/10 p-3 hover:bg-green-600"
            to="/admin/products/new"
          >
            Novo produto
          </Link>
          <Link
            className="rounded-xl bg-white/10 p-3 hover:bg-green-600"
            to="/novidades"
          >
            Ver novidades
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              location.href = "/";
            }}
            className="rounded-xl bg-red-500/15 p-3 text-left text-red-100"
          >
            Sair
          </button>
        </nav>
      </aside>
      <section>{children}</section>
    </main>
  );
}
function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="text-green-400">{icon}</div>
      <p className="mt-3 text-sm text-white/55">{label}</p>
      <h3 className="text-3xl font-black">{value}</h3>
    </div>
  );
}
function AdminDashboard() {
  const [d, setD] = useState<Dash | null>(null),
    [msg, setMsg] = useState(""),
    [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setMsg("");
    try {
      setD(await req("/admin/dashboard"));
    } catch (e: any) {
      if (String(e.message).includes("senha"))
        location.href = "/admin/reset-password";
      else setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function resync() {
    setMsg("");
    try {
      await req("/admin/resync-metrics", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }
  const conversion = d?.totals.views
    ? ((d.totals.checkoutClicks / d.totals.views) * 100)
        .toFixed(1)
        .replace(".", ",")
    : "0";
  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Dashboard</h1>
          <p className="text-white/55">
            Resumo comercial da loja, visualizações únicas e cliques para
            checkout.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/15"
          >
            <RefreshCw className="mr-2 inline" size={16} />
            Atualizar
          </button>
          <button
            onClick={resync}
            className="rounded-xl bg-green-600 px-4 py-3 text-sm font-black hover:bg-green-500"
          >
            Sincronizar métricas
          </button>
        </div>
      </div>
      {msg && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {msg}
        </div>
      )}
      {loading || !d ? (
        <p className="mt-8 text-white/60">Carregando métricas...</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Stat
              icon={<Package />}
              label="Produtos"
              value={num(d.totals.products)}
            />
            <Stat
              icon={<Eye />}
              label="Views únicas"
              value={num(d.totals.views)}
            />
            <Stat
              icon={<MousePointerClick />}
              label="Cliques gerais"
              value={num(d.totals.clicks)}
            />
            <Stat
              icon={<ExternalLink />}
              label="Cliques checkout"
              value={num(d.totals.checkoutClicks)}
            />
            <Stat
              icon={<TrendingUp />}
              label="Conversão"
              value={`${conversion}%`}
            />
            <Stat
              icon={<BarChart3 />}
              label="Ativos"
              value={num(d.totals.active)}
            />
          </div>
          <section className="glass mt-6 rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Operação da loja</h2>
                <p className="text-sm text-white/55">
                  Acompanhe rapidamente o que precisa de atenção.
                </p>
              </div>
              <Link
                to="/admin/products/new"
                className="rounded-xl bg-green-600 px-4 py-3 text-sm font-black"
              >
                Cadastrar novo produto
              </Link>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-4">
                <b>{num(d.totals.inactive)}</b>
                <p className="text-sm text-white/55">Produtos inativos</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <b>{num(d.lowPerformance?.length || 0)}</b>
                <p className="text-sm text-white/55">
                  Produtos com views e sem checkout
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <b>{money((d.totals as any).revenueIntent || 0)}</b>
                <p className="text-sm text-white/55">
                  Potencial gerado por cliques checkout
                </p>
              </div>
            </div>
          </section>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Rank title="Mais visualizados" items={d.topViews} metric="views" />
            <Rank
              title="Mais cliques no checkout"
              items={d.topClicks}
              metric="checkout"
            />
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section className="glass rounded-3xl p-5">
              <h2 className="text-xl font-black">Produtos recentes</h2>
              <ProductMiniList items={d.recent} />
            </section>
            <section className="glass rounded-3xl p-5">
              <h2 className="text-xl font-black">Origem dos acessos</h2>
              <div className="mt-4 grid gap-3">
                {(d.traffic || []).length === 0 ? <p className="text-white/55">Nenhum UTM registrado ainda.</p> : (d.traffic || []).slice(0,6).map((t) => (
                  <div key={t.source} className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <b>{t.source}</b><span className="text-sm text-green-300">{num(t.views)} views • {num(t.checkout)} checkout</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="glass rounded-3xl p-5">
              <h2 className="text-xl font-black">Últimas atualizações</h2>
              <div className="mt-4 grid gap-3">
                {(d.activity || []).length === 0 ? (
                  <p className="text-white/55">
                    Nenhuma atualização registrada.
                  </p>
                ) : (
                  (d.activity || []).map((a) => (
                    <div key={a.id} className="rounded-2xl bg-white/5 p-4">
                      <p className="text-xs font-black uppercase text-green-400">
                        {a.type}
                      </p>
                      <b>{a.title}</b>
                      <p className="text-sm text-white/55">{a.description}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </AdminShell>
  );
}
function Rank({
  title,
  items,
  metric,
}: {
  title: string;
  items: Product[];
  metric: "views" | "checkout";
}) {
  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <ProductMiniList items={items} metric={metric} />
    </section>
  );
}
function ProductMiniList({
  items,
  metric,
}: {
  items: Product[];
  metric?: "views" | "checkout";
}) {
  if (items.length === 0)
    return <p className="mt-4 text-white/55">Nenhum produto cadastrado.</p>;
  return (
    <div className="mt-4 grid gap-3">
      {items.map((p) => (
        <div key={p.id} className="rounded-2xl bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <b>{p.name}</b>
              <p className="text-xs text-white/50">
                /{p.slug} • {p.active ? "Ativo" : "Inativo"} {p.score ? `• score ${p.score}` : ""}
              </p>
            </div>
            <span className="text-sm font-black text-green-400">
              {metric === "checkout"
                ? num(p.checkout_clicks || p.clicks)
                : metric === "views"
                  ? num(p.views)
                  : priceLabel(p.price)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]),
    [msg, setMsg] = useState("");
  async function load() {
    try {
      setItems(await req("/admin/products"));
    } catch (e: any) {
      setMsg(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function del(id: string) {
    if (confirm("Excluir produto?")) {
      await req("/admin/products/" + id, { method: "DELETE" });
      load();
    }
  }
  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Produtos</h1>
          <p className="text-white/55">
            Gerencie produtos criados, status, links e métricas.
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="rounded-xl bg-green-600 px-4 py-3 font-black"
        >
          Novo produto
        </Link>
      </div>
      {msg && <p className="mt-4 text-red-300">{msg}</p>}
      <div className="mt-6 grid gap-3">
        {items.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-white/60">
            Nenhum produto cadastrado.
          </div>
        ) : (
          items.map((p) => (
            <div
              key={p.id}
              className="glass grid gap-4 rounded-3xl p-4 md:grid-cols-[80px_1fr_auto]"
            >
              <img
                src={p.image_url || "/icon.svg"}
                className="h-20 w-20 rounded-2xl object-cover"
              />
              <div>
                <h3 className="font-black">{p.name}</h3>
                <p className="text-sm text-white/55">
                  /{p.slug} • {priceLabel(p.price)} •{" "}
                  {p.active ? "Ativo" : "Inativo"} {p.badge ? `• ${p.badge}` : ""}
                </p>
                <p className="mt-1 text-sm text-green-300">
                  {num(p.views)} visualizações • {num(p.clicks)} cliques •{" "}
                  {num(p.checkout_clicks || p.clicks)} checkout
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  className="rounded-xl bg-white/10 p-3"
                  to={`/admin/products/${p.id}/edit`}
                >
                  <Edit3 size={18} />
                </Link>
                <button
                  onClick={() => del(p.id)}
                  className="rounded-xl bg-red-500/20 p-3 text-red-200"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
function AdminAnalytics() {
  const [items, setItems] = useState<Product[]>([]),
    [msg, setMsg] = useState("");
  useEffect(() => {
    req("/admin/products")
      .then(setItems)
      .catch((e) => setMsg(e.message));
  }, []);
  const totalViews = items.reduce((a, p) => a + Number(p.views || 0), 0);
  const totalCheckout = items.reduce(
    (a, p) => a + Number(p.checkout_clicks || 0),
    0,
  );
  const conversion = totalViews
    ? ((totalCheckout / totalViews) * 100).toFixed(1).replace(".", ",")
    : "0";
  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Analytics</h1>
          <p className="text-white/55">
            Acompanhe visualizações únicas, cliques e intenção de compra por
            produto.
          </p>
        </div>
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-3 text-sm font-bold text-green-200">
          Conversão geral: {conversion}%
        </div>
      </div>
      {msg && <p className="mt-4 text-red-300">{msg}</p>}
      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/10 text-white/70">
            <tr>
              <th className="p-4">Produto</th>
              <th>Preço</th>
              <th>Status</th>
              <th>Views únicas</th>
              <th>Cliques</th>
              <th>Checkout</th>
              <th>Conversão</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="p-5 text-white/55" colSpan={7}>
                  Nenhum produto cadastrado.
                </td>
              </tr>
            ) : (
              items.map((p) => {
                const conv = p.views
                  ? (((p.checkout_clicks || 0) / p.views) * 100)
                      .toFixed(1)
                      .replace(".", ",")
                  : "0";
                return (
                  <tr
                    key={p.id}
                    className="border-t border-white/10 bg-white/[.03]"
                  >
                    <td className="p-4">
                      <b>{p.name}</b>
                      <p className="text-xs text-white/45">/{p.slug}</p>
                    </td>
                    <td>{priceLabel(p.price)}</td>
                    <td>
                      <span
                        className={p.active ? "text-green-400" : "text-red-300"}
                      >
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>{num(p.views)}</td>
                    <td>{num(p.clicks)}</td>
                    <td>{num(p.checkout_clicks || 0)}</td>
                    <td>{conv}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}


function AdminOperation() {
  const [notifications,setNotifications] = useState<any[]>([]);
  const [audit,setAudit] = useState<any[]>([]);
  const [logs,setLogs] = useState<any[]>([]);
  const [pixels,setPixels] = useState<any>({meta_pixel:"", google_tag_manager:"", google_analytics:"", tiktok_pixel:""});
  const [msg,setMsg] = useState("");
  async function load(){
    setMsg("");
    try {
      const [n,a,l,p] = await Promise.all([req("/admin/notifications"), req("/admin/audit"), req("/admin/logs"), req("/settings/pixels")]);
      setNotifications(n); setAudit(a); setLogs(l); setPixels(p);
    } catch(e:any){ setMsg(e.message); }
  }
  useEffect(()=>{ load(); },[]);
  async function savePixels(){
    setMsg("");
    try { await req("/admin/settings/pixels", {method:"PUT", body:JSON.stringify(pixels)}); setMsg("Pixels salvos com segurança."); }
    catch(e:any){ setMsg(e.message); }
  }
  async function exportFile(kind: "csv" | "json"){
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`/api/admin/export/products.${kind}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if(!r.ok) throw new Error("Falha ao exportar dados.");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `kaskl-produtos.${kind}`; a.click(); URL.revokeObjectURL(url);
    } catch(e:any){ setMsg(e.message); }
  }
  return <AdminShell>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-black">Operação</h1><p className="text-white/55">Notificações, pixels, auditoria, logs e exportação.</p></div>
      <button onClick={load} className="rounded-xl bg-white/10 px-4 py-3 font-black"><RefreshCw className="mr-2 inline" size={16}/>Atualizar</button>
    </div>
    {msg && <p className="mt-4 rounded-2xl bg-white/10 p-4 text-green-200">{msg}</p>}
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="glass rounded-3xl p-5"><h2 className="flex items-center gap-2 text-xl font-black"><Bell/> Notificações</h2><div className="mt-4 grid gap-3">{notifications.length===0?<p className="text-white/55">Nada pendente.</p>:notifications.map(n=><div key={n.id} className="rounded-2xl bg-white/5 p-4"><b>{n.title}</b><p className="text-sm text-white/55">{n.message}</p><p className="mt-1 text-xs text-white/35">{dateBR(n.created_at)}</p></div>)}</div></section>
      <section className="glass rounded-3xl p-5"><h2 className="flex items-center gap-2 text-xl font-black"><Download/> Exportação</h2><p className="mt-2 text-sm text-white/55">Baixe produtos e métricas para backup, análise ou planilhas.</p><div className="mt-4 flex flex-wrap gap-3"><button onClick={()=>exportFile("csv")} className="rounded-xl bg-green-600 px-4 py-3 font-black">CSV</button><button onClick={()=>exportFile("json")} className="rounded-xl bg-white/10 px-4 py-3 font-black">JSON</button></div></section>
      <section className="glass rounded-3xl p-5 lg:col-span-2"><h2 className="flex items-center gap-2 text-xl font-black"><Settings/> Pixel Manager</h2><p className="mt-2 text-sm text-white/55">Configure IDs. Scripts reais devem ser adicionados no deploy conforme a política de privacidade.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Meta Pixel ID" value={pixels.meta_pixel||""} onChange={e=>setPixels({...pixels, meta_pixel:e.target.value})}/><input placeholder="Google Tag Manager ID" value={pixels.google_tag_manager||""} onChange={e=>setPixels({...pixels, google_tag_manager:e.target.value})}/><input placeholder="Google Analytics ID" value={pixels.google_analytics||""} onChange={e=>setPixels({...pixels, google_analytics:e.target.value})}/><input placeholder="TikTok Pixel ID" value={pixels.tiktok_pixel||""} onChange={e=>setPixels({...pixels, tiktok_pixel:e.target.value})}/></div><button onClick={savePixels} className="mt-4 rounded-xl bg-green-600 px-4 py-3 font-black">Salvar pixels</button></section>
      <section className="glass rounded-3xl p-5"><h2 className="flex items-center gap-2 text-xl font-black"><FileText/> Auditoria admin</h2><div className="mt-4 max-h-96 overflow-auto grid gap-2">{audit.length===0?<p className="text-white/55">Sem auditoria.</p>:audit.map(a=><div key={a.id} className="rounded-xl bg-white/5 p-3 text-sm"><b>{a.action}</b> em {a.entity}<p className="text-xs text-white/40">{dateBR(a.created_at)}</p></div>)}</div></section>
      <section className="glass rounded-3xl p-5"><h2 className="flex items-center gap-2 text-xl font-black"><AlertCircle/> Logs do sistema</h2><div className="mt-4 max-h-96 overflow-auto grid gap-2">{logs.length===0?<p className="text-white/55">Sem erros registrados.</p>:logs.map(l=><div key={l.id} className="rounded-xl bg-white/5 p-3 text-sm"><b className={l.level==='error'?'text-red-300':'text-green-300'}>{l.level}</b> {l.message}<p className="text-xs text-white/40">{dateBR(l.created_at)}</p></div>)}</div></section>
    </div>
  </AdminShell>;
}

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-black text-white/85">
        {label}
        {required ? (
          <b className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] uppercase text-green-300">Obrigatório</b>
        ) : (
          <b className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/45">Opcional</b>
        )}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/45">{hint}</span>}
    </label>
  );
}
function StepTitle({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-2xl bg-green-500/15 p-3 text-green-300">{icon}</div>
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="text-sm text-white/55">{text}</p>
      </div>
    </div>
  );
}
function cleanLocalDate(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function ProductForm({ edit = false }: { edit?: boolean }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState<any>(emptyForm);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<"basico" | "oferta" | "conteudo" | "publicacao">("basico");
  const requiredReady = form.name.trim().length >= 3 && form.category.trim().length >= 2 && /^https?:\/\//i.test(form.checkout_url.trim());

  useEffect(() => {
    if (edit && id) {
      setLoading(true);
      req("/admin/products")
        .then((list: Product[]) => {
          const p = list.find((x) => x.id === id);
          if (p) {
            setForm({
              ...emptyForm,
              ...p,
              old_price: p.old_price ?? "",
              price: p.price ?? "",
              image_url: p.image_url || "",
              badge: p.badge || "",
              scheduled_at: cleanLocalDate(p.scheduled_at),
              short_description: p.short_description || "",
              description: p.description || "",
            });
          }
        })
        .catch((e) => setMsg(e.message))
        .finally(() => setLoading(false));
    }
  }, [edit, id]);

  function patch(key: string, value: any) {
    setMsg("");
    setOk("");
    setForm((old: any) => ({ ...old, [key]: value }));
  }
  function makeSlug() {
    const base = (form.name || form.slug || "produto")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120);
    patch("slug", base || "produto");
  }
  async function analyzeCheckout() {
    setMsg("");
    setOk("");
    if (!/^https?:\/\//i.test(form.checkout_url || "")) {
      setMsg("Cole um link de checkout válido antes de usar a inteligência.");
      setSection("basico");
      return;
    }
    setLoading(true);
    try {
      const r = await req("/admin/product-intelligence", {
        method: "POST",
        body: JSON.stringify({ checkout_url: form.checkout_url, name: form.name, category: form.category }),
      });
      setForm((old: any) => ({ ...old, ...r, checkout_url: old.checkout_url, active: old.active, scheduled_at: old.scheduled_at || "" }));
      setOk("Informações sugeridas com sucesso. Revise os campos e salve quando estiver pronto.");
      setSection("conteudo");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }
  function buildPayload() {
    const scheduled_at = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null;
    return {
      name: form.name.trim(),
      slug: form.slug.trim(),
      category: form.category.trim(),
      short_description: String(form.short_description || "").trim(),
      description: String(form.description || "").trim(),
      image_url: String(form.image_url || "").trim(),
      old_price: form.old_price === "" ? null : form.old_price,
      price: form.price === "" ? null : form.price,
      checkout_url: form.checkout_url.trim(),
      active: Boolean(form.active),
      featured: Boolean(form.featured),
      badge: String(form.badge || "").trim(),
      scheduled_at,
    };
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setOk("");
    if (!requiredReady) {
      setMsg("Preencha nome, categoria e link de checkout válido. O restante pode ficar vazio.");
      setSection("basico");
      return;
    }
    setLoading(true);
    try {
      await req(edit ? "/admin/products/" + id : "/admin/products", {
        method: edit ? "PUT" : "POST",
        body: JSON.stringify(buildPayload()),
      });
      nav("/admin/products");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }
  const tabs = [
    ["basico", "1. Básico"],
    ["oferta", "2. Oferta"],
    ["conteudo", "3. Conteúdo"],
    ["publicacao", "4. Publicação"],
  ] as const;
  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{edit ? "Editar produto" : "Novo produto"}</h1>
          <p className="text-white/55">Cadastro refeito para ser simples, flexível e seguro. Só nome, categoria e checkout são obrigatórios.</p>
        </div>
        <Link to="/admin/products" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/15">Voltar para produtos</Link>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_340px]">
        <form onSubmit={save} className="glass rounded-3xl p-4 md:p-6">
          <div className="mb-5 grid gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-100 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <b>Modo flexível ativado:</b> publique rápido agora e complete preço, imagem, descrição, badge e agendamento depois.
            </div>
            <button type="button" onClick={analyzeCheckout} disabled={loading} className="rounded-xl bg-green-600 px-4 py-3 text-sm font-black hover:bg-green-500 disabled:opacity-60">
              <Wand2 className="mr-2 inline" size={16} /> Preencher pelo checkout
            </button>
          </div>

          <div className="mb-6 grid gap-2 sm:grid-cols-4">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${section === key ? "bg-green-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/15"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {section === "basico" && (
            <section>
              <StepTitle icon={<Package size={22} />} title="Informações básicas" text="Esses dados identificam o produto na loja e no link público." />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Nome do produto" required hint="Exemplo: Mini Projetor Portátil LED 1080p">
                  <input required className="w-full" placeholder="Nome do produto" value={form.name} onChange={(e) => patch("name", e.target.value)} onBlur={() => !form.slug && makeSlug()} />
                </FormField>
                <FormField label="Categoria" required hint="Use categorias simples: Eletrônicos, Casa, Beleza, Fitness...">
                  <input required className="w-full" placeholder="Categoria" value={form.category} onChange={(e) => patch("category", e.target.value)} />
                </FormField>
                <FormField label="Link de checkout" required hint="Cole o link Kaiross ou checkout externo. Deve começar com https://">
                  <input required className="w-full" placeholder="https://pay.kaiross.com.br/..." value={form.checkout_url} onChange={(e) => patch("checkout_url", e.target.value)} />
                </FormField>
                <FormField label="Slug público" hint="Se ficar vazio, o sistema gera sozinho. Exemplo: mini-projetor">
                  <div className="flex gap-2">
                    <input className="w-full" placeholder="mini-projetor" value={form.slug} onChange={(e) => patch("slug", e.target.value)} />
                    <button type="button" onClick={makeSlug} className="rounded-xl bg-white/10 px-4 text-sm font-black hover:bg-white/15">Gerar</button>
                  </div>
                </FormField>
              </div>
            </section>
          )}

          {section === "oferta" && (
            <section>
              <StepTitle icon={<Target size={22} />} title="Oferta e mídia" text="Preço, imagem e destaque são opcionais. Se não informar preço, a loja mostrará preço no checkout." />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Preço antigo" hint="Opcional. Aceita 252,89 ou 252.89">
                  <input className="w-full" inputMode="decimal" placeholder="252,89" value={form.old_price ?? ""} onChange={(e) => patch("old_price", e.target.value)} />
                </FormField>
                <FormField label="Preço atual" hint="Opcional. Se vazio, aparece 'Preço no checkout'.">
                  <input className="w-full" inputMode="decimal" placeholder="219,90" value={form.price ?? ""} onChange={(e) => patch("price", e.target.value)} />
                </FormField>
                <FormField label="Imagem principal" hint="URL opcional em jpg, png ou webp. Upload real pode ser ligado ao Supabase Storage depois.">
                  <input className="w-full" placeholder="https://.../imagem.webp" value={form.image_url || ""} onChange={(e) => patch("image_url", e.target.value)} />
                </FormField>
                <FormField label="Badge" hint="Exemplo: Oferta, Novo, Mais clicado, Últimas unidades.">
                  <input className="w-full" placeholder="Oferta" value={form.badge || ""} onChange={(e) => patch("badge", e.target.value)} />
                </FormField>
              </div>
            </section>
          )}

          {section === "conteudo" && (
            <section>
              <StepTitle icon={<FileText size={22} />} title="Conteúdo da página" text="Descrições são opcionais. Se deixar vazio, o backend cria textos seguros de fallback." />
              <div className="grid gap-4">
                <FormField label="Descrição curta" hint="Resumo usado nos cards. Máximo recomendado: 180 caracteres.">
                  <input className="w-full" maxLength={500} placeholder="Resumo curto do produto" value={form.short_description || ""} onChange={(e) => patch("short_description", e.target.value)} />
                </FormField>
                <FormField label="Descrição completa" hint="Pode deixar vazio. Não use scripts ou HTML; o sistema renderiza como texto seguro.">
                  <textarea className="min-h-[220px] w-full" maxLength={10000} placeholder="Detalhes, benefícios, informações de entrega, observações..." value={form.description || ""} onChange={(e) => patch("description", e.target.value)} />
                </FormField>
              </div>
            </section>
          )}

          {section === "publicacao" && (
            <section>
              <StepTitle icon={<CalendarClock size={22} />} title="Publicação" text="Controle se o produto aparece agora, se será destaque ou se será agendado." />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Agendar publicação" hint="Opcional. Se vazio, fica disponível imediatamente quando ativo.">
                  <input className="w-full" type="datetime-local" value={form.scheduled_at || ""} onChange={(e) => patch("scheduled_at", e.target.value)} />
                </FormField>
                <div className="grid gap-3 rounded-2xl bg-white/5 p-4">
                  <label className="flex items-center justify-between gap-3 rounded-xl bg-black/20 p-3 font-bold">
                    Produto ativo
                    <input type="checkbox" checked={Boolean(form.active)} onChange={(e) => patch("active", e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-xl bg-black/20 p-3 font-bold">
                    Destaque na loja
                    <input type="checkbox" checked={Boolean(form.featured)} onChange={(e) => patch("featured", e.target.checked)} />
                  </label>
                </div>
              </div>
            </section>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {msg && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{msg}</p>}
              {ok && <p className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">{ok}</p>}
            </div>
            <button disabled={loading || !requiredReady} className="rounded-2xl bg-green-600 px-7 py-4 font-black hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Processando..." : edit ? "Salvar alterações" : "Publicar produto"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="glass rounded-3xl p-5">
            <h2 className="text-lg font-black">Prévia do card</h2>
            <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="h-44 bg-black/30">
                <img src={form.image_url || "/icon.svg"} onError={(e) => ((e.currentTarget.src = "/icon.svg"))} className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2 text-xs font-black uppercase text-green-300">
                  <span>{form.category || "Categoria"}</span>{form.badge && <span className="rounded-full bg-green-500/15 px-2 py-0.5">{form.badge}</span>}
                </div>
                <h3 className="mt-2 text-xl font-black">{form.name || "Nome do produto"}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-white/60">{form.short_description || "Descrição curta será gerada automaticamente se você deixar em branco."}</p>
                <p className="mt-4 text-2xl font-black text-green-400">{form.price ? money(Number(String(form.price).replace(',', '.'))) : "Preço no checkout"}</p>
              </div>
            </div>
          </section>
          <section className="glass rounded-3xl p-5">
            <h2 className="text-lg font-black">Checklist</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <p className={form.name.trim().length >= 3 ? "text-green-300" : "text-white/45"}>✓ Nome com pelo menos 3 caracteres</p>
              <p className={form.category.trim().length >= 2 ? "text-green-300" : "text-white/45"}>✓ Categoria definida</p>
              <p className={/^https?:\/\//i.test(form.checkout_url.trim()) ? "text-green-300" : "text-white/45"}>✓ Checkout com URL válida</p>
              <p className={form.slug ? "text-green-300" : "text-white/45"}>• Slug personalizado</p>
              <p className={form.image_url ? "text-green-300" : "text-white/45"}>• Imagem adicionada</p>
            </div>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/p/:slug" element={<ProductPage />} />
        <Route path="/novidades" element={<News />} />
        <Route path="/admin/login" element={<AdminLoginEntry />} />
        <Route path="/admin/login/:token" element={<AdminLogin />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/operation" element={<AdminOperation />} />
        <Route path="/admin/products/new" element={<ProductForm />} />
        <Route path="/admin/products/:id/edit" element={<ProductForm edit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
