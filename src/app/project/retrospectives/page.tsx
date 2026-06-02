"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRetrospectives, useCreateRetrospective, useUpdateRetrospective, useSprints } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RefreshCw, Plus, X, Smile, Frown, Zap, ChevronDown, ChevronUp } from "lucide-react";
import type { Retrospective } from "@/types";

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) { onChange([...values, v]); setInput(""); }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <Button type="button" variant="secondary" size="sm" onClick={add}>+ Ajouter</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-xs text-slate-300">
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

function RetroModal({ projectId, sprints, retro, onClose }: {
  projectId: string;
  sprints: { id: string; name: string }[];
  retro?: Retrospective;
  onClose: () => void;
}) {
  const create = useCreateRetrospective();
  const update = useUpdateRetrospective();
  const isEdit = !!retro;
  const [sprintId,    setSprint]    = useState(retro?.sprint_id ?? sprints[0]?.id ?? "");
  const [wentWell,    setWentWell]  = useState<string[]>(retro?.went_well ?? []);
  const [toImprove,   setImprove]   = useState<string[]>(retro?.to_improve ?? []);
  const [actions,     setActions]   = useState<string[]>(retro?.action_items ?? []);
  const [happiness,   setHappiness] = useState(retro?.happiness_score ?? 3);
  const [heldAt,      setHeldAt]    = useState(retro?.held_at ? new Date(retro.held_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { sprint_id: sprintId, went_well: wentWell, to_improve: toImprove, action_items: actions, happiness_score: happiness, held_at: new Date(heldAt).toISOString() };
    if (isEdit) await update.mutateAsync({ id: retro!.id, project_id: projectId, ...payload });
    else await create.mutateAsync({ project_id: projectId, ...payload });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">{isEdit ? "Modifier la rétrospective" : "Nouvelle rétrospective"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Sprint *</label>
                <select value={sprintId} onChange={e => setSprint(e.target.value)} required
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Date</label>
                <input type="date" value={heldAt} onChange={e => setHeldAt(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Happiness */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">Score de bonheur équipe ({happiness}/5)</label>
              <input type="range" min={1} max={5} value={happiness} onChange={e => setHappiness(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500" />
              <div className="flex justify-between text-xs text-slate-500">
                <span><Frown className="w-3.5 h-3.5 inline" /> Difficile</span>
                <span>Excellent <Smile className="w-3.5 h-3.5 inline text-green-400" /></span>
              </div>
            </div>

            {/* Went well */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-green-400 flex items-center gap-1.5">
                <Smile className="w-4 h-4" /> Ce qui s&apos;est bien passé
              </label>
              <TagInput values={wentWell} onChange={setWentWell} placeholder="ex : Bonne communication…" />
            </div>

            {/* To improve */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-amber-400 flex items-center gap-1.5">
                <Frown className="w-4 h-4" /> Points à améliorer
              </label>
              <TagInput values={toImprove} onChange={setImprove} placeholder="ex : Estimation des tâches…" />
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-indigo-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Actions concrètes
              </label>
              <TagInput values={actions} onChange={setActions} placeholder="ex : Faire des daily plus courts…" />
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

function RetroCard({ retro, sprints, onClick }: { retro: Retrospective; sprints: { id: string; name: string }[]; onClick: () => void }) {
  const sprint = sprints.find(s => s.id === retro.sprint_id);
  const [expanded, setExpanded] = useState(false);
  const score = retro.happiness_score ?? 0;
  const scoreColor = score >= 4 ? "text-green-400" : score >= 3 ? "text-amber-400" : "text-red-400";

  return (
    <Card className="hover:border-slate-700 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-100">{sprint?.name ?? "Sprint inconnu"}</p>
            <p className="text-xs text-slate-500 mt-0.5">{new Date(retro.held_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${scoreColor}`}>{score}/5</span>
            <button onClick={onClick} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded border border-slate-700 hover:border-slate-600">Modifier</button>
            <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-300">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardBody className="space-y-4">
          {(retro.went_well ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-400 mb-1.5 flex items-center gap-1"><Smile className="w-3.5 h-3.5" /> Bien passé</p>
              <div className="flex flex-wrap gap-1.5">{(retro.went_well ?? []).map((v, i) => <span key={i} className="bg-green-950/30 border border-green-800/50 text-green-300 text-xs px-2 py-0.5 rounded-full">{v}</span>)}</div>
            </div>
          )}
          {(retro.to_improve ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-400 mb-1.5 flex items-center gap-1"><Frown className="w-3.5 h-3.5" /> À améliorer</p>
              <div className="flex flex-wrap gap-1.5">{(retro.to_improve ?? []).map((v, i) => <span key={i} className="bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs px-2 py-0.5 rounded-full">{v}</span>)}</div>
            </div>
          )}
          {(retro.action_items ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-indigo-400 mb-1.5 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Actions</p>
              <div className="space-y-1">{(retro.action_items ?? []).map((v, i) => <p key={i} className="text-xs text-slate-300 flex items-start gap-1.5"><span className="text-indigo-400 mt-0.5">→</span>{v}</p>)}</div>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}

function RetrosContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: retros = [], isLoading } = useRetrospectives(id);
  const { data: sprints = [] } = useSprints(id);
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState<Retrospective | undefined>();

  const avgHappiness = retros.length ? (retros.reduce((a, r) => a + (r.happiness_score ?? 0), 0) / retros.length).toFixed(1) : "—";

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-green-400" /> Rétrospectives
            </h1>
            <p className="text-slate-400 text-sm mt-1">{retros.length} rétrospective(s) · Bonheur moyen : <span className="text-green-400 font-medium">{avgHappiness}/5</span></p>
          </div>
          <Button onClick={() => { setEditItem(undefined); setShowModal(true); }} disabled={sprints.length === 0}>
            <Plus className="w-4 h-4" /> Nouvelle rétro
          </Button>
        </div>

        {sprints.length === 0 && (
          <div className="p-4 bg-amber-950/20 border border-amber-800/30 rounded-xl text-sm text-amber-300">
            Créez d&apos;abord des sprints dans le module Agile pour associer des rétrospectives.
          </div>
        )}

        {isLoading ? (
          <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : retros.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Aucune rétrospective. Lancez votre première réunion rétro !</p>
          </div>
        ) : (
          <div className="space-y-4">
            {retros.map(r => (
              <RetroCard key={r.id} retro={r} sprints={sprints} onClick={() => { setEditItem(r); setShowModal(true); }} />
            ))}
          </div>
        )}
      </div>

      {showModal && id && sprints.length > 0 && (
        <RetroModal projectId={id} sprints={sprints} retro={editItem} onClose={() => { setShowModal(false); setEditItem(undefined); }} />
      )}
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function RetrosPage() { return <Suspense fallback={<Spinner />}><RetrosContent /></Suspense>; }
