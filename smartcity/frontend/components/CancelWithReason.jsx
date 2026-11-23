// Administration : annuler (une réservation) ou refuser (une proposition) en écrivant un motif visible par le citoyen.
import { useState } from "react";
import { router } from "@inertiajs/react";
import { LoaderCircle, X } from "lucide-react";
import { Btn } from "../lib/ui";

export default function CancelWithReason({ url, label = "Annuler", confirmLabel = "Confirmer l'annulation", placeholder = "Motif (ex. station fermée pour travaux)", field = "motif", extra = {}, size = "sm" }) {
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);
  const short = motif.trim().length < 3;

  const send = (e) => {
    e.preventDefault();
    if (short) return;
    router.post(url, { ...extra, [field]: motif.trim(), next: window.location.pathname + window.location.search }, { forceFormData: true, preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  };

  if (!open)
    return (
      <Btn variant="danger" size={size} onClick={() => setOpen(true)}>
        {label}
      </Btn>
    );
  return (
    <form onSubmit={send} className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-coral/40 bg-coral/10 p-2">
      <input
        autoFocus
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        maxLength={500}
        placeholder={placeholder}
        aria-label="Motif visible par le citoyen"
        className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-coral"
      />
      <Btn type="submit" variant="danger" size="sm" disabled={busy || short} title={short ? "Écrivez un motif (3 caractères minimum)" : undefined}>
        {busy && <LoaderCircle className="size-3.5 animate-spin" />} {confirmLabel}
      </Btn>
      <button type="button" aria-label="Fermer" onClick={() => (setOpen(false), setMotif(""))} className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-paper">
        <X className="size-4" />
      </button>
    </form>
  );
}
