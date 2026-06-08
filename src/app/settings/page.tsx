"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useMyMemberships } from "@/hooks/useProjects";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, Euro, Sun, Moon } from "lucide-react";
import toast from "react-hot-toast";
import { useThemeStore } from "@/stores/theme";

export default function SettingsPage() {
  const { user, profile, setProfile } = useAuthStore();
  const { data: memberships = [] } = useMyMemberships();
  const { theme, setTheme } = useThemeStore();
  // Client = uniquement des rôles client/observer sur tous ses projets
  const isClientOnly = memberships.length > 0 &&
    memberships.every(m => m.role === "client" || m.role === "observer");

  const [fullName,     setFullName]     = useState(profile?.full_name ?? "");
  const [jobTitle,     setJobTitle]     = useState(profile?.job_title ?? "");
  const [organization, setOrganization] = useState(profile?.organization ?? "");
  const [rateHT,       setRateHT]       = useState(profile?.daily_rate_ht?.toString() ?? "");
  const [rateTTC,      setRateTTC]      = useState(profile?.daily_rate_ttc?.toString() ?? "");
  const [saving,       setSaving]       = useState(false);

  // Auto-calcul TTC depuis HT (TVA 20%)
  function handleRateHT(v: string) {
    setRateHT(v);
    const ht = parseFloat(v);
    if (!isNaN(ht)) setRateTTC((ht * 1.2).toFixed(2));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase
        .schema("hybridpm")
        .from("profiles")
        .update({
          full_name:       fullName,
          job_title:       jobTitle,
          organization,
          daily_rate_ht:   rateHT  ? parseFloat(rateHT)  : null,
          daily_rate_ttc:  rateTTC ? parseFloat(rateTTC) : null,
        })
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
              {/* Tarification — masquée pour les clients */}
              {!isClientOnly && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2 mb-3 mt-3">
                    <Euro className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-slate-300">Tarif journalier</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Taux HT (€/jour)</label>
                      <input
                        type="number" min="0" step="0.01" value={rateHT}
                        onChange={(e) => handleRateHT(e.target.value)}
                        placeholder="ex : 500"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Taux TTC (€/jour)</label>
                      <input
                        type="number" min="0" step="0.01" value={rateTTC}
                        onChange={(e) => setRateTTC(e.target.value)}
                        placeholder="ex : 600 (TVA 20% auto)"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-600 mt-1">Calculé auto (HT × 1.20)</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Apparence */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Apparence</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-300">Thème de l&apos;interface</p>
                <p className="text-xs text-slate-500 mt-0.5">Votre choix est mémorisé sur cet appareil</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    theme === "dark"
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  <Moon className="w-4 h-4" /> Sombre
                </button>
                <button
                  onClick={() => setTheme("light")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    theme === "light"
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  <Sun className="w-4 h-4" /> Clair
                </button>
              </div>
            </div>
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
