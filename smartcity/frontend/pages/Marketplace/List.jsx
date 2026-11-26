import { useMemo, useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Clock3, Package, Plus, Search, ShieldCheck, ShoppingBasket } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Chips, EmptyState, MARKET_ICONS, PageHeader, STATUS_TONE, cn, fmtRelative } from "../../lib/ui";

function unitLabel(label, qty = 1) {
  if (!label || label === "Kg") return label || "";
  return qty > 1 ? `${label}s` : label;
}

function ProductCard({ p, index }) {
  const Icon = MARKET_ICONS[p.category] || ShoppingBasket;
  const outOfStock = p.status === "disponible" && p.en_rupture;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-line bg-paper transition-shadow hover:shadow-[0_24px_60px_#15362e1a]"
    >
      <div className={cn("relative overflow-hidden", p.image ? "aspect-[16/10]" : "aspect-[16/7]")}>
        {p.image ? (
          <img src={p.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-mint to-lime/40 text-green">
            <Icon className="size-14 opacity-50 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {outOfStock ? (
            <Badge tone="coral" dot>Rupture de stock</Badge>
          ) : (
            <Badge tone={STATUS_TONE[p.status]} dot>{p.status_label}</Badge>
          )}
          <Badge tone="muted">{p.category_label}</Badge>
          {p.mine && <Badge tone="lime">Mon annonce</Badge>}
        </div>
        <div className="absolute right-3 bottom-3 rounded-full bg-deep px-3.5 py-1.5 text-sm font-bold text-lime shadow-lg">
          {Number(p.price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
          {p.unite_label && <span className="ml-1 text-xs font-normal text-paper/75">/ {p.unite_label}</span>}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <Link href={p.url} className="font-serif text-2xl leading-tight font-medium hover:underline">{p.title}</Link>
        {p.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{p.description}</p>}
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
          <Package className={cn("size-3.5", outOfStock ? "text-[#b4532f]" : "text-green")} />
          {outOfStock ? (
            <span className="text-[#b4532f]">Rupture de stock</span>
          ) : (
            <span className="text-ink/80">Stock : {p.quantite} {unitLabel(p.unite_label, p.quantite)}</span>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          <span className="flex items-center gap-1 text-xs text-muted">
            <Clock3 className="size-3.5" /> {fmtRelative(p.date)}
            <span className="mx-1">·</span> {p.author}
          </span>
          <Link href={p.url} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-green hover:bg-mint">
            Voir <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function MarketplaceList({ items, categories, create_url, manage_url }) {
  const { auth } = usePage().props;
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [query, setQuery] = useState("");

  const availableCount = useMemo(() => items.filter((p) => p.status === "disponible" && !p.en_rupture).length, [items]);
  const ruptureCount = useMemo(() => items.filter((p) => p.status === "disponible" && p.en_rupture).length, [items]);
  const soldCount = useMemo(() => items.filter((p) => p.status === "vendu").length, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      const statusMatch =
        !status ||
        (status === "disponible" && p.status === "disponible" && !p.en_rupture) ||
        (status === "rupture" && p.status === "disponible" && p.en_rupture) ||
        (status === "vendu" && p.status === "vendu");
      return (
        statusMatch &&
        (!category || p.category === category) &&
        (!mineOnly || p.mine) &&
        (!q || p.title.toLowerCase().includes(q) || (p.author || "").toLowerCase().includes(q))
      );
    });
  }, [items, status, category, mineOnly, query]);

  const statusChips = [
    { value: "", label: "Tous", count: items.length },
    { value: "disponible", label: "Disponibles", count: availableCount },
    ...(ruptureCount > 0 ? [{ value: "rupture", label: "Rupture de stock", count: ruptureCount }] : []),
    { value: "vendu", label: "Vendus", count: soldCount },
  ];
  const catChips = [{ value: "", label: "Toutes" }, ...categories.map((c) => ({ ...c, icon: MARKET_ICONS[c.value] }))];
  const mineCount = items.filter((p) => p.mine).length;

  return (
    <>
      <Head title="Marché local" />
      <PageHeader eyebrow="Services citoyens" title="Acheter local" subtitle="Produits du marché local : alimentaire, artisanat, services. Achetez directement aux producteurs de My City." icon={ShoppingBasket}>
        {create_url && (
          <Btn href={create_url} icon={Plus} size="lg">
            Publier un produit
          </Btn>
        )}
        {manage_url && (
          <Btn href={manage_url} icon={ShieldCheck} size="lg">
            Tableau de gestion
          </Btn>
        )}
      </PageHeader>

      {/* Chiffres */}
      <div className="grain relative mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] bg-deep text-paper">
        <button type="button" onClick={() => setStatus(status === "disponible" ? "" : "disponible")} className={cn("relative cursor-pointer px-5 py-4 text-left transition hover:bg-white/5", status === "disponible" && "bg-white/10")}>
          <p className="font-serif text-4xl leading-none font-medium" style={{ color: "#c8f169" }}>{availableCount}</p>
          <p className="mt-1.5 text-sm text-paper/60">disponibles</p>
        </button>
        <button type="button" onClick={() => setStatus(status === "vendu" ? "" : "vendu")} className={cn("relative cursor-pointer px-5 py-4 text-left transition hover:bg-white/5", status === "vendu" && "bg-white/10")}>
          <p className="font-serif text-4xl leading-none font-medium" style={{ color: "#9aa8a3" }}>{soldCount}</p>
          <p className="mt-1.5 text-sm text-paper/60">vendus</p>
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ShoppingBasket} title="Le marché est vide." text="Proposez le premier produit local.">
          {create_url && <Btn href={create_url} icon={Plus}>Publier un produit</Btn>}
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Chips options={statusChips} value={status} onChange={setStatus} />
            <label className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Produit ou vendeur…" aria-label="Rechercher" className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none transition focus:border-green focus:ring-4 focus:ring-green/10" />
            </label>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Chips options={catChips} value={category} onChange={setCategory} />
            {auth.user && mineCount > 0 && (
              <button type="button" onClick={() => setMineOnly((v) => !v)} className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition", mineOnly ? "border-lime bg-lime text-deep" : "border-line bg-paper hover:border-ink/30")}>
                Mes annonces ({mineCount})
              </button>
            )}
          </div>

          {shown.length === 0 ? (
            <EmptyState icon={Search} title="Aucun résultat" text="Essayez un autre filtre.">
              <Btn variant="ghost" onClick={() => (setStatus(""), setCategory(""), setMineOnly(false), setQuery(""))}>Tout afficher</Btn>
            </EmptyState>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {shown.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </>
  );
}

MarketplaceList.layout = appLayout;
