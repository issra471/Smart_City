// Liste d'un module : signalements, événements, observations animales, marché local.
// Les données viennent de core.views.ModuleListView (une seule page pour 4 modules).
import { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { Clock, MapPin, Plus, Search, ShoppingCart, Sparkles, UserRound } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Chips, EmptyState, MODULES, PageHeader, STATUS_TONE, cn, fmtDay, fmtMonth, fmtRelative, fmtTime, fmtWeekday } from "../../lib/ui";

const EMPTY = {
  infrastructures: ["Tout est calme ici.", "Aucun signalement pour le moment. Vous avez repéré un problème ?"],
  evenements: ["Rien de prévu pour l'instant.", "Soyez le premier à proposer un événement aux habitants."],
  animaux: ["Aucune observation.", "Un animal croisé en ville ? Partagez-le."],
  marketplace: ["Le marché est vide.", "Aucun produit disponible pour l'instant."],
};

function AddToCartBtn({ item }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = (e) => {
    e.stopPropagation();
    if (adding || added) return;
    setAdding(true);
    router.post(item.add_to_cart_url, { quantite: "1" }, {
      preserveScroll: true,
      preserveState: true,
      onFinish: () => {
        setAdding(false);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={adding}
      className={cn(
        "mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-semibold transition",
        added
          ? "border-green bg-mint text-green"
          : "border-line bg-paper text-ink hover:border-green hover:bg-mint hover:text-green",
        adding && "opacity-60 cursor-wait",
      )}
      aria-label={`Ajouter ${item.title} au panier`}
    >
      <ShoppingCart className="size-4 shrink-0" />
      {adding ? "Ajout…" : added ? "Ajouté ✓" : "Ajouter au panier"}
    </button>
  );
}

function ItemCard({ item, ns, index }) {
  const Icon = MODULES[ns]?.icon || Sparkles;
  const isMarket = ns === "marketplace";

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
        {/* Quantité disponible pour le marché */}
        {isMarket && item.quantity && (
          <p className="mt-1 text-sm font-medium text-green">
            {item.quantity} {item.unit} disponible{item.raw_quantity > 1 ? "s" : ""}
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

        {/* Bouton "Ajouter au panier" uniquement pour le marché */}
        {isMarket && item.add_to_cart_url && item.is_available && (
          <AddToCartBtn item={item} />
        )}
        {isMarket && !item.is_available && (
          <div className="mt-4 flex w-full items-center justify-center rounded-full border border-line/40 bg-ink/5 py-2.5 text-sm font-medium text-muted">
            Stock épuisé
          </div>
        )}
      </div>
    </motion.article>
  );
}

export default function ModuleList({ title, subtitle, ns, add_label, create_url, can_add, filters, items }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const Icon = MODULES[ns]?.icon || Sparkles;
  const isMarket = ns === "marketplace";
  // Pour le marché, on ne montre jamais le bouton d'ajout global
  const showAddBtn = !isMarket && create_url && add_label;

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
        {showAddBtn && (
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
          {showAddBtn && (
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
