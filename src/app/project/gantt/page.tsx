"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTasks, useTaskDependencies, useAddDependency, useRemoveDependency, useUpdateTask, useUpdateTaskSilent, useMilestones, useSaveBaseline } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { CalendarDays, ChevronLeft, ChevronRight, X, Link2, Milestone, Bookmark, GitBranch } from "lucide-react";
import type { Task } from "@/types";
import toast from "react-hot-toast";

const DAY_W = 28;
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
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ── Calcul du chemin critique (CPM simplifié) ─────────────────────────────────
function computeCriticalPath(
  tasks: Task[],
  deps: { task_id: string; predecessor_id: string; lag_days: number }[]
): Set<string> {
  const valid = tasks.filter(t => t.start_date && t.due_date && t.status !== "cancelled");
  if (valid.length < 2) return new Set();

  const ids   = new Set(valid.map(t => t.id));
  const dur   = new Map(valid.map(t => [
    t.id,
    Math.max(1, Math.round((new Date(t.due_date!).getTime() - new Date(t.start_date!).getTime()) / 86400000)),
  ]));

  const succs = new Map<string, { id: string; lag: number }[]>();
  const preds  = new Map<string, { id: string; lag: number }[]>();
  for (const t of valid) { succs.set(t.id, []); preds.set(t.id, []); }
  for (const d of deps) {
    if (ids.has(d.predecessor_id) && ids.has(d.task_id)) {
      succs.get(d.predecessor_id)!.push({ id: d.task_id,       lag: d.lag_days });
      preds.get(d.task_id)!.push(       { id: d.predecessor_id, lag: d.lag_days });
    }
  }

  // Forward pass (topological BFS)
  const inDeg = new Map(valid.map(t => [t.id, preds.get(t.id)!.length]));
  const ES = new Map<string, number>();
  const EF = new Map<string, number>();
  const queue: string[] = [];
  for (const t of valid) { if (inDeg.get(t.id) === 0) { ES.set(t.id, 0); queue.push(t.id); } }
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    const ef = (ES.get(id) ?? 0) + (dur.get(id) ?? 1);
    EF.set(id, ef);
    for (const { id: sid, lag } of succs.get(id) ?? []) {
      if ((ES.get(sid) ?? 0) < ef + lag) ES.set(sid, ef + lag);
      const d = (inDeg.get(sid) ?? 1) - 1;
      inDeg.set(sid, d);
      if (d === 0) queue.push(sid);
    }
  }
  if (!order.length) return new Set();
  const projEnd = Math.max(...Array.from(EF.values()));

  // Backward pass
  const LF = new Map<string, number>(valid.map(t => [t.id, projEnd]));
  const LS = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const lf = LF.get(id) ?? projEnd;
    LS.set(id, lf - (dur.get(id) ?? 1));
    for (const { id: pid, lag } of preds.get(id) ?? []) {
      const maxLF = (LS.get(id) ?? 0) - lag;
      if ((LF.get(pid) ?? projEnd) > maxLF) LF.set(pid, maxLF);
    }
  }

  // Float ≤ 0 → chemin critique
  const critical = new Set<string>();
  for (const id of ids) {
    if (((LS.get(id) ?? 0) - (ES.get(id) ?? 0)) <= 0) critical.add(id);
  }
  return critical;
}

// ── Modals (identiques à l'original) ─────────────────────────────────────────
function minStartAfterPred(predTask: Task, lagDays: number): string {
  const endDate = predTask.due_date ?? (predTask as Task & { start_date?: string }).start_date;
  if (!endDate) return "";
  const d = new Date(endDate); d.setDate(d.getDate() + lagDays + 1);
  return d.toISOString().slice(0, 10);
}

