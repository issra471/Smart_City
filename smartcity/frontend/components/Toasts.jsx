// Notifications : affiche les messages envoyés par Django (messages.success, etc.).
import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Info, TriangleAlert, X } from "lucide-react";

const LOOK = {
  success: { icon: Check, cls: "bg-mint text-green" },
  error: { icon: TriangleAlert, cls: "bg-coral/20 text-[#b4532f]" },
  warning: { icon: TriangleAlert, cls: "bg-[#f4c95d]/30 text-[#7a5a10]" },
  info: { icon: Info, cls: "bg-ink/5 text-ink" },
};
let nextId = 1;

export default function Toasts() {
  const { flash } = usePage().props;
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!flash?.length) return;
    const added = flash.map((m) => ({ ...m, id: nextId++ }));
    setItems((all) => [...all, ...added]);
    const timer = setTimeout(() => setItems((all) => all.filter((t) => !added.includes(t))), 5500);
    return () => clearTimeout(timer);
  }, [flash]);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[95] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((m) => {
          const look = LOOK[m.level] || LOOK.info;
          return (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-paper p-4 text-ink shadow-[0_18px_50px_rgb(11_42_35/0.18)]"
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-full ${look.cls}`}>
                <look.icon className="size-4" />
              </span>
              <p className="flex-1 pt-1 text-sm leading-snug">{m.text}</p>
              <button type="button" aria-label="Fermer la notification" onClick={() => setItems((all) => all.filter((t) => t.id !== m.id))} className="cursor-pointer p-1 text-muted hover:text-ink">
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
