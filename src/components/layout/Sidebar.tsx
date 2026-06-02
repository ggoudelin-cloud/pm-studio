"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Settings, LogOut,
  ChevronRight, Layers, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useProjects";
import toast from "react-hot-toast";
import { useState, useRef, useEffect } from "react";

const navItems = [
  { href: "/dashboard/",  label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/projects/",   label: "Projets",          icon: FolderKanban },
];

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-16 left-full ml-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        <span className="text-xs text-slate-500">{notifications.filter(n => !n.read).length} non lues</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500 text-center">Aucune notification</p>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => markRead.mutate(n.id)}
              className={cn("px-4 py-3 border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/40 transition-colors",
                !n.read && "bg-indigo-950/20")}
            >
              <div className="flex items-start gap-2">
                {!n.read && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" />}
                <div className={cn("flex-1", n.read && "pl-3.5")}>
                  <p className="text-xs font-medium text-slate-200">{n.title}</p>
                  {n.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                  <p className="text-xs text-slate-600 mt-1">{new Date(n.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, user } = useAuthStore();
  const router = useRouter();
  const { data: notifications = [] } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

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
      <div className="px-3 py-4 border-t border-slate-800 space-y-1 relative">
        {/* Notifications */}
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto flex items-center justify-center w-5 h-5 bg-indigo-600 rounded-full text-xs text-white font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}

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
