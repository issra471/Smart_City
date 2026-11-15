// Page d'un animal : photo, carte, infos. Animal en difficulté : suivi (Signalé → Pris en charge → Résolu),
// résultat, messages de la ville et panneau de gestion pour l'administration. Observation : simple partage.
import { isValidElement, lazy, Suspense, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { ArrowLeft, Ban, CalendarClock, Check, Clock3, Hash, HandHeart, LoaderCircle, MapPin, MessageSquareText, PawPrint, Pencil, ShieldCheck, Trash2, UserRound } from "lucide-react";
import DjangoForm from "../../components/DjangoForm";
import { adminLayout, appLayout } from "../../layouts/AppShell";
import { ANIMAL_ICONS, Badge, Btn, Card, STATUS_TONE, animalColor, cn, fmtDateTime, fmtRelative } from "../../lib/ui";
import { CaseBadge, SeenButton } from "./List";

const ReportMap = lazy(() => import("../../components/ReportMap"));
const STEP_TEXT = { ouvert: "Signalement envoyé", en_cours: "Pris en charge", resolu: "Animal aidé" };
const PRIORITY_TONE = { basse: "muted", moyenne: "amber", urgente: "coral" };

function Timeline({ steps, status, partner }) {
  const current = steps.findIndex((s) => s.key === status);
  return (
    <ol className="flex flex-col gap-5">
      {steps.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.key} className="relative flex gap-4">
            {i < steps.length - 1 && <span aria-hidden="true" className={cn("absolute top-9 left-[17px] h-[calc(100%-12px)] w-0.5", i < current ? "bg-green" : "bg-line")} />}
            <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-full border-2", done ? "border-green bg-green text-paper" : "border-line bg-paper text-muted")}>
              {done ? <Check className="size-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
            </span>
            <div className="pt-1">
              <p className={cn("font-semibold", !done && "text-muted")}>{s.key === "en_cours" && partner && done ? `Pris en charge par ${partner}` : STEP_TEXT[s.key] || s.label}</p>
              <p className="text-xs text-muted">{s.date && done ? fmtDateTime(s.date) : "En attente"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function AnimalDetail({ item: a, steps, messages, can_edit, can_delete, can_support, edit_url, delete_url, list_url, manage }) {
  const Icon = ANIMAL_ICONS[a.animal] || PawPrint;
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = () => router.post(delete_url, {}, { onStart: () => setDeleting(true), onFinish: () => setDeleting(false) });

  return (
    <>
      <Head title={a.title} />
      <Link href={list_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Animaux
      </Link>

      <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="mt-1 hidden size-14 shrink-0 place-items-center rounded-2xl text-paper sm:grid" style={{ background: animalColor(a) }}>
            <Icon className="size-7" />
          </span>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <CaseBadge a={a} />
              {a.urgent && <Badge tone={STATUS_TONE[a.status]} dot>{a.status_label}</Badge>}
              {a.urgent && !["resolu", "rejete"].includes(a.status) && <Badge tone={PRIORITY_TONE[a.priority]}>Priorité {a.priority_label.toLowerCase()}</Badge>}
              {a.partner && a.urgent && (
                <Badge tone="ink">
                  <HandHeart className="size-3" /> {a.partner}
                </Badge>
              )}
            </div>
            <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{a.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" /> {a.mine ? "Vous" : a.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" /> vu {fmtRelative(a.seen_at)}
              </span>
              {a.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {a.address}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can_support && <SeenButton a={a} size="lg" />}
          {!can_support && a.urgent && a.supports > 0 && (
            <span className="rounded-full bg-mint px-4 py-2.5 text-sm font-semibold text-green">
              Vu aussi par {a.supports} citoyen{a.supports > 1 ? "s" : ""}
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

      {a.status === "rejete" && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-line bg-ink/5 p-4 text-sm">
          <Ban className="mt-0.5 size-4 shrink-0 text-muted" />
          <p>Ce signalement a été rejeté par la ville. Le motif est indiqué dans les messages ci-dessous.</p>
        </div>
      )}
      {a.status === "resolu" && a.result_label && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-mint p-4 text-sm text-green">
          <HandHeart className="size-5 shrink-0" />
          <p>
            <b>Résultat : {a.result_label}.</b> Merci pour votre signalement !
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          {a.photo && (
            <figure className="overflow-hidden rounded-[1.75rem] border border-line">
              <img src={a.photo} alt={`Photo : ${a.title}`} className="max-h-[28rem] w-full object-cover" />
            </figure>
          )}
          <Card className="p-6 sm:p-7">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [Icon, "Animal", a.animal_label],
                [Hash, "Nombre", a.count],
                [CalendarClock, "Vu le", fmtDateTime(a.seen_at)],
              ].map(([I, label, value]) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-pale p-3">
                  <I className="size-5 shrink-0 text-green" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{label}</p>
                    <p className="truncate font-semibold first-letter:uppercase">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            {a.description && <p className="mt-5 leading-relaxed whitespace-pre-line text-ink/85">{a.description}</p>}
          </Card>
          {a.lat != null && (
            <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
              <Suspense fallback={<div className="h-72 animate-pulse rounded-[1.4rem] bg-pale" />}>
                <ReportMap reports={[a]} selectedId={a.id} iconFor={(x) => ANIMAL_ICONS[x.animal]} colorFor={animalColor} label="Lieu de l'animal" className="h-72 rounded-[1.4rem]" />
              </Suspense>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-6">
          {a.urgent ? (
            <>
              {a.status !== "rejete" && (
                <Card className="p-6 sm:p-7">
                  <h2 className="mb-5 font-serif text-2xl">Suivi</h2>
                  <Timeline steps={steps} status={a.status} partner={a.partner} />
                </Card>
              )}
              <Card className="p-6 sm:p-7">
                <h2 className="flex items-center gap-2 font-serif text-2xl">
                  <MessageSquareText className="size-5 text-green" /> Messages de la ville
                </h2>
                {messages.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Aucun message pour le moment. Vous serez informé ici de l'intervention.</p>
                ) : (
                  <ul className="mt-4 flex flex-col gap-3">
                    {messages.map((m) => (
                      <li key={m.id} className={cn("rounded-2xl p-4", m.kind === "team" ? "border border-line" : "bg-pale")}>
                        <p className="flex items-start gap-2 text-[15px]">
                          {m.kind === "team" && <HandHeart className="mt-0.5 size-4 shrink-0 text-green" />}
                          {m.text}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          Administration · {m.status_label} · {fmtRelative(m.date)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              {can_edit && <p className="px-2 text-xs text-muted">Vous pouvez modifier ou supprimer ce signalement tant qu'il n'est pas pris en charge.</p>}
            </>
          ) : (
            <Card className="p-6 sm:p-7">
              <h2 className="font-serif text-2xl">Observation</h2>
              <p className="mt-2 text-sm text-muted">Un animal vu en ville, partagé pour le plaisir et pour mieux connaître la nature de My City. Aucune intervention n'est nécessaire.</p>
            </Card>
          )}
        </div>
      </div>

      {manage && (
        <section className="grain relative mt-8 overflow-hidden rounded-[1.75rem] bg-deep p-6 text-paper sm:p-8">
          <div aria-hidden="true" className="absolute -top-24 -right-24 size-72 rounded-full bg-green/40 blur-3xl" />
          <div className="relative">
            <h2 className="flex items-center gap-2.5 font-serif text-3xl">
              <ShieldCheck className="size-6 text-lime" /> Gestion du signalement
            </h2>
            <p className="mt-1 mb-6 text-sm text-paper/60">Statut, priorité, partenaire et message au citoyen. Pour rejeter (faux, hors sujet), choisissez « Rejeté » et expliquez le motif. Une fois résolu, indiquez le résultat.</p>
            <div className="rounded-[1.5rem] bg-paper p-5 text-ink sm:p-6">
              <DjangoForm key={a.updated} form={manage.form} action={manage.url} submitLabel="Mettre à jour" columns={2} wide={["partenaire", "resultat"]} placeholders={{ commentaire: "Ex. Le vétérinaire passe cet après-midi." }} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// Inertia appelle cette fonction avec les données de la page, puis avec la page elle-même.
AnimalDetail.layout = (page) => {
  const props = isValidElement(page) ? page.props : page;
  return props?.manage || props?.list_url?.includes("/gestion/") ? adminLayout(page) : appLayout(page);
};
