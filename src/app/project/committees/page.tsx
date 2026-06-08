"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCommittees, useCreateCommittee, useUpdateCommittee, useDeleteCommittee, useProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Building2, Plus, X, Clock, CheckCircle2, XCircle, Edit2, Trash2, ChevronDown, ChevronUp, Users } from "lucide-react";
import type { Committee, CommitteeType, CommitteeStatus, CommitteeActionItem } from "@/types";

const TYPE_CONFIG: Record<CommitteeType, { label: string; color: string; bg: string }> = {
  copil:   { label: "COPIL",          color: "text-indigo-400", bg: "bg-indigo-900/20 border-indigo-700/40" },
  comev:   { label: "ComEV",          color: "text-purple-400", bg: "bg-purple-900/20 border-purple-700/40" },
  cab:     { label: "CAB",            color: "text-amber-400",  bg: "bg-amber-900/20 border-amber-700/40"  },
  rcc:     { label: "RCC",            color: "text-blue-400",   bg: "bg-blue-900/20 border-blue-700/40"    },
  rci:     { label: "RCI",            color: "text-cyan-400",   bg: "bg-cyan-900/20 border-cyan-700/40"    },
  weekly:  { label: "Hebdo",          color: "text-green-400",  bg: "bg-green-900/20 border-green-700/40"  },
  other:   { label: "Autre",          color: "text-slate-400",  bg: "bg-slate-800 border-slate-700"        },
};

const STATUS_CONFIG: Record<CommitteeStatus, { label: string; icon: React.ElementType; color: string }> = {
  scheduled: { label: "Planifié",  icon: Clock,         color: "text-slate-400" },
  held:      { label: "Tenu",      icon: CheckCircle2,  color: "text-green-400" },
  cancelled: { label: "Annulé",    icon: XCircle,       color: "text-red-400"   },
};

