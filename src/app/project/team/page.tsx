"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProjectMembers, useAddMember, useRemoveMember, useUpdateMemberRole } from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/auth";
import { useProject } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Users, UserPlus, X, Crown, Shield } from "lucide-react";
import type { MemberRole } from "@/types";

const ROLES: { value: MemberRole; label: string; desc: string }[] = [
  { value: "pm",       label: "Chef de projet",   desc: "Gestion complète du projet" },
  { value: "pmo",      label: "PMO",               desc: "Pilotage et gouvernance" },
  { value: "dev",      label: "Développeur",       desc: "Réalisation des tâches" },
  { value: "client",   label: "Client",            desc: "Accès en lecture + commentaires" },
  { value: "observer", label: "Observateur",       desc: "Lecture seule" },
];

const ROLE_COLORS: Record<MemberRole, string> = {
  pm:       "bg-indigo-600/20 text-indigo-300 border-indigo-700/50",
  pmo:      "bg-purple-600/20 text-purple-300 border-purple-700/50",
  dev:      "bg-green-600/20 text-green-300 border-green-700/50",
  client:   "bg-amber-600/20 text-amber-300 border-amber-700/50",
  observer: "bg-slate-600/20 text-slate-400 border-slate-700/50",
};

function AddMemberModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const addMember = useAddMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("dev");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addMember.mutateAsync({ projectId, email, role });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" /> Inviter un membre
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            id="email"
            label="Adresse email"
            type="email"
            placeholder="collaborateur@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Rôle</label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label key={r.value} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-transparent hover:border-slate-700 hover:bg-slate-800/50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="accent-indigo-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 justify-center">Annuler</Button>
            <Button type="submit" loading={addMember.isPending} className="flex-1 justify-center">Inviter</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useAuthStore();
  const { data: project } = useProject(id);
  const { data: members, isLoading } = useProjectMembers(id);
  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();
  const [showModal, setShowModal] = useState(false);

  const isOwner = project?.owner_id === user?.id;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link href={`/project/?id=${id}`} className="hover:text-slate-300">← Projet</Link>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-400" /> Équipe
            </h1>
            <p className="text-slate-400 text-sm mt-1">{members?.length ?? 0} membre(s)</p>
          </div>
          {isOwner && (
            <Button onClick={() => setShowModal(true)}>
              <UserPlus className="w-4 h-4" /> Inviter un membre
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white text-sm">Membres du projet</h2>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="py-10 flex justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !members?.length ? (
              <div className="py-10 text-center text-slate-400 text-sm">Aucun membre.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {members.map((m) => {
                  const isProjectOwner = project?.owner_id === m.user_id;
                  return (
                    <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                      {/* Avatar */}
                      <div className="w-9 h-9 bg-indigo-600/30 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-indigo-300">
                          {(m.profiles?.full_name ?? m.profiles?.email ?? "?")[0].toUpperCase()}
                        </span>
                      </div>
                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-200 truncate">
                            {m.profiles?.full_name ?? m.profiles?.email ?? "Utilisateur inconnu"}
                          </p>
                          {isProjectOwner && (
                            <span title="Propriétaire"><Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" /></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {m.profiles?.email ?? ""}
                          {m.profiles?.job_title ? ` · ${m.profiles.job_title}` : ""}
                        </p>
                      </div>
                      {/* Rôle */}
                      {isOwner && !isProjectOwner ? (
                        <select
                          value={m.role}
                          onChange={(e) => updateRole.mutate({ memberId: m.id, projectId: id!, role: e.target.value as MemberRole })}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border bg-transparent cursor-pointer ${ROLE_COLORS[m.role]}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value} className="bg-slate-900 text-slate-200">{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ROLE_COLORS[m.role]}`}>
                          {ROLES.find((r) => r.value === m.role)?.label ?? m.role}
                        </span>
                      )}
                      {/* Retirer */}
                      {isOwner && !isProjectOwner && (
                        <button
                          onClick={() => removeMember.mutate({ memberId: m.id, projectId: id! })}
                          className="text-slate-600 hover:text-red-400 transition-colors ml-1"
                          title="Retirer du projet"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Légende rôles */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-white text-sm">Rôles & permissions</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <div key={r.value} className="flex items-start gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${ROLE_COLORS[r.value]}`}>
                    {r.label}
                  </span>
                  <p className="text-xs text-slate-500">{r.desc}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {showModal && id && <AddMemberModal projectId={id} onClose={() => setShowModal(false)} />}
    </DashboardLayout>
  );
}

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function TeamPage() {
  return <Suspense fallback={<Spinner />}><TeamPageContent /></Suspense>;
}
