"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import {
  X, CheckSquare, CalendarDays, Flag, AlertTriangle, Euro,
  BarChart2, Layers, Users, Zap, ClipboardList, FileText,
  LayoutDashboard, Briefcase, BookOpen, TrendingUp, Activity,
  GitBranch, Star,
} from "lucide-react";

type Role = "pm" | "pmo" | "dev" | "client" | null;

interface Section {
  group: string;
  items: { icon: React.ElementType; title: string; desc: string }[];
}

const GUIDE_DEV: Section[] = [
  {
    group: "Mon espace",
    items: [
      {
        icon: CheckSquare,
        title: "Mes tâches",
        desc: "Retrouvez toutes vos tâches assignées. Faites glisser le curseur d'avancement (0 → 100 % par pas de 5 %) pour mettre à jour votre progression. Le PM est notifié automatiquement.",
      },
      {
        icon: Flag,
        title: "Jalons rattachés",
        desc: "Chaque tâche peut être liée à un ou plusieurs jalons de livraison. Consultez les dates cibles et les statuts directement depuis la vue Jalons du projet.",
      },
    ],
  },
  {
    group: "Vue projet",
    items: [
      {
        icon: LayoutDashboard,
        title: "Cockpit projet",
        desc: "Accédez à l'accueil du projet pour voir les KPI en temps réel : avancement global, budget, santé (vert / orange / rouge) et les alertes actives.",
      },
      {
        icon: Layers,
        title: "Tâches & Classification",
        desc: "Liste complète des tâches du projet. Filtrez par statut, complexité ou assigné. Cliquez sur une tâche pour modifier son avancement ou ses dates.",
      },
    ],
  },
];

const GUIDE_CLIENT: Section[] = [
  {
    group: "Suivi du projet",
    items: [
      {
        icon: LayoutDashboard,
        title: "Tableau de bord",
        desc: "Vue synthétique de la santé du projet : indicateur RAG (vert / orange / rouge), avancement en %, budget consommé vs alloué et alertes en cours.",
      },
      {
        icon: Flag,
        title: "Jalons",
        desc: "Liste des jalons de livraison avec leur statut (À venir, Atteint, À risque, Manqué) et les dates prévisionnelles. Indicateur clé pour suivre les engagements contractuels.",
      },
    ],
  },
  {
    group: "Reporting",
    items: [
      {
        icon: BarChart2,
        title: "Reporting",
        desc: "Graphiques d'avancement, répartition des tâches par statut, évolution du budget et synthèse des risques. Données actualisées en temps réel.",
      },
      {
        icon: TrendingUp,
        title: "Coûts (lecture seule)",
        desc: "Visualisez le budget alloué, les coûts engagés et le reste à consommer. Aucune saisie possible depuis ce rôle.",
      },
    ],
  },
];

