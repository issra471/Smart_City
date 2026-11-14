import { useMemo, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { Bike, CalendarCheck, MapPin, Plus, Search } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Chips, EmptyState, PageHeader, STATION_ICONS, cn } from "../../lib/ui";

function StationCard({ s, index }) {
  const Icon = STATION_ICONS[s.type] || Bike;
  const full = s.units === 0;
  const low = !full && s.units <= 2;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="group flex flex-col rounded-[1.75rem] border border-line bg-paper p-6 transition-shadow hover:shadow-[0_24px_60px_#15362e1a]"
    >
      <div className="flex items-start justify-between">
        <span className={cn("grid size-14 place-items-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110", full ? "bg-ink/5 text-muted" : "bg-mint text-green")}>
          <Icon className="size-7" />
        </span>
        <Badge tone="muted">{s.type_label}</Badge>
      </div>
      <h3 className="mt-5 font-serif text-2xl leading-tight font-medium">{s.name}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
        <MapPin className="size-3.5 shrink-0" /> {s.address || "Adresse non renseignée"}
      </p>

      <div className="mt-6 flex items-end justify-between gap-3 border-t border-line pt-5">
        <div>
          <p className="font-serif text-4xl leading-none font-medium">{s.units}</p>
          <p className={cn("mt-1 flex items-center gap-1.5 text-xs font-medium", full ? "text-muted" : low ? "text-[#b4532f]" : "text-green")}>
            <i className={cn("size-1.5 rounded-full", full ? "bg-muted" : low ? "bg-coral" : "bg-green")} />
            {full ? "Complet" : low ? "Bientôt complet" : `disponible${s.units > 1 ? "s" : ""}`}
          </p>
        </div>
        {full ? (
          <span className="rounded-full bg-ink/5 px-4 py-2.5 text-sm text-muted">Indisponible</span>
        ) : (
          <Btn href={s.reserve_url} arrow>
            Réserver
          </Btn>
        )}
      </div>
    </motion.article>
  );
}

export default function Stations({ stations, types, current_type }) {
  const { urls } = usePage().props;
  const [type, setType] = useState(current_type || "");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stations.filter((s) => (!type || s.type === type) && (!q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)));
  }, [stations, type, query]);

  const chips = [
    { value: "", label: "Tous", count: stations.length },
    ...types.map((t) => ({ ...t, icon: STATION_ICONS[t.value], count: stations.filter((s) => s.type === t.value).length })),
  ];
  const units = stations.reduce((n, s) => n + s.units, 0);

  return (
    <>
      <Head title="Me déplacer" />
      <PageHeader eyebrow="Services citoyens" title="Me déplacer" subtitle="Vélos, trottinettes, bus électriques, covoiturage : trouvez une station et réservez." icon={Bike}>
        <Btn href={urls.reservations} variant="ghost" icon={CalendarCheck}>
          Mes réservations
        </Btn>
        <Btn href={urls.mobilite_create} icon={Plus}>
          Ajouter une station
        </Btn>
      </PageHeader>

      {stations.length === 0 ? (
        <EmptyState icon={Bike} title="Aucune station pour le moment." text="Ajoutez une première station pour commencer.">
          <Btn href={urls.mobilite_create} icon={Plus}>
            Ajouter une station
          </Btn>
        </EmptyState>
      ) : (
        <>
          <div className="grain relative mb-6 grid gap-px overflow-hidden rounded-[1.75rem] bg-deep text-paper sm:grid-cols-3">
            {[
              [stations.length, "stations"],
              [units, "unités disponibles"],
              [stations.filter((s) => s.units === 0).length, "stations complètes"],
            ].map(([n, label]) => (
              <div key={label} className="relative px-6 py-5">
                <p className="font-serif text-4xl leading-none font-medium text-lime">{n}</p>
                <p className="mt-1.5 text-sm text-paper/60">{label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Chips options={chips} value={type} onChange={setType} />
            <label className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom ou adresse…"
                aria-label="Rechercher une station"
                className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none transition focus:border-green focus:ring-4 focus:ring-green/10"
              />
            </label>
          </div>

          {shown.length === 0 ? (
            <EmptyState icon={Search} title="Aucune station trouvée" text="Essayez un autre type de transport ou un autre mot.">
              <Btn variant="ghost" onClick={() => (setType(""), setQuery(""))}>
                Tout afficher
              </Btn>
            </EmptyState>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {shown.map((s, i) => (
                  <StationCard key={s.id} s={s} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </>
  );
}

Stations.layout = appLayout;
