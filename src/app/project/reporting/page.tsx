"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useProject, useTasks, useProjectCosts, useProjectMembers,
  useMilestones, useProjectRisks,
} from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  BarChart2, TrendingUp, DollarSign, Users, AlertTriangle,
  CheckCircle2, Clock, Milestone, ArrowUpRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadialBarChart, RadialBar,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function ProgressBar({ value, max, color = "bg-indigo-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Tooltip personnalisé pour les graphiques
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-slate-300 font-medium mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill ?? "#c7d2fe" }}>{p.name} : <span className="font-bold">{typeof p.value === "number" && p.name?.includes("€") ? fmt(p.value) : p.value}</span></p>
      ))}
    </div>
  );
}

// Couleurs cohérentes avec l'UI
const STATUS_CFG: Record<string, { label: string; color: string; fill: string }> = {
  done:        { label: "Terminé",     color: "text-green-400",  fill: "#22c55e" },
  in_progress: { label: "En cours",    color: "text-indigo-400", fill: "#6366f1" },
  review:      { label: "En révision", color: "text-amber-400",  fill: "#f59e0b" },
  blocked:     { label: "Bloqué",      color: "text-red-400",    fill: "#ef4444" },
  todo:        { label: "À faire",     color: "text-slate-400",  fill: "#64748b" },
  cancelled:   { label: "Annulé",      color: "text-slate-600",  fill: "#334155" },
};

const RISK_STATUS_CFG: Record<string, { label: string; fill: string }> = {
  open:      { label: "Ouvert",   fill: "#ef4444" },
  mitigated: { label: "Atténué",  fill: "#f59e0b" },
  closed:    { label: "Clôturé",  fill: "#22c55e" },
  occurred:  { label: "Survenu",  fill: "#64748b" },
};

const CAT_COLORS: Record<string, string> = {
  human:          "#6366f1",
  software:       "#22c55e",
  infrastructure: "#f59e0b",
  other:          "#64748b",
};
const CAT_LABELS: Record<string, string> = {
  human: "Ressources humaines", software: "Logiciels", infrastructure: "Infrastructure", other: "Autres",
};

