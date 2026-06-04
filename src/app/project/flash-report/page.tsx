"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useFlashReports, useCreateFlashReport, useUpdateFlashReport, useProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText, Plus, X, CheckSquare, Square, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import type { FlashReport } from "@/types";

const CHECKLIST_ITEMS: { key: keyof Pick<FlashReport, "check_rssi"|"check_design_authority"|"check_test_strategy"|"check_industrialization"|"check_comev"|"check_pv_recette">; label: string; desc: string }[] = [
  { key: "check_rssi",              label: "Gouvernance Risque RSSI",          desc: "Conformité aux exigences de sécurité RSSI validée" },
  { key: "check_design_authority",  label: "Design Authority",                 desc: "Architecture validée par la Design Authority" },
  { key: "check_test_strategy",     label: "Stratégie de tests",               desc: "Stratégie de tests définie et validée" },
  { key: "check_industrialization",  label: "Industrialisation des socles",     desc: "Socles industrialisés et conformes" },
  { key: "check_comev",             label: "Passage ComEV",                    desc: "Dossier d'avant-projet présenté en ComEV" },
  { key: "check_pv_recette",        label: "PV de Recette",                    desc: "Procès-verbal de recette signé" },
];

const ENV_KEYS = ["DEV", "INT", "PREPROD", "PROD"];

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ── Modal rapport flash ───────────────────────────────────────────────────────
function FlashReportModal({ projectId, report, onClose }: {
  projectId: string;
  report?: FlashReport;
  onClose: () => void;
}) {
  const create = useCreateFlashReport();
  const update = useUpdateFlashReport();
  const isEdit = !!report;
  const now = new Date();

  const [weekNumber,  setWeekNumber]  = useState(report?.week_number ?? getISOWeek(now));
  const [year,        setYear]        = useState(report?.year ?? now.getFullYear());
  const [generalInfo, setGeneralInfo] = useState(report?.general_info ?? "");
  const [alerts,      setAlerts]      = useState(report?.alerts ?? "");
  const [nextActions, setNextActions] = useState(report?.next_actions ?? "");
  const [checks, setChecks] = useState<Record<string, boolean>>({
    check_rssi:              report?.check_rssi ?? false,
    check_design_authority:  report?.check_design_authority ?? false,
    check_test_strategy:     report?.check_test_strategy ?? false,
    check_industrialization:  report?.check_industrialization ?? false,
    check_comev:             report?.check_comev ?? false,
    check_pv_recette:        report?.check_pv_recette ?? false,
  });
  const [envStatus, setEnvStatus] = useState<Record<string, string>>(
    report?.environments_status ?? Object.fromEntries(ENV_KEYS.map(k => [k, ""]))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<FlashReport, "id" | "created_at" | "updated_at"> = {
      project_id: projectId,
      week_number: weekNumber,
      year,
      general_info: generalInfo || null,
      alerts: alerts || null,
      next_actions: nextActions || null,
      environments_status: envStatus,
      check_rssi:              checks.check_rssi,
      check_design_authority:  checks.check_design_authority,
      check_test_strategy:     checks.check_test_strategy,
      check_industrialization:  checks.check_industrialization,
      check_comev:             checks.check_comev,
      check_pv_recette:        checks.check_pv_recette,
      created_by: null,
    };
    if (isEdit) await update.mutateAsync({ id: report!.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">{isEdit ? "Modifier le rapport flash" : "Nouveau rapport flash"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Semaine */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Semaine</label>
                <input type="number" min={1} max={53} value={weekNumber} onChange={e => setWeekNumber(parseInt(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Année</label>
                <input type="number" min={2020} max={2030} value={year} onChange={e => setYear(parseInt(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Infos générales */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Informations générales</label>
              <textarea rows={3} value={generalInfo} onChange={e => setGeneralInfo(e.target.value)}
                placeholder="Avancement global, faits marquants de la semaine…"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            {/* Check-list */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-3">Check-list gouvernance</p>
              <div className="space-y-2">
                {CHECKLIST_ITEMS.map(item => (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                    <div className="mt-0.5">
                      {checks[item.key]
                        ? <CheckSquare className="w-4 h-4 text-green-400" onClick={() => setChecks(c => ({...c, [item.key]: false}))} />
                        : <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-400" onClick={() => setChecks(c => ({...c, [item.key]: true}))} />
                      }
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${checks[item.key] ? "text-green-400" : "text-slate-300"}`}>{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Statut par environnement */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-3">Statut par environnement</p>
              <div className="grid grid-cols-2 gap-3">
                {ENV_KEYS.map(env => (
                  <div key={env} className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">{env}</label>
                    <select value={envStatus[env] ?? ""} onChange={e => setEnvStatus(s => ({...s, [env]: e.target.value}))}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">—</option>
                      <option value="ok">OK</option>
                      <option value="degraded">Dégradé</option>
                      <option value="ko">KO</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Alertes & actions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-red-400">Alertes</label>
              <textarea rows={2} value={alerts} onChange={e => setAlerts(e.target.value)}
                placeholder="Points de vigilance, risques en cours…"
                className="bg-slate-800 border border-red-900/30 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-amber-400">Prochaines actions</label>
              <textarea rows={2} value={nextActions} onChange={e => setNextActions(e.target.value)}
                placeholder="Actions planifiées pour la semaine prochaine…"
                className="bg-slate-800 border border-amber-900/30 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
              <Button type="submit" loading={create.isPending || update.isPending} className="flex-1 justify-center">
                {isEdit ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Carte rapport flash ───────────────────────────────────────────────────────
function FlashReportCard({ report, onEdit }: { report: FlashReport; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const checksOk = CHECKLIST_ITEMS.filter(c => report[c.key as keyof FlashReport] === true).length;
  const envEntries = Object.entries(report.environments_status ?? {}).filter(([, v]) => v);

  const envColor = (v: string) => v === "ok" ? "text-green-400" : v === "degraded" ? "text-amber-400" : v === "ko" ? "text-red-400" : "text-slate-400";

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-400 bg-indigo-900/20 border border-indigo-700/40 px-2 py-0.5 rounded-full">
                S{report.week_number} / {report.year}
              </span>
              <span className={`text-xs font-medium ${checksOk === CHECKLIST_ITEMS.length ? "text-green-400" : checksOk > 3 ? "text-amber-400" : "text-red-400"}`}>
                ✓ {checksOk}/{CHECKLIST_ITEMS.length} checks
              </span>
              {report.alerts && <span className="text-xs text-red-400">⚠ Alerte</span>}
            </div>
            {report.general_info && (
              <p className="text-sm text-slate-400 mt-1.5 line-clamp-2">{report.general_info}</p>
            )}
            {envEntries.length > 0 && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {envEntries.map(([k, v]) => (
                  <span key={k} className={`text-xs font-medium ${envColor(v)}`}>{k}: {v.toUpperCase()}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={onEdit} className="text-slate-500 hover:text-indigo-400 p-1.5 rounded hover:bg-slate-800"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setExpanded(e => !e)} className="text-slate-500 hover:text-slate-300 p-1.5 rounded hover:bg-slate-800">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Check-list gouvernance</p>
              <div className="grid grid-cols-2 gap-1.5">
                {CHECKLIST_ITEMS.map(item => (
                  <div key={item.key} className={`flex items-center gap-2 text-xs ${report[item.key as keyof FlashReport] ? "text-green-400" : "text-slate-500"}`}>
                    {report[item.key as keyof FlashReport]
                      ? <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                      : <Square className="w-3.5 h-3.5 shrink-0" />}
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
            {report.alerts && (
              <div className="bg-red-950/20 border border-red-800/30 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-red-400 mb-1">Alertes</p>
                <p className="text-sm text-red-200 whitespace-pre-line">{report.alerts}</p>
              </div>
            )}
            {report.next_actions && (
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg px-3 py-2">
                <p className="text-xs font-medium text-amber-400 mb-1">Prochaines actions</p>
                <p className="text-sm text-amber-200 whitespace-pre-line">{report.next_actions}</p>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function FlashReportContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: project } = useProject(id);
  const { data: reports = [], isLoading } = useFlashReports(id);

  const [showModal,  setShowModal]  = useState(false);
  const [editReport, setEditReport] = useState<FlashReport | undefined>();

  const latest = reports[0];
  const checksLatest = latest ? CHECKLIST_ITEMS.filter(c => latest[c.key as keyof FlashReport] === true).length : 0;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← {project?.name ?? "Projet"}</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-400" /> Rapport Flash
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {reports.length} rapport{reports.length > 1 ? "s" : ""} · Suivi hebdomadaire avec check-lists
            </p>
          </div>
          <Button onClick={() => { setEditReport(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Nouveau rapport
          </Button>
        </div>

        {/* Dernière semaine en résumé */}
        {latest && (
          <div className={`p-4 rounded-xl border ${checksLatest === CHECKLIST_ITEMS.length ? "bg-green-950/20 border-green-800/30" : checksLatest >= 4 ? "bg-amber-950/20 border-amber-800/30" : "bg-red-950/20 border-red-800/30"}`}>
            <p className="text-xs text-slate-400 mb-1">Dernier rapport — S{latest.week_number}/{latest.year}</p>
            <div className="flex items-center gap-4">
              <span className={`text-2xl font-bold ${checksLatest === CHECKLIST_ITEMS.length ? "text-green-400" : checksLatest >= 4 ? "text-amber-400" : "text-red-400"}`}>
                {checksLatest}/{CHECKLIST_ITEMS.length}
              </span>
              <p className="text-sm text-slate-300">checks validés</p>
              {latest.alerts && <span className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 px-2 py-0.5 rounded-full">⚠ Alerte active</span>}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : reports.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Aucun rapport flash</p>
              <p className="text-slate-500 text-sm mt-1">Créez votre premier rapport hebdomadaire avec check-list RSSI, DA, tests…</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <FlashReportCard key={r.id} report={r} onEdit={() => { setEditReport(r); setShowModal(true); }} />
            ))}
          </div>
        )}
      </div>

      {showModal && id && (
        <FlashReportModal projectId={id} report={editReport} onClose={() => { setShowModal(false); setEditReport(undefined); }} />
      )}
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function FlashReportPage() { return <Suspense fallback={<Spinner />}><FlashReportContent /></Suspense>; }
