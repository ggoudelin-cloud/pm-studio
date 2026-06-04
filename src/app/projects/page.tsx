"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getMethodologyLabel, getMethodologyColor, getStatusLabel, formatDate } from "@/lib/utils";
import { Plus, Search, X, Layers } from "lucide-react";
import type { ComplexityLevel } from "@/types";

const COMPLEXITY_BADGE: Record<ComplexityLevel, { label: string; color: string }> = {
  simple:   { label: "N1 — Simple",   color: "bg-blue-900/20 text-blue-400 border-blue-700/40" },
  medium:   { label: "N2 — Moyen",    color: "bg-green-900/20 text-green-400 border-green-700/40" },
  high:     { label: "N3 — Élevé",    color: "bg-amber-900/20 text-amber-400 border-amber-700/40" },
  critical: { label: "N4 — Critique", color: "bg-red-900/20 text-red-400 border-red-700/40" },
};

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const createProject = useCreateProject();
  const [name,       setName]       = useState("");
  const [description,setDesc]       = useState("");
  const [domain,     setDomain]     = useState("");
  const [budget,     setBudget]     = useState("");
  const [startDate,  setStartDate]  = useState("");
  const [endDate,    setEndDate]    = useState("");
  const [complexity, setComplexity] = useState<ComplexityLevel | "">("");
  const [uoValue,    setUoValue]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createProject.mutateAsync({
      name,
      description: description || null,
      domain: domain || null,
      budget: budget ? parseFloat(budget) : null,
      start_date: startDate || null,
      end_date: endDate || null,
      complexity_level: complexity || null,
      uo_value: uoValue ? parseFloat(uoValue) : null,
      status: "draft",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">Nouveau projet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input id="name" label="Nom du projet *" placeholder="ex : Migration Oracle DB" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Description</label>
              <textarea rows={3} value={description} onChange={(e) => setDesc(e.target.value)}
                placeholder="Objectifs, contexte…"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Niveau de complexité</label>
                <select value={complexity} onChange={e => setComplexity(e.target.value as ComplexityLevel | "")}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Non défini</option>
                  <option value="simple">Niveau 1 — Simple</option>
                  <option value="medium">Niveau 2 — Moyen</option>
                  <option value="high">Niveau 3 — Élevé</option>
                  <option value="critical">Niveau 4 — Critique</option>
                </select>
              </div>
              <Input id="uoValue" label="UO allouées" type="number" placeholder="ex: 14" value={uoValue} onChange={(e) => setUoValue(e.target.value)} />
            </div>
            <Input id="domain" label="Domaine métier" placeholder="ex : Production SI, Finance" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input id="budget" label="Budget (€)" type="number" placeholder="500000" value={budget} onChange={(e) => setBudget(e.target.value)} />
              <div className="invisible" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input id="startDate" label="Date de début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input id="endDate"   label="Date de fin"   type="date" value={endDate}   onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button type="submit" loading={createProject.isPending} className="flex-1 justify-center">Créer le projet</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = projects?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.domain?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Projets</h1>
            <p className="text-slate-400 text-sm mt-1">{projects?.length ?? 0} projet(s)</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            Nouveau projet
          </Button>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Rechercher un projet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Grille */}
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !filtered.length ? (
          <div className="py-16 text-center">
            <Layers className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">Aucun projet trouvé</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-indigo-400 hover:text-indigo-300">
              Créer votre premier projet →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <Link key={project.id} href={`/project/?id=${project.id}`}>
                <Card className="hover:border-slate-700 hover:bg-slate-800/30 transition-all cursor-pointer h-full">
                  <CardBody className="flex flex-col gap-3 h-full">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-100 leading-snug">{project.name}</h3>
                      <span className={`text-xs font-medium shrink-0 ${
                        project.status === "active" ? "text-green-400" :
                        project.status === "paused" ? "text-amber-400" :
                        project.status === "closed" ? "text-slate-500" : "text-slate-400"
                      }`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-sm text-slate-400 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-auto pt-2">
                      {project.methodology_applied && (
                        <Badge variant={getMethodologyColor(project.methodology_applied)}>
                          {getMethodologyLabel(project.methodology_applied)}
                        </Badge>
                      )}
                      {project.complexity_level && COMPLEXITY_BADGE[project.complexity_level] && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${COMPLEXITY_BADGE[project.complexity_level].color}`}>
                          {COMPLEXITY_BADGE[project.complexity_level].label}
                        </span>
                      )}
                      {project.domain && (
                        <Badge variant="default">{project.domain}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{formatDate(project.created_at)}</p>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </DashboardLayout>
  );
}
