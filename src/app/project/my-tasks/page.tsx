"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMyTasks, useUpdateTaskSilent, useProject, useMyRoleInProject } from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckSquare, Clock, AlertTriangle, CheckCircle2, Ban, CalendarDays, TrendingUp, Loader2 } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import toast from "react-hot-toast";

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  todo:        { label: "À faire",      icon: Clock,          color: "text-slate-400",   bg: "bg-slate-800" },
  in_progress: { label: "En cours",     icon: Loader2,        color: "text-indigo-400",  bg: "bg-indigo-900/30" },
  review:      { label: "En revue",     icon: CheckSquare,    color: "text-amber-400",   bg: "bg-amber-900/30" },
  blocked:     { label: "Bloquée",      icon: AlertTriangle,  color: "text-red-400",     bg: "bg-red-900/30" },
  done:        { label: "Terminée",     icon: CheckCircle2,   color: "text-green-400",   bg: "bg-green-900/30" },
  cancelled:   { label: "Annulée",      icon: Ban,            color: "text-slate-600",   bg: "bg-slate-900" },
};

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: "Faible",   color: "text-slate-400" },
  2: { label: "Normale",  color: "text-blue-400" },
  3: { label: "Haute",    color: "text-amber-400" },
  4: { label: "Urgente",  color: "text-red-400" },
};

function ProgressSlider({ task, projectId }: { task: Task; projectId: string }) {
  const update = useUpdateTaskSilent();
  const [value, setValue] = useState(task.progress_pct ?? 0);
  const [saving, setSaving] = useState(false);

  async function handleChange(v: number) {
    setValue(v);
    setSaving(true);
    try {
      await update.mutateAsync({
        id: task.id,
        project_id: projectId,
        progress_pct: v,
        status: v === 100 ? "done" : v > 0 ? "in_progress" : task.status,
      });
    } finally {
      setSaving(false);
    }
  }

  const color = value === 100 ? "bg-green-500" : value >= 50 ? "bg-indigo-500" : value > 0 ? "bg-amber-500" : "bg-slate-600";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Avancement</span>
        <span className={`font-semibold transition-colors ${saving ? "text-indigo-400" : value === 100 ? "text-green-400" : "text-slate-200"}`}>
          {value} %{saving ? " …" : ""}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={e => setValue(parseInt(e.target.value))}
        onMouseUp={e => handleChange(parseInt((e.target as HTMLInputElement).value))}
        onTouchEnd={e => handleChange(parseInt((e.target as HTMLInputElement).value))}
        disabled={task.status === "cancelled"}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer"
        style={{ accentColor: "#6366f1" }}
      />
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatusSelector({ task, projectId }: { task: Task; projectId: string }) {
  const update = useUpdateTaskSilent();
  const [current, setCurrent] = useState(task.status);

  async function handleChange(newStatus: TaskStatus) {
    setCurrent(newStatus);
    await update.mutateAsync({
      id: task.id,
      project_id: projectId,
      status: newStatus,
      progress_pct: newStatus === "done" ? 100 : newStatus === "cancelled" ? task.progress_pct : task.progress_pct,
    });
  }

  const conf = STATUS_CONFIG[current];
  const Icon = conf.icon;

  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center gap-1.5 text-xs font-medium ${conf.color}`}>
        <Icon className="w-3.5 h-3.5" /> {conf.label}
      </span>
      <select
        value={current}
        onChange={e => handleChange(e.target.value as TaskStatus)}
        className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
    </div>
  );
}

function TaskCard({ task, projectId }: { task: Task; projectId: string }) {
  const conf = STATUS_CONFIG[task.status];
  const prio = PRIORITY_LABEL[task.priority] ?? PRIORITY_LABEL[2];
  const isOver = task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && task.status !== "done";

  return (
    <Card className={`transition-all ${task.status === "done" ? "opacity-60" : ""} ${task.status === "blocked" ? "border-red-800/50" : ""}`}>
      <CardBody className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-sm ${task.status === "done" ? "line-through text-slate-500" : "text-slate-100"}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <span className={`text-xs shrink-0 ${prio.color}`}>{prio.label}</span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          {task.due_date && (
            <span className={`flex items-center gap-1 ${isOver ? "text-red-400 font-medium" : ""}`}>
              <CalendarDays className="w-3 h-3" />
              {isOver ? "Dépassé — " : ""}{new Date(task.due_date).toLocaleDateString("fr-FR")}
            </span>
          )}
          {task.estimated_hours && (
            <span>{task.estimated_hours}h estimées</span>
          )}
        </div>

        {/* Statut */}
        <StatusSelector task={task} projectId={projectId} />

        {/* Avancement */}
        {task.status !== "cancelled" && (
          <ProgressSlider task={task} projectId={projectId} />
        )}
      </CardBody>
    </Card>
  );
}

function MyTasksContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: project } = useProject(id);
  const { data: tasks = [], isLoading } = useMyTasks(id);
  const { data: myRole } = useMyRoleInProject(id);

  const active  = tasks.filter(t => !["done", "cancelled"].includes(t.status));
  const done    = tasks.filter(t => t.status === "done");
  const pct     = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;
  const blocked = active.filter(t => t.status === "blocked").length;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/projects/" className="hover:text-slate-300">Projets</Link>
          <span>/</span>
          {project && <Link href={`/project/?id=${id}`} className="hover:text-slate-300">{project.name}</Link>}
          <span>/</span>
          <span className="text-slate-300">Mes tâches</span>
        </div>

        {/* En-tête */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-indigo-400" />
              Mes tâches
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              {tasks.length} tâche(s) assignée(s) · {done.length} terminée(s) · {blocked > 0 ? <span className="text-red-400">{blocked} bloquée(s)</span> : `${blocked} bloquée(s)`}
            </p>
          </div>
          {myRole && (
            <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded-md text-slate-300">
              {myRole === "dev" ? "Développeur" : myRole === "pm" ? "Chef de projet" : myRole === "pmo" ? "PMO" : myRole}
            </span>
          )}
        </div>

        {/* KPIs */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardBody className="py-3 flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Avancement global</p>
                  <p className="text-sm font-bold text-white">{pct} %</p>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="py-3 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">En cours</p>
                  <p className="text-sm font-bold text-white">{active.filter(t => t.status === "in_progress").length}</p>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="py-3 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Terminées</p>
                  <p className="text-sm font-bold text-white">{done.length}</p>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <CheckSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Aucune tâche assignée</p>
              <p className="text-slate-500 text-sm mt-1">Demandez à votre chef de projet de vous assigner des tâches.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-300 text-sm mb-3">En cours ({active.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {active.sort((a, b) => b.priority - a.priority).map(task => (
                    <TaskCard key={task.id} task={task} projectId={id!} />
                  ))}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-500 text-sm mb-3">Terminées ({done.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {done.map(task => (
                    <TaskCard key={task.id} task={task} projectId={id!} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function MyTasksPage() {
  return <Suspense fallback={<Spinner />}><MyTasksContent /></Suspense>;
}
