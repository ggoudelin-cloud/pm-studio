import type { Project, Task, Sprint, ProjectPhase, Milestone, ProjectRisk, UoLog, ProjectCost } from "@/types";
import { computeProjectKpis, isTaskLate } from "./project-kpis";

interface ExportData {
  project: Project;
  tasks: Task[];
  sprints: Sprint[];
  phases: ProjectPhase[];
  milestones: Milestone[];
  risks?: ProjectRisk[];
  uoLogs?: UoLog[];
  costs?: ProjectCost[];
  memberCount: number;
}

// Synthèse chiffrée du projet, partagée par les slides exécutives.
// Délègue à la couche KPI unique (lib/project-kpis) puis adapte les noms de
// champs attendus par les slides et associe une couleur de la palette à la santé.
function computeKpis(data: ExportData) {
  const k = computeProjectKpis({
    project:    data.project,
    tasks:      data.tasks,
    milestones: data.milestones,
    risks:      data.risks,
    uoLogs:     data.uoLogs,
    costs:      data.costs,
  });
  const healthColor = k.health.level === "red" ? C.red : k.health.level === "amber" ? C.amber : C.green;
  return {
    active:       data.tasks.filter(t => t.status !== "cancelled"),
    doneCount:    k.taskDone,
    lateCount:    k.taskLate,
    globalPct:    k.progressPct,
    unitCost:     k.unitCost,
    uoAllocated:  k.uoAllocated,
    budgetUO:     k.budgetUO,
    consumedUO:   k.consumedUO,
    plannedUO:    k.plannedUO,
    costConsumed: k.consumed,
    budgetRef:    k.budgetRef,
    pctBudget:    k.pctBudget,
    remaining:    k.remaining,
    msAchieved:   k.msAchieved,
    msMissed:     k.msMissed,
    risksOpen:    k.risksOpen,
    health:       { label: k.health.label, color: healthColor },
  };
}

// Palette inspirée du template Babel (fond sombre + jaune)
const C = {
  dark:    "191E29",   // fond principal
  dark2:   "242B3A",   // fond cartes
  dark3:   "1A2032",   // fond lignes alternées
  yellow:  "F9E859",   // accent primaire
  amber:   "FBAE40",   // accent secondaire
  white:   "FFFFFF",
  muted:   "B7B2C3",   // texte secondaire
  border:  "2E3A50",   // bordures subtiles
  green:   "4ADE80",
  red:     "F87171",
  blue:    "60A5FA",
};

function methodologyLabel(m: string | null | undefined) {
  if (m === "cycle_v") return "Cycle en V";
  if (m === "agile")   return "Agile";
  if (m === "hybrid")  return "Hybride";
  return "Non défini";
}

function statusLabel(s: string | null | undefined) {
  const map: Record<string, string> = {
    draft: "Brouillon", active: "Actif", paused: "En pause", closed: "Clôturé",
  };
  return map[s ?? ""] ?? s ?? "—";
}

