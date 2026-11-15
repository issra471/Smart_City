import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowLeft, Ban, CalendarCheck, CalendarHeart, CheckCircle, Clock, Mail, PawPrint, ShieldCheck, ShoppingBasket, TriangleAlert, UserPlus, UserRoundCog } from "lucide-react";
import { useState } from "react";
import { adminLayout } from "../../layouts/AppShell";
import { Avatar, Badge, Btn, Card, fmtShort } from "../../lib/ui";

export default function UserDetail({ account, activity, permissions }) {
  const { urls } = usePage().props;
  const [hours, setHours] = useState("24");
  const act = (action, extra = {}) => router.post(account.action_url, { action, ...extra }, { preserveScroll: true });
  const temporaryBan = () => {
    const value = Number(hours);
    if (Number.isInteger(value) && value > 0) act("ban_temporary", { duration_hours: value });
  };
  const rows = [
    [Mail, "E-mail", account.email || "Non renseigné"],
    [UserPlus, "Inscription", fmtShort(account.date_joined)],
    [Clock, "Dernière connexion", account.last_login ? fmtShort(account.last_login) : "Jamais"],
  ];
  const stats = [
    [activity.reservations, "Réservations", CalendarCheck],
    [activity.reports, "Signalements", TriangleAlert],
    [activity.observations, "Observations", PawPrint],
    [activity.events, "Événements", CalendarHeart],
    [activity.products, "Produits", ShoppingBasket],
  ];

  return (
    <>
      <Head title={account.username} />
      <Link href={urls.admin_users} className="mb-5 ml-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Utilisateurs
      </Link>

      <section className="grain relative mb-6 overflow-hidden rounded-[2rem] bg-deep p-7 text-paper sm:p-10">
        <div aria-hidden="true" className="absolute -top-24 -right-16 size-80 animate-blob rounded-full bg-green/50 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <Avatar initials={account.name.slice(0, 2).toUpperCase()} className="size-24 font-serif text-4xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.14em] text-lime uppercase">Utilisateur</p>
            <h1 className="mt-1 font-serif text-4xl leading-tight font-medium sm:text-5xl">{account.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-paper/65">@{account.username}</span>
              <Badge tone={account.is_active ? "lime" : "muted"} className={account.is_active ? "bg-lime text-deep" : "bg-white/15 text-paper"} dot>
                {account.is_active ? "Actif" : "Désactivé"}
              </Badge>
              <Badge className="bg-white/15 text-paper">{account.is_superuser ? "Super-administrateur" : account.is_staff ? "Administrateur" : "Citoyen"}</Badge>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 grid items-start gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-7">
          <h2 className="font-serif text-2xl">Compte</h2>
          <dl className="mt-5 flex flex-col gap-4 text-sm">
            {rows.map(([Icon, label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-muted">
                  <Icon className="size-4" /> {label}
                </dt>
                <dd className="text-right font-semibold break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-7">
          <h2 className="font-serif text-2xl">Activité sur la plateforme</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {stats.map(([n, label, Icon]) => (
              <div key={label} className="rounded-2xl bg-pale p-4">
                <Icon className="size-4 text-green" />
                <p className="mt-3 font-serif text-4xl leading-none font-medium">{n}</p>
                <p className="mt-1.5 text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-7">
          <h2 className="font-serif text-2xl">Informations du compte</h2>
          <dl className="mt-5 flex flex-col gap-3 text-sm">
            {[
              ["Téléphone", account.phone_number || "Non renseigné"],
              ["Date de naissance", account.date_of_birth ? fmtShort(account.date_of_birth) : "Non renseignée"],
              ["Adresse", account.address || "Non renseignée"],
              ["Ville", account.city || "Non renseignée"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-line/60 pb-3 last:border-0 last:pb-0">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-7">
          <h2 className="font-serif text-2xl">Actions de sécurité</h2>
          <p className="mt-2 text-sm text-muted">Les informations personnelles restent consultables uniquement. Utilisez ces actions pour gérer l’accès au compte.</p>
          {!account.is_staff && (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                {account.is_banned ? (
                  <Btn variant="soft" icon={CheckCircle} onClick={() => act("unban")}>Débannir le compte</Btn>
                ) : (
                  <>
                    <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5">
                      <Clock className="size-4 text-muted" />
                      <input type="number" min="1" max="8760" value={hours} onChange={(e) => setHours(e.target.value)} aria-label="Durée du bannissement en heures" className="w-16 bg-transparent text-sm font-semibold outline-none" />
                      <span className="text-sm text-muted">heures</span>
                    </div>
                    <Btn variant="danger" icon={Ban} onClick={temporaryBan}>Bannir temporairement</Btn>
                    <Btn variant="danger" icon={Ban} onClick={() => window.confirm("Bannir définitivement ce compte ?") && act("ban_permanent")}>Bannir définitivement</Btn>
                  </>
                )}
              </div>
              {account.is_banned && <p className="mt-3 text-sm font-medium text-[#b4532f]">{account.permanent_ban ? "Bannissement permanent." : `Banni jusqu'au ${fmtShort(account.banned_until)}.`}</p>}
            </>
          )}
          {permissions.can_manage_roles && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-3 text-sm font-semibold">Rôle d’administration</p>
              <Btn variant={account.is_staff ? "danger" : "soft"} icon={account.is_staff ? UserRoundCog : ShieldCheck} onClick={() => act(account.is_staff ? "remove_admin" : "promote_admin")}>
                {account.is_staff ? "Retirer les droits admin" : "Rendre administrateur"}
              </Btn>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

UserDetail.layout = adminLayout;
