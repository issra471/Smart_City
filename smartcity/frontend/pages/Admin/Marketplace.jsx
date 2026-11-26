import { useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowUpRight, Clock3, Search, ShoppingBasket, XCircle } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Chips, EmptyState, MARKET_ICONS, PageHeader, STATUS_TONE, cn, fmtRelative } from "../../lib/ui";

function Row({ p }) {
  const [showRetire, setShowRetire] = useState(false);
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);
  const Icon = MARKET_ICONS[p.category] || ShoppingBasket;
  const retired = p.status === "retire";

  function doRetire(e) {
    e.preventDefault();
    if (motif.trim().length < 3) return;
    router.post(`/marketplace/gestion/${p.id}/retirer/`, { motif }, { forceFormData: true, preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  }

  return (
    <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="group border-b border-line last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint text-green">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <Link href={p.url} className="block truncate font-medium hover:underline">{p.title}</Link>
            <span className="text-xs text-muted">{p.author}</span>
          </div>
        </div>
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        {p.status === "disponible" && p.en_rupture ? (
          <Badge tone="coral" dot>Rupture de stock</Badge>
        ) : (
          <Badge tone={STATUS_TONE[p.status]} dot>{p.status_label}</Badge>
        )}
      </td>
      <td className="hidden px-4 py-3 md:table-cell"><span className="text-sm text-muted">{p.category_label}</span></td>
      <td className="hidden px-4 py-3 md:table-cell">
        <span className="text-sm font-semibold">{Number(p.price).toLocaleString("fr-FR")} DT</span>
        {p.quantite != null && (
          <span className="block text-xs text-muted">{p.quantite} {p.unite_label}</span>
        )}
      </td>
      <td className="hidden px-4 py-3 lg:table-cell"><span className="text-xs text-muted">{fmtRelative(p.date)}</span></td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link href={p.url} className="rounded-full px-2.5 py-1 text-xs font-semibold text-green hover:bg-mint">
            Voir <ArrowUpRight className="mb-0.5 inline size-3" />
          </Link>
          {!retired && (
            <button type="button" onClick={() => setShowRetire((v) => !v)} className="cursor-pointer rounded-full border border-coral/40 px-2.5 py-1 text-xs font-semibold text-[#b4532f] hover:bg-coral/10">
              {showRetire ? "Annuler" : "Retirer"}
            </button>
          )}
        </div>
        <AnimatePresence>
          {showRetire && (
            <motion.form onSubmit={doRetire} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-2 flex items-center gap-2 overflow-hidden">
              <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif (3 car. min)" className="w-full rounded-full border border-line bg-paper px-3 py-1.5 text-xs outline-none focus:border-green" />
              <button type="submit" disabled={busy || motif.trim().length < 3} className="cursor-pointer whitespace-nowrap rounded-full bg-coral/15 px-3 py-1.5 text-xs font-semibold text-[#b4532f] transition hover:bg-coral/25 disabled:opacity-50">
                Confirmer
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </td>
    </motion.tr>
  );
}

export default function AdminMarketplace({ items, categories }) {
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (p) =>
        (!status || p.status === status) &&
        (!category || p.category === category) &&
        (!q || p.title.toLowerCase().includes(q) || (p.author || "").toLowerCase().includes(q)),
    );
  }, [items, status, category, query]);

  const statusChips = [
    { value: "", label: "Tous", count: items.length },
    { value: "disponible", label: "Disponibles", count: items.filter((p) => p.status === "disponible").length },
    { value: "vendu", label: "Vendus", count: items.filter((p) => p.status === "vendu").length },
    { value: "retire", label: "Retirés", count: items.filter((p) => p.status === "retire").length },
  ];
  const catChips = [{ value: "", label: "Toutes" }, ...categories.map((c) => ({ ...c, icon: MARKET_ICONS[c.value] }))];

  return (
    <>
      <Head title="Gestion du marché" />
      <PageHeader eyebrow="Administration" title="Marché local" subtitle="Gérez les annonces du marché local. Retirez les contenus inappropriés." icon={ShoppingBasket} />

      {/* Compteurs */}
      <div className="grain relative mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-[1.75rem] bg-deep text-paper">
        <div className="px-5 py-4"><p className="font-serif text-4xl leading-none font-medium text-lime">{items.filter((p) => p.status === "disponible").length}</p><p className="mt-1.5 text-sm text-paper/60">disponibles</p></div>
        <div className="px-5 py-4"><p className="font-serif text-4xl leading-none font-medium" style={{ color: "#9aa8a3" }}>{items.filter((p) => p.status === "vendu").length}</p><p className="mt-1.5 text-sm text-paper/60">vendus</p></div>
        <div className="px-5 py-4"><p className="font-serif text-4xl leading-none font-medium" style={{ color: "#e0603a" }}>{items.filter((p) => p.status === "retire").length}</p><p className="mt-1.5 text-sm text-paper/60">retirés</p></div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ShoppingBasket} title="Aucune annonce" text="Le marché est vide pour le moment." />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Chips options={statusChips} value={status} onChange={setStatus} />
            <label className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Produit ou vendeur…" aria-label="Rechercher" className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none transition focus:border-green focus:ring-4 focus:ring-green/10" />
            </label>
          </div>
          <div className="mb-6">
            <Chips options={catChips} value={category} onChange={setCategory} />
          </div>

          {shown.length === 0 ? (
            <EmptyState icon={Search} title="Aucun résultat" text="Essayez un autre filtre.">
              <Btn variant="ghost" onClick={() => (setStatus(""), setCategory(""), setQuery(""))}>Tout afficher</Btn>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-[1.75rem] border border-line bg-paper">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold text-muted uppercase">
                    <th className="px-4 py-3">Produit</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Statut</th>
                    <th className="hidden px-4 py-3 md:table-cell">Catégorie</th>
                    <th className="hidden px-4 py-3 md:table-cell">Prix</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {shown.map((p) => <Row key={p.id} p={p} />)}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

AdminMarketplace.layout = adminLayout;
