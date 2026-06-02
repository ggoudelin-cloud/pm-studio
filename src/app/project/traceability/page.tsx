"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTraceability, useCreateTraceabilityLink, useTasks, usePhases } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GitMerge, Plus, X, ArrowRight } from "lucide-react";
import type { TraceabilityLink } from "@/types";

const LINK_TYPES = ["satisfies", "tests", "implements", "refines", "derives"];

function LinkModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const create = useCreateTraceabilityLink();
  const [reqId,     setReqId]     = useState("");
  const [testId,    setTestId]    = useState("");
  const [linkType,  setLinkType]  = useState("satisfies");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({ project_id: projectId, requirement_id: reqId || undefined, test_case_id: testId || undefined, link_type: linkType });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Nouveau lien de traçabilité</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="reqId" label="ID Exigence / Requirement" value={reqId} onChange={e => setReqId(e.target.value)}
            placeholder="REQ-001" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Type de lien</label>
            <select value={linkType} onChange={e => setLinkType(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input id="testId" label="ID Cas de test (optionnel)" value={testId} onChange={e => setTestId(e.target.value)}
            placeholder="TC-001" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" loading={create.isPending} className="flex-1 justify-center">Créer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TraceabilityContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: links = [], isLoading } = useTraceability(id);
  const { data: tasks = [] } = useTasks(id);
  const { data: phases = [] } = usePhases(id);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("");

  const filtered = links.filter(l => !filterType || l.link_type === filterType);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <GitMerge className="w-6 h-6 text-purple-400" /> Traçabilité
            </h1>
            <p className="text-slate-400 text-sm mt-1">{links.length} lien(s) de traçabilité</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nouveau lien
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {["", ...LINK_TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${filterType === t ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}>
              {t || "Tous"}
            </button>
          ))}
        </div>

        {/* Stats par type */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {LINK_TYPES.map(t => {
            const count = links.filter(l => l.link_type === t).length;
            return (
              <button key={t} className="text-left w-full" onClick={() => setFilterType(t === filterType ? "" : t)}>
              <Card className={`hover:border-slate-700 transition-colors ${t === filterType ? "border-indigo-700/50" : ""}`}>
                <CardBody className="py-3 text-center">
                  <p className="text-xl font-bold text-indigo-400">{count}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t}</p>
                </CardBody>
              </Card>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <GitMerge className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Aucun lien de traçabilité. Créez des liens entre exigences, tâches et cas de tests.</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-white text-sm">Matrice de traçabilité</h2>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Exigence</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Lien</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cas de test</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Créé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filtered.map(link => (
                    <tr key={link.id} className="hover:bg-slate-800/20">
                      <td className="px-5 py-3 font-mono text-xs text-indigo-300">{link.requirement_id ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs bg-purple-900/30 border border-purple-800/50 text-purple-300 px-2 py-0.5 rounded-full">{link.link_type}</span>
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{link.test_case_id ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{new Date(link.created_at).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}

        {/* Couverture des tâches */}
        {tasks.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-white text-sm">Couverture des tâches ({tasks.length})</h2>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-slate-400 mb-3">
                Associez des exigences (requirement_id = ID de tâche) pour mesurer la couverture des exigences.
              </p>
              <div className="flex flex-wrap gap-2">
                {tasks.slice(0, 10).map(t => {
                  const covered = links.some(l => l.requirement_id === t.id);
                  return (
                    <span key={t.id} className={`text-xs px-2.5 py-1 rounded-full border ${covered ? "bg-green-900/20 border-green-800/50 text-green-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                      {t.title.slice(0, 30)}
                    </span>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {showModal && id && <LinkModal projectId={id} onClose={() => setShowModal(false)} />}
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function TraceabilityPage() { return <Suspense fallback={<Spinner />}><TraceabilityContent /></Suspense>; }
