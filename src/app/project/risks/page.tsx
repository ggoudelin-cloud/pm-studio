"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProjectRisks, useCreateRisk, useUpdateRisk, useDeleteRisk, useProjectMembers } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertTriangle, Plus, X, Trash2, Edit2, ShieldCheck, ShieldAlert, ShieldOff, Zap } from "lucide-react";
import type { ProjectRisk, RiskCategory, RiskStatus } from "@/types";

const CATEGORIES: { value: RiskCategory; label: string }[] = [
  { value: "technical",    label: "Technique" },
  { value: "schedule",     label: "Planning" },
  { value: "budget",       label: "Budget" },
  { value: "resource",     label: "Ressources" },
  { value: "quality",      label: "Qualité" },
  { value: "other",        label: "Autre" },
];

const STATUSES: { value: RiskStatus; label: string; icon: React.ElementType; color: string; border: string }[] = [
  { value: "open",      label: "Ouvert",    icon: ShieldAlert, color: "text-red-400",    border: "border-red-700/50" },
  { value: "mitigated", label: "Atténué",   icon: ShieldCheck, color: "text-amber-400",  border: "border-amber-700/50" },
  { value: "closed",    label: "Clôturé",   icon: ShieldOff,   color: "text-green-400",  border: "border-green-700/50" },
  { value: "occurred",  label: "Survenu",   icon: Zap,         color: "text-slate-400",  border: "border-slate-700" },
];

function weightColor(w: number) {
  if (w >= 20) return "text-red-400 bg-red-900/30 border-red-700/50";
  if (w >= 12) return "text-amber-400 bg-amber-900/20 border-amber-700/50";
  if (w >= 6)  return "text-yellow-400 bg-yellow-900/20 border-yellow-700/50";
  return "text-green-400 bg-green-900/20 border-green-700/50";
}

