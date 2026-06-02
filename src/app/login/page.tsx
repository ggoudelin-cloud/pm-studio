"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Layers } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        // Mettre à jour le store immédiatement avant la navigation
        // pour éviter la race condition avec onAuthStateChange
        setUser(data.user);
        setSession(data.session);
        toast.success("Connexion réussie !");
        router.replace("/dashboard/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: "https://pm.mg-softwares.fr/",
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Compte créé ! Vérifiez votre email.");
        setMode("login");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">PM Studio</h1>
          <p className="text-slate-400 text-sm mt-1">by MG Softwares</p>
        </div>

        {/* Carte */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </h2>
          <p className="text-slate-400 text-sm mb-5">
            {mode === "login"
              ? "Accédez à votre espace de pilotage."
              : "Rejoignez PM Studio gratuitement."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <Input
                id="fullName"
                label="Nom complet"
                type="text"
                placeholder="Gilles Goudelin"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" loading={loading} className="w-full justify-center">
              {mode === "login" ? "Se connecter" : "Créer le compte"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {mode === "login"
                ? "Pas encore de compte ? S'inscrire"
                : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
