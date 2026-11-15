// Propositions de transports envoyées par les citoyens : l'administrateur approuve ou refuse.
import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import { Bike, Check, Inbox, MapPin, X } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, STATION_ICONS, STATUS_TONE, fmtShort } from "../../lib/ui";

export default function AdminTransports({ rows, station_create_url }) {
  const [busy, setBusy] = useState(null);
  const decide = (row, decision) => router.post(row.decide_url, { decision }, { forceFormData: true, preserveScroll: true, onStart: () => setBusy(row.id), onFinish: () => setBusy(null) });
  const waiting = rows.filter((r) => r.status === "en_attente").length;

  return (
    <>
      <Head title="Transports" />
      <PageHeader eyebrow="Gestion" title="Transports" subtitle={waiting ? `${waiting} proposition${waiting > 1 ? "s" : ""} en attente de votre décision.` : "Aucune proposition en attente."}>
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
                      </td>
                      <td className="px-6 py-4">
                        {r.status === "en_attente" && (
                          <div className="flex justify-end gap-2">
                            <Btn size="sm" icon={Check} disabled={busy === r.id} onClick={() => decide(r, "approuve")}>
                              Approuver
                            </Btn>
                            <Btn size="sm" variant="danger" icon={X} disabled={busy === r.id} onClick={() => decide(r, "refuse")}>
                              Refuser
                            </Btn>
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
