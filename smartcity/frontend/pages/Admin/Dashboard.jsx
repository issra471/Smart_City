import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowUpRight, Bike, CalendarCheck, CalendarHeart, LayoutGrid, PawPrint, ShoppingBasket, TriangleAlert, UserCheck, Users } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Avatar, Badge, Btn, Card, PageHeader, STATUS_TONE, cn, fmtRelative } from "../../lib/ui";

const BAR = { coral: "bg-coral", amber: "bg-[#f4c95d]", green: "bg-green" };

export default function AdminDashboard({ stats, report_status, recent_users }) {
  const { urls } = usePage().props;
  const top = [
    [stats.users, "Utilisateurs", Users, urls.admin_users],
    [stats.active_users, "Comptes actifs", UserCheck, urls.admin_users],
    [stats.open_reports, "Signalements ouverts", TriangleAlert, urls.admin_reports],
    [stats.events, "Événements", CalendarHeart, urls.admin_events],
  ];
  const activity = [
    [stats.stations, "Stations de mobilité", Bike],
    [stats.reservations, "Réservations", CalendarCheck],
    [stats.observations, "Observations animales", PawPrint],
    [stats.products, "Produits locaux", ShoppingBasket],
  ];
  const max = Math.max(1, ...activity.map(([n]) => n));
  const totalReports = report_status.reduce((n, s) => n + s.count, 0);

  return (
    <>
      <Head title="Administration" />
      <PageHeader eyebrow="Gestion" title="Tableau de bord" subtitle="Vue d'ensemble de la plateforme Smart City.">
        <Btn href={urls.admin_modules} icon={LayoutGrid} size="lg">
          Gérer les modules
        </Btn>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {top.map(([n, label, Icon, href], i) => (
          <Link key={label} href={href} className={cn("group rounded-[1.75rem] p-6 transition hover:-translate-y-0.5", i === 0 ? "grain relative overflow-hidden bg-deep text-paper" : "border border-line bg-paper hover:shadow-[0_18px_45px_#15362e17]")}>
            <div className="relative flex items-center justify-between">
              <span className={cn("grid size-11 place-items-center rounded-2xl", i === 0 ? "bg-lime text-deep" : "bg-mint text-green")}>
                <Icon className="size-5" />
              </span>
              <ArrowUpRight className="size-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </div>
            <p className="relative mt-6 font-serif text-6xl leading-none font-medium">{n}</p>
            <p className={cn("relative mt-2 text-sm", i === 0 ? "text-paper/60" : "text-muted")}>{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-7 lg:col-span-2">
          <h2 className="font-serif text-2xl">Activité des modules</h2>
          <ul className="mt-6 flex flex-col gap-5">
            {activity.map(([n, label, Icon]) => (
              <li key={label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 text-green" /> {label}
                  </span>
                  <b className="font-serif text-xl font-medium">{n}</b>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink/5">
                  <div className="h-full rounded-full bg-green transition-[width] duration-700" style={{ width: `${(n / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col p-7">
          <h2 className="font-serif text-2xl">Signalements</h2>
          <p className="mt-1 text-sm text-muted">{totalReports} au total</p>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-ink/5">
            {report_status.map((s) => s.count > 0 && <div key={s.key} className={BAR[STATUS_TONE[s.key]]} style={{ width: `${(s.count / totalReports) * 100}%` }} />)}
          </div>
          <ul className="mt-5 flex flex-col gap-2.5">
            {report_status.map((s) => (
              <li key={s.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <i className={cn("size-2.5 rounded-full", BAR[STATUS_TONE[s.key]])} /> {s.label}
                </span>
                <b className="font-serif text-xl font-medium">{s.count}</b>
              </li>
            ))}
          </ul>
          <Link href={urls.admin_reports} className="group mt-auto flex items-center gap-1.5 pt-6 text-sm font-semibold text-green">
            Suivre les signalements <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </Card>
      </div>

      <Card className="mt-4 p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Derniers inscrits</h2>
          <Btn href={urls.admin_users} variant="ghost" size="sm" arrow>
            Tous les utilisateurs
          </Btn>
        </div>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {recent_users.map((u) => (
            <li key={u.id}>
              <Link href={u.detail_url} className="flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-pale">
                <Avatar initials={u.name.slice(0, 2).toUpperCase()} className="size-11 text-sm" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm font-semibold">{u.name}</b>
                  <span className="block truncate text-xs text-muted">
                    @{u.username} · inscrit {fmtRelative(u.date_joined)}
                  </span>
                </span>
                {u.is_staff && <Badge tone="ink">Staff</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

AdminDashboard.layout = adminLayout;