// ── Page ─────────────────────────────────────────────────────────────────────
function ReportingContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { data: project }      = useProject(id);
  const { data: tasks      = [] } = useTasks(id);
  const { data: costs      = [] } = useProjectCosts(id);
  const { data: members    = [] } = useProjectMembers(id);
  const { data: milestones = [] } = useMilestones(id);
  const { data: risks      = [] } = useProjectRisks(id);

  // ── Calculs avancement ────────────────────────────────────────────────────
  const statusGroups = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return counts;
  }, [tasks]);

  const totalTasks   = tasks.length;
  const doneTasks    = statusGroups["done"] ?? 0;
  const progressPct  = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const blockedTasks = statusGroups["blocked"] ?? 0;

  // Données PieChart statut
  const statusPieData = useMemo(() =>
    Object.entries(statusGroups)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name:  STATUS_CFG[key]?.label ?? key,
        value,
        fill:  STATUS_CFG[key]?.fill  ?? "#64748b",
      })),
    [statusGroups]
  );

  // ── Calculs budget ────────────────────────────────────────────────────────
  const totalHT  = costs.reduce((s, c) => s + c.quantity * c.unit_cost_ht, 0);
  const totalTTC = costs.reduce((s, c) => s + c.quantity * c.unit_cost_ht * (1 + c.vat_rate / 100), 0);
  const budgetPct = project?.budget && project.budget > 0
    ? Math.min(100, Math.round((totalHT / project.budget) * 100)) : null;

  // Données BarChart coûts par catégorie
  const costsByCat = useMemo(() => {
    const agg: Record<string, number> = {};
    costs.forEach(c => { agg[c.category] = (agg[c.category] ?? 0) + c.quantity * c.unit_cost_ht; });
    return Object.entries(agg)
      .filter(([, v]) => v > 0)
      .map(([cat, total]) => ({ cat: CAT_LABELS[cat] ?? cat, total, fill: CAT_COLORS[cat] ?? "#64748b" }));
  }, [costs]);

  // Données PieChart budget consommé vs restant
  const budgetPieData = useMemo(() => project?.budget ? [
    { name: "Consommé", value: Math.round(totalHT),                        fill: budgetPct! > 90 ? "#ef4444" : budgetPct! > 70 ? "#f59e0b" : "#6366f1" },
    { name: "Restant",  value: Math.max(0, Math.round(project.budget - totalHT)), fill: "#1e293b" },
  ] : [], [totalHT, project, budgetPct]);

  // ── Calculs ressources ────────────────────────────────────────────────────
  const memberStats = useMemo(() => members.map(m => {
    const assigned    = tasks.filter(t => t.assignee_id === m.user_id);
    const doneCount   = assigned.filter(t => t.status === "done").length;
    const inProgress  = assigned.filter(t => t.status === "in_progress").length;
    const todo        = assigned.filter(t => t.status === "todo").length;
    const blocked     = assigned.filter(t => t.status === "blocked").length;
    const avgAlloc    = assigned.length > 0
      ? Math.round(assigned.reduce((s, t) => s + (t.allocation_pct ?? 100), 0) / assigned.length) : 0;
    return {
      name:       (m.profiles?.full_name ?? m.profiles?.email ?? "?").split(" ")[0],
      fullName:   m.profiles?.full_name ?? m.profiles?.email ?? "?",
      total:      assigned.length,
      done:       doneCount,
      inProgress, todo, blocked, avgAlloc,
    };
  }).filter(m => m.total > 0), [members, tasks]);

  // ── Calculs jalons ────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const upcomingMilestones = milestones
    .filter(m => m.status === "pending" && m.due_date)
    .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1))
    .slice(0, 5);
  const achievedMs = milestones.filter(m => m.status === "achieved").length;
  const missedMs   = milestones.filter(m => m.status === "missed" || (m.status === "pending" && m.due_date && m.due_date < today)).length;

  // ── Calculs risques ───────────────────────────────────────────────────────
  const openRisks     = risks.filter(r => r.status === "open");
  const criticalRisks = openRisks.filter(r => r.weight >= 15);

  const riskStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    risks.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return Object.entries(counts).map(([key, value]) => ({
      name:  RISK_STATUS_CFG[key]?.label ?? key,
      value,
      fill:  RISK_STATUS_CFG[key]?.fill  ?? "#64748b",
    }));
  }, [risks]);

  // Matrice risques (RadialBar) : top 5 risques ouverts par pondération
  const topRisks = useMemo(() =>
    [...openRisks]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map((r, i) => ({
        name:   r.title.length > 28 ? r.title.slice(0, 28) + "…" : r.title,
        weight: r.weight,
        fill:   ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16"][i] ?? "#64748b",
      })),
    [openRisks]
  );

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {/* En-tête */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-indigo-400" /> Reporting
              </h1>
              {project && <p className="text-slate-400 text-sm mt-1">{project.name} — vue au {new Date().toLocaleDateString("fr-FR")}</p>}
            </div>
            {project?.end_date && (
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500">Fin prévue</p>
                <p className="text-sm font-medium text-slate-300">{new Date(project.end_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                {(() => {
                  const daysLeft = Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / 86400000);
                  return <p className={`text-xs font-medium ${daysLeft < 30 ? "text-red-400" : daysLeft < 60 ? "text-amber-400" : "text-slate-500"}`}>{daysLeft > 0 ? `J-${daysLeft}` : "Dépassé"}</p>;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* KPIs principaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp,   color: "indigo",  value: `${progressPct} %`,       label: "Avancement",       sub: `${doneTasks}/${totalTasks} tâches` },
            { icon: DollarSign,   color: budgetPct !== null && budgetPct > 90 ? "red" : "amber",
              value: budgetPct !== null ? `${budgetPct} %` : fmt(totalHT), label: "Budget consommé",
              sub: project?.budget ? `Restant : ${fmt(Math.max(0, project.budget - totalHT))}` : fmt(totalHT) },
            { icon: Milestone,    color: "amber",   value: `${achievedMs}/${milestones.length}`, label: "Jalons atteints", sub: missedMs > 0 ? `${missedMs} en retard` : "Aucun retard" },
            { icon: AlertTriangle,color: criticalRisks.length > 0 ? "red" : "slate",
              value: openRisks.length.toString(), label: "Risques ouverts", sub: `${criticalRisks.length} critique(s)` },
          ].map(({ icon: Icon, color, value, label, sub }) => (
            <Card key={label}>
              <CardBody className="flex items-center gap-3 py-3">
                <div className={`w-10 h-10 bg-${color}-600/20 rounded-lg flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-white leading-none">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  <p className={`text-xs mt-0.5 ${sub?.includes("retard") || sub?.includes("critique") ? "text-red-400" : "text-slate-600"}`}>{sub}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Ligne 2 : Avancement + Budget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Avancement par statut — Pie + légende */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Répartition des tâches
              </h2>
            </CardHeader>
            <CardBody>
              {totalTasks === 0 ? (
                <p className="text-slate-500 text-sm">Aucune tâche.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-40 h-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={36} outerRadius={62}
                          dataKey="value" paddingAngle={2}>
                          {statusPieData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="transparent" />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {statusPieData.map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.fill }} />
                        <span className="text-xs text-slate-400 flex-1">{item.name}</span>
                        <span className="text-xs font-semibold text-slate-300">{item.value}</span>
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round((item.value / totalTasks) * 100)}%`, background: item.fill }} />
                        </div>
                      </div>
                    ))}
                    {blockedTasks > 0 && (
                      <div className="mt-3 bg-red-950/30 border border-red-800/50 rounded-lg px-2 py-1.5 text-xs text-red-300">
                        ⚠ {blockedTasks} tâche(s) bloquée(s)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Budget — Pie consommé/restant + bar catégories */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" /> Budget
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {project?.budget ? (
                <div className="flex items-center gap-4">
                  <div className="w-36 h-36 shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={budgetPieData} cx="50%" cy="50%" innerRadius={32} outerRadius={58}
                          dataKey="value" startAngle={90} endAngle={-270} paddingAngle={1}>
                          {budgetPieData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="transparent" />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className={`text-lg font-bold ${budgetPct! > 90 ? "text-red-400" : "text-white"}`}>{budgetPct} %</p>
                      <p className="text-xs text-slate-500">consommé</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-slate-800/50 rounded-lg p-2.5 space-y-0.5">
                      <p className="text-xs text-slate-500">Total HT dépensé</p>
                      <p className="text-base font-bold text-slate-200">{fmt(totalHT)}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2.5 space-y-0.5">
                      <p className="text-xs text-slate-500">Budget restant</p>
                      <p className={`text-base font-bold ${project.budget - totalHT < 0 ? "text-red-400" : "text-green-400"}`}>
                        {fmt(project.budget - totalHT)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">Total TTC : {fmt(totalTTC)}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3"><p className="text-xs text-slate-500">HT</p><p className="text-lg font-bold text-slate-200">{fmt(totalHT)}</p></div>
                  <div className="bg-slate-800/50 rounded-lg p-3"><p className="text-xs text-slate-500">TTC</p><p className="text-lg font-bold text-slate-200">{fmt(totalTTC)}</p></div>
                </div>
              )}
              {/* Bar chart par catégorie */}
              {costsByCat.length > 0 && (
                <div className="h-28">
                  <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Ventilation par catégorie</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costsByCat} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="cat" tick={{ fill: "#94a3b8", fontSize: 10 }} width={95} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name="Montant HT (€)" radius={[0, 4, 4, 0]}>
                        {costsByCat.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Ligne 3 : Ressources + Jalons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Charge ressources — BarChart groupé */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Charge des ressources
              </h2>
            </CardHeader>
            <CardBody>
              {memberStats.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune tâche assignée.</p>
              ) : (
                <>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={memberStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
                        <Legend formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} />
                        <Bar dataKey="done"       name="Terminé"    fill="#22c55e" stackId="a" radius={[0,0,0,0]} />
                        <Bar dataKey="inProgress" name="En cours"   fill="#6366f1" stackId="a" />
                        <Bar dataKey="todo"       name="À faire"    fill="#475569" stackId="a" />
                        <Bar dataKey="blocked"    name="Bloqué"     fill="#ef4444" stackId="a" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-3">
                    {memberStats.map(m => (
                      <div key={m.name} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 w-28 truncate">{m.fullName}</span>
                        <ProgressBar value={m.done} max={m.total} color="bg-green-500" />
                        <span className="text-slate-500 shrink-0">{m.done}/{m.total}</span>
                        {m.avgAlloc > 0 && (
                          <span className={`shrink-0 font-medium ${m.avgAlloc > 80 ? "text-amber-400" : "text-slate-600"}`}>
                            {m.avgAlloc}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Jalons */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                <Milestone className="w-4 h-4 text-amber-400" /> Jalons
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Barre de progression jalons */}
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Jalons atteints</span>
                    <span className="text-slate-300 font-medium">{achievedMs}/{milestones.length}</span>
                  </div>
                  <ProgressBar value={achievedMs} max={milestones.length} color="bg-amber-500" />
                </div>
              </div>
              {/* Liste jalons à venir */}
              {upcomingMilestones.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun jalon à venir.</p>
              ) : (
                <div className="space-y-2">
                  {milestones.map(m => {
                    const isAchieved = m.status === "achieved";
                    const isMissed   = m.status === "missed" || (m.status === "pending" && m.due_date && m.due_date < today);
                    const daysLeft   = m.due_date ? Math.ceil((new Date(m.due_date).getTime() - new Date().getTime()) / 86400000) : null;
                    return (
                      <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${isAchieved ? "bg-green-950/20 border border-green-800/30" : isMissed ? "bg-red-950/20 border border-red-800/30" : "bg-slate-800/40 border border-slate-700/40"}`}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isAchieved ? "bg-green-400" : isMissed ? "bg-red-500" : "bg-amber-400"}`} />
                        <span className={`flex-1 truncate ${isAchieved ? "text-green-300 line-through" : "text-slate-300"}`}>{m.title}</span>
                        {m.due_date && (
                          <span className={`shrink-0 ${isAchieved ? "text-green-500" : isMissed ? "text-red-400" : daysLeft !== null && daysLeft <= 14 ? "text-amber-400" : "text-slate-500"}`}>
                            {isAchieved ? "✓" : isMissed ? `${Math.abs(daysLeft!)}j retard` : daysLeft === 0 ? "Aujourd'hui" : `J-${daysLeft}`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Ligne 4 : Risques */}
        {risks.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Statuts des risques — Pie */}
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Répartition des risques
                </h2>
              </CardHeader>
              <CardBody>
                <div className="flex items-center gap-6">
                  <div className="w-36 h-36 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={riskStatusData} cx="50%" cy="50%" outerRadius={60} dataKey="value" paddingAngle={2}>
                          {riskStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="transparent" />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {riskStatusData.map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.fill }} />
                        <span className="text-xs text-slate-400 flex-1">{item.name}</span>
                        <span className="text-xs font-semibold text-slate-300">{item.value}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      {[
                        { range: "Critique ≥ 20", count: openRisks.filter(r => r.weight >= 20).length, c: "text-red-400" },
                        { range: "Élevé 12–19",    count: openRisks.filter(r => r.weight >= 12 && r.weight < 20).length, c: "text-amber-400" },
                        { range: "Moyen 6–11",     count: openRisks.filter(r => r.weight >= 6  && r.weight < 12).length, c: "text-yellow-400" },
                      ].map(({ range, count, c }) => count > 0 && (
                        <div key={range} className="flex justify-between text-xs">
                          <span className={c}>{range}</span>
                          <span className={`font-bold ${c}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Top risques ouverts — RadialBar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> Top risques ouverts
                  </h2>
                  <Link href={`/project/risks/?id=${id}`} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    Tous <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                {topRisks.length === 0 ? (
                  <p className="text-sm text-green-400">✓ Aucun risque ouvert.</p>
                ) : (
                  <>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%"
                          data={topRisks} startAngle={90} endAngle={-270}>
                          <RadialBar dataKey="weight" cornerRadius={4} label={false} />
                          <Tooltip content={<CustomTooltip />} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1 mt-2">
                      {topRisks.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.fill }} />
                          <span className="text-slate-400 flex-1 truncate">{r.name}</span>
                          <span className="font-bold shrink-0" style={{ color: r.fill }}>{r.weight}/25</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Alertes */}
        {(blockedTasks > 0 || criticalRisks.length > 0 || missedMs > 0) && (
          <Card className="border-red-800/50 bg-red-950/10">
            <CardBody className="space-y-2">
              <p className="text-sm font-semibold text-red-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Points d&apos;attention</p>
              {blockedTasks > 0 && <p className="text-xs text-red-300">• {blockedTasks} tâche(s) bloquée(s) — intervention requise</p>}
              {criticalRisks.length > 0 && <p className="text-xs text-red-300">• {criticalRisks.length} risque(s) critique(s) ouvert(s) (pondération ≥ 15)</p>}
              {missedMs > 0 && <p className="text-xs text-red-300">• {missedMs} jalon(s) en retard ou manqué(s)</p>}
              {budgetPct !== null && budgetPct > 90 && <p className="text-xs text-red-300">• Budget consommé à {budgetPct} % — surveiller les dépassements</p>}
            </CardBody>
          </Card>
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

export default function ReportingPage() {
  return <Suspense fallback={<Spinner />}><ReportingContent /></Suspense>;
}
