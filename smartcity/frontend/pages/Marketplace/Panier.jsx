import { useEffect, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle, Minus, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, EmptyState, PageHeader } from "../../lib/ui";

function unitLabel(label, qty = 1) {
  if (!label || label === "Kg") return label || "";
  return qty > 1 ? `${label}s` : label;
}

function PanierItemRow({ item, onRemove, onChangeQte }) {
  const [qte, setQte] = useState(item.quantite);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQte(item.quantite);
  }, [item.quantite]);

  const unavailable = item.status !== "disponible" || item.stock_dispo === 0;
  const exceedsStock = !unavailable && item.quantite > item.stock_dispo;

  function handleDecrement() {
    if (qte <= 1) return;
    const newQte = Math.min(item.stock_dispo, Math.max(1, qte - 1));
    setQte(newQte);
    onChangeQte(item.modifier_url, newQte, setBusy);
  }

  function handleIncrement() {
    if (qte >= item.stock_dispo) return;
    const newQte = Math.min(item.stock_dispo, qte + 1);
    setQte(newQte);
    onChangeQte(item.modifier_url, newQte, setBusy);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-line bg-paper p-4 sm:flex-nowrap sm:p-5"
    >
      {/* Image ou icône */}
      <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-mint">
        {item.image ? (
          <img src={item.image} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-green">
            <Package className="size-7 opacity-50" />
          </div>
        )}
      </div>

      {/* Infos produit */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={item.url} className="truncate font-serif text-lg font-medium hover:underline">
            {item.title}
          </Link>
          {unavailable && <Badge tone="coral">Rupture de stock</Badge>}
          {exceedsStock && <Badge tone="amber">Stock max : {item.stock_dispo}</Badge>}
        </div>
        <p className="text-sm text-muted">
          {Number(item.price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT / {item.unite_label}
        </p>
        <p className="mt-1 text-sm font-semibold text-green">
          Sous-total : {Number(item.sous_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
          <span className="ml-2 text-xs font-normal text-muted">
            ({qte} {unitLabel(item.unite_label, qte)})
          </span>
        </p>
      </div>

      {/* Contrôle quantité */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Réduire la quantité"
          onClick={handleDecrement}
          disabled={qte <= 1 || busy || unavailable}
          className="grid size-9 cursor-pointer place-items-center rounded-full border border-line bg-paper transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="min-w-[2rem] text-center font-semibold">{qte}</span>
        <button
          type="button"
          aria-label="Augmenter la quantité"
          onClick={handleIncrement}
          disabled={qte >= item.stock_dispo || busy || unavailable}
          className="grid size-9 cursor-pointer place-items-center rounded-full border border-line bg-paper transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Supprimer */}
      <button
        type="button"
        aria-label="Supprimer du panier"
        title="Supprimer du panier"
        onClick={() => onRemove(item.retirer_url)}
        disabled={busy}
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-coral/30 text-[#b4532f] transition hover:bg-coral/10 disabled:opacity-40"
      >
        <Trash2 className="size-4" />
      </button>
    </motion.div>
  );
}

export default function Panier({ panier, passer_commande_url }) {
  const { urls } = usePage().props;
  const [busy, setBusy] = useState(false);

  const hasUnavailable = panier.items.some(
    (item) => item.status !== "disponible" || item.stock_dispo === 0 || item.quantite > item.stock_dispo,
  );

  function handleRemove(retirerUrl) {
    router.post(retirerUrl, {}, { preserveScroll: true });
  }

  function handleChangeQte(modifierUrl, qte, setItemBusy) {
    setItemBusy(true);
    router.post(modifierUrl, { quantite: String(qte) }, {
      forceFormData: true,
      preserveScroll: true,
      onFinish: () => setItemBusy(false),
    });
  }

  function handleCommande() {
    router.post(passer_commande_url, {}, {
      preserveScroll: true,
      onStart: () => setBusy(true),
      onFinish: () => setBusy(false),
    });
  }

  return (
    <>
      <Head title="Mon panier" />
      <PageHeader
        eyebrow="Mon compte"
        title="Mon panier"
        subtitle="Retrouvez vos articles sélectionnés sur le marché local."
        icon={ShoppingCart}
      />

      {panier.items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Votre panier est vide"
          text="Parcourez le marché local pour ajouter des produits."
        >
          <Btn href={urls.marketplace} icon={ShoppingCart}>Explorer le marché</Btn>
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          {/* Liste des articles */}
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">{panier.items.length} article(s) dans votre panier</p>
            <AnimatePresence mode="popLayout">
              {panier.items.map((item) => (
                <PanierItemRow
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onChangeQte={handleChangeQte}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Récapitulatif */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-8">
            <div className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-6 text-paper">
              <div aria-hidden="true" className="absolute -top-16 -right-16 size-48 rounded-full bg-green/40 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-semibold tracking-[0.14em] text-paper/60 uppercase">Récapitulatif</p>
                <div className="mt-4 flex flex-col gap-2.5">
                  {panier.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-paper/80">{item.quantite}× {item.title}</span>
                      <span className="shrink-0 font-medium text-paper">{Number(item.sous_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-white/15 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-paper/80">Total</span>
                    <span className="font-serif text-3xl font-medium text-lime">
                      {Number(panier.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {hasUnavailable && (
              <div className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-center text-xs font-medium text-[#b4532f]">
                Certains articles ne sont plus disponibles ou dépassent le stock. Veuillez ajuster ou supprimer ces articles avant de passer commande.
              </div>
            )}

            <Btn onClick={handleCommande} icon={busy ? undefined : ShoppingCart} size="lg" disabled={busy || hasUnavailable} className="w-full">
              {busy && <LoaderCircle className="size-4 animate-spin" />}
              Passer commande
            </Btn>

            <Btn href={urls.marketplace} variant="ghost" className="w-full">
              Continuer mes achats
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}

Panier.layout = appLayout;
