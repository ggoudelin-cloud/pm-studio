"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Settings, LogOut,
  ChevronRight, Layers, Bell, ArrowLeft, Inbox, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useMyMemberships, useProject } from "@/hooks/useProjects";
import { getProjectModules, MODULE_GROUP_ORDER } from "@/lib/project-modules";
import { notifStyle } from "@/lib/notifications";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const navItemsBase = [
  { href: "/dashboard/",  label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/projects/",   label: "Projets",          icon: FolderKanban },
  { href: "/actions/",    label: "Mes actions",      icon: Inbox },
];
const navItemPmo = { href: "/dashboard/portfolio/", label: "Portefeuille PMO", icon: Briefcase };

// Normalise un chemin (sans query ni slash final) pour comparer route active
function routeOf(href: string) {
  return href.split("?")[0].replace(/\/$/, "");
}

// ── Navigation contextuelle quand on est à l'intérieur d'un projet ───────────
function ProjectContextNav({ projectId, pathname }: { projectId: string; pathname: string }) {
  const { data: memberships = [] } = useMyMemberships();
  const { data: project } = useProject(projectId);
  const role = memberships.find(m => m.project_id === projectId)?.role ?? null;
  const modules = getProjectModules(projectId, role);
  const currentRoute = routeOf(pathname);

  // Regroupement par section (les modules sans groupe restent dans "" )
  const groups = modules.reduce<Record<string, typeof modules>>((acc, m) => {
    const g = m.group ?? "";
    (acc[g] ??= []).push(m);
    return acc;
  }, {});
  const orderedGroups = Object.keys(groups).sort(
    (a, b) => MODULE_GROUP_ORDER.indexOf(a) - MODULE_GROUP_ORDER.indexOf(b)
  );

  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      {/* Retour à la liste des projets */}
      <Link
        href="/projects/"
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Tous les projets</span>
      </Link>
      {/* Nom du projet → accueil / cockpit du projet */}
      <Link
        href={`/project/?id=${projectId}`}
        className={cn(
          "block px-3 py-1 text-sm font-semibold truncate transition-colors",
          routeOf(pathname) === "/project"
            ? "text-indigo-400"
            : "text-slate-200 hover:text-white"
        )}
      >
        {project?.name ?? "Projet"}
      </Link>

      {orderedGroups.map(group => (
        <div key={group} className="mt-2">
          {group && (
            <p className="px-3 py-1 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{group}</p>
          )}
          <div className="space-y-0.5">
            {groups[group].map(({ href, label, icon: Icon }) => {
              const active = currentRoute === routeOf(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors",
                    active
                      ? "bg-indigo-600/10 text-indigo-400 font-medium"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate flex-1">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll  = useMarkAllNotificationsRead();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function open(n: { id: string; link: string | null }) {
    markRead.mutate(n.id);
    if (n.link) { router.push(n.link); onClose(); }
  }

  return createPortal(
    <div ref={ref} className="fixed bottom-16 left-60 ml-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        {unread > 0
          ? <button onClick={() => markAll.mutate()} className="text-xs text-indigo-400 hover:text-indigo-300">Tout lire ({unread})</button>
          : <span className="text-xs text-slate-500">à jour</span>}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500 text-center">Aucune notification</p>
        ) : (
          notifications.map(n => {
            const { icon: Icon, color } = notifStyle(n.type);
            return (
              <div
                key={n.id}
                onClick={() => open(n)}
                className={cn("px-4 py-3 border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/40 transition-colors",
                  !n.read && "bg-indigo-950/20")}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                      {!n.read && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />}
                      {n.title}
                    </p>
                    {n.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-xs text-slate-600 mt-1">{new Date(n.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Link href="/actions/" onClick={onClose}
        className="block px-4 py-2.5 text-center text-xs text-indigo-400 hover:bg-slate-800/50 border-t border-slate-800">
        Voir toutes mes actions →
      </Link>
    </div>,
    document.body
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, user, reset } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const { data: memberships = [] }   = useMyMemberships();
  const [showNotifs, setShowNotifs] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const isPmoOrPm = memberships.some(m => m.role === "pm" || m.role === "pmo");
  const navItems = isPmoOrPm ? [...navItemsBase, navItemPmo] : navItemsBase;

  // Projet courant déduit de l'URL (?id=) — pour la navigation contextuelle.
  // Lu côté client (pas de useSearchParams pour ne pas imposer de Suspense ici).
  const [projectId, setProjectId] = useState<string | null>(null);
  useEffect(() => {
    const inProject = pathname === "/project" || pathname.startsWith("/project/");
    if (!inProject || typeof window === "undefined") { setProjectId(null); return; }
    setProjectId(new URLSearchParams(window.location.search).get("id"));
  }, [pathname]);

  function handleLogout() {
    setLoggingOut(true);
    // Fire & forget : ne pas attendre signOut pour rediriger
    // (signOut peut bloquer sur réseau lent ; onAuthStateChange nettoie le cache)
    supabase.auth.signOut().catch(() => {});
    window.location.replace("/login/");
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
            <p className="text-xs text-slate-500 mt-0.5">by Consort France</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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

        {/* Navigation contextuelle du projet courant */}
        {projectId && <ProjectContextNav projectId={projectId} pathname={pathname} />}
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
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {loggingOut
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <LogOut className="w-4 h-4" />
          }
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
