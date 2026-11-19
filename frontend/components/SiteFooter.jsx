import { usePage } from "@inertiajs/react";
import { A, Logo } from "./SiteHeader";

export default function SiteFooter() {
  const { urls } = usePage().props;
  const cols = [
    ["Découvrir", [["Nos services", "#services"], ["Comment ça marche ?", "#fonctionnement"]]],
    ["Services", [["Mobilité", urls.mobilite], ["Événements", urls.evenements], ["Marché local", urls.marketplace]]],
    ["Une question ?", [["Nos engagements", "#engagements"], ["Nous contacter", "mailto:bonjour@smartcity.local"]]],
  ];

  return (
    <footer className="relative overflow-hidden bg-deep text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-20 pb-10 sm:px-6 md:grid-cols-4">
        <div>
          <Logo href={urls.home} light />
          <p className="mt-4 font-serif text-xl leading-snug text-paper/70">
            Des services utiles.
            <br />
            <em className="text-lime">Une ville plus proche.</em>
          </p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title} className="flex flex-col gap-2.5">
            <b className="mb-1 text-sm tracking-wide text-paper/50 uppercase">{title}</b>
            {links.map(([label, href]) => (
              <A key={label} href={href} className="w-fit text-paper/85 transition hover:text-lime">
                {label}
              </A>
            ))}
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none -mb-[0.22em] text-center font-serif text-[22vw] leading-none italic text-transparent select-none"
        style={{ WebkitTextStroke: "1px rgb(200 241 105 / 0.35)" }}
      >
        My City
      </div>
      <div className="relative border-t border-paper/10 py-5 text-center text-sm text-paper/50">© 2026 Smart City · My City</div>
    </footer>
  );
}
