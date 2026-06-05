"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import {
  useProject, useUpdateProject, useProjectMembers, useTasks,
  useSprints, usePhases, useMilestones, useMyMemberships,
  useProjectRisks, useUoLogs, useProjectCosts,
} from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/auth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getMethodologyLabel, getMethodologyColor, getStatusLabel, formatDate } from "@/lib/utils";
import {
  KanbanSquare, GitBranch, ListTodo, ArrowRight, CalendarDays,
  Banknote, Users, Download, X, Edit2, Package, RefreshCw, GitMerge, Trash2,
  Euro, Milestone, AlertTriangle, BarChart2, Rocket, Building2,
  FileText, Wrench, Star, CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Project, MemberRole, ComplexityLevel } from "@/types";

// ── Config complexité ────────────────────────────────────────────────────────
const COMPLEXITY_CONFIG: Record<ComplexityLevel, { label: string; color: string; bg: string; dot: string }> = {
  simple:   { label: "Niveau 1 — Simple",    color: "text-blue-400",   bg: "bg-blue-900/20 border-blue-700/40",   dot: "bg-blue-400" },
  medium:   { label: "Niveau 2 — Moyen",     color: "text-green-400",  bg: "bg-green-900/20 border-green-700/40",  dot: "bg-green-400" },
  high:     { label: "Niveau 3 — Élevé",     color: "text-amber-400",  bg: "bg-amber-900/20 border-amber-700/40",  dot: "bg-amber-400" },
  critical: { label: "Niveau 4 — Critique",  color: "text-red-400",    bg: "bg-red-900/20 border-red-700/40",      dot: "bg-red-400" },
};

// ── Navigation selon rôle ────────────────────────────────────────────────────
function getNavLinks(id: string, role: MemberRole | null) {
  const isPM = role === "pm" || role === "pmo" || role === null;
  const isDev = role === "dev";
  const isClient = role === "client" || role === "observer";

  if (isClient) {
    return [
      { href: `/project/reporting/?id=${id}`,  label: "Reporting",         icon: BarChart2,    desc: "Avancement, budget, risques — vue exécutive" },
      { href: `/project/milestones/?id=${id}`,  label: "Jalons",            icon: Milestone,    desc: "Jalons clés et leur statut d'atteinte" },
      { href: `/project/deliverables/?id=${id}`,label: "Livrables",         icon: Package,      desc: "Livrables et statuts de validation" },
      { href: `/project/risks/?id=${id}`,       label: "Risques",           icon: AlertTriangle,desc: "Registre des risques du projet" },
    ];
  }

  if (isDev) {
    return [
      { href: `/project/my-tasks/?id=${id}`, label: "Mes tâches", icon: CheckSquare, desc: "Vos tâches assignées — mettez à jour votre avancement" },
    ];
  }

  // PM / PMO — accès complet
  return [
    { href: `/project/my-tasks/?id=${id}`,       label: "Mes tâches",             icon: CheckSquare,   desc: "Tâches assignées à vous — avancement rapide",          group: "Personnel" },
    { href: `/project/tasks/?id=${id}`,           label: "Tâches & Classification",icon: ListTodo,      desc: "Classifiez vos tâches et obtenez des recommandations",  group: "Planification" },
    { href: `/project/gantt/?id=${id}`,           label: "Gantt & Dépendances",    icon: CalendarDays,  desc: "Planifiez tâches, jalons et liens prédécesseurs",        group: "Planification" },
    { href: `/project/milestones/?id=${id}`,      label: "Jalons",                 icon: Milestone,     desc: "Jalons clés et tâches rattachées",                      group: "Planification" },
    { href: `/project/agile/?id=${id}`,           label: "Agile — Kanban & Sprints",icon: KanbanSquare, desc: "Backlog, sprints et tableau Kanban",                     group: "Méthodologie" },
    { href: `/project/cycle-v/?id=${id}`,         label: "Cycle en V — Phases",    icon: GitBranch,     desc: "Phases, jalons et gate reviews Cycle en V",             group: "Méthodologie" },
    { href: `/project/deliverables/?id=${id}`,    label: "Livrables",              icon: Package,       desc: "Gérez les livrables et leur statut de validation",       group: "Livraison" },
    { href: `/project/mep/?id=${id}`,             label: "MEP — Mises En Production",icon: Rocket,      desc: "Chronogrammes, Go/NoGo, PSS/PSC, bilans MEP",           group: "Livraison" },
    { href: `/project/flash-report/?id=${id}`,    label: "Rapport Flash",          icon: FileText,      desc: "Rapport hebdomadaire avec check-lists RSSI/DA/tests",    group: "PMO" },
    { href: `/project/committees/?id=${id}`,      label: "Comitologie",            icon: Building2,     desc: "COPIL, ComEV, CAB — ordres du jour et comptes rendus",   group: "PMO" },
    { href: `/project/skills/?id=${id}`,          label: "Matrice de compétences", icon: Star,          desc: "Compétences des membres avec niveaux requis",            group: "PMO" },
    { href: `/project/uo/?id=${id}`,              label: "Suivi UO & Coûts UO",    icon: Wrench,        desc: "UO allouées, coût/UO, consommation mensuelle et budget", group: "Finances" },
    { href: `/project/costs/?id=${id}`,           label: "Gestion des coûts",      icon: Euro,    desc: "Ressources humaines, logiciels, infrastructure",         group: "Finances" },
    { href: `/project/risks/?id=${id}`,           label: "Registre des risques",   icon: AlertTriangle, desc: "Identifiez, pondérez et suivez les risques",             group: "Finances" },
    { href: `/project/reporting/?id=${id}`,       label: "Reporting",              icon: BarChart2,     desc: "Avancement, budget dépensé, charge ressources, risques", group: "Reporting" },
    { href: `/project/traceability/?id=${id}`,    label: "Traçabilité",            icon: GitMerge,      desc: "Liez exigences, tâches et cas de tests",                 group: "Qualité" },
    { href: `/project/retrospectives/?id=${id}`,  label: "Rétrospectives",         icon: RefreshCw,     desc: "Retours d'expérience de chaque sprint",                  group: "Qualité" },
    { href: `/project/team/?id=${id}`,            label: "Équipe",                 icon: Users,         desc: "Membres et rôles du projet",                             group: "Équipe" },
  ];
}

