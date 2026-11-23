// Bouton « Moi aussi » : un citoyen soutient un signalement existant au lieu d'en créer un doublon.
import { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { ThumbsUp } from "lucide-react";
import { cn } from "../lib/ui";

export default function SupportButton({ r, size = "sm", className, label = "Moi aussi", doneLabel = "Soutenu", title = "Je suis aussi gêné par ce problème" }) {
  const { auth, urls } = usePage().props;
  const [busy, setBusy] = useState(false);
  if (r.mine || r.status === "resolu" || r.status === "rejete") return null;
  const go = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!auth.user) return router.visit(`${urls.login}?next=${encodeURIComponent(window.location.pathname)}`);
    router.post(r.support_url, { next: window.location.pathname + window.location.search }, { forceFormData: true, preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  };
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      aria-pressed={r.supported}
      title={r.supported ? "Retirer" : title}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border font-semibold transition disabled:opacity-60",
        size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-5 py-3 text-sm",
        r.supported ? "border-green bg-green text-paper" : "border-line bg-paper text-ink hover:border-green hover:text-green",
        className,
      )}
    >
      <ThumbsUp className={cn("size-3.5", r.supported && "fill-current")} />
      {r.supported ? doneLabel : label}
      <span className={cn("rounded-full px-1.5 text-[11px]", r.supported ? "bg-paper/20" : "bg-ink/5")}>{r.supports}</span>
    </button>
  );
}
