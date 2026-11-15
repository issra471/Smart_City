// Propositions de transports envoyées par les citoyens : l'administrateur approuve, ou refuse avec un motif.
import { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import CancelWithReason from "../../components/CancelWithReason";
import { ArrowLeft, Bike, Check, Inbox, MapPin } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, STATION_ICONS, STATUS_TONE, fmtShort } from "../../lib/ui";

export default function AdminTransports({ rows, station_create_url, back_url }) {
  const [busy, setBusy] = useState(null);
  const decide = (row, decision) => router.post(row.decide_url, { decision }, { forceFormData: true, preserveScroll: true, onStart: () => setBusy(row.id), onFinish: () => setBusy(null) });
  const waiting = rows.filter((r) => r.status === "en_attente").length;

  return (
    <>
      <Head title="Propositions de transport" />
      <Link href={back_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Gestion mobilité
      </Link>
      <PageHeader eyebrow="Gestion" title="Propositions de transport" subtitle={waiting ? `${waiting} proposition${waiting > 1 ? "s" : ""} en attente de votre décision.` : "Aucune proposition en attente."}>
        <Btn href={station_create_url} icon={MapPin} size="lg">
          Ajouter une station
        </Btn>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucun transport proposé" text="Les propositions des citoyens apparaîtront ici." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="px-6 py-4 font-semibold">Transport</th>
                  <th className="px-4 py-4 font-semibold">Station</th>
                  <th className="px-4 py-4 font-semibold">Proposé par</th>
                  <th className="px-4 py-4 font-semibold">Date</th>
                  <th className="px-4 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const Icon = STATION_ICONS[r.type] || Bike;
                  return (
                    <tr key={r.id} className="border-b border-line/60 transition last:border-0 hover:bg-pale">
                      <td className="px-6 py-4 font-semibold">
                        <span className="flex items-center gap-2.5">
                          <Icon className="size-4 text-green" /> {r.units} × {r.type_label}
                        </span>
                      </td>
                      <td className="px-4 py-4">{r.station}</td>
                      <td className="px-4 py-4 text-muted">{r.author}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-muted">{fmtShort(r.date)}</td>
                      <td className="px-4 py-4">
                        <Badge tone={STATUS_TONE[r.status]} dot>
                          {r.status_label}
                        </Badge>
                        {r.reason && <p className="mt-1 max-w-56 text-xs text-muted">{r.reason}</p>}
                      </td>
                      <td className="px-6 py-4">
                        {r.status === "en_attente" && (
                          <div className="flex min-w-72 flex-wrap justify-end gap-2">
                            <Btn size="sm" icon={Check} disabled={busy === r.id} onClick={() => decide(r, "approuve")}>
                              Approuver
                            </Btn>
                            <CancelWithReason url={r.decide_url} extra={{ decision: "refuse" }} label="Refuser" confirmLabel="Refuser" placeholder="Motif du refus (ex. station déjà pleine)" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

AdminTransports.layout = adminLayout;
