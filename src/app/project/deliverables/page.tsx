"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDeliverables, useCreateDeliverable, useUpdateDeliverable, usePhases, useMyRoleInProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Package, Plus, X, CheckCircle2, Clock, AlertTriangle, FileCheck } from "lucide-react";
import type { Deliverable } from "@/types";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft:     { label: "Brouillon",  icon: Clock,         color: "text-slate-400"  },
  submitted: { label: "Soumis",     icon: FileCheck,     color: "text-indigo-400" },
  approved:  { label: "Approuvé",   icon: CheckCircle2,  color: "text-green-400"  },
  rejected:  { label: "Rejeté",     icon: AlertTriangle, color: "text-red-400"    },
};

function DeliverableModal({ projectId, phases, deliverable, onClose }: {
  projectId: string;
  phases: { id: string; name: string }[];
  deliverable?: Deliverable;
  onClose: () => void;
}) {
  const create = useCreateDeliverable();
  const update = useUpdateDeliverable();
  const isEdit = !!deliverable;
  const [title,   setTitle]   = useState(deliverable?.title ?? "");
  const [desc,    setDesc]    = useState(deliverable?.description ?? "");
  const [phaseId, setPhaseId] = useState(deliverable?.phase_id ?? "");
  const [fileUrl, setFileUrl] = useState(deliverable?.file_url ?? "");
  const [status,  setStatus]  = useState(deliverable?.status ?? "draft");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { title, description: desc || undefined, phase_id: phaseId || undefined, file_url: fileUrl || undefined };
    if (isEdit) {
      await update.mutateAsync({ id: deliverable!.id, project_id: projectId, ...payload, status: status as Deliverable["status"] });
    } else {
      await create.mutateAsync({ project_id: projectId, ...payload });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">{isEdit ? "Modifier le livrable" : "Nouveau livrable"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input id="title" label="Titre *" value={title} onChange={e => setTitle(e.target.value)} required placeholder="ex : Cahier des charges fonctionnel" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Description</label>
              <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            {phases.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Phase associée</label>
                <select value={phaseId} onChange={e => setPhaseId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Aucune —</option>
                  {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <Input id="fileUrl" label="URL du document" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://docs.google.com/..." />
            {isEdit && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value as Deliverable["status"])}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {Object.entries(STATUS_CONFIG).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
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

function DeliverablesContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: deliverables = [], isLoading } = useDeliverables(id);
  const { data: phases = [] } = usePhases(id);
  const { data: myRole } = useMyRoleInProject(id);
  const isReadOnly = myRole === "client" || myRole === "observer";
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<Deliverable | undefined>();

  const byStatus = (s: string) => deliverables.filter(d => d.status === s);
  const total     = deliverables.length;
  const approved  = byStatus("approved").length;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-400" /> Livrables
            </h1>
            <p className="text-slate-400 text-sm mt-1">{approved}/{total} approuvé(s)</p>
          </div>
          {!isReadOnly && (
            <Button onClick={() => { setEditItem(undefined); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> Nouveau livrable
            </Button>
          )}
        </div>

        {/* Colonnes par statut */}
        {isLoading ? (
          <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : total === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Aucun livrable. Commencez par en créer un.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const items = byStatus(status);
              const Icon  = cfg.icon;
              return (
                <div key={status}>
                  <div className={`flex items-center gap-2 mb-3 ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{cfg.label}</span>
                    <span className="text-xs text-slate-600 ml-auto">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(d => {
                      const phase = phases.find(p => p.id === d.phase_id);
                      return (
                        <div key={d.id} className={isReadOnly ? "" : "cursor-pointer"} onClick={() => { if (!isReadOnly) { setEditItem(d); setShowModal(true); } }}>
                    <Card className="hover:border-slate-700 transition-colors">
                          <CardBody className="py-3">
                            <p className="text-sm font-medium text-slate-200 leading-snug">{d.title}</p>
                            {phase && <p className="text-xs text-indigo-400 mt-1">{phase.name}</p>}
                            {d.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{d.description}</p>}
                            {d.file_url && (
                              <a href={d.file_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block">
                                Ouvrir le document →
                              </a>
                            )}
                          </CardBody>
                        </Card>
                    </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="py-4 text-center text-xs text-slate-600 border border-dashed border-slate-800 rounded-xl">Aucun</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && id && (
        <DeliverableModal
          projectId={id}
          phases={phases}
          deliverable={editItem}
          onClose={() => { setShowModal(false); setEditItem(undefined); }}
        />
      )}
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function DeliverablesPage() { return <Suspense fallback={<Spinner />}><DeliverablesContent /></Suspense>; }
