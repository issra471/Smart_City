import { lazy, Suspense, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowLeft, CalendarClock, CalendarHeart, Clock3, LoaderCircle, MapPin, Pencil, Trash2, UserRound, Users } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EVENT_COLORS, EVENT_ICONS, STATUS_TONE, cn, fmtDateTime, fmtRelative } from "../../lib/ui";

const ReportMap = lazy(() => import("../../components/ReportMap"));

export default function EvenementDetail({ event: e, can_edit, can_delete, can_participate, edit_url, delete_url, list_url, participants_list }) {
  const { auth } = usePage().props;
  const Icon = EVENT_ICONS[e.category] || CalendarHeart;
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [joining, setJoining] = useState(false);
  const remove = () => router.post(delete_url, {}, { onStart: () => setDeleting(true), onFinish: () => setDeleting(false) });
  const participate = () => router.post(e.participate_url, {}, { preserveScroll: true, onStart: () => setJoining(true), onFinish: () => setJoining(false) });

  return (
    <>
      <Head title={e.title} />
      <Link href={list_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Événements
      </Link>

      {/* En-tête */}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="mt-1 hidden size-14 shrink-0 place-items-center rounded-2xl text-paper sm:grid" style={{ background: EVENT_COLORS[e.status] }}>
            <Icon className="size-7" />
          </span>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={STATUS_TONE[e.status]} dot>{e.status_label}</Badge>
              <Badge tone="muted">{e.category_label}</Badge>
              {e.mine && <Badge tone="lime">Organisateur</Badge>}
            </div>
            <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{e.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" /> {e.mine ? "Vous" : e.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" /> {fmtRelative(e.created)}
              </span>
              {e.place && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {e.place}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can_participate && (
            <button type="button" disabled={joining} onClick={participate} className={cn("flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition", e.participating ? "bg-green text-paper hover:bg-dark" : "border border-line bg-paper text-green hover:bg-mint")}>
              {joining ? <LoaderCircle className="size-4 animate-spin" /> : <Users className="size-4" />}
              {e.participating ? "Je participe ✓" : "J'y vais !"}
            </button>
          )}
          {!can_participate && e.participants > 0 && (
            <span className="rounded-full bg-mint px-4 py-2.5 text-sm font-semibold text-green">
              {e.participants} participant{e.participants > 1 ? "s" : ""}
            </span>
          )}
          {can_edit && <Btn href={edit_url} variant="ghost" icon={Pencil}>Modifier</Btn>}
          {can_delete && (confirm ? (
            <span className="flex items-center gap-2 rounded-full border border-coral/40 bg-coral/10 py-1 pr-1 pl-4 text-sm">
              Supprimer ?
              <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={deleting}>Non</Btn>
              <Btn size="sm" variant="danger" onClick={remove} disabled={deleting}>
                {deleting && <LoaderCircle className="size-3.5 animate-spin" />} Oui
              </Btn>
            </span>
          ) : (
            <Btn variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>Supprimer</Btn>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Colonne principale */}
        <div className="flex flex-col gap-5">
          {e.image && (
            <figure className="overflow-hidden rounded-[1.75rem] border border-line">
              <img src={e.image} alt={`Photo : ${e.title}`} className="max-h-[28rem] w-full object-cover" />
            </figure>
          )}

          <Card className="p-6 sm:p-7">
            <h2 className="font-serif text-2xl">Description</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-ink/85">{e.description}</p>
          </Card>

          {e.lat != null && (
            <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
              <Suspense fallback={<div className="h-72 animate-pulse rounded-[1.4rem] bg-pale" />}>
                <ReportMap reports={[e]} selectedId={e.id} iconFor={() => EVENT_ICONS[e.category]} colorFor={() => EVENT_COLORS[e.status]} label="Lieu de l'événement" className="h-72 rounded-[1.4rem]" />
              </Suspense>
            </div>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-6">
          {/* Infos pratiques */}
          <Card className="p-6 sm:p-7">
            <h2 className="mb-4 font-serif text-2xl">Infos pratiques</h2>
            <div className="flex flex-col gap-3">
              {[
                [CalendarClock, "Date", fmtDateTime(e.date)],
                e.date_end && [CalendarClock, "Fin", fmtDateTime(e.date_end)],
                [MapPin, "Lieu", e.place],
                e.address && [MapPin, "Adresse", e.address],
                [UserRound, "Organisateur", e.mine ? "Vous" : e.author],
              ].filter(Boolean).map(([I, label, value]) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-pale p-3">
                  <I className="size-5 shrink-0 text-green" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{label}</p>
                    <p className="truncate font-semibold first-letter:uppercase">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Participants */}
          <Card className="p-6 sm:p-7">
            <h2 className="flex items-center gap-2 font-serif text-2xl">
              <Users className="size-5 text-green" /> Participants
              <span className="ml-auto rounded-full bg-mint px-2.5 py-1 text-sm font-semibold text-green">{e.participants}</span>
            </h2>
            {participants_list.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Personne n'a encore confirmé sa participation. Soyez le premier !</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {participants_list.map((name) => (
                  <li key={name} className="flex items-center gap-3 rounded-2xl bg-pale p-3 text-sm font-medium">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime text-xs font-semibold text-deep">
                      {name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    {name}
                  </li>
                ))}
                {e.participants > participants_list.length && (
                  <p className="text-center text-xs text-muted">et {e.participants - participants_list.length} autre{e.participants - participants_list.length > 1 ? "s" : ""}</p>
                )}
              </ul>
            )}
          </Card>

          {can_edit && <p className="px-2 text-xs text-muted">Vous pouvez modifier ou supprimer cet événement tant qu'il n'a pas commencé.</p>}
        </div>
      </div>
    </>
  );
}

EvenementDetail.layout = appLayout;
