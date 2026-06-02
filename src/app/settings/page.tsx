"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user, profile, setProfile } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? "");
  const [organization, setOrganization] = useState(profile?.organization ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase
        .schema("hybridpm")
        .from("profiles")
        .update({ full_name: fullName, job_title: jobTitle, organization })
        .eq("id", user!.id)
        .select()
        .limit(1);
      if (error) throw error;
      setProfile(data?.[0] ?? null);
      toast.success("Profil mis à jour !");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Paramètres</h1>
          <p className="text-slate-400 mt-1">Gérez votre profil et vos préférences</p>
        </div>

        {/* Profil */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Informations personnelles</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nom complet
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Votre nom complet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Poste / Titre
                </label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ex : Chef de projet, Développeur..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Organisation
                </label>
                <Input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Nom de votre entreprise ou organisation"
                />
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Compte */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Compte</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Adresse e-mail
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-sm text-slate-400">{user?.email}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                L&apos;adresse e-mail ne peut pas être modifiée ici.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
