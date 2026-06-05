// ─────────────────────────────────────────────────────────────────────────────
// Définition des modules d'un projet, filtrés par rôle.
// Source unique consommée par la grille d'accueil projet ET la sidebar
// contextuelle, pour garantir une navigation cohérente.
// ─────────────────────────────────────────────────────────────────────────────
import type { LucideIcon } from "lucide-react";
import {
  BarChart2, Milestone, Package, AlertTriangle, CheckSquare, ListTodo,
  CalendarDays, KanbanSquare, GitBranch, Rocket, FileText, Building2,
  Star, Wrench, Euro, GitMerge, RefreshCw, Users,
} from "lucide-react";
import type { MemberRole } from "@/types";

export interface ProjectModule {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  group?: string;
}

// Ordre d'affichage des groupes (PM/PMO)
export const MODULE_GROUP_ORDER = [
  "Personnel", "Planification", "Méthodologie", "Livraison",
  "PMO", "Finances", "Reporting", "Qualité", "Équipe",
];

export function getProjectModules(id: string, role: MemberRole | null): ProjectModule[] {
  const isPM = role === "pm" || role === "pmo" || role === null;
  const isDev = role === "dev";
  const isClient = role === "client" || role === "observer";

  if (isClient) {
    return [
      { href: `/project/reporting/?id=${id}`,    label: "Reporting",   icon: BarChart2,     desc: "Avancement, budget, risques — vue exécutive" },
      { href: `/project/milestones/?id=${id}`,   label: "Jalons",      icon: Milestone,     desc: "Jalons clés et leur statut d'atteinte" },
      { href: `/project/deliverables/?id=${id}`, label: "Livrables",   icon: Package,       desc: "Livrables et statuts de validation" },
      { href: `/project/risks/?id=${id}`,        label: "Risques",     icon: AlertTriangle, desc: "Registre des risques du projet" },
    ];
  }

  if (isDev) {
    return [
      { href: `/project/my-tasks/?id=${id}`, label: "Mes tâches", icon: CheckSquare, desc: "Vos tâches assignées — mettez à jour votre avancement" },
    ];
  }

  // PM / PMO — accès complet
  return [
    { href: `/project/my-tasks/?id=${id}`,       label: "Mes tâches",              icon: CheckSquare,   desc: "Tâches assignées à vous — avancement rapide",          group: "Personnel" },
    { href: `/project/tasks/?id=${id}`,          label: "Tâches & Classification", icon: ListTodo,      desc: "Classifiez vos tâches et obtenez des recommandations", group: "Planification" },
    { href: `/project/gantt/?id=${id}`,          label: "Gantt & Dépendances",     icon: CalendarDays,  desc: "Planifiez tâches, jalons et liens prédécesseurs",       group: "Planification" },
    { href: `/project/milestones/?id=${id}`,     label: "Jalons",                  icon: Milestone,     desc: "Jalons clés et tâches rattachées",                      group: "Planification" },
    { href: `/project/agile/?id=${id}`,          label: "Agile — Kanban & Sprints",icon: KanbanSquare,  desc: "Backlog, sprints et tableau Kanban",                    group: "Méthodologie" },
    { href: `/project/cycle-v/?id=${id}`,        label: "Cycle en V — Phases",     icon: GitBranch,     desc: "Phases, jalons et gate reviews Cycle en V",             group: "Méthodologie" },
    { href: `/project/deliverables/?id=${id}`,   label: "Livrables",               icon: Package,       desc: "Gérez les livrables et leur statut de validation",      group: "Livraison" },
    { href: `/project/mep/?id=${id}`,            label: "MEP — Mises En Production",icon: Rocket,       desc: "Chronogrammes, Go/NoGo, PSS/PSC, bilans MEP",           group: "Livraison" },
    { href: `/project/flash-report/?id=${id}`,   label: "Rapport Flash",           icon: FileText,      desc: "Rapport hebdomadaire avec check-lists RSSI/DA/tests",   group: "PMO" },
    { href: `/project/committees/?id=${id}`,     label: "Comitologie",             icon: Building2,     desc: "COPIL, ComEV, CAB — ordres du jour et comptes rendus",  group: "PMO" },
    { href: `/project/skills/?id=${id}`,         label: "Matrice de compétences",  icon: Star,          desc: "Compétences des membres avec niveaux requis",           group: "PMO" },
    { href: `/project/uo/?id=${id}`,             label: "Suivi UO & Coûts UO",     icon: Wrench,        desc: "UO allouées, coût/UO, consommation mensuelle et budget",group: "Finances" },
    { href: `/project/costs/?id=${id}`,          label: "Gestion des coûts",       icon: Euro,          desc: "Ressources humaines, logiciels, infrastructure",        group: "Finances" },
    { href: `/project/risks/?id=${id}`,          label: "Registre des risques",    icon: AlertTriangle, desc: "Identifiez, pondérez et suivez les risques",            group: "Finances" },
    { href: `/project/reporting/?id=${id}`,      label: "Reporting",               icon: BarChart2,     desc: "Avancement, budget dépensé, charge ressources, risques",group: "Reporting" },
    { href: `/project/traceability/?id=${id}`,   label: "Traçabilité",             icon: GitMerge,      desc: "Liez exigences, tâches et cas de tests",                group: "Qualité" },
    { href: `/project/retrospectives/?id=${id}`, label: "Rétrospectives",          icon: RefreshCw,     desc: "Retours d'expérience de chaque sprint",                 group: "Qualité" },
    { href: `/project/team/?id=${id}`,           label: "Équipe",                  icon: Users,         desc: "Membres et rôles du projet",                            group: "Équipe" },
  ];
}
