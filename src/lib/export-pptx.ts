import type { Project, Task, Sprint, ProjectPhase, Milestone } from "@/types";

interface ExportData {
  project: Project;
  tasks: Task[];
  sprints: Sprint[];
  phases: ProjectPhase[];
  milestones: Milestone[];
  memberCount: number;
}

const C = {
  navy:    "1E2D4E",
  indigo:  "4F46E5",
  white:   "FFFFFF",
  light:   "F8FAFC",
  grey:    "64748B",
  greyBg:  "F1F5F9",
  border:  "E2E8F0",
  green:   "16A34A",
  amber:   "D97706",
  red:     "DC2626",
  blue:    "2563EB",
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
  pptx.author    = "PM Studio — MG Softwares";
  pptx.company   = "MG Softwares";
  pptx.subject   = `Rapport ${data.project.name}`;
  pptx.title     = data.project.name;

  const W = 13.33;

  // ── Slide 1 : Couverture ───────────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: C.navy };

  cover.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.2, w: W, h: 2.3, fill: { color: C.indigo }, line: { color: C.indigo },
  });

  cover.addText("PM Studio", {
    x: 0.6, y: 0.4, w: 8, h: 0.5,
    fontSize: 13, color: "A5B4FC", bold: false,
  });
  cover.addText(data.project.name, {
    x: 0.6, y: 1.0, w: 11, h: 1.6,
    fontSize: 36, color: C.white, bold: true, breakLine: false,
  });
  cover.addText([
    { text: "Méthodologie : ", options: { color: "A5B4FC", bold: false } },
    { text: methodologyLabel(data.project.methodology_applied), options: { color: C.white, bold: true } },
  ], { x: 0.6, y: 2.7, w: 8, h: 0.4, fontSize: 14 });

  cover.addText([
    { text: "Statut : ", options: { color: "A5B4FC" } },
    { text: statusLabel(data.project.status), options: { color: C.white, bold: true } },
  ], { x: 0.6, y: 3.1, w: 8, h: 0.4, fontSize: 14 });

  if (data.project.description) {
    cover.addText(data.project.description, {
      x: 0.6, y: 3.6, w: 10, h: 0.8,
      fontSize: 12, color: "94A3B8", italic: true,
    });
  }

  cover.addText(`Rapport généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`, {
    x: 0.6, y: 5.5, w: 10, h: 0.4, fontSize: 11, color: C.white,
  });
  cover.addText("Document confidentiel — MG Softwares", {
    x: 0.6, y: 5.9, w: 10, h: 0.3, fontSize: 10, color: "C7D2FE", italic: true,
  });

  // ── Slide 2 : Vue d'ensemble ───────────────────────────────────────────────
  const overview = pptx.addSlide();
  overview.background = { color: C.light };
  _addHeader(pptx, overview, "Vue d'ensemble", data.project.name);

  const kpis = [
    { label: "Tâches",       value: String(data.tasks.length),    color: C.indigo },
    { label: "Sprints",      value: String(data.sprints.length),  color: C.blue   },
    { label: "Phases",       value: String(data.phases.length),   color: C.navy   },
    { label: "Jalons",       value: String(data.milestones.length), color: C.green },
    { label: "Membres",      value: String(data.memberCount),     color: C.amber  },
    { label: "Budget",       value: fmtEuro(data.project.budget), color: C.grey   },
  ];

  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 4.3;
    const y = 1.4 + row * 1.5;
    overview.addShape(pptx.ShapeType.rect, { x, y, w: 4, h: 1.2, fill: { color: C.white }, line: { color: C.border, pt: 1 }, rectRadius: 0.08 });
    overview.addShape(pptx.ShapeType.rect, { x, y, w: 0.12, h: 1.2, fill: { color: k.color }, line: { color: k.color } });
    overview.addText(k.value, { x: x + 0.25, y: y + 0.15, w: 3.6, h: 0.55, fontSize: 26, color: k.color, bold: true });
    overview.addText(k.label,  { x: x + 0.25, y: y + 0.72, w: 3.6, h: 0.35, fontSize: 11, color: C.grey });
  });

  // Dates & budget
  const infoRows: [string, string][] = [
    ["Début",       fmtDate(data.project.start_date)],
    ["Fin prévue",  fmtDate(data.project.end_date)],
    ["Reco. PM Studio", methodologyLabel(data.project.methodology_recommended)],
    ["Appliquée",   methodologyLabel(data.project.methodology_applied)],
  ];
  overview.addShape(pptx.ShapeType.rect, { x: 0.4, y: 4.55, w: 12.5, h: 1.85, fill: { color: C.white }, line: { color: C.border, pt: 1 }, rectRadius: 0.08 });
  infoRows.forEach(([lbl, val], i) => {
    const x = 0.7 + i * 3.1;
    overview.addText(lbl, { x, y: 4.75, w: 2.8, h: 0.3, fontSize: 9, color: C.grey });
    overview.addText(val, { x, y: 5.05, w: 2.8, h: 0.35, fontSize: 12, color: C.navy, bold: true });
  });

  // ── Slide 3 : Classification des tâches ───────────────────────────────────
  if (data.tasks.length > 0) {
    const tasksSlide = pptx.addSlide();
    tasksSlide.background = { color: C.light };
    _addHeader(pptx, tasksSlide, "Classification des tâches", data.project.name);

    const summary = [
      { label: "Cycle en V", count: data.tasks.filter(t => t.methodology_recommendation === "cycle_v").length, color: C.blue },
      { label: "Agile",      count: data.tasks.filter(t => t.methodology_recommendation === "agile").length,   color: C.green },
      { label: "Hybride",    count: data.tasks.filter(t => t.methodology_recommendation === "hybrid").length,  color: C.amber },
    ];
    summary.forEach((s, i) => {
      const x = 0.4 + i * 4.3;
      tasksSlide.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 4, h: 0.9, fill: { color: C.white }, line: { color: C.border }, rectRadius: 0.08 });
      tasksSlide.addText(`${s.count} ${s.label}`, { x: x + 0.15, y: 1.45, w: 3.7, h: 0.6, fontSize: 14, color: s.color, bold: true });
    });

    const rows = data.tasks.slice(0, 10).map(t => [
      t.title.slice(0, 40) + (t.title.length > 40 ? "…" : ""),
      methodologyLabel(t.methodology_recommendation),
      methodologyLabel(t.methodology),
      t.decision_score_v != null ? `V:${t.decision_score_v} / A:${t.decision_score_agile}` : "—",
    ]);

    tasksSlide.addTable(
      [
        [
          { text: "Tâche",           options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Recommandation",  options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Appliquée",       options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Scores",          options: { bold: true, color: C.white, fill: { color: C.navy } } },
        ],
        ...rows.map((r, ri) => r.map(cell => ({
          text: cell,
          options: { color: C.navy, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } },
        }))),
      ],
      { x: 0.4, y: 2.35, w: 12.5, h: 4.5, fontSize: 10, rowH: 0.35, border: { type: "solid", color: C.border, pt: 0.5 } }
    );
  }

  // ── Slide 4 : Agile — Vélocité ─────────────────────────────────────────────
  if (data.sprints.length > 0) {
    const agileSlide = pptx.addSlide();
    agileSlide.background = { color: C.light };
    _addHeader(pptx, agileSlide, "Agile — Vélocité des sprints", data.project.name);

    const sprintsToShow = data.sprints.slice(0, 8);
    const maxV = Math.max(...sprintsToShow.map(s => Math.max(s.velocity_planned, s.velocity_achieved)), 1);
    const barH = 2.8;
    const barW = 1.1;
    const startX = 0.8;
    const baseY = 5.5;

    sprintsToShow.forEach((s, i) => {
      const x = startX + i * 1.55;
      const plannedH = (s.velocity_planned / maxV) * barH;
      const achievedH = (s.velocity_achieved / maxV) * barH;

      agileSlide.addShape(pptx.ShapeType.rect, {
        x: x, y: baseY - plannedH, w: barW * 0.45, h: plannedH,
        fill: { color: "BFDBFE" }, line: { color: C.blue, pt: 0.5 },
      });
      agileSlide.addShape(pptx.ShapeType.rect, {
        x: x + barW * 0.48, y: baseY - achievedH, w: barW * 0.45, h: achievedH,
        fill: { color: s.velocity_achieved >= s.velocity_planned ? "86EFAC" : "FCA5A5" },
        line: { color: s.velocity_achieved >= s.velocity_planned ? C.green : C.red, pt: 0.5 },
      });
      agileSlide.addText(s.name.slice(0, 8), { x: x - 0.1, y: baseY + 0.08, w: 1.3, h: 0.3, fontSize: 8, color: C.grey, align: "center" });
    });

    agileSlide.addText([
      { text: "■ ", options: { color: "BFDBFE" } }, { text: "Planifié  ", options: { color: C.grey } },
      { text: "■ ", options: { color: "86EFAC" } }, { text: "Réalisé (objectif atteint)  ", options: { color: C.grey } },
      { text: "■ ", options: { color: "FCA5A5" } }, { text: "Réalisé (sous objectif)", options: { color: C.grey } },
    ], { x: 0.4, y: 2.0, w: 12, h: 0.4, fontSize: 10 });

    const totalPlanned  = data.sprints.reduce((a, s) => a + s.velocity_planned,  0);
    const totalAchieved = data.sprints.reduce((a, s) => a + s.velocity_achieved, 0);
    const ratio = totalPlanned > 0 ? Math.round((totalAchieved / totalPlanned) * 100) : 0;

    agileSlide.addShape(pptx.ShapeType.rect, { x: 9.5, y: 2.5, w: 3.4, h: 2.5, fill: { color: C.white }, line: { color: C.border }, rectRadius: 0.08 });
    agileSlide.addText("Performance globale", { x: 9.6, y: 2.65, w: 3.2, h: 0.35, fontSize: 11, color: C.grey, bold: true });
    agileSlide.addText(`${ratio}%`, { x: 9.6, y: 3.05, w: 3.2, h: 0.8, fontSize: 40, color: ratio >= 80 ? C.green : C.amber, bold: true, align: "center" });
    agileSlide.addText(`${totalAchieved} / ${totalPlanned} pts`, { x: 9.6, y: 3.85, w: 3.2, h: 0.35, fontSize: 11, color: C.grey, align: "center" });
    agileSlide.addText("points réalisés / planifiés", { x: 9.6, y: 4.2, w: 3.2, h: 0.3, fontSize: 9, color: C.grey, align: "center", italic: true });
  }

  // ── Slide 5 : Cycle en V — Phases ─────────────────────────────────────────
  if (data.phases.length > 0) {
    const phasesSlide = pptx.addSlide();
    phasesSlide.background = { color: C.light };
    _addHeader(pptx, phasesSlide, "Cycle en V — Avancement des phases", data.project.name);

    const completed = data.phases.filter(p => p.status === "completed").length;
    const progress  = Math.round((completed / data.phases.length) * 100);

    phasesSlide.addText(`Avancement global : ${completed}/${data.phases.length} phases (${progress}%)`, {
      x: 0.4, y: 1.3, w: 9, h: 0.4, fontSize: 13, color: C.navy, bold: true,
    });
    phasesSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.8, w: 12.5, h: 0.25, fill: { color: C.border }, line: { color: C.border }, rectRadius: 0.1 });
    phasesSlide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.8, w: 12.5 * (progress / 100), h: 0.25, fill: { color: C.indigo }, line: { color: C.indigo }, rectRadius: 0.1 });

    const statusMap: Record<string, { label: string; color: string }> = {
      pending:     { label: "En attente",  color: C.grey  },
      active:      { label: "En cours",    color: C.indigo },
      gate_review: { label: "Gate Review", color: C.amber },
      completed:   { label: "Terminée",    color: C.green },
      rejected:    { label: "Rejetée",     color: C.red   },
    };

    phasesSlide.addTable(
      [
        [
          { text: "#",           options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Phase",       options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Statut",      options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Démarré",     options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Terminé",     options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Gate Review", options: { bold: true, color: C.white, fill: { color: C.navy } } },
        ],
        ...data.phases.map((p, ri) => {
          const sc = statusMap[p.status] ?? { label: p.status, color: C.grey };
          return [
            { text: String(p.position), options: { color: C.grey, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
            { text: p.name,             options: { color: C.navy, bold: true, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
            { text: sc.label,           options: { color: sc.color, bold: true, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
            { text: fmtDate(p.started_at),   options: { color: C.grey, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
            { text: fmtDate(p.completed_at), options: { color: C.grey, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
            { text: p.validation_required ? "Oui" : "Non", options: { color: p.validation_required ? C.amber : C.grey, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
          ];
        }),
      ],
      { x: 0.4, y: 2.2, w: 12.5, h: 4.7, fontSize: 10, rowH: 0.4, border: { type: "solid", color: C.border, pt: 0.5 } }
    );
  }

  // ── Slide 6 : Jalons ──────────────────────────────────────────────────────
  if (data.milestones.length > 0) {
    const msSlide = pptx.addSlide();
    msSlide.background = { color: C.light };
    _addHeader(pptx, msSlide, "Jalons", data.project.name);

    const achieved = data.milestones.filter(m => m.status === "achieved").length;
    const missed   = data.milestones.filter(m => m.status === "missed").length;
    const pending  = data.milestones.filter(m => m.status === "pending").length;

    [
      { label: "Atteints", v: achieved, color: C.green },
      { label: "Manqués",  v: missed,   color: C.red   },
      { label: "En attente", v: pending, color: C.grey  },
    ].forEach((k, i) => {
      const x = 0.4 + i * 4.3;
      msSlide.addShape(pptx.ShapeType.rect, { x, y: 1.3, w: 4, h: 0.9, fill: { color: C.white }, line: { color: C.border }, rectRadius: 0.08 });
      msSlide.addText(String(k.v), { x: x + 0.15, y: 1.35, w: 1, h: 0.6, fontSize: 30, color: k.color, bold: true });
      msSlide.addText(k.label, { x: x + 1.1, y: 1.5, w: 2.7, h: 0.4, fontSize: 12, color: C.grey });
    });

    msSlide.addTable(
      [
        [
          { text: "Jalon",    options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Échéance", options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Atteint le", options: { bold: true, color: C.white, fill: { color: C.navy } } },
          { text: "Statut",   options: { bold: true, color: C.white, fill: { color: C.navy } } },
        ],
        ...data.milestones.map((m, ri) => {
          const sc = m.status === "achieved" ? C.green : m.status === "missed" ? C.red : C.grey;
          const sl = m.status === "achieved" ? "Atteint" : m.status === "missed" ? "Manqué" : "En attente";
          return [
            { text: m.title,              options: { color: C.navy, bold: true, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
            { text: fmtDate(m.due_date),   options: { color: C.grey, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
            { text: fmtDate(m.achieved_at), options: { color: C.grey, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
            { text: sl,                   options: { color: sc, bold: true, fill: { color: ri % 2 === 0 ? C.white : C.greyBg } } },
          ];
        }),
      ],
      { x: 0.4, y: 2.35, w: 12.5, h: 4.5, fontSize: 10, rowH: 0.4, border: { type: "solid", color: C.border, pt: 0.5 } }
    );
  }

  // ── Slide finale : Pied de page ────────────────────────────────────────────
  const last = pptx.addSlide();
  last.background = { color: C.navy };
  last.addShape(pptx.ShapeType.rect, { x: 0, y: 2.8, w: W, h: 2, fill: { color: C.indigo }, line: { color: C.indigo } });
  last.addText("PM Studio", { x: 0.6, y: 1.2, w: 12, h: 0.6, fontSize: 14, color: "A5B4FC", align: "center" });
  last.addText("Merci pour votre attention", { x: 0.6, y: 3.0, w: 12, h: 0.8, fontSize: 28, color: C.white, bold: true, align: "center" });
  last.addText("by MG Softwares", { x: 0.6, y: 3.9, w: 12, h: 0.4, fontSize: 12, color: "C7D2FE", align: "center", italic: true });

  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9\s]/g, "").trim()}_rapport_${new Date().toISOString().slice(0, 10)}.pptx`;
  await pptx.writeFile({ fileName });
}

function _addHeader(pptx: InstanceType<typeof import("pptxgenjs")["default"]>, slide: ReturnType<typeof pptx.addSlide>, title: string, subtitle: string) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.1, fill: { color: "1E2D4E" }, line: { color: "1E2D4E" } });
  slide.addText(title,    { x: 0.4, y: 0.12, w: 10, h: 0.5, fontSize: 20, color: "FFFFFF", bold: true });
  slide.addText(subtitle, { x: 0.4, y: 0.62, w: 10, h: 0.35, fontSize: 11, color: "A5B4FC" });
  slide.addText("PM Studio", { x: 10.5, y: 0.3, w: 2.5, h: 0.5, fontSize: 11, color: "4F46E5", bold: true, align: "right" });
}
