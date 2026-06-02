"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

function AuthListener() {
  const { setUser, setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    // Timeout de sécurité : 2s max pour résoudre le loading
    const timeout = setTimeout(() => setLoading(false), 2000);

    // getSession() lit depuis localStorage → résout loading sans attendre le réseau
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => { clearTimeout(timeout); setLoading(false); });

    // onAuthStateChange gère login/logout/refresh en temps réel
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const { data } = await supabase
              .schema("hybridpm")
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .limit(1);
            setProfile(data?.[0] ?? null);
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, [setUser, setSession, setProfile, setLoading]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #334155",
          },
        }}
      />
    </QueryClientProvider>
  );
}
