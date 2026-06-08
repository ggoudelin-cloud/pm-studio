"use client";

import Link from "next/link";
import { useProjects, useMyMemberships, useAllMilestones, useAllUoLogs, useAllProjectCosts } from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getMethodologyLabel, getMethodologyColor, formatDate } from "@/lib/utils";
import {
  FolderKanban, AlertTriangle, CheckCircle2, Clock,
  Milestone, Euro, Wrench, TrendingUp, TrendingDown, ArrowRight,
} from "lucide-react";
import type { Project, ComplexityLevel } from "@/types";

const UO_FORFAIT = 350;

const COMPLEXITY: Record<ComplexityLevel, { label: string; color: string; dot: string }> = {
  simple:   { label: "N1",  color: "text-blue-400",  dot: "bg-blue-400" },
  medium:   { label: "N2",  color: "text-green-400", dot: "bg-green-400" },
  high:     { label: "N3",  color: "text-amber-400", dot: "bg-amber-400" },
  critical: { label: "N4",  color: "text-red-400",   dot: "bg-red-400" },
};

type MsHealth = "red" | "amber" | "green";

function projectHealth(project: Project, missedCount: number, overdueCount: number, budgetPct: number | null): MsHealth {
  if (missedCount > 0 || (budgetPct !== null && budgetPct > 100)) return "red";
  if (overdueCount > 0 || (budgetPct !== null && budgetPct > 85)) return "amber";
  return "green";
}

const HEALTH_LABEL: Record<MsHealth, string> = { red: "À risque", amber: "Sous surveillance", green: "Sur la bonne voie" };
const HEALTH_COLOR: Record<MsHealth, string> = { red: "text-red-400", amber: "text-amber-400", green: "text-green-400" };
const HEALTH_DOT: Record<MsHealth, string> = { red: "bg-red-400", amber: "bg-amber-400", green: "bg-green-400" };

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

