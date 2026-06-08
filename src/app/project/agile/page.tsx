"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  useSprints, useUserStories, useEpics,
  useCreateEpic, useUpdateEpic, useDeleteEpic,
  useUpdateUserStory, useCreateSprint, useUpdateSprint,
} from "@/hooks/useProjects";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";
import { Plus, X, Zap, Layers, Trash2 } from "lucide-react";
import type { UserStory, Sprint, Epic } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const COLUMNS = [
  { key: "backlog",      label: "Backlog" },
  { key: "planned",     label: "Planifié" },
  { key: "in_progress", label: "En cours" },
  { key: "done",        label: "Terminé" },
];

const POINTS_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

// ── Story card avec sélecteur de statut ──────────────────────────────────────
function StoryCard({
  story,
  onStatusChange,
}: {
  story: UserStory;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2 hover:border-slate-600 transition-colors">
      <p className="text-sm text-slate-200 leading-snug">{story.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {story.story_points && (
          <span className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-800 rounded px-1.5 py-0.5 font-mono">
            {story.story_points} pts
          </span>
        )}
        {story.epics && (
          <span className="text-xs text-slate-500 truncate max-w-[7rem]">{story.epics.title}</span>
        )}
        <select
          value={story.status}
          onChange={(e) => onStatusChange(story.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="ml-auto text-xs bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {COLUMNS.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Sprint card avec boutons Démarrer / Terminer ─────────────────────────────
function SprintCard({
  sprint,
  onActivate,
  onComplete,
}: {
  sprint: Sprint;
  onActivate?: () => void;
  onComplete?: () => void;
}) {
  const progress =
    sprint.velocity_planned > 0
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
          <Badge
            variant={
              sprint.status === "active"    ? "green" :
              sprint.status === "completed" ? "blue"  :
              sprint.status === "cancelled" ? "red"   : "default"
            }
          >
            {sprint.status === "active"    ? "Actif"    :
             sprint.status === "completed" ? "Terminé"  :
             sprint.status === "planned"   ? "Planifié" : "Annulé"}
          </Badge>
        </div>

        {sprint.start_date && (
          <p className="text-xs text-slate-500">
            {formatDate(sprint.start_date)} → {sprint.end_date ? formatDate(sprint.end_date) : "?"}
          </p>
        )}

        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Vélocité</span>
            <span>{sprint.velocity_achieved} / {sprint.velocity_planned} pts</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {(sprint.status === "planned" || sprint.status === "active") && (
          <div className="mt-3 flex gap-2">
            {sprint.status === "planned" && onActivate && (
              <button
                onClick={onActivate}
                className="text-xs text-green-400 hover:text-green-300 border border-green-900 hover:border-green-700 rounded px-2 py-1 transition-colors"
              >
                Démarrer
              </button>
            )}
            {sprint.status === "active" && onComplete && (
              <button
                onClick={onComplete}
                className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 rounded px-2 py-1 transition-colors"
              >
                Terminer le sprint
              </button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ── Modal nouvelle user story ────────────────────────────────────────────────
function NewStoryModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle]     = useState("");
  const [persona, setPersona] = useState("");
  const [goal, setGoal]       = useState("");
  const [benefit, setBenefit] = useState("");
  const [points, setPoints]   = useState<number>(3);
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

// ── Modal nouveau sprint ─────────────────────────────────────────────────────
function NewSprintModal({ projectId, onClose, onCreate }: {
  projectId: string;
  onClose: () => void;
  onCreate: (values: { project_id: string; name: string; goal?: string; start_date?: string; end_date?: string; velocity_planned?: number }) => void;
}) {
  const [name, setName]         = useState("");
  const [goal, setGoal]         = useState("");
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");
  const [velocity, setVelocity] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Le nom du sprint est requis."); return; }
    onCreate({
      project_id: projectId,
      name: name.trim(),
      goal: goal.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      velocity_planned: velocity ? parseInt(velocity, 10) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Nouveau Sprint</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input id="sprint-name" label="Nom du sprint *" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sprint 1" />
          <Input id="sprint-goal" label="Objectif" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Objectif principal du sprint" />
          <div className="grid grid-cols-2 gap-4">
            <Input id="sprint-start" label="Date de début" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
            <Input id="sprint-end" label="Date de fin" type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Input id="sprint-velocity" label="Vélocité prévue (pts)" type="number" min={0} value={velocity} onChange={(e) => setVelocity(e.target.value)} placeholder="ex : 40" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" className="flex-1 justify-center">Créer le sprint</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────
function AgilePageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const { data: sprints,  isLoading: loadingSprints } = useSprints(id);
  const { data: stories,  isLoading: loadingStories } = useUserStories(id);
  const { data: epics = [] } = useEpics(id);

  const createEpic  = useCreateEpic();
  const updateEpic  = useUpdateEpic();
  const deleteEpic  = useDeleteEpic();
  const updateStory = useUpdateUserStory();
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();

  const [tab, setTab]             = useState<"kanban" | "sprints" | "epics">("kanban");
  const [epicTitle, setEpicTitle] = useState("");
  const [epicColor, setEpicColor] = useState("#6366f1");
  const [epicError, setEpicError] = useState("");
  const [showModal, setShowModal]         = useState(false);
  const [showSprintModal, setShowSprint]  = useState(false);

  const storiesByStatus = (status: string) => stories?.filter((s) => s.status === status) ?? [];
  const totalPoints = stories?.reduce((sum, s) => sum + (s.story_points ?? 0), 0) ?? 0;
  const donePoints  = stories?.filter((s) => s.status === "done").reduce((sum, s) => sum + (s.story_points ?? 0), 0) ?? 0;

  function handleStatusChange(storyId: string, status: string) {
    if (!id) return;
    updateStory.mutate({ id: storyId, project_id: id, status: status as UserStory["status"] });
  }

  function handleEpicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!epicTitle.trim()) { setEpicError("Saisissez un titre avant de créer l'épic."); return; }
    if (!id) return;
    setEpicError("");
    createEpic.mutate(
      { project_id: id, title: epicTitle, color: epicColor },
      { onSuccess: () => setEpicTitle("") },
    );
  }

  function handleSprintCreate(values: Parameters<typeof createSprint.mutate>[0]) {
    createSprint.mutate(values, { onSuccess: () => setShowSprint(false) });
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-green-400" /> Agile — Kanban &amp; Sprints
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
          {[
            { key: "kanban",  label: "Kanban"  },
            { key: "sprints", label: "Sprints" },
            { key: "epics",   label: "Épics"   },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Kanban ── */}
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
                    ) : (
                      cols.map((s) => (
                        <StoryCard key={s.id} story={s} onStatusChange={handleStatusChange} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Sprints ── */}
        {tab === "sprints" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowSprint(true)}>
                <Plus className="w-4 h-4" /> Nouveau sprint
              </Button>
            </div>

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
                {sprints.map((sprint) => (
                  <SprintCard
                    key={sprint.id}
                    sprint={sprint}
                    onActivate={
                      sprint.status === "planned" && id
                        ? () => updateSprint.mutate({ id: sprint.id, project_id: id, status: "active" })
                        : undefined
                    }
                    onComplete={
                      sprint.status === "active" && id
                        ? () => updateSprint.mutate({ id: sprint.id, project_id: id, status: "completed" })
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Épics ── */}
        {tab === "epics" && (
          <div className="space-y-4">
            <form onSubmit={handleEpicSubmit} className="flex flex-col gap-2">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Titre de l&apos;épic</label>
                  <input
                    value={epicTitle}
                    onChange={(e) => { setEpicTitle(e.target.value); if (epicError) setEpicError(""); }}
                    placeholder="ex : Authentification utilisateur"
                    className={`w-full bg-slate-900 border rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      epicError ? "border-red-500" : "border-slate-800"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Couleur</label>
                  <input
                    type="color"
                    value={epicColor}
                    onChange={(e) => setEpicColor(e.target.value)}
                    className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <Button type="submit" loading={createEpic.isPending}>
                  <Plus className="w-4 h-4" /> Créer l&apos;épic
                </Button>
              </div>
              {epicError && <p className="text-xs text-red-400">{epicError}</p>}
            </form>

            {epics.length === 0 ? (
              <div className="py-10 text-center">
                <Layers className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">Aucun épic. Les épics regroupent plusieurs user stories.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {epics.map((epic) => {
                  const epicStories = stories?.filter((s) => s.epic_id === epic.id) ?? [];
                  const doneS = epicStories.filter((s) => s.status === "done").length;
                  return (
                    <Card key={epic.id} className="hover:border-slate-700 transition-colors">
                      <CardBody>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: epic.color ?? "#6366f1" }} />
                            <p className="font-semibold text-slate-100">{epic.title}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <select
                              value={epic.status}
                              onChange={(e) =>
                                updateEpic.mutate({ id: epic.id, project_id: id!, status: e.target.value as Epic["status"] })
                              }
                              className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-300 focus:outline-none"
                            >
                              <option value="open">Ouvert</option>
                              <option value="in_progress">En cours</option>
                              <option value="closed">Fermé</option>
                            </select>
                            <button
                              onClick={() => deleteEpic.mutate({ id: epic.id, project_id: id! })}
                              className="text-slate-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {epic.description && <p className="text-xs text-slate-500 mt-2">{epic.description}</p>}
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                          <span>{epicStories.length} stories</span>
                          <span>{doneS}/{epicStories.length} terminées</span>
                        </div>
                        {epicStories.length > 0 && (
                          <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((doneS / epicStories.length) * 100)}%`,
                                background: epic.color ?? "#6366f1",
                              }}
                            />
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && id && <NewStoryModal projectId={id} onClose={() => setShowModal(false)} />}
      {showSprintModal && id && (
        <NewSprintModal projectId={id} onClose={() => setShowSprint(false)} onCreate={handleSprintCreate} />
      )}
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
