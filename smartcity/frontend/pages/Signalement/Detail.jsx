// Page d'un signalement : photo, carte, suivi (Envoyé → En cours → Résolu), messages de l'administration,
// actions de l'auteur (modifier, supprimer) et panneau de gestion pour l'administrateur.
import { isValidElement, lazy, Suspense, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { ArrowLeft, Check, Clock3, HardHat, LoaderCircle, MapPin, MessageSquareText, Pencil, ShieldCheck, Trash2, TriangleAlert, UserRound } from "lucide-react";
import DjangoForm from "../../components/DjangoForm";
import SupportButton from "../../components/SupportButton";
import { adminLayout, appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, REPORT_COLORS, REPORT_ICONS, STATUS_TONE, cn, fmtDateTime, fmtRelative } from "../../lib/ui";

const ReportMap = lazy(() => import("../../components/ReportMap"));

const STEP_TEXT = {
  ouvert: "Signalement envoyé",
  en_cours: "Pris en charge par les équipes",
  resolu: "Problème résolu",
};
const PRIORITY_TONE = { basse: "muted", moyenne: "amber", urgente: "coral" };

function Timeline({ steps, status, team }) {
  const current = steps.findIndex((s) => s.key === status);
  return (
    <ol className="relative flex flex-col gap-5">
      {steps.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.key} className="relative flex gap-4">
            {i < steps.length - 1 && <span aria-hidden="true" className={cn("absolute top-9 left-[17px] h-[calc(100%-12px)] w-0.5", i < current ? "bg-green" : "bg-line")} />}
            <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-full border-2", done ? "border-green bg-green text-paper" : "border-line bg-paper text-muted")}>
              {done ? <Check className="size-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
            </span>
            <div className="pt-1">
              <p className={cn("font-semibold", !done && "text-muted")}>{s.key === "en_cours" && team && done ? `Pris en charge par ${team}` : STEP_TEXT[s.key] || s.label}</p>
              <p className="text-xs text-muted">{s.date && done ? fmtDateTime(s.date) : "En attente"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function SignalementDetail({ report: r, steps, messages, can_edit, can_delete, can_support, edit_url, delete_url, list_url, manage }) {
  const Icon = REPORT_ICONS[r.category] || TriangleAlert;
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = () => router.post(delete_url, {}, { onStart: () => setDeleting(true), onFinish: () => setDeleting(false) });

  return (
    <>
      <Head title={r.title} />
      <Link href={list_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Signalements
      </Link>

      {/* En-tête */}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="mt-1 hidden size-14 shrink-0 place-items-center rounded-2xl text-paper sm:grid" style={{ background: REPORT_COLORS[r.status] }}>
            <Icon className="size-7" />
          </span>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={STATUS_TONE[r.status]} dot>{r.status_label}</Badge>
              <Badge tone="muted">{r.category_label}</Badge>
              {r.status !== "resolu" && <Badge tone={PRIORITY_TONE[r.priority]}>Priorité {r.priority_label.toLowerCase()}</Badge>}
              {r.team && (
                <Badge tone="ink">
                  <HardHat className="size-3" /> {r.team}
                </Badge>
              )}
            </div>
            <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{r.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" /> {r.mine ? "Vous" : r.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" /> {fmtRelative(r.date)}
              </span>
              {r.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {r.address}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can_support && <SupportButton r={r} size="lg" />}
          {!can_support && r.supports > 0 && (
            <span className="rounded-full bg-mint px-4 py-2.5 text-sm font-semibold text-green">
              {r.supports} citoyen{r.supports > 1 ? "s" : ""} gêné{r.supports > 1 ? "s" : ""} aussi
            </span>
          )}
          {can_edit && (
            <Btn href={edit_url} variant="ghost" icon={Pencil}>
              Modifier
            </Btn>
          )}
          {can_delete &&
            (confirm ? (
              <span className="flex items-center gap-2 rounded-full border border-coral/40 bg-coral/10 py-1 pr-1 pl-4 text-sm">
                Supprimer ?
                <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={deleting}>
                  Non
                </Btn>
                <Btn size="sm" variant="danger" onClick={remove} disabled={deleting}>
                  {deleting && <LoaderCircle className="size-3.5 animate-spin" />} Oui, supprimer
                </Btn>
              </span>
            ) : (
              <Btn variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
                Supprimer
              </Btn>
            ))}
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Colonne principale */}
        <div className="flex flex-col gap-5">
          {(r.photo || r.photo_after) && (
            <div className={cn("grid gap-3", r.photo && r.photo_after && "sm:grid-cols-2")}>
              {r.photo && (
                <figure className="relative overflow-hidden rounded-[1.75rem] border border-line">
                  <img src={r.photo} alt={`Photo : ${r.title}`} className="max-h-[26rem] w-full object-cover" />
                  {r.photo_after && <figcaption className="absolute top-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-xs font-semibold">Avant</figcaption>}
                </figure>
              )}
              {r.photo_after && (
                <figure className="relative overflow-hidden rounded-[1.75rem] border border-line">
                  <img src={r.photo_after} alt="Après l'intervention" className="max-h-[26rem] w-full object-cover" />
                  <figcaption className="absolute top-3 left-3 rounded-full bg-green px-3 py-1 text-xs font-semibold text-paper">Après</figcaption>
                </figure>
              )}
            </div>
          )}

          <Card className="p-6 sm:p-7">
            <h2 className="font-serif text-2xl">Description</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-ink/85">{r.description}</p>
          </Card>

          {r.lat != null && (
            <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
              <Suspense fallback={<div className="h-72 animate-pulse rounded-[1.4rem] bg-pale" />}>
                <ReportMap reports={[r]} selectedId={r.id} className="h-72 rounded-[1.4rem]" />
              </Suspense>
            </div>
          )}
        </div>

        {/* Suivi */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-6">
          <Card className="p-6 sm:p-7">
            <h2 className="mb-5 font-serif text-2xl">Suivi</h2>
            <Timeline steps={steps} status={r.status} team={r.team} />
          </Card>

          <Card className="p-6 sm:p-7">
            <h2 className="flex items-center gap-2 font-serif text-2xl">
              <MessageSquareText className="size-5 text-green" /> Messages de la ville
            </h2>
            {messages.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucun message pour le moment. Vous serez informé ici de l'avancement.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {messages.map((m) => (
                  <li key={m.id} className={cn("rounded-2xl p-4", m.kind === "team" ? "border border-line" : "bg-pale")}>
                    <p className="flex items-start gap-2 text-[15px]">
                      {m.kind === "team" && <HardHat className="mt-0.5 size-4 shrink-0 text-green" />}
                      {m.text}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {m.author} · {m.status_label} · {fmtRelative(m.date)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {can_edit && <p className="px-2 text-xs text-muted">Vous pouvez modifier ou supprimer ce signalement tant que les équipes ne l'ont pas pris en charge.</p>}
        </div>
      </div>

      {/* Gestion (administrateur) */}
      {manage && (
        <section className="grain relative mt-8 overflow-hidden rounded-[1.75rem] bg-deep p-6 text-paper sm:p-8">
          <div aria-hidden="true" className="absolute -top-24 -right-24 size-72 rounded-full bg-green/40 blur-3xl" />
          <div className="relative">
            <h2 className="flex items-center gap-2.5 font-serif text-3xl">
              <ShieldCheck className="size-6 text-lime" /> Gestion du signalement
            </h2>
            <p className="mt-1 mb-6 text-sm text-paper/60">Changez le statut, fixez la priorité et écrivez au citoyen. Le message apparaît dans « Messages de la ville ».</p>
            <div className="rounded-[1.5rem] bg-paper p-5 text-ink sm:p-6">
              <DjangoForm
                key={r.updated}
                form={manage.form}
                action={manage.url}
                submitLabel="Mettre à jour"
                columns={2}
                labels={{ statut: "Statut", photo_apres: "Photo après intervention (facultatif)" }}
                placeholders={{ commentaire: "Ex. Une équipe interviendra jeudi matin." }}
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// Menu d'administration pour l'administrateur, menu citoyen pour les autres.
// Inertia appelle cette fonction avec les données de la page, puis avec la page elle-même.
SignalementDetail.layout = (page) => {
  const props = isValidElement(page) ? page.props : page;
  return props?.manage ? adminLayout(page) : appLayout(page);
};