function EditDatesModal({ task, tasks, deps, projectId, onClose }: {
  task: Task; tasks: Task[];
  deps: { id: string; task_id: string; predecessor_id: string; lag_days: number }[];
  projectId: string; onClose: () => void;
}) {
  const update    = useUpdateTask();
  const removeDep = useRemoveDependency();
  const [start, setStart] = useState((task as Task & { start_date?: string }).start_date ?? "");
  const [end,   setEnd]   = useState(task.due_date ?? "");
  const [error, setError] = useState("");

  const predecessors = deps.filter(d => d.task_id === task.id)
    .map(d => ({ dep: d, pred: tasks.find(t => t.id === d.predecessor_id) }))
    .filter(x => x.pred);
  const minStart = predecessors.reduce((best, { dep, pred }) => {
    const min = minStartAfterPred(pred!, dep.lag_days);
    return min > best ? min : best;
  }, "");

  function validate(sv: string, ev: string) {
    if (sv && ev && sv > ev) return "La date de début doit être antérieure à la date de fin.";
    if (minStart && sv && sv <= minStart) {
      const b = predecessors.find(({ dep, pred }) => minStartAfterPred(pred!, dep.lag_days) >= sv);
      return `Début après « ${b?.pred?.title ?? "?"} »${b?.dep.lag_days ? ` +${b.dep.lag_days}j` : ""}.`;
    }
    return "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(start, end);
    if (err) { setError(err); return; }
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
        {predecessors.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-2.5 space-y-1.5">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Prédécesseurs</p>
            {predecessors.map(({ dep, pred }) => {
              const min = minStartAfterPred(pred!, dep.lag_days);
              return (
                <div key={dep.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-indigo-300 truncate">← {pred!.title}{dep.lag_days > 0 && <span className="text-slate-500"> +{dep.lag_days}j</span>}</p>
                    {min && <p className="text-xs text-slate-500">début au plus tôt le {new Date(min).toLocaleDateString("fr-FR")}</p>}
                  </div>
                  <button type="button" onClick={() => removeDep.mutate({ id: dep.id, projectId })}
                    className="shrink-0 text-slate-600 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <form onSubmit={save} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Date de début</label>
            <input type="date" value={start} min={minStart || undefined}
              onChange={e => { setStart(e.target.value); setError(validate(e.target.value, end)); }}
              className={`bg-slate-800 border rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${error.includes("début") ? "border-red-500" : "border-slate-700"}`} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Date de fin</label>
            <input type="date" value={end} min={start || undefined}
              onChange={e => { setEnd(e.target.value); setError(validate(start, e.target.value)); }}
              className={`bg-slate-800 border rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${error.includes("fin") ? "border-red-500" : "border-slate-700"}`} />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" size="sm" loading={update.isPending} disabled={!!error} className="flex-1 justify-center">Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddDepModal({ task, tasks, deps, projectId, onClose }: {
  task: Task; tasks: Task[];
  deps: { id: string; task_id: string; predecessor_id: string; lag_days: number }[];
  projectId: string; onClose: () => void;
}) {
  const addDep = useAddDependency();
  const update = useUpdateTaskSilent();
  const [predId, setPredId] = useState("");
  const [lag,    setLag]    = useState(0);
  const [error,  setError]  = useState("");

  const existingPredIds = deps.filter(d => d.task_id === task.id).map(d => d.predecessor_id);
  const available = tasks.filter(t => t.id !== task.id && !existingPredIds.includes(t.id));
  const selectedPred = tasks.find(t => t.id === predId);
  const minStart     = selectedPred ? minStartAfterPred(selectedPred, lag) : "";
  const taskStart    = (task as Task & { start_date?: string }).start_date ?? "";
  const conflictDate = minStart && taskStart && taskStart <= minStart;

  function validateSel(pid: string, lv: number) {
    const pred = tasks.find(t => t.id === pid);
    if (!pred) return "";
    const min = minStartAfterPred(pred, lv);
    const ts  = (task as Task & { start_date?: string }).start_date ?? "";
    if (min && ts && ts <= min)
      return `Début actuel (${new Date(ts).toLocaleDateString("fr-FR")}) ≤ fin de « ${pred.title} »${lv ? ` +${lv}j` : ""}.`;
    return "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!predId) return;
    const err = validateSel(predId, lag);
    if (err && !conflictDate) { setError(err); return; }
    await addDep.mutateAsync({ taskId: task.id, predecessorId: predId, lagDays: lag, projectId });
    if (conflictDate && minStart) {
      const origStart = task.start_date ?? "";
      const origEnd   = task.due_date ?? "";
      const shiftedEnd = (origStart && origEnd)
        ? addDays(new Date(minStart), diffDays(new Date(origStart), new Date(origEnd))).toISOString().slice(0, 10)
        : undefined;
      await update.mutateAsync({
        id: task.id, project_id: task.project_id,
        start_date: minStart,
        ...(shiftedEnd ? { due_date: shiftedEnd } : {}),
      } as Partial<Task> & { id: string; project_id: string });
      toast.success(`Dates décalées au ${new Date(minStart).toLocaleDateString("fr-FR")}`);
    }
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
            <label className="text-xs text-slate-400">Prédécesseur</label>
            <select value={predId} onChange={e => { setPredId(e.target.value); setError(validateSel(e.target.value, lag)); }} required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— Sélectionner —</option>
              {available.map(t => {
                const end = t.due_date ?? t.start_date;
                return <option key={t.id} value={t.id}>{t.title}{end ? ` (fin: ${new Date(end).toLocaleDateString("fr-FR")})` : ""}</option>;
              })}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Décalage (jours)</label>
            <input type="number" min={0} value={lag} onChange={e => { const v = parseInt(e.target.value) || 0; setLag(v); setError(validateSel(predId, v)); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {selectedPred && minStart && (
            <div className={`text-xs rounded-lg px-3 py-2 border ${conflictDate ? "bg-amber-950/30 border-amber-700/50 text-amber-300" : "bg-green-950/30 border-green-800/50 text-green-300"}`}>
              {conflictDate ? `⚠ Conflit : début ajusté au ${new Date(minStart).toLocaleDateString("fr-FR")}.` : `✓ Compatible.`}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" size="sm" loading={addDep.isPending || update.isPending} className="flex-1 justify-center">
              {conflictDate ? "Ajouter & Ajuster" : "Ajouter"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

type DragState = { taskId: string; edge: "left" | "right"; startX: number; origStart: string; origEnd: string; previewStart: string; previewEnd: string; };

function GanttContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: tasks = [], isLoading } = useTasks(id);
  const { data: deps = [] }            = useTaskDependencies(id);
  const { data: milestones = [] }      = useMilestones(id);
  const removeDep      = useRemoveDependency();
  const update         = useUpdateTask();
  const updateSilent   = useUpdateTaskSilent();
  const saveBaseline   = useSaveBaseline(id);

  const [editTask,      setEditTask]      = useState<Task | null>(null);
  const [depTask,       setDepTask]       = useState<Task | null>(null);
  const [showBaseline,  setShowBaseline]  = useState(false);
  const [showCritical,  setShowCritical]  = useState(false);

  const timelineRef   = useRef<HTMLDivElement>(null);
  const leftPanelRef  = useRef<HTMLDivElement>(null);
  const syncingScroll = useRef(false);
  const dragRef       = useRef<DragState | null>(null);
  const tasksRef      = useRef(tasks);
  tasksRef.current    = tasks;
  const depsRef       = useRef(deps);
  depsRef.current     = deps;
  const justDraggedRef  = useRef(false);
  const didInitScroll   = useRef(false);
  const committingRef   = useRef(false);
  const [drag, setDrag] = useState<DragState | null>(null);

  // ── Chemin critique ──
  const criticalPath = useMemo(() => showCritical ? computeCriticalPath(tasks, deps) : new Set<string>(), [showCritical, tasks, deps]);
  const hasBaseline  = useMemo(() => tasks.some(t => t.baseline_start || t.baseline_end), [tasks]);

  function syncLeft() {
    if (syncingScroll.current || !leftPanelRef.current || !timelineRef.current) return;
    syncingScroll.current = true;
    timelineRef.current.scrollTop = leftPanelRef.current.scrollTop;
    syncingScroll.current = false;
  }
  function syncRight() {
    if (syncingScroll.current || !leftPanelRef.current || !timelineRef.current) return;
    syncingScroll.current = true;
    leftPanelRef.current.scrollTop = timelineRef.current.scrollTop;
    syncingScroll.current = false;
  }

  function startResize(task: Task, edge: "left" | "right", clientX: number) {
    const origStart = task.start_date ?? task.due_date ?? "";
    const origEnd   = task.due_date ?? task.start_date ?? "";
    const nd: DragState = { taskId: task.id, edge, startX: clientX, origStart, origEnd, previewStart: origStart, previewEnd: origEnd };
    dragRef.current = nd; setDrag(nd);
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const prev = dragRef.current; if (!prev) return;
      const dd = Math.round((e.clientX - prev.startX) / DAY_W);
      let updated: DragState;
      if (prev.edge === "right") {
        const ne = addDays(new Date(prev.origEnd), dd);
        const mi = new Date(prev.origStart);
        updated = { ...prev, previewEnd: (ne >= mi ? ne : mi).toISOString().slice(0, 10) };
      } else {
        const ns = addDays(new Date(prev.origStart), dd);
        const ma = new Date(prev.origEnd);
        updated = { ...prev, previewStart: (ns <= ma ? ns : ma).toISOString().slice(0, 10) };
      }
      dragRef.current = updated; setDrag(updated);
    }

    async function onUp() {
      if (committingRef.current) return;
      const d = dragRef.current; dragRef.current = null; setDrag(null);
      if (!d || (d.previewStart === d.origStart && d.previewEnd === d.origEnd)) return;
      justDraggedRef.current = true; committingRef.current = true;
      const currentTasks = tasksRef.current; const currentDeps = depsRef.current;
      const task = currentTasks.find(t => t.id === d.taskId);
      if (!task) { committingRef.current = false; return; }
      try {
        await update.mutateAsync({ id: task.id, project_id: task.project_id, start_date: d.previewStart || null, due_date: d.previewEnd || null } as Partial<Task> & { id: string; project_id: string });
        const taskMap = new Map(currentTasks.map(t => [t.id, { ...t }]));
        taskMap.set(d.taskId, { ...task, start_date: d.previewStart, due_date: d.previewEnd });
        const queue: { taskId: string; newEnd: string }[] = [{ taskId: d.taskId, newEnd: d.previewEnd }];
        const visited = new Set<string>();
        while (queue.length > 0) {
          const { taskId, newEnd } = queue.shift()!;
          if (visited.has(taskId)) continue; visited.add(taskId);
          for (const dep of currentDeps.filter(dep => dep.predecessor_id === taskId)) {
            const succ = taskMap.get(dep.task_id); if (!succ) continue;
            const msd = new Date(newEnd); msd.setDate(msd.getDate() + dep.lag_days + 1);
            const ms = msd.toISOString().slice(0, 10);
            const ss = succ.start_date ?? "";
            if (!ss || ss <= ms) {
              const os = new Date(ss || succ.due_date || ms);
              const oe = new Date(succ.due_date || ss || ms);
              const dur = Math.max(0, Math.round((oe.getTime() - os.getTime()) / 86400000));
              const ne = new Date(ms); ne.setDate(ne.getDate() + dur);
              const nes = ne.toISOString().slice(0, 10);
              taskMap.set(dep.task_id, { ...succ, start_date: ms, due_date: nes });
              await updateSilent.mutateAsync({ id: succ.id, project_id: succ.project_id, start_date: ms, due_date: nes } as Partial<Task> & { id: string; project_id: string });
              queue.push({ taskId: dep.task_id, newEnd: nes });
            }
          }
        }
      } catch (_e) { /* géré par onError */ }
      committingRef.current = false;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const earliestOffset = useMemo(() => {
    let min = -7;
    tasks.forEach(t => {
      const ds = [t.start_date, t.due_date, t.baseline_start, t.baseline_end].filter(Boolean);
      ds.forEach(d => { const diff = diffDays(today, new Date(d!)); if (diff < min) min = diff; });
    });
    milestones.forEach(m => { if (m.due_date) { const diff = diffDays(today, new Date(m.due_date)); if (diff < min) min = diff; } });
    return min - 3;
  }, [tasks, milestones, today]);

  const viewStart = useMemo(() => addDays(today, earliestOffset), [today, earliestOffset]);

  const VISIBLE_DAYS = useMemo(() => {
    let max = 90;
    tasks.forEach(t => {
      [t.due_date, t.baseline_end].filter(Boolean).forEach(d => {
        const v = diffDays(viewStart, new Date(d!)) + 30;
        if (v > max) max = v;
      });
    });
    milestones.forEach(m => { if (m.due_date) { const v = diffDays(viewStart, new Date(m.due_date)) + 30; if (v > max) max = v; } });
    return max;
  }, [tasks, milestones, viewStart]);

  const days   = useMemo(() => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(viewStart, i)), [viewStart, VISIBLE_DAYS]);
  const months = useMemo(() => {
    const g: { label: string; count: number }[] = [];
    days.forEach(d => {
      const lbl = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      if (!g.length || g[g.length - 1].label !== lbl) g.push({ label: lbl, count: 1 });
      else g[g.length - 1].count++;
    });
    return g;
  }, [days]);

  const taskRowMap = useMemo(() => { const m: Record<string, number> = {}; tasks.forEach((t, i) => { m[t.id] = i; }); return m; }, [tasks]);

  function scrollToToday(smooth = true) {
    if (!timelineRef.current) return;
    const x = diffDays(viewStart, today) * DAY_W;
    timelineRef.current.scrollTo({ left: Math.max(0, x - 7 * DAY_W), behavior: smooth ? "smooth" : "auto" });
  }
  function scrollBy(dd: number) { timelineRef.current?.scrollBy({ left: dd * DAY_W, behavior: "smooth" }); }

  useEffect(() => {
    if (didInitScroll.current || isLoading || tasks.length === 0 || !timelineRef.current) return;
    didInitScroll.current = true; scrollToToday(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, tasks.length, viewStart]);

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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Baseline */}
            <Button
              variant="secondary" size="sm"
              onClick={() => saveBaseline.mutate()}
              loading={saveBaseline.isPending}
              title="Sauvegarder le planning actuel comme référence baseline"
            >
              <Bookmark className="w-3.5 h-3.5" /> Baseline
            </Button>
            {hasBaseline && (
              <button
                onClick={() => setShowBaseline(!showBaseline)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showBaseline ? "bg-purple-600/20 border-purple-600/50 text-purple-300" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}
              >
                <Bookmark className="w-3 h-3" /> {showBaseline ? "Baseline ON" : "Baseline OFF"}
              </button>
            )}
            {/* Chemin critique */}
            <button
              onClick={() => setShowCritical(!showCritical)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showCritical ? "bg-red-600/20 border-red-600/50 text-red-300" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}
            >
              <GitBranch className="w-3 h-3" /> Chemin critique {showCritical ? `(${criticalPath.size})` : ""}
            </button>
            <Button variant="secondary" size="sm" onClick={() => scrollBy(-14)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="secondary" size="sm" onClick={() => scrollToToday()}>Aujourd&apos;hui</Button>
            <Button variant="secondary" size="sm" onClick={() => scrollBy(14)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Aucune tâche. Créez des tâches depuis le module Tâches & Classification.
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel */}
            <div ref={leftPanelRef} onScroll={syncLeft} className="shrink-0 bg-slate-950 border-r border-slate-800 overflow-y-auto" style={{ width: LEFT_W }}>
              <div style={{ height: ROW_H * 2 }} className="border-b border-slate-800 flex items-end px-3 pb-2">
                <span className="text-xs text-slate-500 font-medium">TÂCHE</span>
              </div>
              {tasks.map(task => {
                const taskDeps = deps.filter(d => d.task_id === task.id);
                const isCritical = criticalPath.has(task.id);
                return (
                  <div key={task.id} style={{ height: ROW_H }} className={`flex items-center gap-2 px-3 border-b border-slate-800/50 group ${isCritical ? "bg-red-950/10" : ""}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[task.status] ?? "bg-slate-600"}`} />
                    <span className={`text-xs truncate flex-1 ${isCritical ? "text-red-300 font-medium" : "text-slate-300"}`}>{task.title}</span>
                    {isCritical && <span className="text-red-500 text-[9px] shrink-0 font-bold">CC</span>}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => setEditTask(task)} title="Dates" className="text-slate-500 hover:text-indigo-400 transition-colors"><CalendarDays className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDepTask(task)} title="Prédécesseur" className="text-slate-500 hover:text-indigo-400 transition-colors"><Link2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {taskDeps.length > 0 && <span className="text-xs text-indigo-400 shrink-0">{taskDeps.length}↩</span>}
                  </div>
                );
              })}
              {milestones.map(m => (
                <div key={m.id} style={{ height: ROW_H }} className="flex items-center gap-2 px-3 border-b border-slate-800/50">
                  <Milestone className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-300 truncate flex-1 italic">{m.title}</span>
                </div>
              ))}
            </div>

            {/* Right panel: timeline */}
            <div className="flex-1 overflow-auto" ref={timelineRef}
              onScroll={syncRight}
              onWheel={e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; e.preventDefault(); timelineRef.current!.scrollLeft += e.deltaY; }}>
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
                    const isToday   = diffDays(today, d) === 0;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={i} style={{ width: DAY_W }} className={`border-r border-slate-800/50 flex items-center justify-center ${isWeekend ? "bg-slate-900/40" : ""}`}>
                        <span className={`text-[10px] ${isToday ? "text-indigo-400 font-bold" : "text-slate-600"}`}>{d.getDate()}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Grid + bars */}
                <div style={{ position: "relative" }}>
                  {todayX >= 0 && todayX <= VISIBLE_DAYS * DAY_W && (
                    <div style={{ position: "absolute", left: todayX, top: 0, bottom: 0, width: 2, background: "#818cf8", zIndex: 5 }} />
                  )}
                  {drag && <style>{`body { cursor: ew-resize !important; user-select: none !important; }`}</style>}

                  {tasks.map(task => {
                    const isDragging = drag?.taskId === task.id;
                    const effStart = isDragging ? drag.previewStart : (task.start_date ?? "");
                    const effEnd   = isDragging ? drag.previewEnd   : (task.due_date   ?? "");
                    const s = effStart ? new Date(effStart) : null;
                    const e = effEnd   ? new Date(effEnd)   : null;
                    const barStart = s ?? e; const barEnd = e ?? s;
                    const bar = barStart && barEnd ? {
                      x: diffDays(viewStart, barStart) * DAY_W,
                      w: Math.max(DAY_W, (diffDays(barStart, barEnd) + 1) * DAY_W),
                    } : null;

                    // Baseline bar
                    const bStart = task.baseline_start ? new Date(task.baseline_start) : null;
                    const bEnd   = task.baseline_end   ? new Date(task.baseline_end)   : null;
                    const baselineBar = showBaseline && bStart && bEnd ? {
                      x: diffDays(viewStart, bStart) * DAY_W,
                      w: Math.max(DAY_W, (diffDays(bStart, bEnd) + 1) * DAY_W),
                    } : null;

                    const isCritical = criticalPath.has(task.id);

                    return (
                      <div key={task.id} style={{ height: ROW_H, position: "relative" }} className={`border-b border-slate-800/30 flex items-center ${isCritical ? "bg-red-950/5" : ""}`}>
                        {days.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) ? (
                          <div key={i} style={{ position: "absolute", left: i * DAY_W, width: DAY_W, top: 0, bottom: 0, background: "rgba(15,23,42,0.4)" }} />
                        ) : null)}

                        {/* Barre baseline (en dessous, semi-transparente) */}
                        {baselineBar && (
                          <div
                            style={{ position: "absolute", left: baselineBar.x, width: baselineBar.w, height: 8, top: ROW_H / 2 + 10, borderRadius: 4, zIndex: 1 }}
                            className="bg-purple-500/40 border border-purple-500/60"
                            title={`Baseline : ${task.baseline_start} → ${task.baseline_end}`}
                          />
                        )}

                        {/* Barre principale */}
                        {bar && (() => {
                          const pct = task.status === "done" ? 100 : (task.progress_pct ?? 0);
                          const progressPx    = (pct / 100) * bar.w;
                          const todayOffsetPx = barStart ? diffDays(barStart, today) * DAY_W : 0;
                          const todayClampPx  = Math.max(0, Math.min(bar.w, todayOffsetPx));
                          const isLate = task.status !== "done" && task.status !== "cancelled"
                            && !isDragging && todayOffsetPx > 0 && todayClampPx > progressPx + 0.5;
                          const critRing = isCritical && showCritical ? "ring-2 ring-red-500/70" : "";
                          return (
                            <div
                              style={{ position: "absolute", left: bar.x, width: bar.w, height: 24, borderRadius: 4, zIndex: 2, cursor: "grab" }}
                              className={`${METH_COLORS[task.methodology_recommendation ?? ""] ?? "bg-slate-600"} ${critRing} ${isDragging ? "opacity-100 ring-2 ring-white/40" : isLate ? "opacity-90 hover:opacity-100 ring-1 ring-red-500/60" : "opacity-80 hover:opacity-100"} transition-opacity flex items-center relative overflow-hidden`}
                              onClick={() => { if (justDraggedRef.current) { justDraggedRef.current = false; return; } setEditTask(task); }}
                              title={`${task.title} · ${pct}%${isLate ? " · ⚠ EN RETARD" : ""}${isCritical && showCritical ? " · CHEMIN CRITIQUE" : ""}`}
                            >
                              {pct > 0 && <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, borderRadius: pct >= 100 ? 4 : "4px 0 0 4px", zIndex: 1 }} className={`pointer-events-none transition-all ${pct >= 100 ? "bg-green-600/70" : "bg-black/40"}`} />}
                              {isLate && <div style={{ position: "absolute", left: progressPx, top: 0, height: "100%", width: todayClampPx - progressPx, zIndex: 1 }} className="pointer-events-none bg-red-600/70 transition-all" />}
                              <div style={{ position: "absolute", left: 0, top: 0, width: 8, height: "100%", cursor: "ew-resize", zIndex: 3, borderRadius: "4px 0 0 4px" }} className="hover:bg-white/25" onMouseDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); startResize(task, "left", ev.clientX); }} />
                              <span className="text-white text-[10px] truncate font-medium px-3 pointer-events-none flex-1 relative z-[2]">{task.title}</span>
                              {pct > 0 && <span className="text-white/95 text-[9px] font-bold pr-2.5 pointer-events-none relative z-[2] shrink-0">{pct}%</span>}
                              <div style={{ position: "absolute", right: 0, top: 0, width: 8, height: "100%", cursor: "ew-resize", zIndex: 3, borderRadius: "0 4px 4px 0" }} className="hover:bg-white/25" onMouseDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); startResize(task, "right", ev.clientX); }} />
                            </div>
                          );
                        })()}
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
                        <div style={{ position: "absolute", left: x - 8, width: 16, height: 16, background: m.status === "missed" ? "#ef4444" : "#f59e0b", transform: "rotate(45deg)", zIndex: 3, cursor: "pointer", borderRadius: 2 }}
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
                      const getEffBar = (t: Task) => {
                        const isDrag = drag?.taskId === t.id;
                        const es = isDrag ? (drag.previewStart ? new Date(drag.previewStart) : null) : (t.start_date ? new Date(t.start_date) : null);
                        const ee = isDrag ? (drag.previewEnd   ? new Date(drag.previewEnd)   : null) : (t.due_date   ? new Date(t.due_date)   : null);
                        if (!es && !ee) return null;
                        const s2 = es ?? ee!; const e2 = ee ?? es!;
                        return { x: diffDays(viewStart, s2) * DAY_W, w: Math.max(DAY_W, (diffDays(s2, e2) + 1) * DAY_W) };
                      };
                      const predBar = getEffBar(predTask); const succBar = getEffBar(succTask);
                      if (!predBar || !succBar) return null;
                      const predRow = taskRowMap[dep.predecessor_id]; const succRow = taskRowMap[dep.task_id];
                      const x1 = predBar.x + predBar.w; const y1 = predRow * ROW_H + ROW_H / 2;
                      const x2 = succBar.x;             const y2 = succRow * ROW_H + ROW_H / 2;
                      const mx = (x1 + x2) / 2;
                      const isCrit = showCritical && criticalPath.has(dep.predecessor_id) && criticalPath.has(dep.task_id);
                      return (
                        <g key={dep.id}>
                          <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                            stroke={isCrit ? "#ef4444" : "#818cf8"} strokeWidth={isCrit ? 2 : 1.5} fill="none" strokeDasharray={isCrit ? "none" : "4 2"} />
                          <polygon points={`${x2},${y2} ${x2 - 7},${y2 - 4} ${x2 - 7},${y2 + 4}`} fill={isCrit ? "#ef4444" : "#818cf8"} />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Légende */}
        {(showBaseline || showCritical) && (
          <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-6 py-2 flex items-center gap-6 text-xs text-slate-500">
            {showBaseline && hasBaseline && (
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-2 rounded bg-purple-500/40 border border-purple-500/60" />
                <span>Baseline (planning initial)</span>
              </div>
            )}
            {showCritical && criticalPath.size > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-2 rounded bg-red-500/60 ring-1 ring-red-500/70" />
                <span className="text-red-400">Chemin critique ({criticalPath.size} tâche{criticalPath.size > 1 ? "s" : ""})</span>
              </div>
            )}
            {showCritical && criticalPath.size === 0 && (
              <span className="text-slate-600">Pas assez de dépendances pour calculer le chemin critique.</span>
            )}
          </div>
        )}

        {/* Dépendances */}
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
                    <button onClick={() => removeDep.mutate({ id: dep.id, projectId: id! })} className="text-slate-600 hover:text-red-400 transition-colors ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {editTask && id && <EditDatesModal task={editTask} tasks={tasks} deps={deps} projectId={id} onClose={() => setEditTask(null)} />}
      {depTask  && id && <AddDepModal task={depTask} tasks={tasks} deps={deps} projectId={id} onClose={() => setDepTask(null)} />}
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function GanttPage() { return <Suspense fallback={<Spinner />}><GanttContent /></Suspense>; }
