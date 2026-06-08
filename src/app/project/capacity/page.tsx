"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTasks, useProjectMembers } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Users } from "lucide-react";
import type { Task } from "@/types";

const WEEKS_BEFORE = 2;
const WEEKS_AFTER  = 8;

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); // lundi
  return r;
}
function fmtWeek(d: Date) {
  const end = addDays(d, 6);
  return `${d.getDate()} ${d.toLocaleDateString("fr-FR", { month: "short" })}`;
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function taskOverlapsWeek(t: Task, weekStart: Date, weekEnd: Date): boolean {
  if (!t.start_date && !t.due_date) return false;
  const s = t.start_date ? new Date(t.start_date) : new Date(t.due_date!);
  const e = t.due_date   ? new Date(t.due_date)   : new Date(t.start_date!);
  return s <= weekEnd && e >= weekStart;
}

const LOAD_COLORS = [
  "bg-slate-800 text-slate-600",          // 0 tâches
  "bg-green-900/60 text-green-300",       // 1
  "bg-amber-900/50 text-amber-300",       // 2
  "bg-orange-900/60 text-orange-300",     // 3
  "bg-red-900/60 text-red-300",           // 4+
];

function loadColor(n: number) {
  return LOAD_COLORS[Math.min(n, 4)];
}

function CapacityContent() {
  const searchParams  = useSearchParams();
  const id = searchParams.get("id");
  const { data: tasks   = [], isLoading: loadingTasks } = useTasks(id);
  const { data: members = [], isLoading: loadingMembers } = useProjectMembers(id);
  const [selectedCell, setSelectedCell] = useState<{ memberId: string; weekIdx: number } | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weeks = useMemo(() => {
    const sw = startOfWeek(today);
    return Array.from({ length: WEEKS_BEFORE + WEEKS_AFTER }, (_, i) =>
      addDays(sw, (i - WEEKS_BEFORE) * 7)
    );
  }, [today]);

  // Membres actifs (non-client/observer) avec profil
  const activeMembers = members.filter(m => m.role !== "client" && m.role !== "observer");

  // Tâches actives (non annulées)
  const activeTasks = tasks.filter(t => t.status !== "cancelled");

  // Tâches par semaine par membre
  const loadMatrix = useMemo(() => {
    return activeMembers.map(member => ({
      member,
      weeks: weeks.map(weekStart => {
        const weekEnd = addDays(weekStart, 6);
        const wTasks = activeTasks.filter(t =>
          t.assignee_id === member.user_id &&
          taskOverlapsWeek(t, weekStart, weekEnd)
        );
        return wTasks;
      }),
    }));
  }, [activeMembers, activeTasks, weeks]);

  // Tâches de la cellule sélectionnée
  const selectedTasks = useMemo(() => {
    if (!selectedCell) return [];
    const row = loadMatrix.find(r => r.member.user_id === selectedCell.memberId);
    return row?.weeks[selectedCell.weekIdx] ?? [];
  }, [selectedCell, loadMatrix]);

  const isLoading = loadingTasks || loadingMembers;
  const todayWeekIdx = weeks.findIndex(w => isoDate(w) === isoDate(startOfWeek(today)));

  if (isLoading) return (
    <DashboardLayout>
      <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" /> Capacité & Charge Équipe
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Nombre de tâches simultanées par membre et par semaine
          </p>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: "Aucune tâche", color: "bg-slate-700" },
            { label: "1 tâche",      color: "bg-green-700" },
            { label: "2 tâches",     color: "bg-amber-700" },
            { label: "3 tâches",     color: "bg-orange-700" },
            { label: "4+ tâches",    color: "bg-red-700" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`w-4 h-4 rounded ${l.color}`} />{l.label}
            </div>
          ))}
        </div>

        {activeMembers.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center text-slate-400 text-sm">
              Aucun membre actif dans ce projet (hors clients/observateurs).
            </CardBody>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900">
                  <th className="sticky left-0 bg-slate-900 z-10 px-4 py-3 text-left text-slate-400 font-medium border-b border-slate-800 min-w-[180px]">
                    Membre
                  </th>
                  {weeks.map((w, i) => {
                    const isCurrentWeek = i === todayWeekIdx;
                    return (
                      <th key={i} className={`px-2 py-3 text-center font-medium border-b border-slate-800 min-w-[72px] ${isCurrentWeek ? "text-indigo-400" : "text-slate-500"}`}>
                        {fmtWeek(w)}
                        {isCurrentWeek && <div className="text-[9px] text-indigo-400 mt-0.5">cette sem.</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loadMatrix.map(({ member, weeks: mWeeks }) => (
                  <tr key={member.id} className="border-b border-slate-800/50 hover:bg-slate-900/40">
                    <td className="sticky left-0 bg-slate-950 z-10 px-4 py-3 border-r border-slate-800">
                      <div className="font-medium text-slate-200 truncate max-w-[160px]">
                        {member.profiles?.full_name ?? member.profiles?.email ?? "—"}
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5 capitalize">{member.role}</div>
                    </td>
                    {mWeeks.map((wTasks, wi) => {
                      const n = wTasks.length;
                      const isSelected = selectedCell?.memberId === member.user_id && selectedCell?.weekIdx === wi;
                      const isCurrentWeek = wi === todayWeekIdx;
                      return (
                        <td key={wi} className={`px-1 py-1.5 text-center ${isCurrentWeek ? "bg-indigo-950/10" : ""}`}>
                          <button
                            onClick={() => setSelectedCell(isSelected ? null : { memberId: member.user_id, weekIdx: wi })}
                            className={`w-full h-10 rounded-lg flex items-center justify-center font-bold transition-all ${loadColor(n)} ${isSelected ? "ring-2 ring-white/40 scale-95" : "hover:scale-95 hover:opacity-80"}`}
                            title={`${n} tâche(s)`}
                          >
                            {n > 0 ? n : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Détail cellule sélectionnée */}
        {selectedCell && selectedTasks.length > 0 && (
          <Card>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  {loadMatrix.find(r => r.member.user_id === selectedCell.memberId)?.member.profiles?.full_name ?? "—"}
                  {" · "}
                  {fmtWeek(weeks[selectedCell.weekIdx])} – {fmtWeek(addDays(weeks[selectedCell.weekIdx], 6))}
                </p>
                <button onClick={() => setSelectedCell(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>
              <div className="space-y-2">
                {selectedTasks.map((t: Task) => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      t.status === "done" ? "bg-green-400" :
                      t.status === "in_progress" ? "bg-indigo-400" :
                      t.status === "blocked" ? "bg-red-400" : "bg-slate-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{t.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.start_date ? new Date(t.start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "?"}
                        {" → "}
                        {t.due_date   ? new Date(t.due_date).toLocaleDateString("fr-FR",   { day: "2-digit", month: "short" }) : "?"}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.status === "done"        ? "bg-green-900/30 text-green-400" :
                        t.status === "in_progress" ? "bg-indigo-900/30 text-indigo-400" :
                        t.status === "blocked"     ? "bg-red-900/30 text-red-400" : "bg-slate-800 text-slate-400"
                      }`}>
                        {t.status === "done" ? "Terminé" : t.status === "in_progress" ? "En cours" : t.status === "blocked" ? "Bloqué" : "À faire"}
                      </span>
                    </div>
                    {t.progress_pct > 0 && (
                      <span className="text-xs text-slate-500 shrink-0">{t.progress_pct}%</span>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function CapacityPage() { return <Suspense fallback={<Spinner />}><CapacityContent /></Suspense>; }
