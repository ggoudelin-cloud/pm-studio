"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useTaskDependencies, useProjectMembers } from "@/hooks/useProjects";
import { useMemo } from "react";
import { Trash2, CalendarDays, User, Link2 } from "lucide-react";
import Comments from "@/components/Comments";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getMethodologyLabel, getMethodologyColor, getStatusLabel } from "@/lib/utils";
import { Plus, X, Brain, ChevronDown, ChevronUp } from "lucide-react";
import type { Task, Methodology } from "@/types";
import type { BadgeVariant } from "@/components/ui/Badge";

const SCORE_LABELS: Record<string, string> = {
  score_stability:         "Stabilité des exigences",
  score_complexity:        "Complexité fonctionnelle",
  score_doc_dependency:    "Dépendances documentaires",
  score_change_frequency:  "Fréquence de changement",
  score_criticality:       "Criticité métier",
  score_innovation:        "Innovation / Incertitude",
  score_client_validation: "Validation client requise",
  score_team_experience:   "Expérience équipe",
};

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-indigo-400 font-medium">{value}/5</span>
      </div>
      <input
        type="range" min={1} max={5} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
      />
      <div className="flex justify-between text-xs text-slate-600">
        <span>Faible</span><span>Fort</span>
      </div>
    </div>
  );
}

function RecommendationBadge({ task }: { task: Partial<Task> }) {
  if (!task.methodology_recommendation) return null;
  const v = task.decision_score_v ?? 0;
  const a = task.decision_score_agile ?? 0;
  const total = v + a || 1;
  const pctV = Math.round((v / total) * 100);

  return (
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-medium text-slate-300">Recommandation moteur</span>
        <Badge variant={getMethodologyColor(task.methodology_recommendation) as BadgeVariant}>
          {getMethodologyLabel(task.methodology_recommendation)}
        </Badge>
      </div>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden">
        <div className="bg-blue-500 transition-all" style={{ width: `${pctV}%` }} title={`Cycle en V ${pctV}%`} />
        <div className="bg-green-500 transition-all" style={{ width: `${100 - pctV}%` }} title={`Agile ${100 - pctV}%`} />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Cycle en V {pctV}%</span>
        <span>Agile {100 - pctV}%</span>
      </div>
      {task.recommendation_reason && (
        <p className="text-xs text-slate-400 italic">{task.recommendation_reason}</p>
      )}
    </div>
  );
}

