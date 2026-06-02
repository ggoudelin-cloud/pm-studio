"use client";

import { useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useProjectCosts, useCreateCost, useUpdateCost, useDeleteCost,
  useProjectMembers,
} from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DollarSign, Plus, X, Users, Monitor, Server, Tag, Trash2, Edit2, TrendingUp } from "lucide-react";
import type { ProjectCost, CostCategory } from "@/types";

// ── Config catégories ────────────────────────────────────────────────────────
const CATEGORIES: { value: CostCategory; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "human",          label: "Ressources humaines", icon: Users,   color: "text-indigo-400", bg: "bg-indigo-600/20" },
  { value: "software",       label: "Logiciels & Licences",  icon: Monitor, color: "text-green-400",  bg: "bg-green-600/20"  },
  { value: "infrastructure", label: "Infrastructure",         icon: Server,  color: "text-amber-400",  bg: "bg-amber-600/20"  },
  { value: "other",          label: "Autres",                icon: Tag,     color: "text-slate-400",  bg: "bg-slate-600/20"  },
];

const UNITS = ["jour", "heure", "mois", "licence", "unité", "forfait", "an"];

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}

function totalHT(cost: ProjectCost)  { return cost.quantity * cost.unit_cost_ht; }
function totalTTC(cost: ProjectCost) { return totalHT(cost) * (1 + cost.vat_rate / 100); }

