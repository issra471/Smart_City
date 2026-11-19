import { Head, Link } from "@inertiajs/react";
import { ArrowRight, ArrowUpRight, LayoutGrid, Sparkles } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { MODULES, PageHeader } from "../../lib/ui";

export default function Modules({ modules }) {
  return (
    <>
      <Head title="Modules" />
      <PageHeader eyebrow="Gestion" title="Modules" subtitle="Vue d'ensemble des données et accès aux outils de gestion." icon={LayoutGrid} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => {
          const Icon = MODULES[m.ns]?.icon || Sparkles;
          const cls = "group flex flex-col rounded-[1.75rem] border border-line bg-paper p-6 transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_#15362e17]";
          const inner = (
            <>
              <div className="flex items-start justify-between">
                <span className="grid size-14 place-items-center rounded-2xl bg-mint text-green transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                  <Icon className="size-7" />
                </span>
                <span className="font-serif text-5xl leading-none font-medium">{m.count}</span>
              </div>
              <h2 className="mt-6 font-serif text-2xl">{m.label}</h2>
              <p className="mt-1 text-sm text-muted">
                {m.count} élément{m.count > 1 ? "s" : ""} enregistré{m.count > 1 ? "s" : ""}
              </p>
              <span className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-green">
                {m.external ? "Ouvrir dans Django Admin" : "Ouvrir le suivi"}
                {m.external ? <ArrowUpRight className="size-4" /> : <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />}
              </span>
            </>
          );
          return m.external ? (
            <a key={m.label} href={m.url} className={cls}>{inner}</a>
          ) : (
            <Link key={m.label} href={m.url} className={cls}>{inner}</Link>
          );
        })}
      </div>
    </>
  );
}

Modules.layout = adminLayout;