export default function PortfolioPage() {
  const { user } = useAuthStore();
  const { data: allProjects = [], isLoading } = useProjects();
  const { data: memberships = [] } = useMyMemberships();
  const { data: allMilestones = [] } = useAllMilestones();
  const { data: allLogs = [] } = useAllUoLogs();
  const { data: allCosts = [] } = useAllProjectCosts();

  // Projets visibles pour l'utilisateur PM/PMO
  const projects = allProjects.filter(p =>
    p.owner_id === user?.id ||
    memberships.some(m => m.project_id === p.id && (m.role === "pm" || m.role === "pmo"))
  );

  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();

  // Stats UO
  const totalUoAllocated = projects.reduce((s, p) => s + (p.uo_value ?? 0), 0);
  const totalUoConsumed  = allLogs.filter(l => l.year === currentYear).reduce((s, l) => s + l.uo_consumed, 0);
  const uoAllocPct       = Math.min(115, Math.round((totalUoAllocated / UO_FORFAIT) * 100));
  const uoConsumePct     = Math.min(100, Math.round((totalUoConsumed  / UO_FORFAIT) * 100));

  // Stats jalons
  const missedMilestones  = allMilestones.filter(m => m.status === "missed" && projects.some(p => p.id === m.project_id));
  const overduePending    = allMilestones.filter(m => m.status === "pending" && m.due_date && m.due_date < today && projects.some(p => p.id === m.project_id));
  const atRiskMilestones  = [...missedMilestones, ...overduePending].sort((a, b) => (a.due_date ?? "") > (b.due_date ?? "") ? 1 : -1);

  // Stats budget global
  const totalBudget   = projects.reduce((s, p) => s + (p.budget ?? 0), 0);
  const totalConsumed = allCosts.filter(c => projects.some(p => p.id === c.project_id)).reduce((s, c) => s + (c.quantity ?? 0) * (c.unit_cost_ht ?? 0), 0);
  const budgetPct     = totalBudget > 0 ? Math.round((totalConsumed / totalBudget) * 100) : null;

  // Santé par projet
  const projectsWithHealth = projects.map(p => {
    const pMilestones = allMilestones.filter(m => m.project_id === p.id);
    const pCosts = allCosts.filter(c => c.project_id === p.id);
    const pConsumed = pCosts.reduce((s, c) => s + (c.quantity ?? 0) * (c.unit_cost_ht ?? 0), 0);
    const pBudgetPct = p.budget && p.budget > 0 ? Math.round((pConsumed / p.budget) * 100) : null;
    const missed  = pMilestones.filter(m => m.status === "missed").length;
    const overdue = pMilestones.filter(m => m.status === "pending" && m.due_date && m.due_date < today).length;
    const health  = projectHealth(p, missed, overdue, pBudgetPct);
    return { project: p, health, missed, overdue, pBudgetPct, uoConsumed: allLogs.filter(l => l.project_id === p.id && l.year === currentYear).reduce((s, l) => s + l.uo_consumed, 0) };
  }).sort((a, b) => {
    const order: Record<MsHealth, number> = { red: 0, amber: 1, green: 2 };
    return order[a.health] - order[b.health];
  });

  const atRiskCount = projectsWithHealth.filter(pw => pw.health === "red").length;
  const surveillanceCount = projectsWithHealth.filter(pw => pw.health === "amber").length;

  if (isLoading) return (
    <DashboardLayout>
      <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-indigo-400" /> Portefeuille PMO
          </h1>
          <p className="text-slate-400 text-sm mt-1">{projects.length} projet(s) · Forfait {UO_FORFAIT} UO/an</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center shrink-0">
                <FolderKanban className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{projects.filter(p => p.status === "active").length}</p>
                <p className="text-xs text-slate-400">Actifs / {projects.length} total</p>
              </div>
            </CardBody>
          </Card>
          <Card className={atRiskCount > 0 ? "border-red-800/50" : ""}>
            <CardBody className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{atRiskCount}</p>
                <p className="text-xs text-slate-400">À risque</p>
              </div>
            </CardBody>
          </Card>
          <Card className={surveillanceCount > 0 ? "border-amber-800/40" : ""}>
            <CardBody className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{surveillanceCount}</p>
                <p className="text-xs text-slate-400">Sous surveillance</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{projectsWithHealth.filter(pw => pw.health === "green").length}</p>
                <p className="text-xs text-slate-400">Sur la bonne voie</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Jauge UO + Budget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Forfait UO — {currentYear}</span>
                <span className="ml-auto text-xs text-slate-500">{UO_FORFAIT} UO/an (±10-15%)</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">UO allouées</span>
                    <span className={`font-medium ${uoAllocPct > 115 ? "text-red-400" : uoAllocPct > 100 ? "text-amber-400" : "text-slate-200"}`}>
                      {totalUoAllocated} / {UO_FORFAIT} UO ({uoAllocPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full ${uoAllocPct > 115 ? "bg-red-500" : uoAllocPct > 100 ? "bg-amber-500" : "bg-indigo-500"}`}
                      style={{ width: `${Math.min(uoAllocPct, 115)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">UO consommées</span>
                    <span className={`font-medium ${uoConsumePct > 90 ? "text-red-400" : uoConsumePct > 70 ? "text-amber-400" : "text-green-400"}`}>
                      {totalUoConsumed} / {UO_FORFAIT} UO ({uoConsumePct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full ${uoConsumePct > 90 ? "bg-red-500" : uoConsumePct > 70 ? "bg-amber-400" : "bg-green-500"}`}
                      style={{ width: `${uoConsumePct}%` }} />
                  </div>
                </div>
              </div>
              {totalUoAllocated > UO_FORFAIT * 1.15 && (
                <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Dépassement du forfait UO</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-white">Budget global portefeuille</span>
              </div>
              {totalBudget > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Budget total</span><span className="text-slate-200 font-medium">{fmt(totalBudget)} €</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Coûts saisis</span><span className="text-slate-200 font-medium">{fmt(totalConsumed)} €</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Consommation</span>
                      <span className={`font-medium ${(budgetPct ?? 0) > 100 ? "text-red-400" : (budgetPct ?? 0) > 80 ? "text-amber-400" : "text-green-400"}`}>
                        {budgetPct ?? 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full rounded-full ${(budgetPct ?? 0) > 100 ? "bg-red-500" : (budgetPct ?? 0) > 80 ? "bg-amber-400" : "bg-green-500"}`}
                        style={{ width: `${Math.min(budgetPct ?? 0, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Reste à dépenser</span>
                    <span className={`font-medium ${totalBudget - totalConsumed < 0 ? "text-red-400" : "text-green-400"}`}>
                      {totalBudget - totalConsumed >= 0 ? "+" : ""}{fmt(totalBudget - totalConsumed)} €
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4 text-center">Aucun budget renseigné sur les projets.</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Jalons à risque */}
        {atRiskMilestones.length > 0 && (
          <Card className="border-red-800/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Milestone className="w-4 h-4 text-red-400" />
                <h2 className="font-semibold text-white text-sm">Jalons à risque ({atRiskMilestones.length})</h2>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Projet</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Jalon</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {atRiskMilestones.slice(0, 10).map(m => {
                    const isMissed = m.status === "missed";
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3 text-xs text-slate-400">{m.projects?.name ?? "—"}</td>
                        <td className="px-5 py-3 text-sm text-slate-200 font-medium">{m.title}</td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          {m.due_date ? new Date(m.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isMissed ? "bg-red-900/30 text-red-400" : "bg-amber-900/30 text-amber-400"}`}>
                            {isMissed ? "Manqué" : "En retard"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {m.project_id && (
                            <Link href={`/project/milestones/?id=${m.project_id}`} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                              Voir <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}

        {/* Tableau santé portefeuille */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Santé du portefeuille</h2>
              <Link href="/projects/" className="text-sm text-indigo-400 hover:text-indigo-300">Tous les projets →</Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {projectsWithHealth.length === 0 ? (
              <p className="px-5 py-10 text-center text-slate-500 text-sm">Aucun projet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Projet</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Santé</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Complexité</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Méthodo</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">UO {currentYear}</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Budget</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Jalons</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {projectsWithHealth.map(({ project: p, health, missed, overdue, pBudgetPct, uoConsumed }) => {
                    const cc = p.complexity_level ? COMPLEXITY[p.complexity_level] : null;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <Link href={`/project/?id=${p.id}`} className="font-medium text-slate-200 hover:text-indigo-400 transition-colors">
                            {p.name}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {p.status === "active" ? "Actif" : p.status === "paused" ? "Suspendu" : p.status === "draft" ? "Brouillon" : "Clôturé"}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${HEALTH_COLOR[health]}`}>
                            <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[health]}`} />
                            {HEALTH_LABEL[health]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {cc ? (
                            <span className={`flex items-center gap-1 text-xs font-medium ${cc.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cc.dot}`} />{cc.label}
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={getMethodologyColor(p.methodology_applied)}>
                            {getMethodologyLabel(p.methodology_applied)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <span className="text-amber-400 font-medium">{uoConsumed}</span>
                          <span className="text-slate-500"> / {p.uo_value ?? "?"} UO</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {pBudgetPct !== null ? (
                            <span className={`text-xs font-medium flex items-center gap-1 ${pBudgetPct > 100 ? "text-red-400" : pBudgetPct > 80 ? "text-amber-400" : "text-green-400"}`}>
                              {pBudgetPct > 100 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {pBudgetPct}%
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {missed > 0 && <span className="text-red-400 font-medium">{missed} manqué{missed > 1 ? "s" : ""}</span>}
                          {overdue > 0 && <span className="text-amber-400 font-medium ml-1">{overdue} en retard</span>}
                          {missed === 0 && overdue === 0 && <span className="text-green-400">OK</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <Link href={`/project/?id=${p.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
