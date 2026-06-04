"use client";

import Link from "next/link";
import {
  useProjects, useMyMemberships, useTasks, useProjectCosts,
  useMilestones, useAllUoLogs, useMyTaskProjectIds,
} from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getMethodologyLabel, getMethodologyColor, getStatusLabel, formatDate } from "@/lib/utils";
import {
  Plus, FolderKanban, TrendingUp, CheckCircle2, Clock, BarChart2,
  Euro, Milestone, ArrowRight, Wrench, AlertTriangle,
} from "lucide-react";
import type { Project, ComplexityLevel } from "@/types";

const UO_FORFAIT_ANNUEL = 350;

const COMPLEXITY_CONFIG: Record<ComplexityLevel, { label: string; color: string; dot: string }> = {
  simple:   { label: "N1 Simple",   color: "text-blue-400",   dot: "bg-blue-400" },
  medium:   { label: "N2 Moyen",    color: "text-green-400",  dot: "bg-green-400" },
  high:     { label: "N3 Élevé",    color: "text-amber-400",  dot: "bg-amber-400" },
  critical: { label: "N4 Critique", color: "text-red-400",    dot: "bg-red-400" },
};

// ── Carte exécutive (client) ─────────────────────────────────────────────────
function ExecutiveProjectCard({ project }: { project: Project }) {
  const { data: tasks      = [] } = useTasks(project.id);
  const { data: costs      = [] } = useProjectCosts(project.id);
  const { data: milestones = [] } = useMilestones(project.id);

  const total    = tasks.length;
  const done     = tasks.filter(t => t.status === "done").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const totalHT  = costs.reduce((s, c) => s + c.quantity * c.unit_cost_ht, 0);
  const budgetPct = project.budget && project.budget > 0 ? Math.min(100, Math.round((totalHT / project.budget) * 100)) : null;

  const today = new Date().toISOString().slice(0, 10);
  const nextMilestone = milestones
    .filter(m => m.status === "pending" && m.due_date && m.due_date >= today)
    .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1))[0];
  const overdueMilestones = milestones.filter(m => m.status === "pending" && m.due_date && m.due_date < today).length;

  const complexityConf = project.complexity_level ? COMPLEXITY_CONFIG[project.complexity_level] : null;

  return (
    <Card className="hover:border-indigo-700/50 transition-all">
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/project/reporting/?id=${project.id}`} className="font-semibold text-slate-100 hover:text-indigo-400 transition-colors truncate block">
              {project.name}
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {project.domain && <p className="text-xs text-slate-500">{project.domain}</p>}
              {complexityConf && (
                <span className={`flex items-center gap-1 text-xs ${complexityConf.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${complexityConf.dot}`} />{complexityConf.label}
                </span>
              )}
            </div>
          </div>
          <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
            project.status === "active" ? "bg-green-900/30 text-green-400" :
            project.status === "paused" ? "bg-amber-900/30 text-amber-400" :
            "bg-slate-800 text-slate-400"
          }`}>{getStatusLabel(project.status)}</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Avancement</span>
            <span className="text-slate-300 font-medium">{done}/{total} tâches — {progress} %</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className={`h-full rounded-full transition-all ${progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-indigo-500" : "bg-amber-500"}`}
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        {budgetPct !== null && (
          <div className="flex items-center gap-2 text-xs">
            <Euro className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400">Budget consommé</span>
            <span className={`ml-auto font-medium ${budgetPct > 90 ? "text-red-400" : budgetPct > 70 ? "text-amber-400" : "text-green-400"}`}>
              {budgetPct} %
            </span>
          </div>
        )}

        {nextMilestone ? (
          <div className="flex items-center gap-2 text-xs bg-amber-950/20 border border-amber-700/30 rounded-lg px-3 py-2">
            <Milestone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-amber-300 truncate flex-1">{nextMilestone.title}</span>
            <span className="text-amber-400/70 shrink-0">
              {new Date(nextMilestone.due_date!).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
            </span>
          </div>
        ) : overdueMilestones > 0 ? (
          <div className="text-xs text-red-400 bg-red-950/20 border border-red-700/30 rounded-lg px-3 py-2">
            ⚠ {overdueMilestones} jalon(s) en retard
          </div>
        ) : null}

        <Link href={`/project/reporting/?id=${project.id}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 mt-1">
          Voir le reporting <ArrowRight className="w-3 h-3" />
        </Link>
      </CardBody>
    </Card>
  );
}

// ── Jauge UO annuelle ─────────────────────────────────────────────────────────
function UoGauge({ projects }: { projects: Project[] }) {
  const { data: allLogs = [] } = useAllUoLogs();
  const now = new Date();
  const currentYear = now.getFullYear();

  const totalUoAllocated = projects.reduce((s, p) => s + (p.uo_value ?? 0), 0);
  const totalUoConsumed  = allLogs.filter(l => l.year === currentYear).reduce((s, l) => s + l.uo_consumed, 0);
  const uoConsumedPct    = UO_FORFAIT_ANNUEL > 0 ? Math.min(100, Math.round((totalUoConsumed / UO_FORFAIT_ANNUEL) * 100)) : 0;
  const uoAllocatedPct   = UO_FORFAIT_ANNUEL > 0 ? Math.min(100, Math.round((totalUoAllocated / UO_FORFAIT_ANNUEL) * 100)) : 0;
  const elasticMax       = UO_FORFAIT_ANNUEL * 1.15;
  const elasticMin       = UO_FORFAIT_ANNUEL * 0.9;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Forfait UO annuel</span>
          </div>
          <span className="text-xs text-slate-500">{UO_FORFAIT_ANNUEL} UO/an (élasticité ±10-15%)</span>
        </div>

        <div className="space-y-3">
          {/* UO allouées */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">UO allouées au portefeuille</span>
              <span className={`font-medium ${uoAllocatedPct > 115 ? "text-red-400" : uoAllocatedPct > 100 ? "text-amber-400" : "text-slate-200"}`}>
                {totalUoAllocated} / {UO_FORFAIT_ANNUEL} UO ({uoAllocatedPct} %)
              </span>
            </div>
            <div className="relative w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="absolute inset-y-0 bg-indigo-600/30 border-r-2 border-indigo-500/60" style={{ width: `${100}%` }} />
              <div className={`h-full rounded-full transition-all ${uoAllocatedPct > 115 ? "bg-red-500" : uoAllocatedPct > 100 ? "bg-amber-500" : "bg-indigo-500"}`}
                style={{ width: `${Math.min(uoAllocatedPct, 115)}%` }} />
            </div>
          </div>

          {/* UO consommées cette année */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">UO consommées {currentYear}</span>
              <span className={`font-medium ${uoConsumedPct > 90 ? "text-red-400" : uoConsumedPct > 70 ? "text-amber-400" : "text-green-400"}`}>
                {totalUoConsumed} / {UO_FORFAIT_ANNUEL} UO ({uoConsumedPct} %)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${uoConsumedPct > 90 ? "bg-red-500" : uoConsumedPct > 70 ? "bg-amber-400" : "bg-green-500"}`}
                style={{ width: `${Math.min(uoConsumedPct, 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Élasticité : [{Math.round(elasticMin)} – {Math.round(elasticMax)}] UO</span>
          {totalUoAllocated > elasticMax && (
            <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" /> Dépassement forfait</span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ── Vue PMO portefeuille ──────────────────────────────────────────────────────
function PMDashboard({ projects, isLoading, isPMO = true }: { projects: Project[] | undefined; isLoading: boolean; isPMO?: boolean }) {
  const activeProjects   = projects?.filter(p => p.status === "active") ?? [];
  const draftProjects    = projects?.filter(p => p.status === "draft") ?? [];
  const criticalProjects = projects?.filter(p => p.complexity_level === "critical") ?? [];

  const totalUo = projects?.reduce((s, p) => s + (p.uo_value ?? 0), 0) ?? 0;

  const complexityCounts = projects?.reduce<Record<ComplexityLevel, number>>((acc, p) => {
    if (p.complexity_level) acc[p.complexity_level] = (acc[p.complexity_level] ?? 0) + 1;
    return acc;
  }, { simple: 0, medium: 0, high: 0, critical: 0 }) ?? { simple: 0, medium: 0, high: 0, critical: 0 };

  return (
    <div className="space-y-8">
      {/* KPIs principaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{projects?.length ?? 0}</p>
              <p className="text-xs text-slate-400">Projets</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeProjects.length}</p>
              <p className="text-xs text-slate-400">Actifs</p>
            </div>
          </CardBody>
        </Card>
        <Card className={criticalProjects.length > 0 ? "border-red-800/40" : ""}>
          <CardBody className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{criticalProjects.length}</p>
              <p className="text-xs text-slate-400">Critiques</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalUo}</p>
              <p className="text-xs text-slate-400">UO allouées</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Jauge UO — PM/PMO uniquement */}
      {isPMO && projects && projects.length > 0 && <UoGauge projects={projects} />}

      {/* Répartition par complexité — PM/PMO uniquement */}
      {isPMO && projects && projects.some(p => p.complexity_level) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white text-sm">Répartition par niveau de complexité</h2>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="grid grid-cols-4 gap-3">
              {(["critical", "high", "medium", "simple"] as ComplexityLevel[]).map(level => {
                const conf = COMPLEXITY_CONFIG[level];
                const count = complexityCounts[level];
                return (
                  <div key={level} className="text-center p-3 rounded-xl bg-slate-800/50">
                    <div className={`text-2xl font-bold ${conf.color}`}>{count}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{conf.label}</div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Portefeuille projets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Portefeuille projets</h2>
            <Link href="/projects/" className="text-sm text-indigo-400 hover:text-indigo-300">Voir tous →</Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !projects?.length ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">Aucun projet pour l&apos;instant.</p>
              <Link href="/projects/" className="inline-block mt-3 text-sm text-indigo-400 hover:text-indigo-300">
                Créer votre premier projet
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Projet</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Complexité</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">UO</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Méthodo</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {[...(projects ?? [])].sort((a, b) => {
                  const order = { critical: 0, high: 1, medium: 2, simple: 3 };
                  return (order[a.complexity_level as ComplexityLevel] ?? 4) - (order[b.complexity_level as ComplexityLevel] ?? 4);
                }).slice(0, 10).map(project => {
                  const complexityConf = project.complexity_level ? COMPLEXITY_CONFIG[project.complexity_level] : null;
                  return (
                    <tr key={project.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/project/?id=${project.id}`} className="font-medium text-slate-200 hover:text-indigo-400 transition-colors">
                          {project.name}
                        </Link>
                        {project.domain && <p className="text-xs text-slate-500 mt-0.5">{project.domain}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        {complexityConf ? (
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${complexityConf.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${complexityConf.dot}`} />
                            {complexityConf.label}
                          </span>
                        ) : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-amber-400">
                        {project.uo_value ? `${project.uo_value} UO` : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={getMethodologyColor(project.methodology_applied)}>
                          {getMethodologyLabel(project.methodology_applied)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium ${
                          project.status === "active" ? "text-green-400" :
                          project.status === "paused" ? "text-amber-400" :
                          project.status === "closed" ? "text-slate-500" : "text-slate-400"
                        }`}>{getStatusLabel(project.status)}</span>
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
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile, user } = useAuthStore();
  const { data: projects, isLoading } = useProjects();
  const { data: memberships = [] } = useMyMemberships();
  const { data: myTaskProjectIds = [] } = useMyTaskProjectIds();

  const prenom = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  const pmProjects = projects?.filter(p =>
    p.owner_id === user?.id ||
    memberships.some(m => m.project_id === p.id && m.role !== "client" && m.role !== "observer")
  ) ?? [];

  const clientProjectIds = new Set(memberships.filter(m => m.role === "client").map(m => m.project_id));
  const clientProjects = projects?.filter(p =>
    clientProjectIds.has(p.id) &&
    p.owner_id !== user?.id &&
    !memberships.some(m => m.project_id === p.id && m.role !== "client")
  ) ?? [];

  const isClientOnly = pmProjects.length === 0 && clientProjects.length > 0;

  // Dev : ne voir que les projets où il a des tâches assignées
  const isDevOnly = memberships.length > 0 &&
    memberships.every(m => m.role === "dev" || m.role === "client" || m.role === "observer") &&
    memberships.some(m => m.role === "dev");

  // Peut créer un projet : propriétaire OU rôle pm/pmo
  const canCreateProject =
    projects?.some(p => p.owner_id === user?.id) ||
    memberships.some(m => m.role === "pm" || m.role === "pmo") ||
    (memberships.length === 0 && !isLoading);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Bonjour, {prenom}</h1>
            <p className="text-slate-400 mt-1">
              {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
            </p>
          </div>
          {!isClientOnly && canCreateProject && (
            <Link href="/projects/"
              className="inline-flex items-center gap-2 rounded-lg font-medium transition-colors bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm px-4 py-2 text-sm">
              <Plus className="w-4 h-4" /> Nouveau projet
            </Link>
          )}
        </div>

        {clientProjects.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-white">
                {isClientOnly ? "Mes projets" : "Reporting exécutif client"}
              </h2>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{clientProjects.length} projet(s)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {clientProjects.map(p => <ExecutiveProjectCard key={p.id} project={p} />)}
            </div>
          </div>
        )}

        {!isClientOnly && (
          <PMDashboard
            projects={(() => {
              if (isDevOnly) return (projects ?? []).filter(p => myTaskProjectIds.includes(p.id));
              return pmProjects.length > 0 ? pmProjects : projects;
            })()}
            isLoading={isLoading}
            isPMO={!isDevOnly}
          />
        )}

        {isClientOnly && clientProjects.length === 0 && !isLoading && (
          <div className="py-16 text-center text-slate-400 text-sm">
            Vous n&apos;êtes assigné à aucun projet pour le moment.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
