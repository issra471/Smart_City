// Équipes d'intervention : chaque équipe traite des catégories ; les nouveaux signalements lui sont confiés automatiquement.
import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import { AlertTriangle, HardHat, LoaderCircle, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, REPORT_ICONS } from "../../lib/ui";

function TeamCard({ t }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = () => router.post(t.delete_url, {}, { onStart: () => setBusy(true), onFinish: () => setBusy(false) });

  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-deep text-lime">
          <HardHat className="size-6" />
        </span>
        <div className="flex gap-1">
          <Btn href={t.edit_url} variant="ghost" size="sm" icon={Pencil}>
            Modifier
          </Btn>
        </div>
      </div>
      <h2 className="mt-4 font-serif text-2xl leading-tight">{t.name}</h2>
      <div className="mt-2 flex flex-col gap-1 text-sm text-muted">
        {t.manager && (
          <span className="flex items-center gap-2">
            <UserRound className="size-3.5" /> {t.manager}
          </span>
        )}
        {t.phone && (
          <a href={`tel:${t.phone.replace(/\s/g, "")}`} className="flex w-fit items-center gap-2 hover:text-green">
            <Phone className="size-3.5" /> {t.phone}
          </a>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {t.categories.length === 0 && <span className="text-sm text-muted">Aucune catégorie</span>}
        {t.categories.map((c) => {
          const I = REPORT_ICONS[c.value];
          return (
            <span key={c.value} className="flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-[13px] font-medium text-green">
              {I && <I className="size-3.5" />} {c.label}
            </span>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4">
        <div>
          <p className="font-serif text-3xl leading-none">{t.active}</p>
          <p className="mt-1 text-xs text-muted">en cours</p>
        </div>
        <div>
          <p className="font-serif text-3xl leading-none text-green">{t.done}</p>
          <p className="mt-1 text-xs text-muted">résolus</p>
        </div>
      </div>
      <div className="mt-auto pt-5">
        {confirm ? (
          <div className="rounded-2xl border border-coral/40 bg-coral/10 p-3 text-sm">
            <p>Supprimer cette équipe ?{t.active > 0 && ` Ses ${t.active} signalement(s) en cours seront sans équipe.`}</p>
            <div className="mt-2 flex justify-end gap-2">
              <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>
                Non
              </Btn>
              <Btn size="sm" variant="danger" onClick={remove} disabled={busy}>
                {busy && <LoaderCircle className="size-3.5 animate-spin" />} Oui, supprimer
              </Btn>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="flex cursor-pointer items-center gap-1.5 text-sm text-muted hover:text-[#b4532f]">
            <Trash2 className="size-3.5" /> Supprimer l'équipe
          </button>
        )}
      </div>
    </Card>
  );
}

export default function AdminEquipes({ teams, uncovered, create_url, reports_url }) {
  return (
    <>
      <Head title="Équipes" />
      <PageHeader eyebrow="Gestion" title="Équipes d'intervention" subtitle="Chaque nouveau signalement est confié automatiquement à l'équipe qui traite sa catégorie." icon={HardHat}>
        <Btn href={reports_url} variant="ghost" size="lg">
          Signalements
        </Btn>
        <Btn href={create_url} icon={Plus} size="lg">
          Nouvelle équipe
        </Btn>
      </PageHeader>

      {uncovered.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#d99a16]/40 bg-[#f4c95d]/15 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#7a5a10]" />
          <p>
            Aucune équipe ne traite : <b>{uncovered.map((c) => c.label).join(", ")}</b>. Ces signalements arriveront « sans équipe » et devront être affectés à la main.
          </p>
        </div>
      )}

      {teams.length === 0 ? (
        <EmptyState icon={HardHat} title="Aucune équipe" text="Créez une équipe par type de problème (éclairage, voirie, eau…).">
          <Btn href={create_url} icon={Plus}>
            Nouvelle équipe
          </Btn>
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <TeamCard key={t.id} t={t} />
          ))}
        </div>
      )}
      {teams.length > 0 && <Badge tone="muted" className="mt-6">{teams.length} équipe{teams.length > 1 ? "s" : ""}</Badge>}
    </>
  );
}

AdminEquipes.layout = adminLayout;
