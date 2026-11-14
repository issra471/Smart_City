import { useEffect, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import LogoMark from "./LogoMark";

/** Lien : sans rechargement vers une page de l'app, classique pour une ancre (#) ou un e-mail. */
export function A({ href, ...rest }) {
  return /^(#|mailto:)/.test(href) ? <a href={href} {...rest} /> : <Link href={href} {...rest} />;
}

export function Logo({ href, light = false }) {
  return (
    <A href={href} className="group flex items-center gap-2.5">
      <LogoMark tone={light ? "lime" : "green"} />
      <span className={`font-semibold tracking-tight ${light ? "text-paper" : "text-ink"}`}>Smart City</span>
    </A>
  );
}

export default function SiteHeader({ overDark = false }) {
  const { auth, urls } = usePage().props;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // En haut de page sur un fond sombre (ville de nuit) : texte clair.
  const light = overDark && !scrolled;
  const link = light ? "text-paper/80 hover:bg-white/10 hover:text-paper" : "text-ink/75 hover:bg-mint hover:text-ink";
  const action = light ? "text-paper hover:bg-white/10" : "hover:bg-mint";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    ["Nos services", "#services"],
    ["Le pouls de la ville", "#pouls"],
    ["Comment ça marche ?", "#fonctionnement"],
    ["Nos engagements", "#engagements"],
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 sm:px-6 ${
          scrolled ? "border border-line/70 bg-paper/75 shadow-[0_14px_45px_#15362e14] backdrop-blur-xl" : "border border-transparent"
        }`}
      >
        <Logo href={urls.home} light={light} />

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {nav.map(([label, href]) => (
            <A key={href} href={href} className={`rounded-full px-3.5 py-2 text-sm transition ${link}`}>
              {label}
            </A>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {auth.user ? (
            <>
              <A href={urls.dashboard} className={`hidden rounded-full px-4 py-2 text-sm font-medium sm:block ${action}`}>
                Mon espace
              </A>
              <button type="button" onClick={() => router.post(urls.logout)} className={`hidden cursor-pointer rounded-full px-4 py-2 text-sm sm:block ${light ? "text-paper/60 hover:text-paper" : "text-muted hover:text-ink"}`}>
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <A href={urls.login} className={`hidden rounded-full px-4 py-2 text-sm font-medium sm:block ${action}`}>
                Se connecter
              </A>
              <A
                href={urls.signup}
                className="group hidden items-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-paper shadow-[0_5px_14px_#087a5b24] transition hover:bg-dark sm:flex"
              >
                Créer mon compte
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </A>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            className={`grid size-10 place-items-center rounded-full lg:hidden ${light ? "bg-lime text-deep" : "bg-ink text-paper"}`}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Navigation mobile"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="mx-auto mt-3 flex max-w-6xl flex-col gap-1 rounded-3xl border border-line bg-paper/95 p-3 shadow-xl backdrop-blur-xl lg:hidden"
          >
            {nav.map(([label, href]) => (
              <A key={href} href={href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 hover:bg-mint">
                {label}
              </A>
            ))}
            <div className="my-1 h-px bg-line" />
            {auth.user ? (
              <>
                <A href={urls.dashboard} className="rounded-2xl px-4 py-3 font-medium hover:bg-mint">Mon espace</A>
                <A href={urls.profile} className="rounded-2xl px-4 py-3 hover:bg-mint">{auth.user.username}</A>
              </>
            ) : (
              <>
                <A href={urls.login} className="rounded-2xl px-4 py-3 hover:bg-mint">Se connecter</A>
                <A href={urls.signup} className="rounded-2xl bg-green px-4 py-3 font-semibold text-paper">Créer mon compte</A>
              </>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