// ── Modale coût ──────────────────────────────────────────────────────────────
function CostModal({ projectId, cost, members, onClose }: {
  projectId: string;
  cost?: ProjectCost;
  members: { user_id: string; profiles: { full_name: string | null; email: string | null; daily_rate_ht?: number | null } | null }[];
  onClose: () => void;
}) {
  const create = useCreateCost();
  const update = useUpdateCost();
  const isEdit = !!cost;

  const [category,   setCategory]   = useState<CostCategory>(cost?.category ?? "human");
  const [label,      setLabel]      = useState(cost?.label ?? "");
  const [unit,       setUnit]       = useState(cost?.unit ?? "jour");
  const [qty,        setQty]        = useState(cost?.quantity?.toString() ?? "1");
  const [unitCostHT, setUnitCost]   = useState(cost?.unit_cost_ht?.toString() ?? "");
  const [vatRate,    setVatRate]     = useState(cost?.vat_rate?.toString() ?? "20");
  const [memberId,   setMemberId]   = useState(cost?.member_id ?? "");
  const [notes,      setNotes]      = useState(cost?.notes ?? "");

  const totalHT_preview = (parseFloat(qty) || 0) * (parseFloat(unitCostHT) || 0);
  const totalTTC_preview = totalHT_preview * (1 + (parseFloat(vatRate) || 0) / 100);

  function handleMemberSelect(uid: string) {
    setMemberId(uid);
    if (uid) {
      const m = members.find(m => m.user_id === uid);
      const rate = (m?.profiles as { daily_rate_ht?: number | null })?.daily_rate_ht;
      if (rate) setUnitCost(rate.toString());
      if (!label) setLabel(m?.profiles?.full_name ?? m?.profiles?.email ?? "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      project_id:   projectId,
      category,
      label:        label.trim(),
      unit,
      quantity:     parseFloat(qty) || 1,
      unit_cost_ht: parseFloat(unitCostHT) || 0,
      vat_rate:     parseFloat(vatRate) || 20,
      member_id:    memberId || null,
      notes:        notes || null,
    };
    if (isEdit) await update.mutateAsync({ id: cost!.id, ...payload });
    else        await create.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">{isEdit ? "Modifier le coût" : "Ajouter un coût"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Catégorie */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Catégorie *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        category === cat.value
                          ? `${cat.bg} ${cat.color} border-current`
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Membre (si humain) */}
            {category === "human" && members.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Membre de l&apos;équipe</label>
                <select value={memberId} onChange={e => handleMemberSelect(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Sélectionner (optionnel) —</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.full_name ?? m.profiles?.email}
                      {(m.profiles as { daily_rate_ht?: number | null })?.daily_rate_ht ? ` — ${(m.profiles as { daily_rate_ht?: number | null }).daily_rate_ht}€/j HT` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Label */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Libellé *</label>
              <input required value={label} onChange={e => setLabel(e.target.value)}
                placeholder={category === "human" ? "ex : Développeur senior" : category === "software" ? "ex : GitHub Copilot" : "ex : AWS EC2"}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Quantité + Unité */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Quantité *</label>
                <input required type="number" min="0" step="0.5" value={qty} onChange={e => setQty(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Unité</label>
                <select value={unit} onChange={e => setUnit(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {/* Coût unitaire + TVA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Coût unitaire HT (€) *</label>
                <input required type="number" min="0" step="0.01" value={unitCostHT} onChange={e => setUnitCost(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Taux TVA (%)</label>
                <input type="number" min="0" max="100" step="0.5" value={vatRate} onChange={e => setVatRate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Aperçu totaux */}
            {totalHT_preview > 0 && (
              <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total HT</p>
                  <p className="text-lg font-bold text-indigo-300">{fmt(totalHT_preview)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total TTC</p>
                  <p className="text-lg font-bold text-white">{fmt(totalTTC_preview)}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Notes</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Justificatif, référence contrat…"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button type="submit" loading={create.isPending || update.isPending} className="flex-1 justify-center">
                {isEdit ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────
function CostsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: costs = [],   isLoading } = useProjectCosts(id);
  const { data: members = [] }            = useProjectMembers(id);
  const deleteCost = useDeleteCost();

  const [showModal, setShowModal] = useState(false);
  const [editCost,  setEditCost]  = useState<ProjectCost | undefined>();
  const [confirmDel, setConfirmDel] = useState<ProjectCost | null>(null);

  // Calculs globaux
  const summary = useMemo(() => {
    const cats = CATEGORIES.map(cat => {
      const items = costs.filter(c => c.category === cat.value);
      const ht  = items.reduce((s, c) => s + totalHT(c), 0);
      const ttc = items.reduce((s, c) => s + totalTTC(c), 0);
      return { ...cat, items, ht, ttc };
    });
    const grandHT  = cats.reduce((s, c) => s + c.ht, 0);
    const grandTTC = cats.reduce((s, c) => s + c.ttc, 0);
    const grandTVA = grandTTC - grandHT;
    return { cats, grandHT, grandTTC, grandTVA };
  }, [costs]);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-400" /> Gestion des coûts
            </h1>
            <p className="text-slate-400 text-sm mt-1">{costs.length} ligne(s) de coût</p>
          </div>
          <Button onClick={() => { setEditCost(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Ajouter un coût
          </Button>
        </div>

        {/* Tableau de bord synthèse */}
        {costs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {summary.cats.map(cat => {
              const Icon = cat.icon;
              return (
                <Card key={cat.value} className={cat.items.length ? "" : "opacity-40"}>
                  <CardBody className="py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 ${cat.bg} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                      </div>
                      <span className="text-xs text-slate-400 font-medium truncate">{cat.label}</span>
                    </div>
                    <p className={`text-lg font-bold ${cat.color}`}>{fmt(cat.ht)}</p>
                    <p className="text-xs text-slate-500">HT · {fmt(cat.ttc)} TTC</p>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

        {/* Totaux globaux */}
        {costs.length > 0 && (
          <Card className="border-indigo-800/40 bg-indigo-950/10">
            <CardBody>
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <h2 className="font-semibold text-white">Récapitulatif financier</h2>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total HT</p>
                  <p className="text-2xl font-bold text-indigo-300">{fmt(summary.grandHT)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">TVA</p>
                  <p className="text-2xl font-bold text-slate-400">{fmt(summary.grandTVA)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total TTC</p>
                  <p className="text-2xl font-bold text-white">{fmt(summary.grandTTC)}</p>
                </div>
              </div>
              {/* Barre de répartition */}
              {summary.grandHT > 0 && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                    {summary.cats.filter(c => c.ht > 0).map(cat => (
                      <div key={cat.value} style={{ width: `${(cat.ht / summary.grandHT) * 100}%` }}
                        className={`${cat.bg.replace("/20", "/60")} transition-all`}
                        title={`${cat.label}: ${fmt(cat.ht)}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {summary.cats.filter(c => c.ht > 0).map(cat => (
                      <span key={cat.value} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className={`w-2.5 h-2.5 rounded-sm ${cat.bg.replace("/20", "/60")}`} />
                        {cat.label} {Math.round((cat.ht / summary.grandHT) * 100)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Liste des coûts par catégorie */}
        {isLoading ? (
          <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : costs.length === 0 ? (
          <div className="py-16 text-center">
            <DollarSign className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Aucun coût enregistré. Commencez par ajouter les ressources humaines, logiciels et infrastructure.</p>
          </div>
        ) : (
          summary.cats.map(cat => {
            if (cat.items.length === 0) return null;
            const Icon = cat.icon;
            return (
              <Card key={cat.value}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 ${cat.bg} rounded-lg flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                      </div>
                      <h2 className="font-semibold text-white">{cat.label}</h2>
                      <span className="text-xs text-slate-500">({cat.items.length})</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${cat.color}`}>{fmt(cat.ht)} HT</span>
                      <span className="text-xs text-slate-500 ml-2">/ {fmt(cat.ttc)} TTC</span>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-5 py-2.5 text-left text-xs text-slate-500 font-medium">Libellé</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Qté</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Coût unit. HT</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">TVA</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Total HT</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Total TTC</th>
                        <th className="px-3 py-2.5 w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {cat.items.map(cost => (
                        <tr key={cost.id} className="hover:bg-slate-800/20 group">
                          <td className="px-5 py-3">
                            <p className="text-slate-200 font-medium">{cost.label}</p>
                            {cost.notes && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cost.notes}</p>}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400">{cost.quantity} {cost.unit}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{fmt(cost.unit_cost_ht)}</td>
                          <td className="px-4 py-3 text-right text-slate-500">{cost.vat_rate}%</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-200">{fmt(totalHT(cost))}</td>
                          <td className="px-4 py-3 text-right font-medium text-white">{fmt(totalTTC(cost))}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <button onClick={() => { setEditCost(cost); setShowModal(true); }}
                                className="text-slate-500 hover:text-indigo-400 transition-colors p-1">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setConfirmDel(cost)}
                                className="text-slate-500 hover:text-red-400 transition-colors p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>

      {showModal && id && (
        <CostModal projectId={id} cost={editCost} members={members as Parameters<typeof CostModal>[0]["members"]}
          onClose={() => { setShowModal(false); setEditCost(undefined); }} />
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-white">Supprimer ce coût ?</h3>
            <p className="text-sm text-slate-400">« <span className="text-slate-200">{confirmDel.label}</span> » — {fmt(totalHT(confirmDel))} HT</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200 hover:bg-slate-700">Annuler</button>
              <button onClick={async () => {
                await deleteCost.mutateAsync({ id: confirmDel.id, project_id: confirmDel.project_id });
                setConfirmDel(null);
              }} className="flex-1 px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function CostsPage() { return <Suspense fallback={<Spinner />}><CostsContent /></Suspense>; }
