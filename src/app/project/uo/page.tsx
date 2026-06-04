"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProject, useUoLogs, useUpsertUoLog, useUpdateProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Wrench, Save, AlertTriangle, Euro } from "lucide-react";

const UO_FORFAIT_ANNUEL = 350;
const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

const now = new Date();
const CURRENT_YEAR  = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function UoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: project } = useProject(id);
  const { data: logs = [], isLoading } = useUoLogs(id);
  const upsert        = useUpsertUoLog();
  const updateProject = useUpdateProject();

  const [year,         setYear]         = useState(CURRENT_YEAR);
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editConsumed, setEditConsumed] = useState("");
  const [editPlanned,  setEditPlanned]  = useState("");
  const [editNotes,    setEditNotes]    = useState("");

  // Paramètres UO du projet
  const [uoValue,    setUoValue]    = useState(project?.uo_value?.toString()    ?? "");
  const [uoUnitCost, setUoUnitCost] = useState(project?.uo_unit_cost?.toString() ?? "");
  const [savingParams, setSavingParams] = useState(false);

  const logsForYear   = logs.filter(l => l.year === year);
  const totalConsumed = logsForYear.reduce((s, l) => s + l.uo_consumed, 0);
  const totalPlanned  = logsForYear.reduce((s, l) => s + l.uo_planned,  0);

  const allYears = [...new Set([CURRENT_YEAR, ...logs.map(l => l.year)])].sort((a,b) => b - a);

  const unitCost    = parseFloat(uoUnitCost || "0") || project?.uo_unit_cost || 0;
  const costTotal   = totalConsumed * unitCost;
  const costPlanned = totalPlanned  * unitCost;
  const costBudget  = (project?.uo_value ?? 0) * unitCost;

  const pctConsumed = UO_FORFAIT_ANNUEL > 0
    ? Math.min(110, Math.round((totalConsumed / UO_FORFAIT_ANNUEL) * 100)) : 0;

  function startEdit(month: number) {
    const existing = logsForYear.find(l => l.month === month);
    setEditConsumed(existing?.uo_consumed.toString() ?? "");
    setEditPlanned(existing?.uo_planned.toString()   ?? "");
    setEditNotes(existing?.notes ?? "");
    setEditingMonth(month);
  }

  async function saveEntry() {
    if (!id || editingMonth === null) return;
    await upsert.mutateAsync({
      project_id:  id,
      month:       editingMonth,
      year,
      uo_consumed: parseFloat(editConsumed) || 0,
      uo_planned:  parseFloat(editPlanned)  || 0,
      notes:       editNotes || null,
    });
    setEditingMonth(null);
  }

  async function saveParams() {
    if (!project) return;
    setSavingParams(true);
    await updateProject.mutateAsync({
      id: project.id,
      uo_value:     parseFloat(uoValue)    || null,
      uo_unit_cost: parseFloat(uoUnitCost) || null,
    });
    setSavingParams(false);
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* En-tête */}
        <div>
          <div className="text-sm text-slate-500 mb-1">
            <Link href={`/project/?id=${id}`} className="hover:text-slate-300">
              ← {project?.name ?? "Projet"}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-400" /> Gestion des UO
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Unités d&apos;Œuvre — forfait annuel {UO_FORFAIT_ANNUEL} UO · élasticité −10% / +15%
          </p>
        </div>

        {/* Paramètres UO du projet */}
        <Card className="border-amber-800/30">
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-semibold text-slate-300">Paramètres UO du projet</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">UO allouées à ce projet</label>
                <input type="number" min="0" step="0.5" value={uoValue}
                  onChange={e => setUoValue(e.target.value)}
                  placeholder="ex : 14"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">
                  Coût unitaire par UO (€ HT)
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input type="number" min="0" step="100" value={uoUnitCost}
                    onChange={e => setUoUnitCost(e.target.value)}
                    placeholder="ex : 4200"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <Button onClick={saveParams} loading={savingParams}>
                <Save className="w-3.5 h-3.5" /> Enregistrer
              </Button>
            </div>
            {/* Coût budget calculé */}
            {costBudget > 0 && (
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg px-4 py-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Budget UO alloué</p>
                    <p className="text-sm font-bold text-amber-400">{fmt(costBudget)}</p>
                    <p className="text-xs text-slate-600">{project?.uo_value ?? 0} UO × {fmt(unitCost)}/UO</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Coût planifié {year}</p>
                    <p className="text-sm font-bold text-slate-300">{fmt(costPlanned)}</p>
                    <p className="text-xs text-slate-600">{totalPlanned.toFixed(1)} UO</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Coût consommé {year}</p>
                    <p className={`text-sm font-bold ${costTotal > costBudget ? "text-red-400" : "text-green-400"}`}>
                      {fmt(costTotal)}
                    </p>
                    <p className="text-xs text-slate-600">{totalConsumed.toFixed(1)} UO</p>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Sélecteur d'année */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-400">Année :</span>
          {allYears.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                year === y ? "bg-amber-600/30 text-amber-400 border border-amber-700/50"
                           : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}>
              {y}
            </button>
          ))}
        </div>

        {/* KPIs annuels */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: `UO consommées ${year}`,  value: `${totalConsumed.toFixed(1)} UO`,   color: "text-white" },
            { label: `UO planifiées ${year}`,   value: `${totalPlanned.toFixed(1)} UO`,    color: "text-slate-300" },
            { label: "% du forfait annuel",     value: `${pctConsumed} %`,                 color: pctConsumed > 100 ? "text-red-400" : pctConsumed > 90 ? "text-amber-400" : "text-green-400" },
            { label: `Coût consommé ${year}`,   value: unitCost > 0 ? fmt(costTotal) : "—", color: "text-amber-400" },
          ].map(k => (
            <Card key={k.label}>
              <CardBody className="py-3">
                <p className="text-xs text-slate-500 mb-0.5">{k.label}</p>
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Barre forfait */}
        {totalConsumed > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Consommation forfait annuel ({UO_FORFAIT_ANNUEL} UO)</span>
              <span className={pctConsumed > 100 ? "text-red-400 font-medium" : ""}>
                {totalConsumed.toFixed(1)} / {UO_FORFAIT_ANNUEL} UO
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${
                pctConsumed > 100 ? "bg-red-500" : pctConsumed > 90 ? "bg-amber-400" : "bg-amber-500"
              }`} style={{ width: `${Math.min(pctConsumed, 100)}%` }} />
            </div>
            {pctConsumed > 115 && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Dépassement +15% — arbitrage COPIL requis
              </p>
            )}
          </div>
        )}

        {/* Tableau mensuel */}
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Mois</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Planifié (UO)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Consommé (UO)</th>
                    {unitCost > 0 && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Coût (€ HT)</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Notes</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((monthLabel, i) => {
                    const month = i + 1;
                    const log   = logsForYear.find(l => l.month === month);
                    const isEditing = editingMonth === month;
                    const isPast = year < CURRENT_YEAR || (year === CURRENT_YEAR && month <= CURRENT_MONTH);
                    const isCurrent = month === CURRENT_MONTH && year === CURRENT_YEAR;
                    const delta = log ? log.uo_consumed - log.uo_planned : null;

                    return (
                      <tr key={month} className={`border-b border-slate-800/50 transition-colors ${
                        isEditing ? "bg-slate-800/50" :
                        isCurrent ? "bg-amber-950/10" :
                        !isPast   ? "opacity-40" :
                        "hover:bg-slate-800/20"
                      }`}>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${isCurrent ? "text-amber-400 font-medium" : "text-slate-300"}`}>
                            {monthLabel}
                            {isCurrent && <span className="ml-1 text-xs text-amber-600">← actuel</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input type="number" min="0" step="0.5" value={editPlanned}
                              onChange={e => setEditPlanned(e.target.value)}
                              className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          ) : (
                            <span className="text-slate-400">{log?.uo_planned.toFixed(1) ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input type="number" min="0" step="0.5" value={editConsumed}
                              onChange={e => setEditConsumed(e.target.value)}
                              className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <span className={`font-medium ${log?.uo_consumed ? "text-white" : "text-slate-600"}`}>
                                {log?.uo_consumed.toFixed(1) ?? "—"}
                              </span>
                              {delta !== null && delta !== 0 && (
                                <span className={`text-xs ${delta > 0 ? "text-red-400" : "text-green-400"}`}>
                                  {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        {unitCost > 0 && (
                          <td className="px-4 py-3 text-center text-xs text-slate-400">
                            {log?.uo_consumed ? fmt(log.uo_consumed * unitCost) : "—"}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                              placeholder="Commentaire…"
                              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          ) : (
                            <span className="text-xs text-slate-500 truncate max-w-xs block">{log?.notes ?? ""}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex gap-1.5">
                              <button onClick={saveEntry} disabled={upsert.isPending}
                                className="px-2 py-1 rounded text-xs bg-amber-600/30 text-amber-400 hover:bg-amber-600/50 border border-amber-700/40 disabled:opacity-50">
                                {upsert.isPending ? "…" : "✓"}
                              </button>
                              <button onClick={() => setEditingMonth(null)}
                                className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-400 hover:bg-slate-600">
                                ✗
                              </button>
                            </div>
                          ) : isPast ? (
                            <button onClick={() => startEdit(month)}
                              className="px-2 py-1 rounded text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors">
                              Saisir
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700 bg-slate-900/50">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Total {year}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-slate-300">{totalPlanned.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-white">{totalConsumed.toFixed(1)}</td>
                    {unitCost > 0 && (
                      <td className="px-4 py-3 text-center text-sm font-bold text-amber-400">{fmt(costTotal)}</td>
                    )}
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function UoPage() {
  return <Suspense fallback={<Spinner />}><UoContent /></Suspense>;
}