// ── Modal création/édition ────────────────────────────────────────────────────
function CommitteeModal({ projectId, committee, onClose }: {
  projectId: string;
  committee?: Committee;
  onClose: () => void;
}) {
  const create = useCreateCommittee();
  const update = useUpdateCommittee();
  const isEdit = !!committee;

  const [title,       setTitle]       = useState(committee?.title ?? "");
  const [type,        setType]        = useState<CommitteeType>(committee?.committee_type ?? "copil");
  const [scheduledAt, setScheduled]   = useState(committee?.scheduled_at ? committee.scheduled_at.slice(0, 16) : "");
  const [status,      setStatus]      = useState<CommitteeStatus>(committee?.status ?? "scheduled");
  const [agenda,      setAgenda]      = useState(committee?.agenda ?? "");
  const [minutes,     setMinutes]     = useState(committee?.minutes ?? "");
  const [attendees,   setAttendees]   = useState((committee?.attendees ?? []).join(", "));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      project_id: projectId,
      title: title.trim(),
      committee_type: type,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      held_at: status === "held" && scheduledAt ? new Date(scheduledAt).toISOString() : committee?.held_at ?? null,
      status,
      agenda: agenda || null,
      minutes: minutes || null,
      attendees: attendees.split(",").map(s => s.trim()).filter(Boolean),
      action_items: committee?.action_items ?? [],
      created_by: null,
    };
    if (isEdit) await update.mutateAsync({ id: committee!.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">{isEdit ? "Modifier le comité" : "Nouveau comité"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input id="title" label="Titre *" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="ex : COPIL Mensuel — Juin 2026" />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Type de comité</label>
                <select value={type} onChange={e => setType(e.target.value as CommitteeType)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Statut</label>
                <select value={status} onChange={e => setStatus(e.target.value as CommitteeStatus)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="scheduled">Planifié</option>
                  <option value="held">Tenu</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Date / Heure</label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduled(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Participants (séparés par virgule)</label>
              <input type="text" value={attendees} onChange={e => setAttendees(e.target.value)}
                placeholder="Gilles Goudelin, Pierre-Henri Bellet, Thomas Leblanc…"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Ordre du jour</label>
              <textarea rows={3} value={agenda} onChange={e => setAgenda(e.target.value)}
                placeholder="1. Avancement du portefeuille&#10;2. Risques ouverts&#10;3. Prochaines MEP…"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            {(isEdit || status === "held") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">Compte rendu</label>
                <textarea rows={4} value={minutes} onChange={e => setMinutes(e.target.value)}
                  placeholder="Résumé des décisions, actions, points en suspens…"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            )}
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

// ── Carte comité ──────────────────────────────────────────────────────────────
function CommitteeCard({ c, onEdit, onDelete }: { c: Committee; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const typeConf = TYPE_CONFIG[c.committee_type];
  const statusConf = STATUS_CONFIG[c.status];
  const StatusIcon = statusConf.icon;
  const isPast = c.scheduled_at && new Date(c.scheduled_at) < new Date();

  return (
    <Card className="group">
      <CardBody>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeConf.bg} ${typeConf.color}`}>
                  {typeConf.label}
                </span>
                <h3 className="font-semibold text-slate-100 text-sm">{c.title}</h3>
              </div>
              <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="text-slate-500 hover:text-indigo-400 p-1.5 rounded hover:bg-slate-800"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={onDelete} className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-800"><Trash2 className="w-3.5 h-3.5" /></button>
                {(c.agenda || c.minutes || c.attendees.length > 0) && (
                  <button onClick={() => setExpanded(e => !e)} className="text-slate-500 hover:text-slate-300 p-1.5 rounded hover:bg-slate-800">
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
              <span className={`flex items-center gap-1 ${statusConf.color}`}>
                <StatusIcon className="w-3 h-3" /> {statusConf.label}
              </span>
              {c.scheduled_at && (
                <span className={isPast && c.status === "scheduled" ? "text-amber-400" : "text-slate-500"}>
                  {new Date(c.scheduled_at).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              {c.attendees.length > 0 && (
                <span className="flex items-center gap-1 text-slate-500">
                  <Users className="w-3 h-3" /> {c.attendees.length} participant{c.attendees.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
            {c.attendees.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1.5">Participants</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.attendees.map((a, i) => (
                    <span key={i} className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full text-slate-300">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {c.agenda && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1.5">Ordre du jour</p>
                <p className="text-sm text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2 whitespace-pre-line">{c.agenda}</p>
              </div>
            )}
            {c.minutes && (
              <div>
                <p className="text-xs font-medium text-green-400 mb-1.5">Compte rendu</p>
                <p className="text-sm text-slate-300 bg-slate-800/40 rounded-lg px-3 py-2 whitespace-pre-line">{c.minutes}</p>
              </div>
            )}
            {c.action_items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-400 mb-1.5">Actions ({c.action_items.length})</p>
                <ul className="space-y-1">
                  {c.action_items.map((a, i) => (
                    <li key={i} className={`text-sm flex items-center gap-2 ${a.done ? "text-slate-500 line-through" : "text-slate-300"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.done ? "bg-green-500" : "bg-amber-400"}`} />
                      {a.label} {a.owner && `(${a.owner})`} {a.due_date && `— ${new Date(a.due_date).toLocaleDateString("fr-FR")}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function CommitteesContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: project } = useProject(id);
  const { data: committees = [], isLoading } = useCommittees(id);
  const deleteCommittee = useDeleteCommittee();

  const [showModal,  setShowModal]  = useState(false);
  const [editItem,   setEditItem]   = useState<Committee | undefined>();
  const [confirmDel, setConfirmDel] = useState<Committee | null>(null);
  const [filterType, setFilterType] = useState<CommitteeType | "all">("all");

  const filtered = filterType === "all" ? committees : committees.filter(c => c.committee_type === filterType);
  const upcoming = committees.filter(c => c.status === "scheduled" && c.scheduled_at && new Date(c.scheduled_at) >= new Date()).length;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← {project?.name ?? "Projet"}</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-400" /> Comitologie
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {committees.length} comité{committees.length > 1 ? "s" : ""} · {upcoming} à venir
            </p>
          </div>
          <Button onClick={() => { setEditItem(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Nouveau comité
          </Button>
        </div>

        {/* Filtres par type */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterType("all")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterType === "all" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            Tous
          </button>
          {(Object.entries(TYPE_CONFIG) as [CommitteeType, typeof TYPE_CONFIG[CommitteeType]][]).map(([k, v]) => (
            <button key={k} onClick={() => setFilterType(k)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filterType === k ? `${v.bg} ${v.color}` : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"}`}>
              {v.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Aucun comité</p>
              <p className="text-slate-500 text-sm mt-1">COPIL, ComEV, CAB, RCC/RCI — gérez votre comitologie projet.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <CommitteeCard key={c.id} c={c}
                onEdit={() => { setEditItem(c); setShowModal(true); }}
                onDelete={() => setConfirmDel(c)} />
            ))}
          </div>
        )}
      </div>

      {showModal && id && (
        <CommitteeModal projectId={id} committee={editItem} onClose={() => { setShowModal(false); setEditItem(undefined); }} />
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-white">Supprimer le comité ?</h3>
            <p className="text-sm text-slate-400">« <span className="text-slate-200">{confirmDel.title}</span> » sera supprimé.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-slate-800 text-slate-200 hover:bg-slate-700">Annuler</button>
              <button onClick={async () => {
                await deleteCommittee.mutateAsync({ id: confirmDel.id, project_id: confirmDel.project_id ?? "" });
                setConfirmDel(null);
              }} className="flex-1 px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function CommitteesPage() { return <Suspense fallback={<Spinner />}><CommitteesContent /></Suspense>; }
