// Mise en page de l'application : menu latéral (ou tiroir sur mobile) + contenu.
// Elle reste en place quand on change de page : seul le contenu est remplacé.
import { useEffect, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bike,
  Building2,
  CalendarCheck,
  CalendarHeart,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  PawPrint,
  ShieldCheck,
  ShoppingBasket,
  TriangleAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";
import LogoMark from "../components/LogoMark";
import Toasts from "../components/Toasts";
import { Avatar, cn, ease } from "../lib/ui";

function useNav(admin) {
  const { auth, urls } = usePage().props;
  if (admin)
    return [
      {
        title: "Administration",
        items: [
          { label: "Tableau de bord", href: urls.admin_dashboard, icon: LayoutDashboard, exact: true },
          { label: "Utilisateurs", href: urls.admin_users, icon: Users },
          { label: "Modules", href: urls.admin_modules, icon: LayoutGrid },
          { label: "Signalements", href: urls.admin_reports, icon: TriangleAlert },
          { label: "Événements", href: urls.admin_events, icon: CalendarHeart },
        ],
      },
      {
        title: "Raccourcis",
        items: [
          { label: "Django Admin", href: urls.django_admin, icon: ArrowUpRight, external: true },
          { label: "Espace citoyen", href: urls.dashboard, icon: ArrowLeft },
        ],
      },
    ];
  return [
    {
      title: "Services",
      items: [
        { label: "Vue d'ensemble", href: urls.dashboard, icon: LayoutDashboard, exact: true },
        { label: "Mobilité", href: urls.mobilite, icon: Bike, not: urls.reservations },
        { label: "Signalements", href: urls.infrastructures, icon: TriangleAlert },
        { label: "Événements", href: urls.evenements, icon: CalendarHeart },
        { label: "Observations animales", href: urls.animaux, icon: PawPrint },
        { label: "Marché local", href: urls.marketplace, icon: ShoppingBasket },
      ],
    },
    {
      title: "Mon compte",
      items: [
        { label: "Mes réservations", href: urls.reservations, icon: CalendarCheck },
        { label: "Mon profil", href: urls.profile, icon: UserRound, also: urls.password_change },
        ...(auth.user?.is_staff ? [{ label: "Administration", href: urls.admin_dashboard, icon: ShieldCheck }] : []),
        { label: "La ville en 3D", href: urls.home, icon: Building2, exact: true },
      ],
    },
  ];
}

function NavContent({ admin, onNavigate }) {
  const { auth, urls } = usePage().props;
  const path = usePage().url.split("?")[0];
  const groups = useNav(admin);
  const isActive = (it) => {
    if (it.external) return false;
    if (it.exact) return path === it.href;
    if (it.not && path.startsWith(it.not)) return false;
    return path.startsWith(it.href) || (it.also && path.startsWith(it.also));
  };

  return (
    <div className="flex h-full flex-col">
      <Link href={urls.home} onClick={onNavigate} className="group flex items-center gap-2.5 px-3 pt-2 pb-6">
        <LogoMark tone="lime" className="size-10" />
        <span>
          <b className="block leading-tight font-semibold tracking-tight">Smart City</b>
          <span className="text-xs text-paper/50">{admin ? "Administration" : "Valmont"}</span>
        </span>
      </Link>

      <nav aria-label={admin ? "Navigation d'administration" : "Navigation citoyenne"} className="-mx-1 flex-1 overflow-y-auto px-1">
        {groups.map((g) => (
          <div key={g.title} className="mb-5">
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-paper/40 uppercase">{g.title}</p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((it) => {
                const on = isActive(it);
                const cls = cn(
                  "relative flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors",
                  on ? "font-semibold text-deep" : "text-paper/75 hover:bg-white/10 hover:text-paper",
                );
                const inner = (
                  <>
                    {on && <motion.span layoutId={admin ? "nav-pill-admin" : "nav-pill"} className="absolute inset-0 rounded-full bg-lime" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <it.icon className="relative size-[18px] shrink-0" />
                    <span className="relative">{it.label}</span>
                  </>
                );
                return (
                  <li key={it.label}>
                    {it.external ? (
                      <a href={it.href} className={cls}>{inner}</a>
                    ) : (
                      <Link href={it.href} onClick={onNavigate} className={cls} aria-current={on ? "page" : undefined}>{inner}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-3 rounded-3xl bg-white/[0.07] p-3">
        {auth.user ? (
          <>
            <Link href={urls.profile} onClick={onNavigate} className="flex items-center gap-3 rounded-2xl p-1.5 transition hover:bg-white/10">
              <Avatar initials={auth.user.initials} className="size-10 text-sm" />
              <span className="min-w-0">
                <b className="block truncate text-sm font-semibold">{auth.user.name}</b>
                <span className="block truncate text-xs text-paper/50">{auth.user.is_staff ? "Administrateur" : "Compte citoyen"}</span>
              </span>
            </Link>
            <button type="button" onClick={() => router.post(urls.logout)} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 py-2 text-[13px] text-paper/70 transition hover:bg-white/10 hover:text-paper">
              <LogOut className="size-3.5" /> Se déconnecter
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2 p-1">
            <p className="text-xs text-paper/60">Connectez-vous pour réserver, signaler et contribuer.</p>
            <Link href={urls.login} onClick={onNavigate} className="rounded-full bg-lime py-2.5 text-center text-sm font-semibold text-deep">Se connecter</Link>
            <Link href={urls.signup} onClick={onNavigate} className="rounded-full border border-white/15 py-2.5 text-center text-sm text-paper/80 hover:bg-white/10">Créer mon compte</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppShell({ children, admin = false }) {
  const { url, props } = usePage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  return (
    <div className="min-h-screen bg-cream">
      {/* Menu latéral (ordinateur) */}
      <aside className="grain fixed inset-y-3 left-3 z-40 hidden w-[17rem] overflow-hidden rounded-[2rem] bg-deep p-4 text-paper lg:block">
        <div aria-hidden="true" className="absolute -top-24 -right-24 size-64 rounded-full bg-green/40 blur-3xl" />
        <div className="relative h-full">
          <NavContent admin={admin} />
        </div>
      </aside>

      {/* Barre du haut (mobile) */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line/70 bg-cream/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href={props.urls.home} className="group flex items-center gap-2.5">
          <LogoMark />
          <b className="font-semibold tracking-tight">Smart City</b>
        </Link>
        <button type="button" aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid size-10 cursor-pointer place-items-center rounded-full bg-deep text-paper">
          <Menu className="size-5" />
        </button>
      </div>

      {/* Tiroir (mobile) */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-deep/50 backdrop-blur-sm lg:hidden" />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease }}
              className="fixed inset-y-0 left-0 z-50 w-[min(19rem,88vw)] rounded-r-[2rem] bg-deep p-4 text-paper lg:hidden"
            >
              <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)} className="absolute top-5 right-4 z-10 grid size-9 cursor-pointer place-items-center rounded-full bg-white/10">
                <X className="size-4" />
              </button>
              <NavContent admin={admin} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Contenu : chaque changement de page glisse en douceur */}
      <div className="lg:pl-[18.5rem]">
        <motion.main key={url.split("?")[0]} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }} className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-8 lg:pt-10">
          {children}
        </motion.main>
      </div>
      <Toasts />
    </div>
  );
}

/** À utiliser dans une page : `MaPage.layout = appLayout` ou `adminLayout`. */
export const appLayout = (page) => <AppShell>{page}</AppShell>;
export const adminLayout = (page) => <AppShell admin>{page}</AppShell>;
