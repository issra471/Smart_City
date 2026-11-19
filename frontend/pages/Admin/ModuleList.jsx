import { Head } from "@inertiajs/react";
import { ArrowUpRight, Inbox } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, STATUS_TONE, fmtShort } from "../../lib/ui";

/** Tableau de suivi d'un module (signalements, événements). La modification se fait dans Django Admin. */
export default function AdminModuleList({ title, description, admin_url, rows }) {
  const hasStatus = rows.some((r) => r.status);
  return (
    <>
      <Head title={title} />
      <PageHeader eyebrow="Gestion" title={title} subtitle={description}>
        <Btn href={admin_url} external variant="ghost" size="lg">
          Ouvrir Django Admin <ArrowUpRight className="size-4" />
        </Btn>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucun élément enregistré" text="Les nouvelles entrées apparaîtront ici." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="px-6 py-4 font-semibold">Titre</th>
                  <th className="px-4 py-4 font-semibold">Détail</th>
                  {hasStatus && <th className="px-4 py-4 font-semibold">Statut</th>}
                  <th className="px-4 py-4 font-semibold">Auteur</th>
                  <th className="px-4 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 transition last:border-0 hover:bg-pale">
                    <td className="px-6 py-4 font-semibold">{r.title}</td>
                    <td className="px-4 py-4 text-muted">{r.detail}</td>
                    {hasStatus && <td className="px-4 py-4">{r.status && <Badge tone={STATUS_TONE[r.status.key]} dot>{r.status.label}</Badge>}</td>}
                    <td className="px-4 py-4 text-muted">{r.author}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-muted">{fmtShort(r.date)}</td>
                    <td className="px-6 py-4 text-right">
                      <a href={r.manage_url} className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-green underline-offset-4 hover:underline">
                        Gérer <ArrowUpRight className="size-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

AdminModuleList.layout = adminLayout;
