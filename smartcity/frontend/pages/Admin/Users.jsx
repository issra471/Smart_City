import { useEffect, useRef, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Eye, Search, Users as UsersIcon } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Avatar, Badge, Btn, Card, EmptyState, PageHeader, cn, fmtDate } from "../../lib/ui";

export default function Users({ users, query, sort, export_url, page }) {
  const { urls } = usePage().props;
  const [q, setQ] = useState(query);
  const [sortBy, setSortBy] = useState(sort);
  const [sortOpen, setSortOpen] = useState(false);
  const first = useRef(true);

  // Recherche au fil de la frappe : Django refait la requête, la page ne se recharge pas.
  useEffect(() => {
    if (first.current) return void (first.current = false);
    const t = setTimeout(() => router.get(urls.admin_users, { ...(q ? { q } : {}), sort: sortBy }, { preserveState: true, preserveScroll: true, replace: true }), 300);
    return () => clearTimeout(t);
  }, [q, sortBy]);

  const goto = (n) => router.get(urls.admin_users, { ...(q ? { q } : {}), sort: sortBy, page: n }, { preserveState: true });
  const changeSort = (value) => setSortBy(value);
  const sortLabels = { name: "nom", joined: "inscription", status: "statut", role: "rôle" };

  return (
    <>
      <Head title="Utilisateurs" />
      <PageHeader eyebrow="Gestion" title="Utilisateurs" subtitle={`${page.count} compte${page.count > 1 ? "s" : ""} ${query ? "trouvé" + (page.count > 1 ? "s" : "") : "au total"}.`} icon={UsersIcon}>
        <label className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, identifiant ou e-mail…"
            aria-label="Rechercher un utilisateur"
            className="w-full rounded-full border border-line bg-paper py-3 pr-4 pl-11 text-sm outline-none transition focus:border-green focus:ring-4 focus:ring-green/10"
          />
        </label>
        <div className="relative">
          <button type="button" aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen((open) => !open)} className="inline-flex min-w-48 cursor-pointer items-center justify-between gap-5 rounded-full border border-line bg-paper px-4 py-3 text-left text-sm font-semibold outline-none transition hover:border-green focus:border-green focus:ring-4 focus:ring-green/10">
            Trier : {sortLabels[sortBy] || sortLabels.name}
            <ChevronDown className={`size-4 text-muted transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>
          {sortOpen && (
            <div role="listbox" aria-label="Trier les utilisateurs" className="absolute top-full right-0 z-30 mt-2 min-w-full overflow-hidden rounded-2xl border border-line bg-paper p-1.5 shadow-[0_12px_30px_#073b2c20]">
              {Object.entries(sortLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={sortBy === value}
                  onClick={() => { changeSort(value); setSortOpen(false); }}
                  className={cn("block w-full cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm transition", sortBy === value ? "bg-mint font-semibold text-green" : "hover:bg-pale")}
                >
                  Trier : {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Btn href={export_url} external variant="soft" icon={Download}>Exporter PDF</Btn>
      </PageHeader>

      {users.length === 0 ? (
        <EmptyState icon={Search} title="Aucun utilisateur trouvé" text="Essayez un autre nom ou un autre e-mail." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="px-6 py-4 font-semibold">Utilisateur</th>
                  <th className="px-4 py-4 font-semibold">E-mail</th>
                  <th className="px-4 py-4 font-semibold">Statut</th>
                  <th className="px-4 py-4 font-semibold">Rôle</th>
                  <th className="px-6 py-4 font-semibold">Inscription</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="group relative border-b border-line/60 transition last:border-0 hover:bg-pale">
                    <td className="px-6 py-3.5">
                      <Link href={u.detail_url} className="flex items-center gap-3 after:absolute after:inset-0">
                        <Avatar initials={u.name.slice(0, 2).toUpperCase()} className="size-10 text-xs" />
                        <span>
                          <b className="block font-semibold">{u.name}</b>
                          <span className="text-xs text-muted">@{u.username}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{u.email || "—"}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone={u.is_active ? "green" : "muted"} dot>{u.is_active ? "Actif" : "Désactivé"}</Badge>
                    </td>
                    <td className="px-4 py-3.5">{u.is_staff ? <Badge tone="ink">Staff</Badge> : <span className="text-muted">Citoyen</span>}</td>
                    <td className="px-6 py-3.5 text-muted">{fmtDate(u.date_joined)}</td>
                    <td className="relative z-10 px-6 py-3.5">
                      <Link href={u.detail_url} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold transition hover:border-green hover:text-green">
                        <Eye className="size-3.5" /> Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {page.pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-6 py-4 text-sm">
              <span className="text-muted">
                Page {page.number} sur {page.pages}
              </span>
              <div className="flex gap-2">
                {[[ChevronLeft, page.number - 1, "Page précédente"], [ChevronRight, page.number + 1, "Page suivante"]].map(([Icon, n, label]) => (
                  <button key={label} type="button" aria-label={label} disabled={n < 1 || n > page.pages} onClick={() => goto(n)} className={cn("grid size-10 cursor-pointer place-items-center rounded-full border border-line bg-paper hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-40")}>
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

Users.layout = adminLayout;
