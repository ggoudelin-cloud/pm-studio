"use client";

import Link from "next/link";
import { useProjects } from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getMethodologyLabel, getMethodologyColor, getStatusLabel, formatDate } from "@/lib/utils";
import { Plus, FolderKanban, TrendingUp, CheckCircle2, Clock } from "lucide-react";

export default function DashboardPage() {
  const { profile, user } = useAuthStore();
  const { data: projects, isLoading } = useProjects();

  const activeProjects = projects?.filter((p) => p.status === "active") ?? [];
  const draftProjects  = projects?.filter((p) => p.status === "draft") ?? [];

  const prenom = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

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
          <Link
            href="/projects/"
            className="inline-flex items-center gap-2 rounded-lg font-medium transition-colors bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm px-4 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau projet
          </Link>
        </div>

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
              <Link href="/projects/" className="text-sm text-indigo-400 hover:text-indigo-300">
                Voir tous →
              </Link>
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
                  {projects.slice(0, 8).map((project) => (
                    <tr key={project.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/project/?id=${project.id}`}
                          className="font-medium text-slate-200 hover:text-indigo-400 transition-colors"
                        >
                          {project.name}
                        </Link>
                        {project.domain && (
                          <p className="text-xs text-slate-500 mt-0.5">{project.domain}</p>
                        )}
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
                        }`}>
                          {getStatusLabel(project.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(project.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
