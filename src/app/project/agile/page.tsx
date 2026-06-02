"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSprints, useUserStories } from "@/hooks/useProjects";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";
import { Plus, X, Zap } from "lucide-react";
import type { UserStory, Sprint } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const COLUMNS = [
  { key: "backlog",     label: "Backlog" },
  { key: "planned",    label: "Planifié" },
  { key: "in_progress",label: "En cours" },
  { key: "done",       label: "Terminé" },
];

const POINTS_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

function SprintCard({ sprint }: { sprint: Sprint }) {
  const progress = sprint.velocity_planned > 0
    ? Math.round((sprint.velocity_achieved / sprint.velocity_planned) * 100)
    : 0;

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold text-slate-100">{sprint.name}</p>
            {sprint.goal && <p className="text-xs text-slate-400 mt-0.5">{sprint.goal}</p>}
          </div>
          <Badge variant={
            sprint.status === "active" ? "green" :
            sprint.status === "completed" ? "blue" :
            sprint.status === "cancelled" ? "red" : "default"
          }>
            {sprint.status === "active" ? "Actif" : sprint.status === "completed" ? "Terminé" :
             sprint.status === "planned" ? "Planifié" : "Annulé"}
          </Badge>
        </div>
        {sprint.start_date && (
          <p className="text-xs text-slate-500">{formatDate(sprint.start_date)} → {sprint.end_date ? formatDate(sprint.end_date) : "?"}</p>
        )}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Vélocité</span>
            <span>{sprint.velocity_achieved} / {sprint.velocity_planned} pts</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function StoryCard({ story }: { story: UserStory }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2 hover:border-slate-600 transition-colors">
      <p className="text-sm text-slate-200 leading-snug">{story.title}</p>
      <div className="flex items-center gap-2">
        {story.story_points && (
          <span className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-800 rounded px-1.5 py-0.5 font-mono">
            {story.story_points} pts
          </span>
        )}
        {story.epics && (
          <span className="text-xs text-slate-500 truncate">{story.epics.title}</span>
        )}
      </div>
    </div>
  );
}

function NewStoryModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle]   = useState("");
  const [persona, setPersona] = useState("");
  const [goal, setGoal]     = useState("");
  const [benefit, setBenefit] = useState("");
  const [points, setPoints] = useState<number>(3);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.schema("hybridpm").from("user_stories").insert({
      project_id: projectId, title, persona: persona || null,
      goal: goal || null, benefit: benefit || null, story_points: points, status: "backlog",
    });
    if (error) { toast.error(error.message); }
    else { toast.success("User story créée !"); qc.invalidateQueries({ queryKey: ["stories", projectId] }); onClose(); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Nouvelle User Story</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input id="title" label="Titre *" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Titre synthétique" />
          <Input id="persona" label="En tant que…" value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="utilisateur, admin, client…" />
          <Input id="goal" label="Je veux…" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="pouvoir…" />
          <Input id="benefit" label="Afin de…" value={benefit} onChange={(e) => setBenefit(e.target.value)} placeholder="bénéfice attendu" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Story points</label>
            <div className="flex gap-2 flex-wrap">
              {POINTS_OPTIONS.map((p) => (
                <button key={p} type="button" onClick={() => setPoints(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-mono font-medium border transition-colors ${
                    points === p ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" loading={loading} className="flex-1 justify-center">Créer la story</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AgilePageContent() {
  const searchParams  = useSearchParams();
  const id = searchParams.get("id");
  const { data: sprints,  isLoading: loadingSprints  } = useSprints(id);
  const { data: stories,  isLoading: loadingStories  } = useUserStories(id);
  const [tab, setTab] = useState<"kanban" | "sprints">("kanban");
  const [showModal, setShowModal] = useState(false);

  const storiesByStatus = (status: string) => stories?.filter((s) => s.status === status) ?? [];
  const totalPoints     = stories?.reduce((sum, s) => sum + (s.story_points ?? 0), 0) ?? 0;
  const donePoints      = stories?.filter((s) => s.status === "done").reduce((sum, s) => sum + (s.story_points ?? 0), 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-green-400" /> Agile — Kanban & Sprints
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {stories?.length ?? 0} stories · {donePoints}/{totalPoints} pts livrés
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nouvelle story
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
          {[{ key: "kanban", label: "Kanban" }, { key: "sprints", label: "Sprints" }].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key as typeof tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Kanban */}
        {tab === "kanban" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map(({ key, label }) => {
              const cols = storiesByStatus(key);
              return (
                <div key={key} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</h3>
                    <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{cols.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 min-h-32 p-2 bg-slate-900/50 border border-slate-800 rounded-xl">
                    {loadingStories ? (
                      <div className="flex justify-center py-4">
                        <div className="w-4 h-4 border border-slate-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : cols.length === 0 ? (
                      <p className="text-xs text-slate-700 text-center py-4">Aucune story</p>
                    ) : cols.map((s) => <StoryCard key={s.id} story={s} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sprints */}
        {tab === "sprints" && (
          <div className="space-y-4">
            {loadingSprints ? (
              <div className="py-10 flex justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !sprints?.length ? (
              <div className="py-10 text-center">
                <p className="text-slate-400">Aucun sprint. Créez votre premier sprint pour commencer.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sprints.map((sprint) => <SprintCard key={sprint.id} sprint={sprint} />)}
              </div>
            )}
          </div>
        )}
      </div>
      {showModal && id && <NewStoryModal projectId={id} onClose={() => setShowModal(false)} />}
    </DashboardLayout>
  );
}

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function AgilePage() {
  return <Suspense fallback={<Spinner />}><AgilePageContent /></Suspense>;
}