function taskStatusLabel(s: string | null | undefined) {
  const map: Record<string, string> = {
    todo: "À faire", in_progress: "En cours", review: "En révision",
    blocked: "Bloqué", done: "Terminé", cancelled: "Annulé",
  };
  return map[s ?? ""] ?? s ?? "—";
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtEuro(n: number | null | undefined) {
  if (!n) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export async function exportProjectToPptx(data: ExportData) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();

  pptx.layout    = "LAYOUT_WIDE";
  pptx.author    = "PM Studio — Consort France";
  pptx.company   = "Consort France";
  pptx.subject   = `Rapport ${data.project.name}`;
  pptx.title     = data.project.name;

  const W = 13.33;
  const H = 7.5;

  // ── Slide 1 : Couverture ───────────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: C.dark };

  // Bande jaune verticale gauche
  cover.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.5, h: H,
    fill: { color: C.yellow }, line: { color: C.yellow },
  });

  // Ligne décorative horizontale jaune
  cover.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 4.5, w: W - 0.5, h: 0.04,
    fill: { color: C.yellow }, line: { color: C.yellow },
  });

  // Label PM Studio
  cover.addText("PM Studio", {
    x: 0.9, y: 0.6, w: 10, h: 0.45,
    fontSize: 13, color: C.yellow, bold: false, fontFace: "Century Gothic",
  });

  // Titre du projet
  cover.addText(data.project.name, {
    x: 0.9, y: 1.2, w: 11.5, h: 2.2,
    fontSize: 38, color: C.white, bold: true, fontFace: "Century Gothic",
    wrap: true,
  });

  // Méthodologie
  cover.addText([
    { text: "Méthodologie : ", options: { color: C.muted, bold: false } },
    { text: methodologyLabel(data.project.methodology_applied), options: { color: C.yellow, bold: true } },
  ], { x: 0.9, y: 3.6, w: 8, h: 0.4, fontSize: 14, fontFace: "Century Gothic" });

  // Statut
  cover.addText([
    { text: "Statut : ", options: { color: C.muted } },
    { text: statusLabel(data.project.status), options: { color: C.white, bold: true } },
  ], { x: 0.9, y: 4.1, w: 8, h: 0.4, fontSize: 14, fontFace: "Century Gothic" });

  if (data.project.description) {
    cover.addText(data.project.description, {
      x: 0.9, y: 4.75, w: 11, h: 0.7,
      fontSize: 11, color: C.muted, italic: true, fontFace: "Century Gothic",
    });
  }

  // Date + confidentialité
  cover.addText(
    `Rapport généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`,
    { x: 0.9, y: 6.4, w: 9, h: 0.35, fontSize: 10, color: C.muted, fontFace: "Century Gothic" }
  );
  cover.addText("Document confidentiel — Consort France", {
    x: 0.9, y: 6.8, w: 9, h: 0.3, fontSize: 9, color: C.muted, italic: true, fontFace: "Century Gothic",
  });

  // ── Slide 2 : Synthèse exécutive ───────────────────────────────────────────
  const k = computeKpis(data);
  const exec = pptx.addSlide();
  exec.background = { color: C.dark };
  _addHeader(pptx, exec, "Synthèse exécutive", data.project.name);

  // Bandeau santé du projet
  exec.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.3, w: 12.5, h: 0.75, fill: { color: C.dark2 }, line: { color: C.border } });
  exec.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.3, w: 0.12, h: 0.75, fill: { color: k.health.color }, line: { color: k.health.color } });
  exec.addText([
    { text: "État du projet : ", options: { color: C.muted, bold: false } },
    { text: k.health.label, options: { color: k.health.color, bold: true } },
  ], { x: 0.7, y: 1.3, w: 8, h: 0.75, fontSize: 18, fontFace: "Century Gothic", valign: "middle" });
  exec.addText(`Statut : ${statusLabel(data.project.status)}  ·  Méthodologie : ${methodologyLabel(data.project.methodology_applied)}`, {
    x: 8.5, y: 1.3, w: 4.3, h: 0.75, fontSize: 11, color: C.muted, align: "right", valign: "middle", fontFace: "Century Gothic",
  });

  // 4 KPI exécutifs
  const execKpis = [
    { label: "Avancement global", value: `${k.globalPct}%`, sub: `${k.doneCount}/${k.active.length} tâches terminées`, color: k.globalPct >= 80 ? C.green : k.globalPct >= 40 ? C.yellow : C.amber },
    { label: "Budget consommé",   value: k.budgetRef > 0 ? `${k.pctBudget}%` : "—", sub: k.budgetRef > 0 ? `${fmtEuro(k.costConsumed)} / ${fmtEuro(k.budgetRef)}` : "Budget non défini", color: k.pctBudget > 100 ? C.red : k.pctBudget > 85 ? C.amber : C.green },
    { label: "Tâches en retard",  value: String(k.lateCount), sub: k.lateCount > 0 ? "Action requise" : "Aucune", color: k.lateCount > 0 ? C.red : C.green },
    { label: "Jalons atteints",   value: `${k.msAchieved}/${data.milestones.length}`, sub: k.msMissed > 0 ? `${k.msMissed} manqué(s)` : "Aucun manqué", color: k.msMissed > 0 ? C.red : C.green },
  ];
  execKpis.forEach((kp, i) => {
    const x = 0.4 + i * 3.18;
    exec.addShape(pptx.ShapeType.rect, { x, y: 2.3, w: 3, h: 1.5, fill: { color: C.dark2 }, line: { color: C.border } });
    exec.addShape(pptx.ShapeType.rect, { x, y: 2.3, w: 0.08, h: 1.5, fill: { color: kp.color }, line: { color: kp.color } });
    exec.addText(kp.label, { x: x + 0.2, y: 2.42, w: 2.7, h: 0.3, fontSize: 10, color: C.muted, fontFace: "Century Gothic" });
    exec.addText(kp.value, { x: x + 0.2, y: 2.72, w: 2.7, h: 0.62, fontSize: 30, color: kp.color, bold: true, fontFace: "Century Gothic" });
    exec.addText(kp.sub,   { x: x + 0.2, y: 3.42, w: 2.7, h: 0.3, fontSize: 9, color: C.muted, italic: true, fontFace: "Century Gothic" });
  });

  // Barres de progression : avancement & budget
  const bars = [
    { label: "Avancement des tâches", pct: k.globalPct, color: k.globalPct >= 80 ? C.green : C.yellow, y: 4.2 },
    { label: "Consommation budget",   pct: k.budgetRef > 0 ? Math.min(100, k.pctBudget) : 0, color: k.pctBudget > 100 ? C.red : k.pctBudget > 85 ? C.amber : C.green, y: 5.1 },
  ];
  bars.forEach(b => {
    exec.addText(`${b.label} — ${b.pct}%`, { x: 0.4, y: b.y, w: 12.5, h: 0.32, fontSize: 12, color: C.white, bold: true, fontFace: "Century Gothic" });
    exec.addShape(pptx.ShapeType.rect, { x: 0.4, y: b.y + 0.38, w: 12.5, h: 0.24, fill: { color: C.dark2 }, line: { color: C.border } });
    if (b.pct > 0) {
      exec.addShape(pptx.ShapeType.rect, { x: 0.4, y: b.y + 0.38, w: 12.5 * (b.pct / 100), h: 0.24, fill: { color: b.color }, line: { color: b.color } });
    }
  });

  // Ligne d'indicateurs secondaires
  exec.addText([
    { text: "Risques ouverts : ",  options: { color: C.muted } }, { text: `${k.risksOpen}    `, options: { color: k.risksOpen > 0 ? C.amber : C.white, bold: true } },
    { text: "Sprints : ",          options: { color: C.muted } }, { text: `${data.sprints.length}    `, options: { color: C.white, bold: true } },
    { text: "Phases : ",           options: { color: C.muted } }, { text: `${data.phases.length}    `, options: { color: C.white, bold: true } },
    { text: "Équipe : ",           options: { color: C.muted } }, { text: `${data.memberCount} membre(s)`, options: { color: C.white, bold: true } },
  ], { x: 0.4, y: 6.4, w: 12.5, h: 0.4, fontSize: 12, fontFace: "Century Gothic" });

  // ── Slide 3 : Vue d'ensemble ───────────────────────────────────────────────
  const overview = pptx.addSlide();
  overview.background = { color: C.dark };
  _addHeader(pptx, overview, "Vue d'ensemble", data.project.name);

  const kpis = [
    { label: "Tâches",    value: String(data.tasks.length),      color: C.yellow },
    { label: "Sprints",   value: String(data.sprints.length),    color: C.amber  },
    { label: "Phases",    value: String(data.phases.length),     color: C.blue   },
    { label: "Jalons",    value: String(data.milestones.length), color: C.green  },
    { label: "Membres",   value: String(data.memberCount),       color: C.yellow },
    { label: "Budget",    value: fmtEuro(data.project.budget),   color: C.amber  },
  ];

  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.3;
    const y = 1.4 + row * 1.55;
    // Carte sombre
    overview.addShape(pptx.ShapeType.rect, {
      x, y, w: 4, h: 1.3,
      fill: { color: C.dark2 }, line: { color: C.border, pt: 1 },
    });
    // Barre jaune gauche
    overview.addShape(pptx.ShapeType.rect, {
      x, y, w: 0.08, h: 1.3,
      fill: { color: k.color }, line: { color: k.color },
    });
    overview.addText(k.value, {
      x: x + 0.25, y: y + 0.15, w: 3.6, h: 0.65,
      fontSize: 30, color: k.color, bold: true, fontFace: "Century Gothic",
    });
    overview.addText(k.label, {
      x: x + 0.25, y: y + 0.82, w: 3.6, h: 0.32,
      fontSize: 11, color: C.muted, fontFace: "Century Gothic",
    });
  });

  // Infos dates
  const infoRows: [string, string][] = [
    ["Début",            fmtDate(data.project.start_date)],
    ["Fin prévue",       fmtDate(data.project.end_date)],
    ["Reco. PM Studio",  methodologyLabel(data.project.methodology_recommended)],
    ["Appliquée",        methodologyLabel(data.project.methodology_applied)],
  ];
  overview.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 4.65, w: 12.5, h: 1.8,
    fill: { color: C.dark2 }, line: { color: C.border, pt: 1 },
  });
  // Ligne jaune haut de la carte infos
  overview.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 4.65, w: 12.5, h: 0.05,
    fill: { color: C.yellow }, line: { color: C.yellow },
  });
  infoRows.forEach(([lbl, val], i) => {
    const x = 0.7 + i * 3.1;
    overview.addText(lbl, {
      x, y: 4.85, w: 2.8, h: 0.3,
      fontSize: 9, color: C.muted, fontFace: "Century Gothic",
    });
    overview.addText(val, {
      x, y: 5.18, w: 2.8, h: 0.38,
      fontSize: 13, color: C.white, bold: true, fontFace: "Century Gothic",
    });
  });

  // ── Slide 3 : Avancement des tâches (vision exécutive) ─────────────────────
  if (data.tasks.length > 0) {
    const progSlide = pptx.addSlide();
    progSlide.background = { color: C.dark };
    _addHeader(pptx, progSlide, "Avancement des tâches", data.project.name);

    const active     = data.tasks.filter(t => t.status !== "cancelled");
    const doneCount  = data.tasks.filter(t => t.status === "done").length;
    const inProgress = data.tasks.filter(t => t.status !== "done" && t.status !== "cancelled" && (t.progress_pct ?? 0) > 0).length;
    const lateCount  = data.tasks.filter(isTaskLate).length;
    const globalPct  = active.length
      ? Math.round(active.reduce((a, t) => a + (t.status === "done" ? 100 : (t.progress_pct ?? 0)), 0) / active.length)
      : 0;

    // KPIs avancement
    const progKpis = [
      { label: "Avancement global", value: `${globalPct}%`,            color: globalPct >= 80 ? C.green : globalPct >= 40 ? C.yellow : C.amber },
      { label: "Terminées",         value: `${doneCount}/${active.length}`, color: C.green },
      { label: "En cours",          value: String(inProgress),         color: C.blue  },
      { label: "En retard",         value: String(lateCount),          color: lateCount > 0 ? C.red : C.muted },
    ];
    progKpis.forEach((k, i) => {
      const x = 0.4 + i * 3.18;
      progSlide.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 3, h: 1.15, fill: { color: C.dark2 }, line: { color: C.border } });
      progSlide.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 0.08, h: 1.15, fill: { color: k.color }, line: { color: k.color } });
      progSlide.addText(k.value, { x: x + 0.2, y: 1.42, w: 2.7, h: 0.6, fontSize: 26, color: k.color, bold: true, fontFace: "Century Gothic" });
      progSlide.addText(k.label, { x: x + 0.2, y: 2.02, w: 2.7, h: 0.32, fontSize: 11, color: C.muted, fontFace: "Century Gothic" });
    });

    // Barre de progression globale
    progSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 2.75, w: 12.5, h: 0.22, fill: { color: C.dark2 }, line: { color: C.border } });
    if (globalPct > 0) {
      progSlide.addShape(pptx.ShapeType.rect, {
        x: 0.4, y: 2.75, w: 12.5 * (globalPct / 100), h: 0.22,
        fill: { color: globalPct >= 80 ? C.green : C.yellow }, line: { color: C.border },
      });
    }

    // Tableau par tâche : retards d'abord, puis avancement décroissant
    const sorted = [...data.tasks].sort((a, b) => {
      const la = isTaskLate(a) ? 1 : 0, lb = isTaskLate(b) ? 1 : 0;
      if (la !== lb) return lb - la;
      return (b.progress_pct ?? 0) - (a.progress_pct ?? 0);
    });

    progSlide.addTable(
      [
        [
          { text: "Tâche",      options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Statut",     options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Échéance",   options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Avancement", options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Suivi",      options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
        ],
        ...sorted.slice(0, 12).map((t, ri) => {
          const bg   = ri % 2 === 0 ? C.dark2 : C.dark3;
          const late = isTaskLate(t);
          const pct  = t.status === "done" ? 100 : (t.progress_pct ?? 0);
          const pctColor = pct >= 100 ? C.green : late ? C.red : pct > 0 ? C.yellow : C.muted;
          return [
            { text: t.title.slice(0, 46) + (t.title.length > 46 ? "…" : ""), options: { color: C.white, bold: true, fill: { color: bg } } },
            { text: taskStatusLabel(t.status), options: { color: C.muted, fill: { color: bg } } },
            { text: fmtDate(t.due_date),       options: { color: C.muted, fill: { color: bg } } },
            { text: `${pct}%`,                 options: { color: pctColor, bold: true, fill: { color: bg } } },
            { text: late ? "⚠ En retard" : pct >= 100 ? "✓ Terminé" : "Dans les temps",
              options: { color: late ? C.red : pct >= 100 ? C.green : C.muted, bold: late, fill: { color: bg } } },
          ];
        }),
      ],
      {
        x: 0.4, y: 3.25, w: 12.5, h: 3.7,
        fontSize: 10, rowH: 0.34,
        fontFace: "Century Gothic",
        colW: [5.7, 1.9, 1.9, 1.5, 1.5],
        border: { type: "solid", color: C.border, pt: 0.5 },
      }
    );

    if (data.tasks.length > 12) {
      progSlide.addText(`+ ${data.tasks.length - 12} autre(s) tâche(s) non affichée(s)`, {
        x: 0.4, y: 7.0, w: 12.5, h: 0.3, fontSize: 9, color: C.muted, italic: true, align: "right", fontFace: "Century Gothic",
      });
    }
  }

  // ── Slide : Budget & Coûts (UO) ────────────────────────────────────────────
  if (k.budgetRef > 0 || (data.uoLogs?.length ?? 0) > 0) {
    const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const curYear = new Date().getFullYear();

    const budgetSlide = pptx.addSlide();
    budgetSlide.background = { color: C.dark };
    _addHeader(pptx, budgetSlide, "Budget & Coûts — Suivi UO", data.project.name);

    // KPI financiers
    const finKpis = [
      { label: "Budget alloué",     value: fmtEuro(k.budgetRef),     sub: k.uoAllocated > 0 ? `${k.uoAllocated} UO × ${fmtEuro(k.unitCost)}/UO` : "—", color: C.yellow },
      { label: "Consommé à date",   value: fmtEuro(k.costConsumed),  sub: `${k.consumedUO.toFixed(1)} UO`, color: k.pctBudget > 100 ? C.red : C.amber },
      { label: "Reste disponible",  value: fmtEuro(k.remaining),     sub: k.remaining < 0 ? "Dépassement" : "Disponible", color: k.remaining < 0 ? C.red : C.green },
      { label: "% budget consommé", value: k.budgetRef > 0 ? `${k.pctBudget}%` : "—", sub: `Planifié : ${k.plannedUO.toFixed(1)} UO`, color: k.pctBudget > 100 ? C.red : k.pctBudget > 85 ? C.amber : C.green },
    ];
    finKpis.forEach((kp, i) => {
      const x = 0.4 + i * 3.18;
      budgetSlide.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 3, h: 1.45, fill: { color: C.dark2 }, line: { color: C.border } });
      budgetSlide.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 0.08, h: 1.45, fill: { color: kp.color }, line: { color: kp.color } });
      budgetSlide.addText(kp.label, { x: x + 0.2, y: 1.42, w: 2.7, h: 0.3, fontSize: 10, color: C.muted, fontFace: "Century Gothic" });
      budgetSlide.addText(kp.value, { x: x + 0.2, y: 1.72, w: 2.7, h: 0.55, fontSize: 22, color: kp.color, bold: true, fontFace: "Century Gothic" });
      budgetSlide.addText(kp.sub,   { x: x + 0.2, y: 2.34, w: 2.7, h: 0.3, fontSize: 9, color: C.muted, italic: true, fontFace: "Century Gothic" });
    });

    // Barre de consommation budget
    const pctBar = k.budgetRef > 0 ? Math.min(100, k.pctBudget) : 0;
    budgetSlide.addText(`Consommation du budget : ${k.pctBudget}%`, { x: 0.4, y: 2.95, w: 12.5, h: 0.32, fontSize: 12, color: C.white, bold: true, fontFace: "Century Gothic" });
    budgetSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 3.32, w: 12.5, h: 0.24, fill: { color: C.dark2 }, line: { color: C.border } });
    if (pctBar > 0) {
      budgetSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 3.32, w: 12.5 * (pctBar / 100), h: 0.24, fill: { color: k.pctBudget > 100 ? C.red : k.pctBudget > 85 ? C.amber : C.green }, line: { color: C.border } });
    }
    if (k.pctBudget > 100) {
      budgetSlide.addText("⚠ Dépassement budgétaire — arbitrage requis", { x: 0.4, y: 3.6, w: 12.5, h: 0.3, fontSize: 10, color: C.red, italic: true, fontFace: "Century Gothic" });
    }

    // Détail mensuel de l'année en cours
    const yearLogs = (data.uoLogs ?? []).filter(l => l.year === curYear).sort((a, b) => a.month - b.month);
    if (yearLogs.length > 0) {
      budgetSlide.addText(`Détail mensuel ${curYear}`, { x: 0.4, y: 4.0, w: 6, h: 0.3, fontSize: 12, color: C.yellow, bold: true, fontFace: "Century Gothic" });
      budgetSlide.addTable(
        [
          [
            { text: "Mois",          options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
            { text: "Planifié (UO)", options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
            { text: "Consommé (UO)", options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
            { text: "Écart",         options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
            { text: "Coût (€ HT)",   options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          ],
          ...yearLogs.map((l, ri) => {
            const bg = ri % 2 === 0 ? C.dark2 : C.dark3;
            const delta = l.uo_consumed - l.uo_planned;
            return [
              { text: MONTHS_FR[l.month - 1] ?? String(l.month), options: { color: C.white, bold: true, fill: { color: bg } } },
              { text: l.uo_planned.toFixed(1),  options: { color: C.muted, fill: { color: bg } } },
              { text: l.uo_consumed.toFixed(1), options: { color: C.white, fill: { color: bg } } },
              { text: delta === 0 ? "—" : (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)), options: { color: delta > 0 ? C.red : delta < 0 ? C.green : C.muted, fill: { color: bg } } },
              { text: fmtEuro(l.uo_consumed * k.unitCost), options: { color: C.amber, fill: { color: bg } } },
            ];
          }),
          [
            { text: `Total ${curYear}`, options: { bold: true, color: C.white, fill: { color: C.dark } } },
            { text: yearLogs.reduce((s, l) => s + l.uo_planned, 0).toFixed(1),  options: { bold: true, color: C.muted, fill: { color: C.dark } } },
            { text: yearLogs.reduce((s, l) => s + l.uo_consumed, 0).toFixed(1), options: { bold: true, color: C.white, fill: { color: C.dark } } },
            { text: "",                 options: { fill: { color: C.dark } } },
            { text: fmtEuro(yearLogs.reduce((s, l) => s + l.uo_consumed, 0) * k.unitCost), options: { bold: true, color: C.amber, fill: { color: C.dark } } },
          ],
        ],
        {
          x: 0.4, y: 4.35, w: 12.5, h: 2.5,
          fontSize: 10, rowH: 0.3,
          fontFace: "Century Gothic",
          colW: [3.3, 2.3, 2.3, 2.0, 2.6],
          border: { type: "solid", color: C.border, pt: 0.5 },
        }
      );
    } else {
      budgetSlide.addText("Aucune saisie de consommation UO pour l'année en cours.", {
        x: 0.4, y: 4.2, w: 12.5, h: 0.4, fontSize: 11, color: C.muted, italic: true, fontFace: "Century Gothic",
      });
    }
  }

  // ── Slide : Classification des tâches ──────────────────────────────────────
  if (data.tasks.length > 0) {
    const tasksSlide = pptx.addSlide();
    tasksSlide.background = { color: C.dark };
    _addHeader(pptx, tasksSlide, "Classification des tâches", data.project.name);

    const summary = [
      { label: "Cycle en V", count: data.tasks.filter(t => t.methodology_recommendation === "cycle_v").length, color: C.blue   },
      { label: "Agile",      count: data.tasks.filter(t => t.methodology_recommendation === "agile").length,   color: C.green  },
      { label: "Hybride",    count: data.tasks.filter(t => t.methodology_recommendation === "hybrid").length,  color: C.amber  },
    ];
    summary.forEach((s, i) => {
      const x = 0.4 + i * 4.3;
      tasksSlide.addShape(pptx.ShapeType.rect, {
        x, y: 1.3, w: 4, h: 0.95,
        fill: { color: C.dark2 }, line: { color: C.border },
      });
      tasksSlide.addShape(pptx.ShapeType.rect, {
        x, y: 1.3, w: 0.08, h: 0.95,
        fill: { color: s.color }, line: { color: s.color },
      });
      tasksSlide.addText(`${s.count}`, {
        x: x + 0.25, y: 1.35, w: 1, h: 0.6,
        fontSize: 26, color: s.color, bold: true, fontFace: "Century Gothic",
      });
      tasksSlide.addText(s.label, {
        x: x + 1.2, y: 1.5, w: 2.6, h: 0.4,
        fontSize: 13, color: C.white, fontFace: "Century Gothic",
      });
    });

    const rows = data.tasks.slice(0, 10).map(t => [
      t.title.slice(0, 42) + (t.title.length > 42 ? "…" : ""),
      methodologyLabel(t.methodology_recommendation),
      methodologyLabel(t.methodology),
      t.decision_score_v != null ? `V:${t.decision_score_v} / A:${t.decision_score_agile}` : "—",
    ]);

    tasksSlide.addTable(
      [
        [
          { text: "Tâche",           options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Recommandation",  options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Appliquée",       options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Scores",          options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
        ],
        ...rows.map((r, ri) => r.map(cell => ({
          text: cell,
          options: {
            color: C.white,
            fill: { color: ri % 2 === 0 ? C.dark2 : C.dark3 },
          },
        }))),
      ],
      {
        x: 0.4, y: 2.4, w: 12.5, h: 4.5,
        fontSize: 10, rowH: 0.38,
        fontFace: "Century Gothic",
        border: { type: "solid", color: C.border, pt: 0.5 },
      }
    );
  }

  // ── Slide 4 : Agile — Vélocité ─────────────────────────────────────────────
  if (data.sprints.length > 0) {
    const agileSlide = pptx.addSlide();
    agileSlide.background = { color: C.dark };
    _addHeader(pptx, agileSlide, "Agile — Vélocité des sprints", data.project.name);

    const sprintsToShow = data.sprints.slice(0, 8);
    const maxV = Math.max(...sprintsToShow.map(s => Math.max(s.velocity_planned, s.velocity_achieved)), 1);
    const barH  = 2.8;
    const barW  = 1.1;
    const startX = 0.8;
    const baseY  = 5.5;

    sprintsToShow.forEach((s, i) => {
      const x = startX + i * 1.55;
      const plannedH  = (s.velocity_planned / maxV)  * barH;
      const achievedH = (s.velocity_achieved / maxV) * barH;
      const ok = s.velocity_achieved >= s.velocity_planned;

      // Barre planifiée
      agileSlide.addShape(pptx.ShapeType.rect, {
        x,
        y: baseY - plannedH,
        w: barW * 0.45,
        h: plannedH,
        fill: { color: "2D4A7A" },
        line: { color: C.blue, pt: 0.5 },
      });
      // Barre réalisée
      agileSlide.addShape(pptx.ShapeType.rect, {
        x: x + barW * 0.48,
        y: baseY - achievedH,
        w: barW * 0.45,
        h: achievedH,
        fill: { color: ok ? "1A4A2E" : "4A1A1A" },
        line: { color: ok ? C.green : C.red, pt: 0.5 },
      });
      agileSlide.addText(s.name.slice(0, 8), {
        x: x - 0.1, y: baseY + 0.08, w: 1.3, h: 0.3,
        fontSize: 8, color: C.muted, align: "center", fontFace: "Century Gothic",
      });
    });

    agileSlide.addText([
      { text: "■ ", options: { color: C.blue } }, { text: "Planifié  ",                     options: { color: C.muted } },
      { text: "■ ", options: { color: C.green } }, { text: "Réalisé (objectif atteint)  ", options: { color: C.muted } },
      { text: "■ ", options: { color: C.red   } }, { text: "Réalisé (sous objectif)",      options: { color: C.muted } },
    ], { x: 0.4, y: 2.0, w: 12, h: 0.4, fontSize: 10, fontFace: "Century Gothic" });

    const totalPlanned  = data.sprints.reduce((a, s) => a + s.velocity_planned,  0);
    const totalAchieved = data.sprints.reduce((a, s) => a + s.velocity_achieved, 0);
    const ratio = totalPlanned > 0 ? Math.round((totalAchieved / totalPlanned) * 100) : 0;
    const perfColor = ratio >= 80 ? C.green : C.amber;

    // Carte performance
    agileSlide.addShape(pptx.ShapeType.rect, {
      x: 9.5, y: 2.5, w: 3.4, h: 2.8,
      fill: { color: C.dark2 }, line: { color: C.border },
    });
    agileSlide.addShape(pptx.ShapeType.rect, {
      x: 9.5, y: 2.5, w: 3.4, h: 0.05,
      fill: { color: C.yellow }, line: { color: C.yellow },
    });
    agileSlide.addText("Performance globale", {
      x: 9.6, y: 2.65, w: 3.2, h: 0.35,
      fontSize: 11, color: C.muted, bold: true, fontFace: "Century Gothic",
    });
    agileSlide.addText(`${ratio}%`, {
      x: 9.6, y: 3.1, w: 3.2, h: 0.85,
      fontSize: 44, color: perfColor, bold: true, align: "center", fontFace: "Century Gothic",
    });
    agileSlide.addText(`${totalAchieved} / ${totalPlanned} pts`, {
      x: 9.6, y: 4.0, w: 3.2, h: 0.35,
      fontSize: 11, color: C.muted, align: "center", fontFace: "Century Gothic",
    });
    agileSlide.addText("points réalisés / planifiés", {
      x: 9.6, y: 4.35, w: 3.2, h: 0.3,
      fontSize: 9, color: C.muted, align: "center", italic: true, fontFace: "Century Gothic",
    });
  }

  // ── Slide 5 : Cycle en V — Phases ─────────────────────────────────────────
  if (data.phases.length > 0) {
    const phasesSlide = pptx.addSlide();
    phasesSlide.background = { color: C.dark };
    _addHeader(pptx, phasesSlide, "Cycle en V — Avancement des phases", data.project.name);

    const completed = data.phases.filter(p => p.status === "completed").length;
    const progress  = Math.round((completed / data.phases.length) * 100);

    phasesSlide.addText(`Avancement global : ${completed}/${data.phases.length} phases (${progress}%)`, {
      x: 0.4, y: 1.3, w: 9, h: 0.4,
      fontSize: 13, color: C.white, bold: true, fontFace: "Century Gothic",
    });

    // Barre de progression
    phasesSlide.addShape(pptx.ShapeType.rect, {
      x: 0.4, y: 1.85, w: 12.5, h: 0.22,
      fill: { color: C.dark2 }, line: { color: C.border },
    });
    if (progress > 0) {
      phasesSlide.addShape(pptx.ShapeType.rect, {
        x: 0.4, y: 1.85, w: 12.5 * (progress / 100), h: 0.22,
        fill: { color: C.yellow }, line: { color: C.yellow },
      });
    }

    const statusMap: Record<string, { label: string; color: string }> = {
      pending:     { label: "En attente",  color: C.muted  },
      active:      { label: "En cours",    color: C.yellow },
      gate_review: { label: "Gate Review", color: C.amber  },
      completed:   { label: "Terminée",    color: C.green  },
      rejected:    { label: "Rejetée",     color: C.red    },
    };

    phasesSlide.addTable(
      [
        [
          { text: "#",           options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Phase",       options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Statut",      options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Démarré",     options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Terminé",     options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Gate Review", options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
        ],
        ...data.phases.map((p, ri) => {
          const sc = statusMap[p.status] ?? { label: p.status, color: C.muted };
          const bg = ri % 2 === 0 ? C.dark2 : C.dark3;
          return [
            { text: String(p.position), options: { color: C.muted,  fill: { color: bg } } },
            { text: p.name,             options: { color: C.white,  bold: true, fill: { color: bg } } },
            { text: sc.label,           options: { color: sc.color, bold: true, fill: { color: bg } } },
            { text: fmtDate(p.started_at),   options: { color: C.muted, fill: { color: bg } } },
            { text: fmtDate(p.completed_at), options: { color: C.muted, fill: { color: bg } } },
            { text: p.validation_required ? "Oui" : "Non",
              options: { color: p.validation_required ? C.amber : C.muted, fill: { color: bg } } },
          ];
        }),
      ],
      {
        x: 0.4, y: 2.25, w: 12.5, h: 4.7,
        fontSize: 10, rowH: 0.4,
        fontFace: "Century Gothic",
        border: { type: "solid", color: C.border, pt: 0.5 },
      }
    );
  }

  // ── Slide 6 : Jalons ──────────────────────────────────────────────────────
  if (data.milestones.length > 0) {
    const msSlide = pptx.addSlide();
    msSlide.background = { color: C.dark };
    _addHeader(pptx, msSlide, "Jalons", data.project.name);

    const achieved = data.milestones.filter(m => m.status === "achieved").length;
    const missed   = data.milestones.filter(m => m.status === "missed").length;
    const pending  = data.milestones.filter(m => m.status === "pending").length;

    [
      { label: "Atteints",    v: achieved, color: C.green  },
      { label: "Manqués",     v: missed,   color: C.red    },
      { label: "En attente",  v: pending,  color: C.muted  },
    ].forEach((k, i) => {
      const x = 0.4 + i * 4.3;
      msSlide.addShape(pptx.ShapeType.rect, {
        x, y: 1.3, w: 4, h: 0.95,
        fill: { color: C.dark2 }, line: { color: C.border },
      });
      msSlide.addShape(pptx.ShapeType.rect, {
        x, y: 1.3, w: 0.08, h: 0.95,
        fill: { color: k.color }, line: { color: k.color },
      });
      msSlide.addText(String(k.v), {
        x: x + 0.25, y: 1.35, w: 1, h: 0.6,
        fontSize: 28, color: k.color, bold: true, fontFace: "Century Gothic",
      });
      msSlide.addText(k.label, {
        x: x + 1.2, y: 1.5, w: 2.6, h: 0.4,
        fontSize: 13, color: C.white, fontFace: "Century Gothic",
      });
    });

    msSlide.addTable(
      [
        [
          { text: "Jalon",      options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Échéance",   options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Atteint le", options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
          { text: "Statut",     options: { bold: true, color: C.dark, fill: { color: C.yellow } } },
        ],
        ...data.milestones.map((m, ri) => {
          const sc = m.status === "achieved" ? C.green : m.status === "missed" ? C.red : C.muted;
          const sl = m.status === "achieved" ? "Atteint" : m.status === "missed" ? "Manqué" : "En attente";
          const bg = ri % 2 === 0 ? C.dark2 : C.dark3;
          return [
            { text: m.title,               options: { color: C.white, bold: true, fill: { color: bg } } },
            { text: fmtDate(m.due_date),    options: { color: C.muted, fill: { color: bg } } },
            { text: fmtDate(m.achieved_at), options: { color: C.muted, fill: { color: bg } } },
            { text: sl,                     options: { color: sc, bold: true, fill: { color: bg } } },
          ];
        }),
      ],
      {
        x: 0.4, y: 2.4, w: 12.5, h: 4.5,
        fontSize: 10, rowH: 0.4,
        fontFace: "Century Gothic",
        border: { type: "solid", color: C.border, pt: 0.5 },
      }
    );
  }

  // ── Slide finale ───────────────────────────────────────────────────────────
  const last = pptx.addSlide();
  last.background = { color: C.dark };

  // Bande jaune verticale gauche
  last.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.5, h: H,
    fill: { color: C.yellow }, line: { color: C.yellow },
  });

  // Ligne jaune centrale
  last.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 3.4, w: W - 0.5, h: 0.04,
    fill: { color: C.yellow }, line: { color: C.yellow },
  });

  last.addText("PM Studio", {
    x: 0.9, y: 2.3, w: 12, h: 0.55,
    fontSize: 14, color: C.yellow, align: "center", fontFace: "Century Gothic",
  });
  last.addText("Merci pour votre attention", {
    x: 0.9, y: 3.6, w: 12, h: 0.9,
    fontSize: 32, color: C.white, bold: true, align: "center", fontFace: "Century Gothic",
  });
  last.addText("by Consort France", {
    x: 0.9, y: 4.6, w: 12, h: 0.4,
    fontSize: 13, color: C.muted, align: "center", italic: true, fontFace: "Century Gothic",
  });

  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9\s]/g, "").trim()}_rapport_${new Date().toISOString().slice(0, 10)}.pptx`;
  await pptx.writeFile({ fileName });
}

function _addHeader(
  pptx: InstanceType<typeof import("pptxgenjs")["default"]>,
  slide: ReturnType<typeof pptx.addSlide>,
  title: string,
  subtitle: string
) {
  // Fond sombre de la bande header
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 1.1,
    fill: { color: C.dark2 }, line: { color: C.dark2 },
  });
  // Barre jaune en bas du header
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.1, w: 13.33, h: 0.05,
    fill: { color: C.yellow }, line: { color: C.yellow },
  });
  // Trait vertical jaune gauche
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 0.12, w: 0.06, h: 0.86,
    fill: { color: C.yellow }, line: { color: C.yellow },
  });
  slide.addText(title, {
    x: 0.62, y: 0.1, w: 10, h: 0.55,
    fontSize: 22, color: C.white, bold: true, fontFace: "Century Gothic",
  });
  slide.addText(subtitle, {
    x: 0.62, y: 0.65, w: 10, h: 0.33,
    fontSize: 11, color: C.yellow, fontFace: "Century Gothic",
  });
  slide.addText("PM Studio", {
    x: 10.5, y: 0.3, w: 2.5, h: 0.5,
    fontSize: 11, color: C.yellow, bold: true, align: "right", fontFace: "Century Gothic",
  });
}