function RiskModal({ projectId, risk, members, onClose }: {
  projectId: string;
  risk?: ProjectRisk & { profiles?: { full_name: string | null; email: string | null } | null };
  members: { user_id: string; profiles: { full_name: string | null; email: string | null } | null }[];
  onClose: () => void;
}) {
  const create = useCreateRisk();
  const update = useUpdateRisk();
  const isEdit = !!risk;

  const [title,       setTitle]       = useState(risk?.title ?? "");
  const [description, setDesc]        = useState(risk?.description ?? "");
  const [category,    setCategory]    = useState<RiskCategory>(risk?.category ?? "technical");
  const [probability, setProbability] = useState(risk?.probability ?? 3);
  const [impact,      setImpact]      = useState(risk?.impact ?? 3);
  const [status,      setStatus]      = useState<RiskStatus>(risk?.status ?? "open");
  const [mitigation,  setMitigation]  = useState(risk?.mitigation ?? "");
  const [ownerId,     setOwner]       = useState(risk?.owner_id ?? "");
  const [dueDate,     setDueDate]     = useState(risk?.due_date ?? "");

  const previewWeight = probability * impact;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      project_id:  projectId,
      title:       title.trim(),
      description: description || null,
      category,
      probability,
      impact,
      status,
      mitigation:  mitigation || null,
      owner_id:    ownerId || null,
      due_date:    dueDate || null,
    };
    if (isEdit) await update.mutateAsync({ id: risk!.id, ...payload });
    else        await create.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">{isEdit ? "Modifier le risque" : "Nouveau risque"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input id="title" label="Titre *" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="ex : Dépendance à un fournisseur externe" />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Description</label>
              <textarea rows={2} value={description} onChange={e => setDesc(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Catégorie</label>
                <select value={category} onChange={e => setCategory(e.target.value as RiskCategory)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value as RiskStatus)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Pondération P × I */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300">Pondération P × I</p>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${weightColor(previewWeight)}`}>
                  {previewWeight} / 25
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Probabilité</span>
                    <span className="text-indigo-400 font-medium">{probability}/5</span>
                  </div>
                  <input type="range" min={1} max={5} value={probability} onChange={e => setProbability(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                  <div className="flex justify-between text-xs text-slate-600"><span>Faible</span><span>Élevée</span></div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Impact</span>
                    <span className="text-red-400 font-medium">{impact}/5</span>
                  </div>
                  <input type="range" min={1} max={5} value={impact} onChange={e => setImpact(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-red-500" />
                  <div className="flex justify-between text-xs text-slate-600"><span>Faible</span><span>Élevé</span></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Plan de mitigation</label>
              <textarea rows={2} value={mitigation} onChange={e => setMitigation(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Actions pour réduire la probabilité ou l'impact…" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {members.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Responsable</label>
                  <select value={ownerId} onChange={e => setOwner(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Non assigné —</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profiles?.full_name ?? m.profiles?.email ?? m.user_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Échéance</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button type="submit" loading={create.isPending || update.isPending} className="flex-1 justify-center">
                {isEdit ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RisksContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: risks = [], isLoading } = useProjectRisks(id);
  const { data: members = [] } = useProjectMembers(id);
  const deleteRisk = useDeleteRisk();
  const updateRisk = useUpdateRisk();

  const [showModal, setShowModal] = useState(false);
  const [editRisk,  setEditRisk]  = useState<(typeof risks)[0] | undefined>();
  const [filterStatus, setFilterStatus] = useState<RiskStatus | "">("");
  const [confirmDel,   setConfirmDel]   = useState<(typeof risks)[0] | null>(null);

  const filtered = risks.filter(r => !filterStatus || r.status === filterStatus);

  // Matrice de risques (agrégation par zone P×I)
  const criticalCount  = risks.filter(r => r.status === "open" && r.weight >= 20).length;
  const highCount      = risks.filter(r => r.status === "open" && r.weight >= 12 && r.weight < 20).length;
  const mediumCount    = risks.filter(r => r.status === "open" && r.weight >= 6  && r.weight < 12).length;
  const lowCount       = risks.filter(r => r.status === "open" && r.weight < 6).length;

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
              <AlertTriangle className="w-6 h-6 text-red-400" /> Registre des risques
            </h1>
            <p className="text-slate-400 text-sm mt-1">{risks.length} risque(s)</p>
          </div>
          <Button onClick={() => { setEditRisk(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Nouveau risque
          </Button>
        </div>

        {/* Synthèse niveaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Critique", count: criticalCount, color: "bg-red-900/20 border-red-700/50 text-red-400", range: "≥ 20" },
            { label: "Élevé",    count: highCount,     color: "bg-amber-900/20 border-amber-700/50 text-amber-400", range: "12-19" },
            { label: "Moyen",    count: mediumCount,   color: "bg-yellow-900/20 border-yellow-700/50 text-yellow-400", range: "6-11" },
            { label: "Faible",   count: lowCount,      color: "bg-green-900/20 border-green-700/50 text-green-400", range: "1-5" },
          ].map(({ label, count, color, range }) => (
            <div key={label} className={`rounded-xl border p-3 text-center ${color}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
              <p className="text-xs opacity-60">{range}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {([["", "Tous"], ...STATUSES.map(s => [s.value, s.label])] as [string, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val as RiskStatus | "")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterStatus === val ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Liste des risques */}
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">Aucun risque enregistré.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(risk => {
              const statusCfg = STATUSES.find(s => s.value === risk.status)!;
              const StatusIcon = statusCfg.icon;
              const catLabel = CATEGORIES.find(c => c.value === risk.category)?.label ?? risk.category;
              return (
                <Card key={risk.id} className="hover:border-slate-700 transition-colors">
                  <CardBody>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-slate-100">{risk.title}</h3>
                          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{catLabel}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.color} ${statusCfg.border}`}>
                            <StatusIcon className="w-3 h-3" />{statusCfg.label}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${weightColor(risk.weight)}`}>
                            P{risk.probability}×I{risk.impact} = {risk.weight}
                          </span>
                        </div>
                        {risk.description && <p className="text-xs text-slate-500 line-clamp-1">{risk.description}</p>}
                        {risk.mitigation && (
                          <p className="text-xs text-slate-400 italic">🛡 {risk.mitigation}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          {risk.profiles && (
                            <span>👤 {risk.profiles.full_name ?? risk.profiles.email ?? "?"}</span>
                          )}
                          {risk.due_date && (
                            <span>📅 {new Date(risk.due_date).toLocaleDateString("fr-FR")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Changement de statut rapide */}
                        <select
                          value={risk.status}
                          onChange={e => updateRisk.mutate({ id: risk.id, project_id: risk.project_id, status: e.target.value as RiskStatus })}
                          className={`text-xs font-medium px-2 py-1 rounded-lg border bg-transparent cursor-pointer focus:outline-none ${statusCfg.color} ${statusCfg.border}`}
                        >
                          {STATUSES.map(s => <option key={s.value} value={s.value} className="bg-slate-900 text-slate-200">{s.label}</option>)}
                        </select>
                        <button onClick={() => { setEditRisk(risk); setShowModal(true); }}
                          className="text-slate-500 hover:text-slate-300 transition-colors" title="Modifier">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDel(risk)}
                          className="text-slate-600 hover:text-red-400 transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showModal && id && (
        <RiskModal
          projectId={id}
          risk={editRisk}
          members={members}
          onClose={() => { setShowModal(false); setEditRisk(undefined); }}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/50 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-white">Supprimer ce risque ?</h3>
            <p className="text-sm text-slate-400">
              <span className="text-slate-200 font-medium">« {confirmDel.title} »</span> sera supprimé définitivement.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirmDel(null)} className="flex-1 justify-center">Annuler</Button>
              <Button variant="danger" onClick={async () => {
                await deleteRisk.mutateAsync({ id: confirmDel.id, project_id: confirmDel.project_id });
                setConfirmDel(null);
              }} loading={deleteRisk.isPending} className="flex-1 justify-center">Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function RisksPage() {
  return <Suspense fallback={<Spinner />}><RisksContent /></Suspense>;
}
