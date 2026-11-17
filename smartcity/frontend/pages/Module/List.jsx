// Liste d'un module : signalements, événements, observations animales, marché local.
// Les données viennent de core.views.ModuleListView (une seule page pour 4 modules).
import { useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { Clock, MapPin, Plus, Search, ShoppingCart, Sparkles, UserRound } from "lucide-react";
import { router, usePage } from "@inertiajs/react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Chips, EmptyState, MODULES, PageHeader, STATUS_TONE, cn, fmtDay, fmtMonth, fmtRelative, fmtTime, fmtWeekday } from "../../lib/ui";

const EMPTY = {
  infrastructures: ["Tout est calme ici.", "Aucun signalement pour le moment. Vous avez repéré un problème ?"],
  evenements: ["Rien de prévu pour l'instant.", "Soyez le premier à proposer un événement aux habitants."],
  animaux: ["Aucune observation.", "Un animal croisé en ville ? Partagez-le."],
  marketplace: ["Le marché est vide.", "Aucun produit disponible pour le moment."],
};

function AddToCartBtn({ item }) {
  const { auth } = usePage().props;
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!auth.user) return null;

  const handleClick = () => {
    if (loading || done) return;
    setLoading(true);
    router.post(
      item.add_to_cart_url,
      {},
      {
        preserveScroll: true,
        onSuccess: () => { setDone(true); setLoading(false); setTimeout(() => setDone(false), 2000); },
        onError: () => setLoading(false),
        onFinish: () => setLoading(false),
      }
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Ajouter au panier"
      className={cn(
        "mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition",
        done
          ? "bg-green/10 text-green"
          : "bg-deep text-lime hover:bg-ink disabled:opacity-60"
      )}
    >
      <ShoppingCart className="size-4 shrink-0" />
      {done ? "Ajouté !" : loading ? "…" : "Ajouter au panier"}
    </button>
  );
}

function ItemCard({ item, ns, index }) {
  const Icon = MODULES[ns]?.icon || Sparkles;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-line bg-paper transition-shadow hover:shadow-[0_24px_60px_#15362e1a]"
    >
      <div className={cn("relative overflow-hidden bg-mint", item.image ? "aspect-[16/10]" : "aspect-[16/7]")}>
        {item.image ? (
          <img src={item.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className={cn("grid size-full place-items-center", item.alert ? "bg-coral/15 text-[#b4532f]" : "bg-gradient-to-br from-mint to-lime/40 text-green")}>
            <Icon className="size-14 opacity-50 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {item.tag && <Badge tone={item.alert ? "coral" : "paper"} className={item.alert ? "bg-coral text-paper" : ""}>{item.tag}</Badge>}
          {item.status && <Badge tone={STATUS_TONE[item.status.key]} dot className="bg-paper">{item.status.label}</Badge>}
        </div>
        {item.event_date && (
          <div className="absolute right-3 bottom-3 rounded-2xl bg-paper px-3 py-1.5 text-center leading-none shadow-lg">
            <b className="block font-serif text-2xl font-semibold">{fmtDay(item.event_date)}</b>
            <span className="text-[11px] font-semibold tracking-wide text-green uppercase">{fmtMonth(item.event_date)}</span>
          </div>
        )}
        {item.price && (
          <div className="absolute right-3 bottom-3 rounded-full bg-deep px-3.5 py-1.5 text-sm font-bold text-lime shadow-lg">
            {Number(item.price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-2xl leading-tight font-medium">{item.title}</h3>
        {/* Quantité + unité pour le marché local */}
        {item.quantite && item.unite_label && (
          <p className="mt-1 text-sm font-semibold text-green">
            {item.quantite} {item.unite_label}
          </p>
        )}
        {item.event_date && (
          <p className="mt-1 text-sm font-medium text-green capitalize">
            {fmtWeekday(item.event_date)} · {fmtTime(item.event_date)}
          </p>
        )}
        {item.text && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{item.text}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted">
          {item.place && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {item.place}
            </span>
          )}
          {item.author && (
            <span className="flex items-center gap-1">
              <UserRound className="size-3.5" /> {item.author}
            </span>
          )}
          {item.date && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {fmtRelative(item.date)}
            </span>
          )}
        </div>
        {/* Bouton panier uniquement pour le marché local */}
        {item.add_to_cart_url && <AddToCartBtn item={item} />}
      </div>
    </motion.article>
  );
}

export default function ModuleList({ title, subtitle, ns, add_label, create_url, filters, items, hide_add }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const Icon = MODULES[ns]?.icon || Sparkles;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => (!filter || it.filter === filter) && (!q || [it.title, it.text, it.place, it.author, it.tag].some((v) => v && v.toLowerCase().includes(q))));
  }, [items, query, filter]);

  const chips = [{ value: "", label: "Tous", count: items.length }, ...filters.map((f) => ({ ...f, count: items.filter((it) => it.filter === f.value).length }))];
  const [emptyTitle, emptyText] = EMPTY[ns] || ["Rien à afficher.", ""];

  return (
    <>
      <Head title={title} />
      <PageHeader eyebrow="Services citoyens" title={title} subtitle={subtitle} icon={Icon}>
        {!hide_add && (
          <Btn href={create_url} icon={Plus} size="lg">
            {add_label}
          </Btn>
        )}
      </PageHeader>

      {items.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          {filters.length > 0 ? <Chips options={chips} value={filter} onChange={setFilter} /> : <p className="text-sm text-muted">{items.length} élément{items.length > 1 ? "s" : ""}</p>}
          <label className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher dans la liste"
              className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none transition focus:border-green focus:ring-4 focus:ring-green/10"
            />
          </label>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={Icon} title={emptyTitle} text={emptyText}>
          {!hide_add && (
            <Btn href={create_url} icon={Plus}>
              {add_label}
            </Btn>
          )}
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState icon={Search} title="Aucun résultat" text="Essayez un autre mot ou retirez le filtre.">
          <Btn variant="ghost" onClick={() => (setQuery(""), setFilter(""))}>
            Tout afficher
          </Btn>
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {shown.map((item, i) => (
              <ItemCard key={item.id} item={item} ns={ns} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

ModuleList.layout = appLayout;