// ── Modal Modifier projet ────────────────────────────────────────────────────
function EditProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const updateProject = useUpdateProject();
  const [name,        setName]      = useState(project.name);
  const [description, setDesc]      = useState(project.description ?? "");
  const [domain,      setDomain]    = useState(project.domain ?? "");
  const [budget,      setBudget]    = useState(project.budget ? String(project.budget) : "");
  const [startDate,   setStart]     = useState(project.start_date ?? "");
  const [endDate,     setEnd]       = useState(project.end_date ?? "");
  const [status,      setStatus]    = useState(project.status);
  const [complexity,  setComplexity]= useState(project.complexity_level ?? "");
  const [uoValue,     setUoValue]   = useState(project.uo_value ? String(project.uo_value) : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateProject.mutateAsync({
      id: project.id,
      name,
      description: description || null,
      domain: domain || null,
      budget: budget ? parseFloat(budget) : null,
      start_date: startDate || null,
      end_date: endDate || null,
      status: status as Project["status"],
      complexity_level: complexity ? complexity as ComplexityLevel : null,
      uo_value: uoValue ? parseFloat(uoValue) : null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">Modifier le projet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input id="name" label="Nom du projet *" value={name} onChange={e => setName(e.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Description</label>
              <textarea rows={3} value={description} onChange={e => setDesc(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value as Project["status"])}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="draft">Brouillon</option>
                  <option value="active">Actif</option>
                  <option value="paused">En pause</option>
                  <option value="closed">Clôturé</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Complexité</label>
                <select value={complexity} onChange={e => setComplexity(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Non définie</option>
                  <option value="simple">Niveau 1 — Simple</option>
                  <option value="medium">Niveau 2 — Moyen</option>
                  <option value="high">Niveau 3 — Élevé</option>
                  <option value="critical">Niveau 4 — Critique</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input id="budget" label="Budget (€)" type="number" value={budget} onChange={e => setBudget(e.target.value)} />
              <Input id="uoValue" label="UO allouées" type="number" placeholder="ex: 14" value={uoValue} onChange={e => setUoValue(e.target.value)} />
            </div>
            <Input id="domain" label="Domaine métier" value={domain} onChange={e => setDomain(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input id="startDate" label="Date de début" type="date" value={startDate} onChange={e => setStart(e.target.value)} />
              <Input id="endDate"   label="Date de fin"   type="date" value={endDate}   onChange={e => setEnd(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button type="submit" loading={updateProject.isPending} className="flex-1 justify-center">Enregistrer</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Navigation modules ───────────────────────────────────────────────────────
function ProjectNav({ id, role }: { id: string; role: MemberRole | null }) {
  const links = getNavLinks(id, role);
  const isPM = role === "pm" || role === "pmo" || role === null;

  if (!isPM) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <span className="text-xs text-indigo-400 flex items-center gap-1">Accéder <ArrowRight className="w-3 h-3" /></span>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  // Grouper par section pour PM/PMO
  type NavLink = { href: string; label: string; icon: React.ElementType; desc: string; group?: string };
  const groups = links.reduce<Record<string, NavLink[]>>((acc, link) => {
    const g = (link as NavLink).group ?? "Autre";
    if (!acc[g]) acc[g] = [];
    acc[g].push(link as NavLink);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{group}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(({ href, label, icon: Icon, desc }) => (
              <Link key={href} href={href}>
                <Card className="hover:border-indigo-700/50 hover:bg-slate-800/30 transition-all cursor-pointer h-full">
                  <CardBody className="flex flex-col gap-2.5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="font-semibold text-slate-100 text-sm">{label}</p>
                    </div>
                    <p className="text-xs text-slate-500">{desc}</p>
                    <span className="text-xs text-indigo-400 flex items-center gap-1 mt-auto">Accéder <ArrowRight className="w-3 h-3" /></span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Contenu principal ────────────────────────────────────────────────────────
function ProjectPageContent() {
  const searchParams  = useSearchParams();
  const id            = searchParams.get("id");
  const router        = useRouter();
  const { user } = useAuthStore();
  const { data: project, isLoading } = useProject(id);
  const { data: members }    = useProjectMembers(id);
  const { data: tasks }      = useTasks(id);
  const { data: sprints }    = useSprints(id);
  const { data: phases }     = usePhases(id);
  const { data: milestones } = useMilestones(id);
  const { data: risks }      = useProjectRisks(id);
  const { data: uoLogs }     = useUoLogs(id);
  const { data: costs }      = useProjectCosts(id);
  // Rôle dérivé depuis useMyMemberships (déjà en cache, pas de requête supplémentaire)
  const { data: memberships = [] } = useMyMemberships();
  const myRole = memberships.find(m => m.project_id === id)?.role ?? null;

  const [showEdit,   setShowEdit]   = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const qcProject = useQueryClient();

  // Le rôle est immédiatement disponible depuis le cache — pas de spinner
  const isClient = myRole === "client" || myRole === "observer";
  const isDev    = myRole === "dev";
  const isPM     = myRole === "pm" || myRole === "pmo" || myRole === null;

  async function handleExport() {
    if (!project) return;
    setExporting(true);
    try {
      const { exportProjectToPptx } = await import("@/lib/export-pptx");
      await exportProjectToPptx({
        project,
        tasks:       tasks ?? [],
        sprints:     sprints ?? [],
        phases:      phases ?? [],
        milestones:  milestones ?? [],
        risks:       risks ?? [],
        uoLogs:      uoLogs ?? [],
        costs:       costs ?? [],
        memberCount: members?.length ?? 0,
      });
    } finally {
      setExporting(false);
    }
  }

  const complexityConf = project?.complexity_level ? COMPLEXITY_CONFIG[project.complexity_level] : null;

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
            {/* En-tête */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Link href="/projects/" className="hover:text-slate-300">Projets</Link>
                  <span>/</span>
                  <span className="text-slate-300">{project.name}</span>
                </div>
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                {project.description && <p className="text-slate-400 max-w-2xl">{project.description}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getMethodologyColor(project.methodology_applied)}>
                    {getMethodologyLabel(project.methodology_applied)}
                  </Badge>
                  <Badge variant="default">{getStatusLabel(project.status)}</Badge>
                  {project.domain && <Badge variant="default">{project.domain}</Badge>}
                  {complexityConf && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${complexityConf.bg} ${complexityConf.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${complexityConf.dot}`} />
                      {complexityConf.label}
                    </span>
                  )}
                  {myRole && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      Mon rôle : {myRole === "pm" ? "Chef de projet" : myRole === "pmo" ? "PMO" : myRole === "dev" ? "Développeur" : myRole === "client" ? "Client" : "Observateur"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {isPM && (
                  <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
                    <Edit2 className="w-3.5 h-3.5" /> Modifier
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}>
                  <Download className="w-3.5 h-3.5" /> Export PPT
                </Button>
                {isPM && (
                  <Button variant="danger" size="sm" onClick={() => setConfirmDel(true)}>
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </Button>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {project.start_date && (
                <Card><CardBody className="flex items-center gap-3 py-3">
                  <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                  <div><p className="text-xs text-slate-500">Début</p><p className="text-sm font-medium text-slate-200">{formatDate(project.start_date)}</p></div>
                </CardBody></Card>
              )}
              {project.end_date && (
                <Card><CardBody className="flex items-center gap-3 py-3">
                  <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                  <div><p className="text-xs text-slate-500">Fin prévue</p><p className="text-sm font-medium text-slate-200">{formatDate(project.end_date)}</p></div>
                </CardBody></Card>
              )}
              {project.budget && !isClient && (
                <Card><CardBody className="flex items-center gap-3 py-3">
                  <Banknote className="w-4 h-4 text-slate-400 shrink-0" />
                  <div><p className="text-xs text-slate-500">Budget</p>
                    <p className="text-sm font-medium text-slate-200">
                      {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(project.budget)}
                    </p>
                  </div>
                </CardBody></Card>
              )}
              {project.uo_value && project.uo_value > 0 && (
                <Card><CardBody className="flex items-center gap-3 py-3">
                  <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
                  <div><p className="text-xs text-slate-500">UO allouées</p><p className="text-sm font-medium text-slate-200">{project.uo_value} UO</p></div>
                </CardBody></Card>
              )}
              <Card><CardBody className="flex items-center gap-3 py-3">
                <Users className="w-4 h-4 text-slate-400 shrink-0" />
                <div><p className="text-xs text-slate-500">Équipe</p><p className="text-sm font-medium text-slate-200">{members?.length ?? 0} membre(s)</p></div>
              </CardBody></Card>
            </div>

            {/* Recommandation (PM seulement) */}
            {isPM && project.methodology_recommended && (
              <Card className="border-indigo-800/50 bg-indigo-950/20">
                <CardBody>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full shrink-0" />
                    <p className="text-sm text-slate-300">
                      <span className="font-medium text-indigo-300">Recommandation PM Studio :</span>{" "}
                      {getMethodologyLabel(project.methodology_recommended)} —{" "}
                      {project.methodology_applied !== project.methodology_recommended ? (
                        <span className="text-amber-400">méthodologie appliquée différente ({getMethodologyLabel(project.methodology_applied)})</span>
                      ) : (
                        <span className="text-green-400">aligné avec la recommandation</span>
                      )}
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Modules — on attend que le rôle soit résolu */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">
                  {isClient ? "Vue projet" : isDev ? "Mes modules" : "Modules du projet"}
                </h2>
                {isClient && (
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-md">Vue client — lecture</span>
                )}
              </div>
              <ProjectNav id={project.id} role={myRole ?? null} />
            </div>
          </>
        )}
      </div>

      {showEdit && project && <EditProjectModal project={project} onClose={() => setShowEdit(false)} />}

      {confirmDel && project && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/50 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-900/30 rounded-xl flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Supprimer le projet ?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Le projet <span className="font-medium text-white">« {project.name} »</span> et toutes ses données seront supprimés définitivement.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors">
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.schema("hybridpm").from("projects").delete().eq("id", project.id);
                    if (error) throw error;
                    qcProject.invalidateQueries({ queryKey: ["projects"] });
                    toast.success("Projet supprimé.");
                    router.replace("/projects/");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression");
                    setConfirmDel(false);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white transition-colors font-medium">
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
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
