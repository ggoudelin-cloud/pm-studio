"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSkillMatrix, useUpsertSkill, useDeleteSkill, useProjectMembers, useProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Star, Plus, X, Trash2 } from "lucide-react";
import type { SkillLevel, SkillMatrixEntry } from "@/types";

const SKILL_LEVELS: { value: SkillLevel; label: string; color: string; short: string }[] = [
  { value: "knowledge", label: "Connaissance",  color: "text-slate-400",  short: "K" },
  { value: "medium",    label: "Moyen",          color: "text-blue-400",   short: "M" },
  { value: "advanced",  label: "Avancé",         color: "text-indigo-400", short: "A" },
  { value: "mastery",   label: "Maîtrise",       color: "text-purple-400", short: "Ma" },
  { value: "expert",    label: "Expert",         color: "text-amber-400",  short: "E" },
];

const DEFAULT_SKILLS = [
  "Gestion de projet", "Cycle en V", "Agile / Scrum", "DevOps",
  "ITSM / ServiceNow", "Rédaction fonctionnelle", "Architecture SI",
  "Tests & Recette", "Communication client", "Pilotage COPIL",
];

const LEVEL_COLORS_BG: Record<SkillLevel, string> = {
  knowledge: "bg-slate-700",
  medium:    "bg-blue-700",
  advanced:  "bg-indigo-600",
  mastery:   "bg-purple-600",
  expert:    "bg-amber-500",
};

