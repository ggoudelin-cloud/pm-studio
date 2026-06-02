"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Settings, LogOut,
  ChevronRight, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard/",  label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/projects/",   label: "Projets",          icon: FolderKanban },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, user } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    router.replace("/login/");
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">PM Studio</p>
            <p className="text-xs text-slate-500 mt-0.5">by MG Softwares</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                active
                  ? "bg-indigo-600/10 text-indigo-400 font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer utilisateur */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        <Link
          href="/settings/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Paramètres
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
        <div className="mt-3 px-3 py-2.5 bg-slate-800/50 rounded-lg">
          <p className="text-xs font-medium text-slate-300 truncate">
            {profile?.full_name ?? user?.email}
          </p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
      </div>
    </aside>
  );
}
