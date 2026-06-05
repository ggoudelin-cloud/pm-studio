// ─────────────────────────────────────────────────────────────────────────────
// Couche de calcul des indicateurs projet — SOURCE DE VÉRITÉ UNIQUE
// Utilisée par : dashboard, en-tête/cockpit projet, reporting, export PPT.
// Module pur (aucune dépendance UI) afin de garantir des chiffres cohérents
// partout dans l'application.
// ─────────────────────────────────────────────────────────────────────────────
import type { Project, Task, Milestone, ProjectRisk, UoLog, ProjectCost } from "@/types";

/**
 * Retard de planning (schedule variance) : l'avancement réel d'une tâche est
 * inférieur à l'avancement attendu à la date du jour (entre start_date et due_date).
 * Cohérent avec l'affichage du Gantt et de l'export.
 */
export function isTaskLate(t: Task): boolean {
  if (t.status === "done" || t.status === "cancelled") return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = t.start_date ? new Date(t.start_date) : null;
  const end   = t.due_date   ? new Date(t.due_date)   : null;
  if (!start || !end) {
    // Sans dates de cadrage : en retard si l'échéance est dépassée et la tâche non finie
    return !!end && end < today;
  }
  if (today <= start) return false;
  const total = end.getTime() - start.getTime();
  const expected = total > 0
    ? Math.min(100, Math.max(0, ((today.getTime() - start.getTime()) / total) * 100))
    : 100;
  return (t.progress_pct ?? 0) < expected - 1;
}

export type HealthLevel = "green" | "amber" | "red";

export interface ProjectKpis {
  // Tâches
  taskTotal: number;
  taskActive: number;
  taskDone: number;
  taskLate: number;
  /** Avancement global = moyenne des progress_pct sur les tâches non annulées (terminé = 100) */
  progressPct: number;

  // Finances
  unitCost: number;
  uoAllocated: number;
  budgetUO: number;
  consumedUO: number;
  plannedUO: number;
  costUO: number;
  /** Coûts directs saisis dans le module Gestion des coûts (RH / logiciel / infra) */
  directCost: number;
  /** Budget de référence retenu : budget UO si défini, sinon budget projet (€) */
  budgetRef: number;
  /** Consommé retenu : coût UO si UO configurées, sinon coûts directs */
  consumed: number;
  pctBudget: number;
  remaining: number;
  /** true si le budget de référence est défini (sinon les indicateurs € ne sont pas pertinents) */
  hasBudget: boolean;

  // Jalons & risques
  msTotal: number;
  msAchieved: number;
  msMissed: number;
  msPending: number;
  risksOpen: number;

  // Santé globale
  health: { level: HealthLevel; label: string };
}

export interface KpiInput {
  project: Project;
  tasks: Task[];
  milestones?: Milestone[];
  risks?: ProjectRisk[];
  uoLogs?: UoLog[];
  costs?: ProjectCost[];
}

export function computeProjectKpis(input: KpiInput): ProjectKpis {
  const tasks = input.tasks ?? [];
  const milestones = input.milestones ?? [];
  const risks = input.risks ?? [];
  const uoLogs = input.uoLogs ?? [];
  const costs = input.costs ?? [];

  // ── Tâches ──
  const active   = tasks.filter(t => t.status !== "cancelled");
  const taskDone = tasks.filter(t => t.status === "done").length;
  const taskLate = tasks.filter(isTaskLate).length;
  const progressPct = active.length
    ? Math.round(active.reduce((a, t) => a + (t.status === "done" ? 100 : (t.progress_pct ?? 0)), 0) / active.length)
    : 0;

  // ── Finances ──
  const unitCost    = input.project.uo_unit_cost ?? 0;
  const uoAllocated = input.project.uo_value ?? 0;
  const budgetUO    = uoAllocated * unitCost;
  const consumedUO  = uoLogs.reduce((s, l) => s + (l.uo_consumed ?? 0), 0);
  const plannedUO   = uoLogs.reduce((s, l) => s + (l.uo_planned  ?? 0), 0);
  const costUO      = consumedUO * unitCost;
  const directCost  = costs.reduce((s, c) => s + (c.quantity ?? 0) * (c.unit_cost_ht ?? 0), 0);

  // Budget de référence : UO si configurées, sinon budget projet.
  // Pour les projets SANS UO, on retombe exactement sur l'ancien calcul
  // (coûts directs vs budget projet) → aucune régression.
  const useUo     = budgetUO > 0;
  const budgetRef = useUo ? budgetUO : (input.project.budget ?? 0);
  const consumed  = useUo ? costUO   : directCost;
  const hasBudget = budgetRef > 0;
  const pctBudget = hasBudget ? Math.round((consumed / budgetRef) * 100) : 0;
  const remaining = budgetRef - consumed;

  // ── Jalons & risques ──
  const msAchieved = milestones.filter(m => m.status === "achieved").length;
  const msMissed   = milestones.filter(m => m.status === "missed").length;
  const msPending  = milestones.filter(m => m.status === "pending").length;
  const risksOpen  = risks.filter(r => r.status === "open" || r.status === "occurred").length;

  // ── Santé globale ──
  let health: ProjectKpis["health"];
  if (taskLate > 0 || msMissed > 0 || (hasBudget && pctBudget > 100)) {
    health = { level: "red", label: "À risque" };
  } else if (risksOpen > 0 || (hasBudget && pctBudget > 85) || (active.length > 0 && progressPct < 30)) {
    health = { level: "amber", label: "Sous surveillance" };
  } else {
    health = { level: "green", label: "Sur la bonne voie" };
  }

  return {
    taskTotal: tasks.length, taskActive: active.length, taskDone, taskLate, progressPct,
    unitCost, uoAllocated, budgetUO, consumedUO, plannedUO, costUO, directCost,
    budgetRef, consumed, pctBudget, remaining, hasBudget,
    msTotal: milestones.length, msAchieved, msMissed, msPending, risksOpen,
    health,
  };
}