function AddSkillModal({ projectId, members, existingSkills, onClose }: {
  projectId: string;
  members: { id: string; user_id: string; profiles: { full_name: string | null; email: string | null } }[];
  existingSkills: string[];
  onClose: () => void;
}) {
  const upsert = useUpsertSkill();
  const [memberId,   setMemberId]   = useState(members[0]?.user_id ?? "");
  const [skillName,  setSkillName]  = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("knowledge");

  const suggestions = DEFAULT_SKILLS.filter(s => !existingSkills.includes(s) && s.toLowerCase().includes(skillName.toLowerCase()));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!skillName.trim() || !memberId) return;
    await upsert.mutateAsync({ project_id: projectId, member_id: memberId, skill_name: skillName.trim(), skill_level: skillLevel, notes: null });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-white">Ajouter une compétence</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Membre *</label>
            <select value={memberId} onChange={e => setMemberId(e.target.value)} required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profiles?.full_name ?? m.profiles?.email ?? m.user_id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Compétence *</label>
            <input value={skillName} onChange={e => setSkillName(e.target.value)} required
              placeholder="ex : Gestion de projet, DevOps, ITSM…"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {suggestions.length > 0 && skillName.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {suggestions.slice(0, 5).map(s => (
                  <button key={s} type="button" onClick={() => setSkillName(s)}
                    className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full text-slate-400 hover:text-slate-200 hover:border-slate-500">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Niveau</label>
            <div className="grid grid-cols-5 gap-1.5">
              {SKILL_LEVELS.map(l => (
                <button key={l.value} type="button" onClick={() => setSkillLevel(l.value)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors border ${
                    skillLevel === l.value
                      ? `${LEVEL_COLORS_BG[l.value]} text-white border-transparent`
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                  }`}>
                  {l.short}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {SKILL_LEVELS.find(l => l.value === skillLevel)?.label}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" loading={upsert.isPending} className="flex-1 justify-center">Ajouter</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SkillsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: project } = useProject(id);
  const { data: skills = [], isLoading } = useSkillMatrix(id);
  const { data: members = [] } = useProjectMembers(id);
  const deleteSkill = useDeleteSkill();
  const upsert = useUpsertSkill();

  const [showModal, setShowModal] = useState(false);

  // Construire la matrice : membres × compétences
  const allSkillNames = [...new Set(skills.map(s => s.skill_name))].sort();
  const memberList = members.filter(m => m.profiles);

  // Regrouper par membre
  const byMember: Record<string, SkillMatrixEntry[]> = {};
  skills.forEach(s => {
    if (!byMember[s.member_id]) byMember[s.member_id] = [];
    byMember[s.member_id].push(s);
  });

  const existingSkills = [...new Set(skills.map(s => s.skill_name))];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← {project?.name ?? "Projet"}</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-400" /> Matrice de compétences
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {memberList.length} membre{memberList.length > 1 ? "s" : ""} · {allSkillNames.length} compétence{allSkillNames.length > 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>

        {/* Légende niveaux */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {SKILL_LEVELS.map(l => (
            <span key={l.value} className={`px-2.5 py-1 rounded-full font-medium ${LEVEL_COLORS_BG[l.value]} text-white`}>
              {l.short} — {l.label}
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : skills.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <Star className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Aucune compétence enregistrée</p>
              <p className="text-slate-500 text-sm mt-1">Évaluez les compétences des membres avec 5 niveaux : Connaissance → Expert.</p>
            </CardBody>
          </Card>
        ) : allSkillNames.length > 0 && memberList.length > 0 ? (
          // Vue matrice
          <Card>
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 min-w-[160px]">Compétence</th>
                    {memberList.map(m => (
                      <th key={m.user_id} className="px-3 py-3 text-xs font-semibold text-slate-400 text-center min-w-[100px]">
                        {m.profiles?.full_name?.split(" ")[0] ?? m.profiles?.email?.split("@")[0] ?? "—"}
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {allSkillNames.map((skillName, i) => (
                    <tr key={skillName} className={`border-b border-slate-800/50 ${i % 2 === 0 ? "" : "bg-slate-800/20"}`}>
                      <td className="px-4 py-2.5 text-slate-300 text-xs font-medium">{skillName}</td>
                      {memberList.map(m => {
                        const entry = byMember[m.user_id]?.find(s => s.skill_name === skillName);
                        const levelConf = entry ? SKILL_LEVELS.find(l => l.value === entry.skill_level) : null;
                        return (
                          <td key={m.user_id} className="px-3 py-2.5 text-center">
                            {entry ? (
                              <button
                                onClick={() => upsert.mutate({
                                  project_id: id!,
                                  member_id: m.user_id,
                                  skill_name: skillName,
                                  skill_level: SKILL_LEVELS[(SKILL_LEVELS.findIndex(l => l.value === entry.skill_level) + 1) % SKILL_LEVELS.length].value,
                                  notes: null,
                                })}
                                className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold text-white transition-opacity hover:opacity-80 ${LEVEL_COLORS_BG[entry.skill_level]}`}
                                title={`${levelConf?.label} — Cliquer pour modifier`}>
                                {levelConf?.short}
                              </button>
                            ) : (
                              <button
                                onClick={() => upsert.mutate({ project_id: id!, member_id: m.user_id, skill_name: skillName, skill_level: "knowledge", notes: null })}
                                className="w-8 h-6 rounded border border-dashed border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400 text-xs transition-colors">
                                +
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2">
                        <button
                          onClick={() => {
                            const toDelete = skills.filter(s => s.skill_name === skillName);
                            Promise.all(toDelete.map(s => deleteSkill.mutate({ id: s.id, project_id: id! })));
                          }}
                          className="text-slate-600 hover:text-red-400 p-1 rounded transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        ) : null}
      </div>

      {showModal && id && (
        <AddSkillModal
          projectId={id}
          members={memberList as { id: string; user_id: string; profiles: { full_name: string | null; email: string | null } }[]}
          existingSkills={existingSkills}
          onClose={() => setShowModal(false)}
        />
      )}
    </DashboardLayout>
  );
}

const Spinner = () => <div className="min-h-screen flex items-center justify-center bg-slate-950"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
export default function SkillsPage() { return <Suspense fallback={<Spinner />}><SkillsContent /></Suspense>; }