const GUIDE_PM: Section[] = [
  {
    group: "Pilotage",
    items: [
      {
        icon: LayoutDashboard,
        title: "Cockpit projet",
        desc: "Bandeau de santé avec KPI live (avancement, budget, risques ouverts). Alertes automatiques si jalons à risque ou tâches en retard.",
      },
      {
        icon: CheckSquare,
        title: "Tâches & Classification",
        desc: "Créez, assignez et classifiez vos tâches (N1–N4). Définissez les dates, la méthodologie et l'avancement. Les membres reçoivent une notification à l'assignation.",
      },
      {
        icon: CalendarDays,
        title: "Gantt & Dépendances",
        desc: "Visualisez le planning en diagramme de Gantt. Glissez les bords des barres pour ajuster les dates. Ajoutez des prédécesseurs pour créer des dépendances. Activez « Baseline » pour sauvegarder le planning de référence, « Chemin critique » pour identifier les tâches sans marge.",
      },
      {
        icon: Flag,
        title: "Jalons",
        desc: "Créez des jalons de livraison et rattachez-y des tâches. Mettez à jour leur statut (Atteint / À risque / Manqué) — les clients sont notifiés automatiquement.",
      },
    ],
  },
  {
    group: "Risques & Finances",
    items: [
      {
        icon: AlertTriangle,
        title: "Risques",
        desc: "Saisissez les risques avec probabilité (1–5) et impact (1–5). Criticité calculée automatiquement. Ajoutez un plan d'atténuation et suivez le statut (Ouvert / Mitigé / Clos).",
      },
      {
        icon: Euro,
        title: "Coûts",
        desc: "Enregistrez les coûts directs par catégorie (RH, Infra, Licence…). Le bloc « Coûts liés aux UO » est calculé automatiquement selon la saisie mensuelle UO.",
      },
      {
        icon: Activity,
        title: "Suivi des UO",
        desc: "Saisissez les unités d'œuvre consommées mois par mois. Le budget forfaitaire est calculé à partir du coût unitaire défini dans les paramètres du projet.",
      },
    ],
  },
  {
    group: "Méthodologie & Qualité",
    items: [
      {
        icon: Zap,
        title: "Module MEP",
        desc: "Planifiez la mise en production : chronogramme Go/NoGo, PSS/PSC, bilan de déploiement, opérations HNO. Chaque étape est horodatée.",
      },
      {
        icon: ClipboardList,
        title: "Comitologie",
        desc: "Gérez vos instances de gouvernance (COPIL, ComEV, CAB, RCC/RCI) avec ODJ et compte-rendu. Chaque réunion est archivée avec ses décisions.",
      },
      {
        icon: FileText,
        title: "Rapport Flash",
        desc: "Check-list de validation avant livraison : RSSI, DA, Tests, Industrialisation. Cochez les items validés et suivez le taux de complétion.",
      },
      {
        icon: Star,
        title: "Matrice de compétences",
        desc: "Évaluez les membres de l'équipe sur 5 niveaux par compétence. Grille cliquable, mise à jour en temps réel.",
      },
    ],
  },
  {
    group: "Capacité & Portefeuille",
    items: [
      {
        icon: Users,
        title: "Capacité & Charge",
        desc: "Heatmap 10 semaines × membres actifs. La couleur indique la charge (vert = légère, rouge = surchargée). Cliquez sur une cellule pour voir le détail des tâches.",
      },
      {
        icon: GitBranch,
        title: "Livrables",
        desc: "Suivez les livrables contractuels avec leur statut de validation (En attente / Validé / Rejeté) et la date de remise.",
      },
      {
        icon: Briefcase,
        title: "Portefeuille PMO",
        desc: "Vue cross-projets (PMO uniquement) : KPI consolidés, jauge forfait UO 350/an, jalons à risque, santé RAG par projet et budget global.",
      },
    ],
  },
];

function roleLabel(role: Role): string {
  if (role === "pm")  return "Chef de projet";
  if (role === "pmo") return "PMO";
  if (role === "dev") return "Développeur / Contributeur";
  return "Client";
}

function sections(role: Role): Section[] {
  if (role === "pm" || role === "pmo") return GUIDE_PM;
  if (role === "dev")                  return GUIDE_DEV;
  return GUIDE_CLIENT;
}

export default function GuideModal({ role, onClose }: { role: Role; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown",   onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown",   onKey);
    };
  }, [onClose]);

  const guide = sections(role);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
      <div ref={ref} className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Guide d&apos;utilisation</p>
              <p className="text-xs text-slate-500">Profil : {roleLabel(role)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {guide.map(section => (
            <div key={section.group}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                {section.group}
              </p>
              <div className="space-y-2">
                {section.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-3 bg-slate-800/50 rounded-lg px-3.5 py-3">
                      <div className="shrink-0 w-7 h-7 bg-slate-700/60 rounded-md flex items-center justify-center mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200 mb-0.5">{item.title}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 shrink-0">
          <p className="text-xs text-slate-600 text-center">
            PM Studio · by Consort France — ce guide s&apos;adapte à votre rôle
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
