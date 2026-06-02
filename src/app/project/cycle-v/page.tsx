"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePhases, useMilestones } from "@/hooks/useProjects";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";
import { Plus, X, CheckCircle2, Clock, AlertTriangle, Shield, GitBranch } from "lucide-react";
import type { ProjectPhase } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const PHASE_TYPES = [
  { value: "requirements",  label: "Expression des besoins", color: "blue" },
  { value: "design",        label: "Conception",              color: "purple" },
  { value: "architecture",  label: "Architecture",            color: "purple" },
  { value: "development",   label: "Développement",           color: "green" },
  { value: "testing",       label: "Tests",                   color: "amber" },
  { value: "validation",    label: "Validation",              color: "amber" },
  { value: "deployment",    label: "Déploiement",             color: "blue" },
  { value: "maintenance",   label: "Maintenance",             color: "gray" },
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending:     { label: "En attente",   icon: Clock,         color: "text-slate-400" },
  active:      { label: "En cours",     icon: Clock,         color: "text-indigo-400" },
  gate_review: { label: "Gate Review",  icon: Shield,        color: "text-amber-400" },
  completed:   { label: "Terminée",     icon: CheckCircle2,  color: "text-green-400" },
  rejected:    { label: "Rejetée",      icon: AlertTriangle, color: "text-red-400"   },
};

function PhaseCard({ phase, onUpdate }: { phase: ProjectPhase; onUpdate: () => void }) {
  const cfg = STATUS_CONFIG[phase.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const phaseType = PHASE_TYPES.find((t) => t.value === phase.phase_type);
  const qc = useQueryClient();

  async function advance() {
    const nextStatus: Record<string, string> = {
      pending: "active", active: "gate_review", gate_review: "completed",
    };
    const next = nextStatus[phase.status];
    if (!next) return;
    const { error } = await supabase.schema("hybridpm").from("project_phases")
      .update({ status: next, ...(next === "completed" ? { completed_at: new Date().toISOString() } : {}) })
      .eq("id", phase.id);
    if (error) toast.error(error.message);
    else { toast.success("Phase mise à jour !"); qc.invalidateQueries({ queryKey: ["phases"] }); }
  }

  return (
    <Card className={phase.status === "active" ? "border-indigo-700/50" : phase.status === "completed" ? "border-green-800/50" : ""}>
      <CardBody className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold text-slate-400">{phase.position}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-100">{phase.name}</h3>
              {phaseType && (
                <Badge variant={phaseType.color as "blue" | "purple" | "green" | "amber" | "gray"}>
                  {phaseType.label}
                </Badge>
              )}
            </div>
            {phase.description && <p className="text-sm text-slate-400 mt-1">{phase.description}</p>}
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-medium shrink-0 ${cfg.color}`}>
            <Icon className="w-4 h-4" />
            {cfg.label}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          {phase.started_at   && <span>Démarré le {formatDate(phase.started_at)}</span>}
          {phase.completed_at && <span>Terminé le {formatDate(phase.completed_at)}</span>}
          {phase.validation_required && (
            <span className="flex items-center gap-1 text-amber-600">
              <Shield className="w-3 h-3" /> Validation requise
            </span>
          )}
        </div>

        {!["completed", "rejected"].includes(phase.status) && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={advance} className="text-xs">
              {phase.status === "pending" ? "Démarrer" :
               phase.status === "active" ? "Soumettre au Gate Review" :
               phase.status === "gate_review" ? "Valider & Clôturer" : ""}
            </Button>
          </div>
        )}

        {phase.rejection_reason && (
          <div className="p-2 bg-red-950/30 border border-red-900/50 rounded-lg">
            <p className="text-xs text-red-400"><span className="font-medium">Motif de rejet :</span> {phase.rejection_reason}</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function NewPhaseModal({ projectId, existingCount, onClose }: { projectId: string; existingCount: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName]       = useState("");
  const [phaseType, setType]  = useState("requirements");
  const [description, setDesc] = useState("");
  const [validationRequired, setValidation] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.schema("hybridpm").from("project_phases").insert({
      project_id: projectId, name, phase_type: phaseType,
      description: description || null, validation_required: validationRequired,
      position: existingCount + 1, status: "pending",
    });
    if (error) toast.error(error.message);
    else { toast.success("Phase créée !"); qc.invalidateQueries({ queryKey: ["phases", projectId] }); onClose(); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Nouvelle phase</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Type de phase</label>
            <select value={phaseType} onChange={(e) => setType(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {PHASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <Input id="name" label="Nom de la phase *" value={name} onChange={(e) => setName(e.target.value)} required placeholder="ex : Spécification fonctionnelle" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDesc(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Objectifs de la phase…" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={validationRequired} onChange={(e) => setValidation(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500" />
            <span className="text-sm text-slate-300">Gate Review requis avant de passer à la phase suivante</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" loading={loading} className="flex-1 justify-center">Créer la phase</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CycleVPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: phases,     isLoading: loadingPhases }     = usePhases(id);
  const { data: milestones, isLoading: loadingMilestones } = useMilestones(id);
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const completedPhases = phases?.filter((p) => p.status === "completed").length ?? 0;
  const totalPhases     = phases?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-blue-400" /> Cycle en V — Phases
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {completedPhases}/{totalPhases} phase(s) terminée(s)
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Ajouter une phase
          </Button>
        </div>

        {/* Barre de progression globale */}
        {totalPhases > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Avancement global</span>
              <span>{Math.round((completedPhases / totalPhases) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-green-500 rounded-full transition-all"
                style={{ width: `${(completedPhases / totalPhases) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Phases */}
        {loadingPhases ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !phases?.length ? (
          <div className="py-10 text-center">
            <GitBranch className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Aucune phase définie. Créez les phases de votre Cycle en V.</p>
          </div>
        ) : (
          <div className="relative space-y-3">
            {/* Ligne verticale */}
            <div className="absolute left-7 top-4 bottom-4 w-px bg-slate-800" />
            {phases.map((phase) => (
              <div key={phase.id} className="relative pl-4">
                <PhaseCard phase={phase} onUpdate={() => qc.invalidateQueries({ queryKey: ["phases", id] })} />
              </div>
            ))}
          </div>
        )}

        {/* Jalons */}
        {!loadingMilestones && milestones && milestones.length > 0 && (
          <div>
            <h2 className="font-semibold text-white mb-3">Jalons</h2>
            <div className="space-y-2">
              {milestones.map((m) => (
                <Card key={m.id}>
                  <CardBody className="flex items-center gap-4 py-3">
                    <div className={`w-2 h-2 rounded-full ${
                      m.status === "achieved" ? "bg-green-400" :
                      m.status === "missed"   ? "bg-red-400"   : "bg-slate-500"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">{m.title}</p>
                      {m.due_date && (
                        <p className="text-xs text-slate-500">
                          {m.status === "achieved" && m.achieved_at ? `Atteint le ${formatDate(m.achieved_at)}` : `Prévu le ${formatDate(m.due_date)}`}
                        </p>
                      )}
                    </div>
                    <Badge variant={m.status === "achieved" ? "green" : m.status === "missed" ? "red" : "default"}>
                      {m.status === "achieved" ? "Atteint" : m.status === "missed" ? "Manqué" : "En attente"}
                    </Badge>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && id && (
        <NewPhaseModal projectId={id} existingCount={phases?.length ?? 0} onClose={() => setShowModal(false)} />
      )}
    </DashboardLayout>
  );
}

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function CycleVPage() {
  return <Suspense fallback={<Spinner />}><CycleVPageContent /></Suspense>;
}
