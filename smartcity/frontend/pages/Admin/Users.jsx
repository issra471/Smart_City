import { useEffect, useRef, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, Search, Users as UsersIcon } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Avatar, Badge, Card, EmptyState, PageHeader, cn, fmtDate } from "../../lib/ui";

export default function Users({ users, query, page }) {
  const { urls } = usePage().props;
  const [q, setQ] = useState(query);
  const first = useRef(true);

  // Recherche au fil de la frappe : Django refait la requête, la page ne se recharge pas.
  useEffect(() => {
    if (first.current) return void (first.current = false);
    const t = setTimeout(() => router.get(urls.admin_users, q ? { q } : {}, { preserveState: true, preserveScroll: true, replace: true }), 300);
    return () => clearTimeout(t);
  }, [q]);

  const goto = (n) => router.get(urls.admin_users, { ...(q ? { q } : {}), page: n }, { preserveState: true });

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
