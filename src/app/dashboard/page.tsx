"use client";

import Link from "next/link";
import { useProjects, useMyMemberships, useTasks, useProjectCosts, useMilestones } from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getMethodologyLabel, getMethodologyColor, getStatusLabel, formatDate } from "@/lib/utils";
import { Plus, FolderKanban, TrendingUp, CheckCircle2, Clock, BarChart2, DollarSign, Milestone, ArrowRight } from "lucide-react";
import type { Project } from "@/types";

// ── Carte exécutive pour un projet (rôle client) ─────────────────────────────
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

  return (
    <Card className="hover:border-indigo-700/50 transition-all">
      <CardBody className="space-y-4">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/project/reporting/?id=${project.id}`} className="font-semibold text-slate-100 hover:text-indigo-400 transition-colors truncate block">
              {project.name}
            </Link>
            {project.domain && <p className="text-xs text-slate-500 mt-0.5">{project.domain}</p>}
          </div>
          <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
            project.status === "active" ? "bg-green-900/30 text-green-400" :
            project.status === "paused" ? "bg-amber-900/30 text-amber-400" :
            "bg-slate-800 text-slate-400"
          }`}>
            {getStatusLabel(project.status)}
          </span>
        </div>

        {/* Avancement */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Avancement</span>
            <span className="text-slate-300 font-medium">{done}/{total} tâches — {progress} %</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className={`h-full rounded-full transition-all ${progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-indigo-500" : "bg-amber-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Budget */}
        {budgetPct !== null && (
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400">Budget consommé</span>
            <span className={`ml-auto font-medium ${budgetPct > 90 ? "text-red-400" : budgetPct > 70 ? "text-amber-400" : "text-green-400"}`}>
              {budgetPct} %
            </span>
          </div>
        )}

        {/* Prochain jalon */}
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
          Voir le reporting complet <ArrowRight className="w-3 h-3" />
        </Link>
      </CardBody>
    </Card>
  );
}

// ── Tableau de bord PM (vue complète) ────────────────────────────────────────
function PMDashboard({ projects, isLoading }: { projects: Project[] | undefined; isLoading: boolean }) {
  const activeProjects = projects?.filter(p => p.status === "active") ?? [];
  const draftProjects  = projects?.filter(p => p.status === "draft") ?? [];

  return (
    <div className="space-y-8">
      {/* Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{projects?.length ?? 0}</p>
              <p className="text-sm text-slate-400">Projets au total</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeProjects.length}</p>
              <p className="text-sm text-slate-400">Projets actifs</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{draftProjects.length}</p>
              <p className="text-sm text-slate-400">Brouillons</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Liste des projets récents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Projets récents</h2>
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
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Méthodologie</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {projects.slice(0, 8).map(project => (
                  <tr key={project.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/project/?id=${project.id}`} className="font-medium text-slate-200 hover:text-indigo-400 transition-colors">
                        {project.name}
                      </Link>
                      {project.domain && <p className="text-xs text-slate-500 mt-0.5">{project.domain}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={getMethodologyColor(project.methodology_applied)}>
                        {getMethodologyLabel(project.methodology_applied)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium ${
                        project.status === "active"  ? "text-green-400" :
                        project.status === "paused"  ? "text-amber-400" :
                        project.status === "closed"  ? "text-slate-500" : "text-slate-400"
                      }`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(project.created_at)}</td>
                  </tr>
                ))}
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

  const prenom = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  // Projets où l'utilisateur est propriétaire ou PM/PMO/dev
  const pmProjects = projects?.filter(p =>
    p.owner_id === user?.id ||
    memberships.some(m => m.project_id === p.id && m.role !== "client" && m.role !== "observer")
  ) ?? [];

  // Projets où l'utilisateur est client (accès en lecture + commentaires)
  const clientProjectIds = new Set(memberships.filter(m => m.role === "client").map(m => m.project_id));
  const clientProjects = projects?.filter(p =>
    clientProjectIds.has(p.id) &&
    p.owner_id !== user?.id &&
    !memberships.some(m => m.project_id === p.id && m.role !== "client")
  ) ?? [];

  // Si l'utilisateur n'a que des projets client, on affiche uniquement la vue exécutive
  const isClientOnly = pmProjects.length === 0 && clientProjects.length > 0;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Bonjour, {prenom} 👋</h1>
            <p className="text-slate-400 mt-1">
              {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
            </p>
          </div>
          {!isClientOnly && (
            <Link href="/projects/"
              className="inline-flex items-center gap-2 rounded-lg font-medium transition-colors bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm px-4 py-2 text-sm">
              <Plus className="w-4 h-4" /> Nouveau projet
            </Link>
          )}
        </div>

        {/* Vue exécutive client */}
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

        {/* Vue PM complète */}
        {!isClientOnly && (
          <PMDashboard
            projects={pmProjects.length > 0 ? pmProjects : projects}
            isLoading={isLoading}
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
