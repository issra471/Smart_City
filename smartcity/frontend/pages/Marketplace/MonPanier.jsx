// Mon panier : produits ajoutés, suppression unitaire ou globale, passer commande.
import { useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, ShoppingBasket, ShoppingCart, Trash2, X } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, EmptyState, PageHeader, cn } from "../../lib/ui";

function PanierRow({ item }) {
  const [busy, setBusy] = useState(false);

  const remove = () => {
    setBusy(true);
    router.post(item.remove_url, {}, {
      preserveScroll: true,
      onFinish: () => setBusy(false),
    });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-line bg-paper p-4"
    >
      {/* Image */}
      <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-mint">
        {item.image ? (
          <img src={item.image} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-green">
            <ShoppingBasket className="size-7 opacity-50" />
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-xl font-medium leading-tight">{item.titre}</h3>
        <p className="mt-0.5 text-xs text-muted">Par {item.vendeur}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="ink">
            {Number(item.prix).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT / {item.unite_label}
          </Badge>
          <Badge tone="green">Qté : {item.quantite_panier}</Badge>
          <Badge tone="lime">
            Total : {Number(item.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
          </Badge>
        </div>
      </div>

      {/* Supprimer */}
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        title="Retirer du panier"
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-line text-muted transition hover:border-coral/40 hover:bg-coral/10 hover:text-[#b4532f] disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
      </button>
    </motion.article>
  );
}

export default function MonPanier({ items, total, clear_url, commande_url }) {
  const [clearBusy, setClearBusy] = useState(false);
  const [commandeBusy, setCommandeBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClear = () => {
    setClearBusy(true);
    router.post(clear_url, {}, {
      onFinish: () => { setClearBusy(false); setConfirmClear(false); },
    });
  };

  const handleCommande = () => {
    setCommandeBusy(true);
    router.post(commande_url, {}, {
      onFinish: () => setCommandeBusy(false),
    });
  };

  return (
    <>
      <Head title="Mon panier" />
      <PageHeader
        eyebrow="Mon compte"
        title="Mon panier"
        subtitle="Les produits que vous souhaitez commander."
        icon={ShoppingCart}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Votre panier est vide"
          text="Parcourez le marché local et ajoutez des produits à votre panier."
        >
          <Btn href="/marketplace/" arrow>
            Voir le marché
          </Btn>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Liste des articles */}
          <div className="flex-1">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted">{items.length} article{items.length > 1 ? "s" : ""}</p>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <Btn variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                    Annuler
                  </Btn>
                  <Btn variant="danger" size="sm" onClick={handleClear} disabled={clearBusy}>
                    {clearBusy && <Loader2 className="size-3.5 animate-spin" />} Vider le panier
                  </Btn>
                </div>
              ) : (
                <Btn variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirmClear(true)}>
                  Tout supprimer
                </Btn>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <PanierRow key={item.id} item={item} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Récapitulatif commande */}
          <div className="grain lg:sticky lg:top-8 lg:w-80">
            <div className="rounded-[1.75rem] border border-line bg-deep p-6 text-paper">
              <h2 className="font-serif text-2xl font-medium">Récapitulatif</h2>
              <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-paper/70">{item.titre} ×{item.quantite_panier}</span>
                    <span className="shrink-0 font-semibold text-lime">
                      {Number(item.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="font-semibold">Total</span>
                <span className="font-serif text-2xl font-semibold text-lime">
                  {Number(total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
                </span>
              </div>
              <button
                type="button"
                onClick={handleCommande}
                disabled={commandeBusy}
                className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-lime py-3.5 font-semibold text-deep transition hover:brightness-95 disabled:opacity-60"
              >
                {commandeBusy && <Loader2 className="size-4 animate-spin" />}
                Passer commande
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

MonPanier.layout = appLayout;
