"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone, usePhases } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Milestone, Plus, X, CheckCircle2, AlertTriangle, Clock, Trash2, Edit2 } from "lucide-react";
import type { Milestone as MilestoneType } from "@/types";

const STATUS_CONFIG = {
  pending:  { label: "En attente",  icon: Clock,         color: "text-slate-400",  border: "border-slate-700" },
  achieved: { label: "Atteint",     icon: CheckCircle2,  color: "text-green-400",  border: "border-green-800/50" },
  missed:   { label: "Manqué",      icon: AlertTriangle, color: "text-red-400",    border: "border-red-800/50" },
};

function MilestoneModal({ projectId, milestone, phases, onClose }: {
  projectId: string;
  milestone?: MilestoneType;
  phases: { id: string; name: string }[];
  onClose: () => void;
}) {
  const create = useCreateMilestone();
  const update = useUpdateMilestone();
  const isEdit = !!milestone;

  const [title,    setTitle]   = useState(milestone?.title ?? "");
  const [desc,     setDesc]    = useState(milestone?.description ?? "");
  const [dueDate,  setDue]     = useState(milestone?.due_date ?? "");
  const [phaseId,  setPhase]   = useState(milestone?.phase_id ?? "");
  const [status,   setStatus]  = useState<MilestoneType["status"]>(milestone?.status ?? "pending");
  const [achieved, setAchieved] = useState(
    milestone?.achieved_at ? new Date(milestone.achieved_at).toISOString().slice(0, 10) : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title:        title.trim(),
      description:  desc || undefined,
      due_date:     dueDate || undefined,
      phase_id:     phaseId || undefined,
      status,
      achieved_at:  status === "achieved" && achieved ? new Date(achieved).toISOString() : null,
    };
    if (isEdit) await update.mutateAsync({ id: milestone!.id, project_id: projectId, ...payload });
    else        await create.mutateAsync({ project_id: projectId, ...payload });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">{isEdit ? "Modifier le jalon" : "Nouveau jalon"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input id="title" label="Titre *" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="ex : Validation cahier des charges" />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Description</label>
              <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Date prévue</label>
                <input type="date" value={dueDate} onChange={e => setDue(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value as MilestoneType["status"])}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="pending">En attente</option>
                  <option value="achieved">Atteint</option>
                  <option value="missed">Manqué</option>
                </select>
              </div>
            </div>

            {status === "achieved" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-green-400">Date d&apos;atteinte</label>
                <input type="date" value={achieved} onChange={e => setAchieved(e.target.value)}
                  className="bg-slate-800 border border-green-800/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            )}

            {phases.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Phase associée</label>
                <select value={phaseId} onChange={e => setPhase(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Aucune phase —</option>
                  {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

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

function MilestonesContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: milestones = [], isLoading } = useMilestones(id);
  const { data: phases = [] }                = usePhases(id);
  const deleteMilestone = useDeleteMilestone();

  const [showModal,  setShowModal]  = useState(false);
  const [editItem,   setEditItem]   = useState<MilestoneType | undefined>();
  const [confirmDel, setConfirmDel] = useState<MilestoneType | null>(null);

  const achieved = milestones.filter(m => m.status === "achieved").length;
  const missed   = milestones.filter(m => m.status === "missed").length;
  const pending  = milestones.filter(m => m.status === "pending").length;

  // Trier : en attente (par date), atteints, manqués
  const sorted = [...milestones].sort((a, b) => {
    const order = { pending: 0, missed: 1, achieved: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return (a.due_date ?? "").localeCompare(b.due_date ?? "");
  });

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Milestone className="w-6 h-6 text-amber-400" /> Jalons
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {achieved} atteint{achieved > 1 ? "s" : ""} · {pending} en attente · {missed > 0 ? <span className="text-red-400">{missed} manqué{missed > 1 ? "s" : ""}</span> : "0 manqué"}
            </p>
          </div>
          <Button onClick={() => { setEditItem(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Nouveau jalon
          </Button>
        </div>

        {/* KPIs */}
        {milestones.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Atteints",    count: achieved, color: "text-green-400" },
              { label: "En attente",  count: pending,  color: "text-slate-400" },
              { label: "Manqués",     count: missed,   color: "text-red-400"   },
            ].map(k => (
              <Card key={k.label}>
                <CardBody className="py-3 text-center">
                  <p className={`text-3xl font-bold ${k.color}`}>{k.count}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : milestones.length === 0 ? (
          <div className="py-16 text-center">
            <Milestone className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Aucun jalon. Créez des jalons clés pour suivre l&apos;avancement du projet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(m => {
              const cfg     = STATUS_CONFIG[m.status];
              const Icon    = cfg.icon;
              const phase   = phases.find(p => p.id === m.phase_id);
              const overdue = m.status === "pending" && m.due_date && new Date(m.due_date) < new Date();

              return (
                <Card key={m.id} className={`${cfg.border} ${overdue ? "border-red-800/60" : ""} group`}>
                  <CardBody>
                    <div className="flex items-start gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        m.status === "achieved" ? "bg-green-600/20" : m.status === "missed" ? "bg-red-600/20" : "bg-slate-800"
                      }`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-100">{m.title}</h3>
                          {overdue && <span className="text-xs bg-red-900/30 border border-red-800/50 text-red-300 px-2 py-0.5 rounded-full">En retard</span>}
                          {phase && <span className="text-xs text-indigo-400">{phase.name}</span>}
                        </div>
                        {m.description && <p className="text-sm text-slate-400 mt-0.5">{m.description}</p>}
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                          {m.due_date && (
                            <span>Prévu : <span className={overdue ? "text-red-400" : "text-slate-300"}>
                              {new Date(m.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                            </span></span>
                          )}
                          {m.achieved_at && (
                            <span className="text-green-400">
                              Atteint le {new Date(m.achieved_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditItem(m); setShowModal(true); }}
                          className="text-slate-500 hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDel(m)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800">
                          <Trash2 className="w-3.5 h-3.5" />
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
        <MilestoneModal projectId={id} milestone={editItem} phases={phases}
          onClose={() => { setShowModal(false); setEditItem(undefined); }} />
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-white">Supprimer le jalon ?</h3>
            <p className="text-sm text-slate-400">« <span className="text-slate-200">{confirmDel.title}</span> » sera supprimé.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200 hover:bg-slate-700">Annuler</button>
              <button onClick={async () => {
                await deleteMilestone.mutateAsync({ id: confirmDel.id, project_id: confirmDel.project_id });
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
export default function MilestonesPage() { return <Suspense fallback={<Spinner />}><MilestonesContent /></Suspense>; }
