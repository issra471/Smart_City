// Admin : CRUD complet des événements.
import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarHeart, Edit3, MapPin, Plus, Trash2, Users, X } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, cn, fmtDateTime, fmtRelative } from "../../lib/ui";

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
          « <strong>{event.title}</strong> » sera définitivement supprimé et les participants notifiés.
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

function EventRow({ event, onDelete }) {
  const [busy, setBusy] = useState(false);
  const upcoming = event.is_upcoming;

  return (
    <tr className="border-b border-line/60 transition last:border-0 hover:bg-pale">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {event.image ? (
            <img src={event.image} alt="" className="size-10 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", upcoming ? "bg-mint text-green" : "bg-ink/5 text-muted")}>
              <CalendarHeart className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold truncate">{event.title}</p>
            <p className="text-xs text-muted truncate max-w-[200px]">{event.description?.slice(0, 60)}{event.description?.length > 60 ? "…" : ""}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-3.5 shrink-0" /> {event.place}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <p className="text-sm font-medium">{fmtDateTime(event.date)}</p>
        <Badge tone={upcoming ? "green" : "muted"} dot className="mt-1">
          {upcoming ? "À venir" : "Passé"}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <Users className="size-3.5 shrink-0" /> {event.participants_count}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-muted">{event.author}</td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <Btn href={event.edit_url} variant="ghost" size="sm" icon={Edit3}>
            Modifier
          </Btn>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(event)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-coral/30 px-3.5 py-2 text-[13px] font-semibold text-[#b4532f] transition hover:bg-coral/10 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" /> Supprimer
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminEvenements({ events, stats, create_url, back_url }) {
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (!toDelete) return;
    setDeleting(true);
    router.post(toDelete.delete_url, {}, {
      onFinish: () => { setDeleting(false); setToDelete(null); },
    });
  };

  return (
    <>
      <Head title="Gestion des événements" />

      <PageHeader eyebrow="Administration" title="Événements" subtitle="Gérez tous les événements publiés sur la plateforme." icon={CalendarHeart}>
        <Btn href={create_url} icon={Plus} size="lg">
          Créer un événement
        </Btn>
      </PageHeader>

      {/* Statistiques */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "bg-deep text-lime" },
          { label: "À venir", value: stats.upcoming, color: "bg-mint text-green" },
          { label: "Passés", value: stats.past, color: "bg-ink/5 text-muted" },
          { label: "Participants", value: stats.participants, color: "bg-lime/40 text-deep" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-4 p-5">
            <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl font-serif text-3xl font-semibold", s.color)}>
              {s.value}
            </span>
            <p className="font-medium text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState icon={CalendarHeart} title="Aucun événement" text="Créez le premier événement de la ville.">
          <Btn href={create_url} icon={Plus}>Créer un événement</Btn>
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
                  <th className="px-6 py-4 font-semibold">Événement</th>
                  <th className="px-4 py-4 font-semibold">Lieu</th>
                  <th className="px-4 py-4 font-semibold">Date</th>
                  <th className="px-4 py-4 font-semibold">Participants</th>
                  <th className="px-4 py-4 font-semibold">Organisateur</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <EventRow key={e.id} event={e} onDelete={setToDelete} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {toDelete && (
          <ConfirmDelete
            event={toDelete}
            onConfirm={handleDelete}
            onCancel={() => setToDelete(null)}
            busy={deleting}
          />
        )}
      </AnimatePresence>
    </>
  );
}

AdminEvenements.layout = adminLayout;
