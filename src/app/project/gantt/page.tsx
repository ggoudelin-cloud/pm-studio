"use client";

import { useState, Suspense, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTasks, useTaskDependencies, useAddDependency, useRemoveDependency, useUpdateTask, useMilestones } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { CalendarDays, ChevronLeft, ChevronRight, X, Link2, Milestone } from "lucide-react";
import type { Task } from "@/types";
import toast from "react-hot-toast";

const DAY_W = 28; // pixels per day
const ROW_H = 44;
const LEFT_W = 280;

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-600", in_progress: "bg-indigo-500", review: "bg-amber-500",
  blocked: "bg-red-500", done: "bg-green-500", cancelled: "bg-slate-700",
};
const METH_COLORS: Record<string, string> = {
  cycle_v: "bg-blue-500", agile: "bg-green-500", hybrid: "bg-purple-500",
};

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function EditDatesModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const update = useUpdateTask();
  const [start, setStart] = useState((task as Task & { start_date?: string }).start_date ?? "");
  const [end, setEnd] = useState(task.due_date ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await update.mutateAsync({ id: task.id, project_id: task.project_id, start_date: start || null, due_date: end || null } as Parameters<typeof update.mutateAsync>[0]);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm truncate">{task.title}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Date de début</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Date de fin</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" size="sm" loading={update.isPending} className="flex-1 justify-center">Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddDepModal({ task, tasks, projectId, onClose }: { task: Task; tasks: Task[]; projectId: string; onClose: () => void }) {
  const addDep = useAddDependency();
  const [predId, setPredId] = useState("");
  const [lag, setLag] = useState(0);
  const available = tasks.filter(t => t.id !== task.id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!predId) return;
    await addDep.mutateAsync({ taskId: task.id, predecessorId: predId, lagDays: lag, projectId });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Ajouter un prédécesseur</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <p className="text-xs text-slate-400">Tâche : <span className="text-slate-200">{task.title}</span></p>
        <form onSubmit={save} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Prédécesseur (doit finir avant)</label>
            <select value={predId} onChange={e => setPredId(e.target.value)} required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— Sélectionner une tâche —</option>
              {available.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Décalage (jours après la fin)</label>
            <input type="number" min={0} value={lag} onChange={e => setLag(parseInt(e.target.value) || 0)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" size="sm" loading={addDep.isPending} className="flex-1 justify-center">Ajouter</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GanttContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: tasks = [], isLoading } = useTasks(id);
  const { data: deps = [] } = useTaskDependencies(id);
  const { data: milestones = [] } = useMilestones(id);
  const removeDep = useRemoveDependency();

  const [offsetDays, setOffsetDays] = useState(0);
  const [editTask,   setEditTask]   = useState<Task | null>(null);
  const [depTask,    setDepTask]    = useState<Task | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const VISIBLE_DAYS = 60;

  // Compute date range
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const viewStart = useMemo(() => addDays(today, offsetDays - 7), [today, offsetDays]);
  const days = useMemo(() => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(viewStart, i)), [viewStart]);

  // Group days by month for header
  const months = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    days.forEach(d => {
      const lbl = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      if (!groups.length || groups[groups.length - 1].label !== lbl) groups.push({ label: lbl, count: 1 });
      else groups[groups.length - 1].count++;
    });
    return groups;
  }, [days]);

  // Task row index map (for SVG arrows)
  const taskRowMap = useMemo(() => {
    const m: Record<string, number> = {};
    tasks.forEach((t, i) => { m[t.id] = i; });
    return m;
  }, [tasks]);

  function getBar(task: Task) {
    const t = task as Task & { start_date?: string };
    const start = t.start_date ? new Date(t.start_date) : null;
    const end   = task.due_date  ? new Date(task.due_date)  : null;
    if (!start && !end) return null;
    const s = start ?? end!;
    const e = end   ?? start!;
    const x = diffDays(viewStart, s) * DAY_W;
    const w = Math.max(DAY_W, (diffDays(s, e) + 1) * DAY_W);
    return { x, w };
  }

  const todayX = diffDays(viewStart, today) * DAY_W;

  if (isLoading) return (
    <DashboardLayout>
      <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-400" /> Gantt & Dépendances
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOffsetDays(d => d - 14)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="secondary" size="sm" onClick={() => setOffsetDays(0)}>Aujourd&apos;hui</Button>
            <Button variant="secondary" size="sm" onClick={() => setOffsetDays(d => d + 14)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Aucune tâche. Créez des tâches depuis le module Tâches & Classification.
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel */}
            <div className="shrink-0 bg-slate-950 border-r border-slate-800 overflow-y-auto" style={{ width: LEFT_W }}>
              {/* Header spacer */}
              <div style={{ height: ROW_H * 2 }} className="border-b border-slate-800 flex items-end px-3 pb-2">
                <span className="text-xs text-slate-500 font-medium">TÂCHE</span>
              </div>
              {tasks.map(task => {
                const taskDeps = deps.filter(d => d.task_id === task.id);
                return (
                  <div key={task.id} style={{ height: ROW_H }} className="flex items-center gap-2 px-3 border-b border-slate-800/50 group">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[task.status] ?? "bg-slate-600"}`} />
                    <span className="text-xs text-slate-300 truncate flex-1">{task.title}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => setEditTask(task)} title="Définir les dates"
                        className="text-slate-500 hover:text-indigo-400 transition-colors">
                        <CalendarDays className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDepTask(task)} title="Ajouter prédécesseur"
                        className="text-slate-500 hover:text-indigo-400 transition-colors">
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {taskDeps.length > 0 && (
                      <span className="text-xs text-indigo-400 shrink-0">{taskDeps.length}↩</span>
                    )}
                  </div>
                );
              })}
              {/* Milestones */}
              {milestones.map(m => (
                <div key={m.id} style={{ height: ROW_H }} className="flex items-center gap-2 px-3 border-b border-slate-800/50">
                  <Milestone className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-300 truncate flex-1 italic">{m.title}</span>
                </div>
              ))}
            </div>

            {/* Right panel: timeline */}
            <div className="flex-1 overflow-auto" ref={timelineRef}>
              <div style={{ width: VISIBLE_DAYS * DAY_W, position: "relative" }}>
                {/* Month header */}
                <div style={{ height: ROW_H, display: "flex" }} className="border-b border-slate-700 bg-slate-900 sticky top-0 z-10">
                  {months.map((m, i) => (
                    <div key={i} style={{ width: m.count * DAY_W }} className="border-r border-slate-700 px-2 flex items-center">
                      <span className="text-xs font-medium text-slate-300 capitalize truncate">{m.label}</span>
                    </div>
                  ))}
                </div>
                {/* Day header */}
                <div style={{ height: ROW_H, display: "flex" }} className="border-b border-slate-800 bg-slate-950 sticky top-11 z-10">
                  {days.map((d, i) => {
                    const isToday = diffDays(today, d) === 0;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={i} style={{ width: DAY_W }} className={`border-r border-slate-800/50 flex items-center justify-center ${isWeekend ? "bg-slate-900/40" : ""}`}>
                        <span className={`text-[10px] ${isToday ? "text-indigo-400 font-bold" : "text-slate-600"}`}>
                          {d.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Grid + bars */}
                <div style={{ position: "relative" }}>
                  {/* Today line */}
                  {todayX >= 0 && todayX <= VISIBLE_DAYS * DAY_W && (
                    <div style={{ position: "absolute", left: todayX, top: 0, bottom: 0, width: 2, background: "#818cf8", zIndex: 5 }} />
                  )}

                  {/* Task rows */}
                  {tasks.map(task => {
                    const bar = getBar(task);
                    return (
                      <div key={task.id} style={{ height: ROW_H, position: "relative" }} className="border-b border-slate-800/30 flex items-center">
                        {/* Weekend shading */}
                        {days.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) ? (
                          <div key={i} style={{ position: "absolute", left: i * DAY_W, width: DAY_W, top: 0, bottom: 0, background: "rgba(15,23,42,0.4)" }} />
                        ) : null)}
                        {bar && (
                          <div
                            style={{ position: "absolute", left: bar.x, width: bar.w, height: 24, borderRadius: 4, zIndex: 2, cursor: "pointer" }}
                            className={`${METH_COLORS[task.methodology_recommendation ?? ""] ?? "bg-slate-600"} opacity-80 hover:opacity-100 transition-opacity flex items-center px-2`}
                            onClick={() => setEditTask(task)}
                            title={task.title}
                          >
                            <span className="text-white text-[10px] truncate font-medium">{task.title}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Milestone diamonds */}
                  {milestones.map(m => {
                    if (!m.due_date) return null;
                    const mDate = new Date(m.due_date);
                    const x = diffDays(viewStart, mDate) * DAY_W;
                    if (x < 0 || x > VISIBLE_DAYS * DAY_W) return null;
                    return (
                      <div key={m.id} style={{ height: ROW_H, position: "relative" }} className="border-b border-slate-800/30 flex items-center">
                        <div style={{ position: "absolute", left: x - 8, width: 16, height: 16, background: "#f59e0b", transform: "rotate(45deg)", zIndex: 3, cursor: "pointer", borderRadius: 2 }}
                          title={`${m.title} — ${fmtShort(mDate)}`} />
                      </div>
                    );
                  })}

                  {/* SVG dependency arrows */}
                  <svg style={{ position: "absolute", top: 0, left: 0, width: VISIBLE_DAYS * DAY_W, height: (tasks.length + milestones.length) * ROW_H, pointerEvents: "none", zIndex: 4 }}>
                    {deps.map(dep => {
                      const predTask = tasks.find(t => t.id === dep.predecessor_id);
                      const succTask = tasks.find(t => t.id === dep.task_id);
                      if (!predTask || !succTask) return null;
                      const predBar = getBar(predTask);
                      const succBar = getBar(succTask);
                      if (!predBar || !succBar) return null;
                      const predRow = taskRowMap[dep.predecessor_id];
                      const succRow = taskRowMap[dep.task_id];
                      const x1 = predBar.x + predBar.w;
                      const y1 = predRow * ROW_H + ROW_H / 2;
                      const x2 = succBar.x;
                      const y2 = succRow * ROW_H + ROW_H / 2;
                      const mx = (x1 + x2) / 2;
                      return (
                        <g key={dep.id}>
                          <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                            stroke="#818cf8" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
                          <polygon points={`${x2},${y2} ${x2 - 7},${y2 - 4} ${x2 - 7},${y2 + 4}`} fill="#818cf8" />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dependency list panel */}
        {deps.length > 0 && (
          <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-6 py-3 max-h-32 overflow-y-auto">
            <p className="text-xs text-slate-500 font-medium mb-2">DÉPENDANCES ({deps.length})</p>
            <div className="flex flex-wrap gap-2">
              {deps.map(dep => {
                const pred = tasks.find(t => t.id === dep.predecessor_id);
                const succ = tasks.find(t => t.id === dep.task_id);
                if (!pred || !succ) return null;
                return (
                  <div key={dep.id} className="flex items-center gap-1.5 bg-slate-800 rounded-full px-3 py-1 text-xs">
                    <span className="text-slate-400 truncate max-w-24">{pred.title}</span>
                    <span className="text-indigo-400">→</span>
                    <span className="text-slate-300 truncate max-w-24">{succ.title}</span>
                    {dep.lag_days > 0 && <span className="text-slate-500">+{dep.lag_days}j</span>}
                    <button onClick={() => removeDep.mutate({ id: dep.id, projectId: id! })}
                      className="text-slate-600 hover:text-red-400 transition-colors ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {editTask && <EditDatesModal task={editTask} onClose={() => setEditTask(null)} />}
      {depTask  && id && <AddDepModal task={depTask} tasks={tasks} projectId={id} onClose={() => setDepTask(null)} />}
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function GanttPage() { return <Suspense fallback={<Spinner />}><GanttContent /></Suspense>; }
