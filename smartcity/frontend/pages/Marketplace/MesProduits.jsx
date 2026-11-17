// Mes produits : espace vendeur — publier, modifier, supprimer ses produits.
import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { Edit2, Loader2, Package, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, cn } from "../../lib/ui";

function ProduitRow({ p, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = () => {
    setBusy(true);
    router.post(p.delete_url, {}, {
      preserveScroll: true,
      onFinish: () => { setBusy(false); setConfirm(false); },
    });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-line bg-paper p-4 transition-shadow hover:shadow-[0_8px_30px_#15362e12]"
    >
      {/* Image ou icône */}
      <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-mint">
        {p.image ? (
          <img src={p.image} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-green">
            <ShoppingBasket className="size-7 opacity-50" />
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-xl font-medium leading-tight">{p.titre}</h3>
        <p className="mt-0.5 text-sm text-muted line-clamp-1">{p.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="ink">{Number(p.prix).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT</Badge>
          <Badge tone="green">{p.quantite} {p.unite_label}</Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Btn href={p.edit_url} variant="ghost" size="sm" icon={Edit2}>
          Modifier
        </Btn>
        {confirm ? (
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={busy}>
              Annuler
            </Btn>
            <Btn variant="danger" size="sm" onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="size-3.5 animate-spin" />} Supprimer
            </Btn>
          </div>
        ) : (
          <Btn variant="danger" size="sm" icon={Trash2} onClick={() => setConfirm(true)}>
            Supprimer
          </Btn>
        )}
      </div>
    </motion.article>
  );
}

export default function MesProduits({ produits, create_url }) {
  return (
    <>
      <Head title="Mes produits" />
      <PageHeader
        eyebrow="Mon compte"
        title="Mes produits"
        subtitle="Gérez vos annonces du marché local."
        icon={Package}
      >
        <Btn href={create_url} icon={Plus} size="lg">
          Publier un produit
        </Btn>
      </PageHeader>

      {produits.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun produit publié"
          text="Publiez votre premier produit pour le proposer aux habitants du marché local."
        >
          <Btn href={create_url} icon={Plus}>
            Publier un produit
          </Btn>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {produits.map((p) => (
              <ProduitRow key={p.id} p={p} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

MesProduits.layout = appLayout;
