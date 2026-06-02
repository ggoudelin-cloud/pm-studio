"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getMethodologyLabel, getMethodologyColor, getStatusLabel, formatDate } from "@/lib/utils";
import { KanbanSquare, GitBranch, ListTodo, ArrowRight, CalendarDays, Banknote, Users } from "lucide-react";

function ProjectNav({ id }: { id: string }) {
  const links = [
    { href: `/project/tasks/?id=${id}`,   label: "Tâches & Classification", icon: ListTodo,     desc: "Classifiez vos tâches et obtenez des recommandations méthodologiques" },
    { href: `/project/agile/?id=${id}`,   label: "Agile — Kanban & Sprints", icon: KanbanSquare, desc: "Gérez votre backlog, vos sprints et votre tableau Kanban" },
    { href: `/project/cycle-v/?id=${id}`, label: "Cycle en V — Phases",      icon: GitBranch,    desc: "Suivez les phases, jalons et gate reviews du Cycle en V" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {links.map(({ href, label, icon: Icon, desc }) => (
        <Link key={href} href={href}>
          <Card className="hover:border-indigo-700/50 hover:bg-slate-800/30 transition-all cursor-pointer h-full">
            <CardBody className="flex flex-col gap-3">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-100 text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-1">{desc}</p>
              </div>
              <div className="mt-auto">
                <span className="text-xs text-indigo-400 flex items-center gap-1">
                  Accéder <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function ProjectPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: project, isLoading } = useProject(id);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !project ? (
          <div className="py-16 text-center">
            <p className="text-slate-400">Projet introuvable.</p>
            <Link href="/projects/" className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block">← Retour aux projets</Link>
          </div>
        ) : (
          <>
            {/* En-tête projet */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Link href="/projects/" className="hover:text-slate-300">Projets</Link>
                  <span>/</span>
                  <span className="text-slate-300">{project.name}</span>
                </div>
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                {project.description && (
                  <p className="text-slate-400 max-w-2xl">{project.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getMethodologyColor(project.methodology_applied) }>
                    {getMethodologyLabel(project.methodology_applied)}
                  </Badge>
                  <Badge variant="default">{getStatusLabel(project.status)}</Badge>
                  {project.domain && <Badge variant="default">{project.domain}</Badge>}
                </div>
              </div>
              <Button variant="secondary" size="sm">
                Modifier
              </Button>
            </div>

            {/* Infos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {project.start_date && (
                <Card>
                  <CardBody className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Début</p>
                      <p className="text-sm font-medium text-slate-200">{formatDate(project.start_date)}</p>
                    </div>
                  </CardBody>
                </Card>
              )}
              {project.end_date && (
                <Card>
                  <CardBody className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Fin prévue</p>
                      <p className="text-sm font-medium text-slate-200">{formatDate(project.end_date)}</p>
                    </div>
                  </CardBody>
                </Card>
              )}
              {project.budget && (
                <Card>
                  <CardBody className="flex items-center gap-3">
                    <Banknote className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Budget</p>
                      <p className="text-sm font-medium text-slate-200">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(project.budget)}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}
              {project.context_team_size && (
                <Card>
                  <CardBody className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Équipe</p>
                      <p className="text-sm font-medium text-slate-200">{project.context_team_size} pers.</p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* Moteur de recommandation */}
            {project.methodology_recommended && (
              <Card className="border-indigo-800/50 bg-indigo-950/20">
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                    <p className="text-sm text-slate-300">
                      <span className="font-medium text-indigo-300">Recommandation PM Studio :</span>{" "}
                      {getMethodologyLabel(project.methodology_recommended)} —{" "}
                      {project.methodology_applied !== project.methodology_recommended && (
                        <span className="text-amber-400">
                          méthodologie appliquée différente ({getMethodologyLabel(project.methodology_applied)})
                        </span>
                      )}
                      {project.methodology_applied === project.methodology_recommended && (
                        <span className="text-green-400">aligné avec la recommandation</span>
                      )}
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Navigation modules */}
            <div>
              <h2 className="font-semibold text-white mb-4">Modules du projet</h2>
              <ProjectNav id={project.id} />
            </div>
          </>
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

export default function ProjectPage() {
  return <Suspense fallback={<Spinner />}><ProjectPageContent /></Suspense>;
}