function TaskModal({ projectId, task, allTasks, onClose }: {
  projectId: string;
  task?: Task;
  allTasks: Task[];
  onClose: () => void;
}) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: members = [] } = useProjectMembers(projectId);
  const isEdit = !!task;

  const [title,      setTitle]    = useState(task?.title ?? "");
  const [description,setDesc]     = useState(task?.description ?? "");
  const [assigneeId, setAssignee] = useState(task?.assignee_id ?? "");
  const [startDate,  setStart]    = useState(task?.start_date ?? "");
  const [dueDate,    setDue]      = useState(task?.due_date ?? "");
  const [allocPct,   setAllocPct] = useState(task?.allocation_pct ?? 100);
  const [scores, setScores]           = useState({
    score_stability:         task?.score_stability ?? 3,
    score_complexity:        task?.score_complexity ?? 3,
    score_doc_dependency:    task?.score_doc_dependency ?? 3,
    score_change_frequency:  task?.score_change_frequency ?? 3,
    score_criticality:       task?.score_criticality ?? 3,
    score_innovation:        task?.score_innovation ?? 3,
    score_client_validation: task?.score_client_validation ?? 3,
    score_team_experience:   task?.score_team_experience ?? 3,
  });
  const [methodology, setMethodology] = useState<string>(task?.methodology ?? "");
  const [preview, setPreview]         = useState<Partial<Task>>({});
  const [showClassif, setShowClassif] = useState(!isEdit);

  function computePreview(s: typeof scores) {
    const v = s.score_stability * 5 + s.score_criticality * 4 + s.score_doc_dependency * 4 + s.score_client_validation * 3;
    const a = (6 - s.score_stability) * 5 + s.score_change_frequency * 4 + s.score_innovation * 4 + s.score_complexity * 3;
    const rec: Methodology = v - a > 15 ? "cycle_v" : a - v > 15 ? "agile" : "hybrid";
    setPreview({ decision_score_v: v, decision_score_agile: a, methodology_recommendation: rec,
      recommendation_reason: rec === "cycle_v" ? "Exigences stables, criticité et documentation élevées." :
        rec === "agile" ? "Forte incertitude, changements fréquents." : "Profil mixte — approche hybride recommandée." });
  }

  function handleScore(key: string, val: number) {
    const next = { ...scores, [key]: val };
    setScores(next);
    computePreview(next);
  }

  // Détection de conflits de ressource
  const resourceConflict = useMemo(() => {
    if (!assigneeId || (!startDate && !dueDate)) return null;
    const effStart = startDate || dueDate;
    const effEnd   = dueDate   || startDate;
    const overlapping = allTasks.filter(t => {
      if (t.id === task?.id) return false;
      if (t.assignee_id !== assigneeId) return false;
      const tS = t.start_date || t.due_date;
      const tE = t.due_date   || t.start_date;
      if (!tS || !tE) return false;
      return effStart! <= tE && effEnd! >= tS;
    });
    const totalPct = overlapping.reduce((s, t) => s + (t.allocation_pct ?? 100), 0) + allocPct;
    if (totalPct > 100) return { totalPct, tasks: overlapping };
    return null;
  }, [assigneeId, startDate, dueDate, allocPct, allTasks, task?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      project_id: projectId,
      title,
      description:  description || null,
      assignee_id:  assigneeId  || null,
      start_date:   startDate   || null,
      due_date:     dueDate     || null,
      methodology:  (methodology as Methodology) || null,
      allocation_pct: allocPct,
      ...scores,
    };
    if (isEdit) {
      await updateTask.mutateAsync({ id: task!.id, ...payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* En-tête fixe */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">{isEdit ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <Input id="title" label="Titre *" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="ex : Développer le module d'authentification" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Description</label>
              <textarea rows={2} value={description} onChange={(e) => setDesc(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Détails de la tâche…" />
            </div>

            {/* Assigné + % d'occupation */}
            {members.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Personne en charge</label>
                  <select value={assigneeId} onChange={e => setAssignee(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Non assigné —</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profiles?.full_name ?? m.profiles?.email ?? m.user_id}
                      </option>
                    ))}
                  </select>
                </div>
                {assigneeId && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm">
                      <label className="font-medium text-slate-300">Taux d&apos;occupation</label>
                      <span className="text-indigo-400 font-medium">{allocPct} %</span>
                    </div>
                    <input type="range" min={10} max={100} step={10} value={allocPct}
                      onChange={e => setAllocPct(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                    <div className="flex justify-between text-xs text-slate-600"><span>10 %</span><span>100 %</span></div>
                  </div>
                )}
                {resourceConflict && (
                  <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg px-3 py-2 text-xs text-amber-300 space-y-1">
                    <p className="font-medium">⚠ Surcharge ressource : {resourceConflict.totalPct} % sur la période</p>
                    <p className="text-amber-400/70">Tâches en conflit : {resourceConflict.tasks.map(t => t.title).join(", ")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Date de début</label>
                <input type="date" value={startDate} onChange={e => setStart(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Date de fin</label>
                <input type="date" value={dueDate} min={startDate || undefined} onChange={e => setDue(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Classification */}
            <div className="border border-slate-700 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowClassif(!showClassif)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                <span className="flex items-center gap-2"><Brain className="w-4 h-4 text-indigo-400" />Classification méthodologique</span>
                {showClassif ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showClassif && (
                <div className="p-4 space-y-4">
                  {Object.entries(SCORE_LABELS).map(([key, label]) => (
                    <ScoreSlider key={key} label={label} value={scores[key as keyof typeof scores]}
                      onChange={(v) => handleScore(key, v)} />
                  ))}
                  {(preview.methodology_recommendation || task?.methodology_recommendation) && (
                    <RecommendationBadge task={Object.keys(preview).length ? preview : task!} />
                  )}
                </div>
              )}
            </div>

            {/* Méthode appliquée */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Méthode appliquée</label>
              <select value={methodology} onChange={(e) => setMethodology(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Suivre la recommandation —</option>
                <option value="cycle_v">Cycle en V</option>
                <option value="agile">Agile</option>
                <option value="hybrid">Hybride</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button type="submit" loading={createTask.isPending || updateTask.isPending} className="flex-1 justify-center">
                {isEdit ? "Enregistrer" : "Créer la tâche"}
              </Button>
            </div>
          </form>

          {/* Commentaires — uniquement en mode édition */}
          {isEdit && task && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-800 mt-2">
              <Comments projectId={projectId} entityType="task" entityId={task.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  todo: "text-slate-400", in_progress: "text-indigo-400", review: "text-amber-400",
  blocked: "text-red-400", done: "text-green-400", cancelled: "text-slate-600",
};

function TasksPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: tasks, isLoading } = useTasks(id);
  const { data: deps    = [] }     = useTaskDependencies(id);
  const { data: members = [] }     = useProjectMembers(id);
  const deleteTask  = useDeleteTask();
  const updateTask  = useUpdateTask();
  const [showModal,  setShowModal]  = useState(false);
  const [editTask,   setEditTask]   = useState<Task | undefined>();
  const [filterM,    setFilterM]    = useState("");
  const [confirmDel, setConfirmDel] = useState<Task | null>(null);

  const filtered = tasks?.filter((t) => !filterM || t.methodology === filterM || t.methodology_recommendation === filterM) ?? [];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white">Tâches & Classification</h1>
            <p className="text-slate-400 text-sm mt-1">{tasks?.length ?? 0} tâche(s)</p>
          </div>
          <Button onClick={() => { setEditTask(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Nouvelle tâche
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {["", "cycle_v", "agile", "hybrid"].map((m) => (
            <button key={m} onClick={() => setFilterM(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterM === m ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
              }`}>
              {m ? getMethodologyLabel(m) : "Toutes"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !filtered.length ? (
          <div className="py-16 text-center">
            <p className="text-slate-400">Aucune tâche. Commencez par en créer une.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => {
              const taskDeps  = deps.filter(d => d.task_id === task.id);
              const assignee  = members.find(m => m.user_id === task.assignee_id);
              const fmtDate   = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : null;
              return (
              <Card key={task.id} className="hover:border-slate-700 transition-colors">
                <CardBody>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-slate-100">{task.title}</h3>
                        {task.methodology_recommendation && (
                          <Badge variant={getMethodologyColor(task.methodology_recommendation) as BadgeVariant}>
                            {getMethodologyLabel(task.methodology_recommendation)}
                          </Badge>
                        )}
                        {task.methodology && task.methodology !== task.methodology_recommendation && (
                          <Badge variant="amber">Appliqué: {getMethodologyLabel(task.methodology)}</Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                      )}

                      {/* Dates, assigné, prédécesseurs */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {(task.start_date || task.due_date) && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {fmtDate(task.start_date) ?? "?"}
                            {task.due_date && <> → {fmtDate(task.due_date)}</>}
                          </span>
                        )}
                        {assignee && (
                          <span className="flex items-center gap-1 text-indigo-400">
                            <User className="w-3 h-3" />
                            {assignee.profiles?.full_name ?? assignee.profiles?.email ?? "Assigné"}
                          </span>
                        )}
                        {taskDeps.length > 0 && (
                          <span className="flex items-center gap-1 text-amber-400/80">
                            <Link2 className="w-3 h-3" />
                            {taskDeps.length} prédécesseur{taskDeps.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {task.decision_score_v !== null && (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex gap-1 h-1.5 rounded-full overflow-hidden w-24">
                            <div className="bg-blue-500" style={{ width: `${Math.round((task.decision_score_v / (task.decision_score_v + (task.decision_score_agile ?? 0) || 1)) * 100)}%` }} />
                            <div className="bg-green-500 flex-1" />
                          </div>
                          <span className="text-xs text-slate-500">
                            V:{task.decision_score_v} / A:{task.decision_score_agile}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Sélecteur de statut rapide */}
                      <select
                        value={task.status}
                        onChange={e => updateTask.mutate({ id: task.id, project_id: task.project_id, status: e.target.value as Task["status"] })}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                          task.status === "done"        ? "border-green-700/50 text-green-400 hover:border-green-600" :
                          task.status === "in_progress" ? "border-indigo-700/50 text-indigo-400 hover:border-indigo-600" :
                          task.status === "review"      ? "border-amber-700/50 text-amber-400 hover:border-amber-600" :
                          task.status === "blocked"     ? "border-red-700/50 text-red-400 hover:border-red-600" :
                          task.status === "cancelled"   ? "border-slate-700 text-slate-500" :
                          "border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <option value="todo"        className="bg-slate-900 text-slate-300">À faire</option>
                        <option value="in_progress" className="bg-slate-900 text-indigo-300">En cours</option>
                        <option value="review"      className="bg-slate-900 text-amber-300">En révision</option>
                        <option value="blocked"     className="bg-slate-900 text-red-300">Bloqué</option>
                        <option value="done"        className="bg-slate-900 text-green-300">Terminé</option>
                        <option value="cancelled"   className="bg-slate-900 text-slate-400">Annulé</option>
                      </select>
                      <button
                        onClick={() => { setEditTask(task); setShowModal(true); }}
                        className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded border border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setConfirmDel(task)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
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
        <TaskModal projectId={id} task={editTask} allTasks={tasks ?? []} onClose={() => { setShowModal(false); setEditTask(undefined); }} />
      )}

      {/* Confirmation suppression tâche */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-white">Supprimer la tâche ?</h3>
            <p className="text-sm text-slate-400">
              <span className="text-slate-200 font-medium">« {confirmDel.title} »</span> sera supprimée définitivement.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors">
                Annuler
              </button>
              <button
                onClick={async () => {
                  await deleteTask.mutateAsync({ id: confirmDel.id, project_id: confirmDel.project_id });
                  setConfirmDel(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Supprimer
              </button>
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

export default function TasksPage() {
  return <Suspense fallback={<Spinner />}><TasksPageContent /></Suspense>;
}
