"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMepOperations, useCreateMep, useUpdateMep, useDeleteMep, useProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Rocket, Plus, X, CheckCircle2, XCircle, Clock, AlertTriangle,
  Trash2, Edit2, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Moon,
} from "lucide-react";
import type { MepOperation, MepStatus, MepEnvironment } from "@/types";

const STATUS_CONFIG: Record<MepStatus, { label: string; color: string; bg: string }> = {
  planned:     { label: "Planifiée",       color: "text-slate-400",  bg: "bg-slate-800" },
  go:          { label: "Go validé",       color: "text-green-400",  bg: "bg-green-900/20" },
  nogo:        { label: "No-Go",           color: "text-red-400",    bg: "bg-red-900/20" },
  in_progress: { label: "En cours",        color: "text-indigo-400", bg: "bg-indigo-900/20" },
  pss:         { label: "PSS",             color: "text-amber-400",  bg: "bg-amber-900/20" },
  psc:         { label: "PSC",             color: "text-blue-400",   bg: "bg-blue-900/20" },
  completed:   { label: "Terminée",        color: "text-green-400",  bg: "bg-green-900/20" },
  cancelled:   { label: "Annulée",         color: "text-slate-500",  bg: "bg-slate-900" },
  incident:    { label: "Incident",        color: "text-red-400",    bg: "bg-red-900/30" },
};

const ENV_CONFIG: Record<MepEnvironment, { label: string; color: string }> = {
  dev:         { label: "Développement",  color: "text-slate-400" },
  integration: { label: "Intégration",    color: "text-blue-400" },
  preprod:     { label: "Pré-production", color: "text-amber-400" },
  production:  { label: "Production",     color: "text-red-400" },
};

