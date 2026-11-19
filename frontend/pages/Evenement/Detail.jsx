// Page détail d'un événement : infos, carte, inscription, actions (modifier/supprimer).
import { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CalendarHeart, Edit3, MapPin, Trash2, Users, X } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, cn, fmtDateTime, fmtRelative } from "../../lib/ui";

function ConfirmDelete({ event, onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-deep/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        className="relative w-full max-w-sm overflow-hidden rounded-t-[2rem] bg-cream p-7 shadow-2xl sm:rounded-[2rem]"
      >
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-coral/10 text-[#b4532f]">
          <Trash2 className="size-7" />
        </div>
        <h2 className="font-serif text-2xl font-medium">Supprimer cet événement ?</h2>
        <p className="mt-2 text-sm text-muted">
          « <strong>{event.title}</strong> » sera définitivement supprimé.
        </p>
        <div className="mt-7 flex gap-3">
          <Btn variant="ghost" className="flex-1" onClick={onCancel}>Annuler</Btn>
          <Btn variant="danger" className="flex-1" onClick={onConfirm} disabled={busy}>
            {busy ? "Suppression…" : "Supprimer"}
          </Btn>
        </div>
      </motion.div>
    </div>
  );
}

export default function EvenementDetail({
  event, can_edit, can_delete, edit_url, delete_url, rsvp_url, list_url, admin_url,
}) {
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [registered, setRegistered] = useState(event.is_registered);
  const [count, setCount] = useState(event.participants_count);

  const handleDelete = () => {
    setDeleting(true);
    router.post(delete_url, {}, { onFinish: () => setDeleting(false) });
  };

  const handleRsvp = () => {
    setRsvpBusy(true);
    router.post(rsvp_url, {}, {
      preserveScroll: true,
      preserveState: false,
      onFinish: () => setRsvpBusy(false),
    });
  };

  const upcoming = event.is_upcoming;

  return (
    <>
      <Head title={event.title} />

      <Link href={admin_url || list_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {admin_url ? "Gestion événements" : "Événements"}
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        {/* Contenu principal */}
        <div className="flex flex-col gap-5">
          {/* Image hero */}
          <div className={cn("relative overflow-hidden rounded-[1.75rem]", event.image ? "aspect-[16/8]" : "aspect-[16/6] bg-gradient-to-br from-mint to-lime/40")}>
            {event.image ? (
              <img src={event.image} alt={event.title} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-green">
                <CalendarHeart className="size-20 opacity-30" strokeWidth={1.2} />
              </div>
            )}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <Badge tone={upcoming ? "green" : "muted"} dot className="bg-paper/90 backdrop-blur">
                {upcoming ? "À venir" : "Passé"}
              </Badge>
            </div>
          </div>

          {/* Infos */}
          <Card className="p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-green uppercase">Événement</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight font-medium">{event.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <CalendarHeart className="size-4" />
                {fmtDateTime(event.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.lieu}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4" />
                {count} participant{count !== 1 ? "s" : ""}
              </span>
            </div>

            {event.description && (
              <p className="mt-6 leading-relaxed text-muted whitespace-pre-line">{event.description}</p>
            )}

            <p className="mt-5 text-sm text-muted/70">
              Organisé par <strong className="text-ink">{event.author}</strong>
              {event.created_at && ` · Publié ${fmtRelative(event.created_at)}`}
            </p>
          </Card>
        </div>

        {/* Panneau latéral */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-8">
          {/* Participation */}
          {upcoming && (
            <Card className="p-6">
              <h2 className="font-serif text-2xl">Participer</h2>
              <p className="mt-2 text-sm text-muted">
                {registered
                  ? "Vous êtes inscrit(e) à cet événement."
                  : "Rejoignez cet événement et rencontrez d'autres citoyens."}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-mint font-semibold text-green">
                  {count}
                </span>
                <span className="text-sm text-muted">participant{count !== 1 ? "s" : ""} inscrit{count !== 1 ? "s" : ""}</span>
              </div>
              {rsvp_url && (
                <Btn
                  className="mt-5 w-full justify-center"
                  variant={registered ? "ghost" : "primary"}
                  onClick={handleRsvp}
                  disabled={rsvpBusy}
                >
                  {rsvpBusy ? "En cours…" : registered ? "Se désinscrire" : "Je participe !"}
                </Btn>
              )}
            </Card>
          )}

          {/* Lieu */}
          <Card className="p-6">
            <h2 className="mb-3 font-serif text-xl">Lieu</h2>
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint text-green">
                <MapPin className="size-4" />
              </span>
              <p className="font-medium">{event.lieu}</p>
            </div>
          </Card>

          {/* Actions (modifier / supprimer) */}
          {(can_edit || can_delete) && (
            <Card className="p-6">
              <h2 className="mb-4 font-serif text-xl">Actions</h2>
              <div className="flex flex-col gap-2">
                {can_edit && (
                  <Btn href={edit_url} variant="ghost" icon={Edit3} className="w-full justify-center">
                    Modifier l'événement
                  </Btn>
                )}
                {can_delete && (
                  <Btn variant="danger" icon={Trash2} className="w-full justify-center" onClick={() => setShowDelete(true)}>
                    Supprimer l'événement
                  </Btn>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDelete && (
          <ConfirmDelete
            event={event}
            onConfirm={handleDelete}
            onCancel={() => setShowDelete(false)}
            busy={deleting}
          />
        )}
      </AnimatePresence>
    </>
  );
}

EvenementDetail.layout = appLayout;
