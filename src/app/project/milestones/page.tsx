"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone,
  usePhases, useTasks, useMilestoneTasks, useAddMilestoneTask, useRemoveMilestoneTask,
  useMyMemberships,
} from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Milestone, Plus, X, CheckCircle2, AlertTriangle, Clock, Trash2, Edit2, Link2, ListTodo } from "lucide-react";
import type { Milestone as MilestoneType, Task } from "@/types";

const STATUS_CONFIG = {
  pending:  { label: "En attente",  icon: Clock,         color: "text-slate-400",  border: "border-slate-700" },
  achieved: { label: "Atteint",     icon: CheckCircle2,  color: "text-green-400",  border: "border-green-800/50" },
  missed:   { label: "Manqué",      icon: AlertTriangle, color: "text-red-400",    border: "border-red-800/50" },
};

// ── Panneau de rattachement jalon ↔ tâches ────────────────────────────────
function TaskLinker({ milestone, projectId, allTasks, onClose }: {
  milestone: MilestoneType;
  projectId: string;
  allTasks: Task[];
  onClose: () => void;
}) {
  const { data: linked = [] } = useMilestoneTasks(milestone.id);
  const addLink    = useAddMilestoneTask();
  const removeLink = useRemoveMilestoneTask();
  const linkedIds  = new Set(linked.map(l => l.task_id));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-white">Tâches rattachées</h2>
            <p className="text-xs text-slate-500 mt-0.5">Jalon : {milestone.title}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {allTasks.length === 0 ? (
            <p className="text-center text-slate-500 py-6 text-sm">Aucune tâche dans ce projet.</p>
          ) : allTasks.map(task => {
            const isLinked = linkedIds.has(task.id);
            const link = linked.find(l => l.task_id === task.id);
            return (
              <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isLinked ? "bg-indigo-900/20 border-indigo-700/50" : "bg-slate-800/40 border-slate-700/50 hover:border-slate-600"
              }`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  task.status === "done" ? "bg-green-400" :
                  task.status === "in_progress" ? "bg-indigo-400" :
                  task.status === "blocked" ? "bg-red-400" : "bg-slate-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{task.title}</p>
                  <p className="text-xs text-slate-500">{
                    task.status === "done" ? "Terminée" :
                    task.status === "in_progress" ? "En cours" :
                    task.status === "blocked" ? "Bloquée" : "À faire"
                  }{task.due_date ? ` · ${new Date(task.due_date).toLocaleDateString("fr-FR")}` : ""}</p>
                </div>
                <button
                  onClick={() => isLinked && link
                    ? removeLink.mutate({ id: link.id, milestoneId: milestone.id, taskId: task.id })
                    : addLink.mutate({ milestoneId: milestone.id, taskId: task.id })
                  }
                  disabled={addLink.isPending || removeLink.isPending}
                  className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                    isLinked
                      ? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
                      : "bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30"
                  }`}
                >
                  {isLinked ? "Retirer" : "Rattacher"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t border-slate-800 shrink-0">
          <p className="text-xs text-slate-500">{linkedIds.size} tâche(s) rattachée(s) à ce jalon</p>
        </div>
      </div>
    </div>
  );
}

// ── Modal création/édition jalon ──────────────────────────────────────────────
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

// ── Carte jalon avec tâches rattachées ────────────────────────────────────────
function MilestoneCard({
  m, phases, allTasks, myRole, onEdit, onDelete, onLink,
}: {
  m: MilestoneType;
  phases: { id: string; name: string }[];
  allTasks: Task[];
  myRole: string | null | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onLink: () => void;
}) {
  const { data: linked = [] } = useMilestoneTasks(m.id);
  const cfg = STATUS_CONFIG[m.status];
  const Icon = cfg.icon;
  const phase = phases.find(p => p.id === m.phase_id);
  const overdue = m.status === "pending" && m.due_date && new Date(m.due_date) < new Date();
  const linkedTasks = allTasks.filter(t => linked.some(l => l.task_id === t.id));
  const tasksDone = linkedTasks.filter(t => t.status === "done").length;
  const tasksPct = linkedTasks.length > 0 ? Math.round((tasksDone / linkedTasks.length) * 100) : null;

  return (
    <Card className={`${cfg.border} ${overdue ? "border-red-800/60" : ""} group`}>
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
            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
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
              {linked.length > 0 && (
                <span className="flex items-center gap-1 text-indigo-400">
                  <ListTodo className="w-3 h-3" />
                  {tasksDone}/{linked.length} tâche{linked.length > 1 ? "s" : ""}
                  {tasksPct !== null && ` (${tasksPct} %)`}
                </span>
              )}
            </div>
            {/* Barre de progression des tâches */}
            {linked.length > 0 && (
              <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${tasksPct === 100 ? "bg-green-500" : "bg-indigo-500"}`}
                  style={{ width: `${tasksPct ?? 0}%` }}
                />
              </div>
            )}
          </div>
          {!(myRole === "client" || myRole === "observer") && (
            <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={onLink}
                className="text-slate-500 hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
                title="Rattacher des tâches">
                <Link2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={onEdit}
                className="text-slate-500 hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete}
                className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function MilestonesContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: milestones = [], isLoading } = useMilestones(id);
  const { data: phases = [] }                = usePhases(id);
  const { data: allTasks = [] }              = useTasks(id);
  const { user } = useAuthStore();
  const { data: memberships = [] }           = useMyMemberships();
  const myRole                               = memberships.find(m => m.project_id === id)?.role ?? null;
  const deleteMilestone = useDeleteMilestone();
  const isReadOnly = myRole === "client" || myRole === "observer";

  const [showModal,    setShowModal]    = useState(false);
  const [editItem,     setEditItem]     = useState<MilestoneType | undefined>();
  const [linkItem,     setLinkItem]     = useState<MilestoneType | null>(null);
  const [confirmDel,   setConfirmDel]   = useState<MilestoneType | null>(null);

  const achieved = milestones.filter(m => m.status === "achieved").length;
  const missed   = milestones.filter(m => m.status === "missed").length;
  const pending  = milestones.filter(m => m.status === "pending").length;

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
              {achieved} atteint{achieved > 1 ? "s" : ""} · {pending} en attente · {missed > 0 ? `${missed} manqué${missed > 1 ? "s" : ""}` : "0 manqué"}
            </p>
          </div>
          {!isReadOnly && (
            <Button onClick={() => { setEditItem(undefined); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> Nouveau jalon
            </Button>
          )}
        </div>

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
            {sorted.map(m => (
              <MilestoneCard
                key={m.id}
                m={m}
                phases={phases}
                allTasks={allTasks}
                myRole={myRole}
                onEdit={() => { if (!isReadOnly) { setEditItem(m); setShowModal(true); } }}
                onDelete={() => { if (!isReadOnly) setConfirmDel(m); }}
                onLink={() => { if (!isReadOnly) setLinkItem(m); }}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && id && (
        <MilestoneModal projectId={id} milestone={editItem} phases={phases}
          onClose={() => { setShowModal(false); setEditItem(undefined); }} />
      )}

      {linkItem && id && (
        <TaskLinker
          milestone={linkItem}
          projectId={id}
          allTasks={allTasks}
          onClose={() => setLinkItem(null)}
        />
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