// ── Modal création/édition MEP ────────────────────────────────────────────────
function MepModal({ projectId, mep, onClose }: {
  projectId: string;
  mep?: MepOperation;
  onClose: () => void;
}) {
  const create = useCreateMep();
  const update = useUpdateMep();
  const isEdit = !!mep;

  const [title,       setTitle]       = useState(mep?.title ?? "");
  const [description, setDesc]        = useState(mep?.description ?? "");
  const [plannedDate, setPlannedDate] = useState(mep?.planned_date ? mep.planned_date.slice(0, 16) : "");
  const [environment, setEnvironment] = useState<MepEnvironment>(mep?.environment ?? "production");
  const [isHno,       setIsHno]       = useState(mep?.is_hno ?? false);
  const [status,      setStatus]      = useState<MepStatus>(mep?.status ?? "planned");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      project_id:  projectId,
      title:       title.trim(),
      description: description || null,
      planned_date: plannedDate ? new Date(plannedDate).toISOString() : null,
      environment,
      is_hno:      isHno,
      status,
      go_nogo_decision: mep?.go_nogo_decision ?? null,
      go_nogo_reason: mep?.go_nogo_reason ?? null,
      go_nogo_decided_by: mep?.go_nogo_decided_by ?? null,
      go_nogo_at: mep?.go_nogo_at ?? null,
      bilan: mep?.bilan ?? null,
      execution_date: mep?.execution_date ?? null,
      created_by: null,
    };
    if (isEdit) await update.mutateAsync({ id: mep!.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">{isEdit ? "Modifier la MEP" : "Nouvelle MEP"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input id="title" label="Titre *" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="ex : MEP Oracle DB v12.1 — Migration schéma" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Description</label>
              <textarea rows={2} value={description} onChange={e => setDesc(e.target.value)}
                placeholder="Périmètre, impacts, prérequis…"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Environnement</label>
                <select value={environment} onChange={e => setEnvironment(e.target.value as MepEnvironment)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="dev">Développement</option>
                  <option value="integration">Intégration</option>
                  <option value="preprod">Pré-production</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value as MepStatus)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Date prévue</label>
              <input type="datetime-local" value={plannedDate} onChange={e => setPlannedDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isHno} onChange={e => setIsHno(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-indigo-500" />
              <span className="text-sm text-slate-300 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" /> Opération HNO (hors heures ouvrées)
              </span>
            </label>
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

// ── Carte MEP détaillée ───────────────────────────────────────────────────────
function MepCard({ mep, projectId, onEdit, onDelete }: {
  mep: MepOperation;
  projectId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const update = useUpdateMep();
  const statusConf = STATUS_CONFIG[mep.status];
  const envConf = ENV_CONFIG[mep.environment];

  async function handleGoNogo(decision: "go" | "nogo") {
    await update.mutateAsync({
      id: mep.id,
      project_id: projectId,
      go_nogo_decision: decision,
      go_nogo_at: new Date().toISOString(),
      status: decision === "go" ? "go" : "nogo",
    });
  }

  async function setBilan(text: string) {
    await update.mutateAsync({ id: mep.id, project_id: projectId, bilan: text });
  }

  const [bilanEdit, setBilanEdit] = useState(false);
  const [bilanText, setBilanText] = useState(mep.bilan ?? "");

  return (
    <Card className={`${mep.status === "incident" ? "border-red-800/50" : mep.status === "nogo" ? "border-red-700/40" : ""} transition-all`}>
      <CardBody>
        <div className="flex items-start gap-3">
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
            mep.status === "completed" ? "bg-green-400" :
            mep.status === "nogo" || mep.status === "incident" ? "bg-red-400" :
            mep.status === "go" || mep.status === "psc" ? "bg-blue-400" :
            mep.status === "in_progress" || mep.status === "pss" ? "bg-amber-400" : "bg-slate-500"
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-100">{mep.title}</h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
                  <span className={`font-medium ${statusConf.color}`}>{statusConf.label}</span>
                  <span className={envConf.color}>{envConf.label}</span>
                  {mep.is_hno && <span className="flex items-center gap-1 text-indigo-400"><Moon className="w-3 h-3" />HNO</span>}
                  {mep.planned_date && (
                    <span className="text-slate-500">
                      {new Date(mep.planned_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={onEdit} className="text-slate-500 hover:text-indigo-400 p-1.5 rounded hover:bg-slate-800 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={onDelete} className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-800 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setExpanded(e => !e)} className="text-slate-500 hover:text-slate-300 p-1.5 rounded hover:bg-slate-800 transition-colors">
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Go/NoGo */}
            {mep.status === "planned" && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-500">Décision Go/NoGo :</span>
                <button onClick={() => handleGoNogo("go")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors border border-green-800/40">
                  <ThumbsUp className="w-3 h-3" /> Go
                </button>
                <button onClick={() => handleGoNogo("nogo")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors border border-red-800/40">
                  <ThumbsDown className="w-3 h-3" /> No-Go
                </button>
              </div>
            )}

            {mep.go_nogo_decision && (
              <div className={`mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                mep.go_nogo_decision === "go" ? "bg-green-900/20 text-green-400 border border-green-800/40" : "bg-red-900/20 text-red-400 border border-red-800/40"
              }`}>
                {mep.go_nogo_decision === "go" ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                {mep.go_nogo_decision === "go" ? "Go validé" : "No-Go"}
                {mep.go_nogo_at && ` · ${new Date(mep.go_nogo_at).toLocaleDateString("fr-FR")}`}
              </div>
            )}

            {/* Détails expandés */}
            {expanded && (
              <div className="mt-4 space-y-4 pt-4 border-t border-slate-800">
                {mep.description && (
                  <p className="text-sm text-slate-400">{mep.description}</p>
                )}

                {/* Statuts intermédiaires */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(["in_progress", "pss", "psc", "completed", "incident"] as MepStatus[]).map(s => (
                    <button key={s} onClick={() => update.mutate({ id: mep.id, project_id: projectId, status: s })}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        mep.status === s
                          ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} border-current`
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500"
                      }`}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>

                {/* Bilan */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-slate-400">Bilan MEP</p>
                    {!bilanEdit && (
                      <button onClick={() => setBilanEdit(true)} className="text-xs text-indigo-400 hover:text-indigo-300">
                        {mep.bilan ? "Modifier" : "Rédiger"}
                      </button>
                    )}
                  </div>
                  {bilanEdit ? (
                    <div className="space-y-2">
                      <textarea rows={3} value={bilanText} onChange={e => setBilanText(e.target.value)}
                        placeholder="Résumé de la MEP, incidents rencontrés, plans d'action…"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                      <div className="flex gap-2">
                        <button onClick={async () => { await setBilan(bilanText); setBilanEdit(false); }}
                          className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-500">Enregistrer</button>
                        <button onClick={() => setBilanEdit(false)}
                          className="text-xs px-3 py-1.5 bg-slate-800 text-slate-400 rounded-md hover:bg-slate-700">Annuler</button>
                      </div>
                    </div>
                  ) : mep.bilan ? (
                    <p className="text-sm text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2 whitespace-pre-line">{mep.bilan}</p>
                  ) : (
                    <p className="text-xs text-slate-600 italic">Aucun bilan rédigé</p>
                  )}
                </div>

                {/* Incidents */}
                {mep.incidents.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Incidents ({mep.incidents.length})
                    </p>
                    <ul className="space-y-1">
                      {mep.incidents.map((inc, i) => (
                        <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span> {inc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function MepContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: project } = useProject(id);
  const { data: meps = [], isLoading } = useMepOperations(id);
  const deleteMep = useDeleteMep();

  const [showModal,  setShowModal]  = useState(false);
  const [editItem,   setEditItem]   = useState<MepOperation | undefined>();
  const [confirmDel, setConfirmDel] = useState<MepOperation | null>(null);

  const active    = meps.filter(m => !["completed", "cancelled"].includes(m.status));
  const completed = meps.filter(m => m.status === "completed");
  const incidents = meps.filter(m => m.status === "incident").length;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← {project?.name ?? "Projet"}</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Rocket className="w-6 h-6 text-indigo-400" /> Mises En Production
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {meps.length} MEP · {active.length} en cours · {completed.length} terminée{completed.length > 1 ? "s" : ""}
              {incidents > 0 && <span className="text-red-400 ml-1">· {incidents} incident{incidents > 1 ? "s" : ""}</span>}
            </p>
          </div>
          <Button onClick={() => { setEditItem(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Nouvelle MEP
          </Button>
        </div>

        {/* Légende statuts */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {(["planned", "go", "in_progress", "pss", "psc", "completed", "nogo", "incident"] as MepStatus[]).map(s => (
            <span key={s} className={`px-2 py-0.5 rounded-full border ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} border-current/30`}>
              {STATUS_CONFIG[s].label}
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : meps.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <Rocket className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Aucune MEP planifiée</p>
              <p className="text-slate-500 text-sm mt-1">Planifiez vos mises en production avec chronogrammes et Go/NoGo.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {meps.map(mep => (
              <MepCard key={mep.id} mep={mep} projectId={id!}
                onEdit={() => { setEditItem(mep); setShowModal(true); }}
                onDelete={() => setConfirmDel(mep)} />
            ))}
          </div>
        )}
      </div>

      {showModal && id && (
        <MepModal projectId={id} mep={editItem} onClose={() => { setShowModal(false); setEditItem(undefined); }} />
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-white">Supprimer la MEP ?</h3>
            <p className="text-sm text-slate-400">« <span className="text-slate-200">{confirmDel.title}</span> » sera supprimée.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200 hover:bg-slate-700">Annuler</button>
              <button onClick={async () => {
                await deleteMep.mutateAsync({ id: confirmDel.id, project_id: confirmDel.project_id });
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
export default function MepPage() { return <Suspense fallback={<Spinner />}><MepContent /></Suspense>; }
