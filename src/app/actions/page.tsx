"use client";

import { useRouter } from "next/navigation";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/useProjects";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { notifStyle } from "@/lib/notifications";
import { Inbox, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

function NotifRow({ n, onOpen }: { n: Notification; onOpen: (n: Notification) => void }) {
  const { icon: Icon, color } = notifStyle(n.type);
  return (
    <div
      onClick={() => onOpen(n)}
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors",
        n.read
          ? "bg-slate-900/40 border-slate-800 hover:border-slate-700"
          : "bg-indigo-950/20 border-indigo-800/40 hover:border-indigo-700/60"
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">
        <Icon className={cn("w-4.5 h-4.5", color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 flex items-center gap-2">
          {!n.read && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />}
          {n.title}
        </p>
        {n.message && <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>}
        <p className="text-xs text-slate-600 mt-1">
          {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {n.link && <span className="text-xs text-indigo-400 shrink-0 mt-1">Ouvrir →</span>}
    </div>
  );
}

export default function ActionsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll  = useMarkAllNotificationsRead();
  const router = useRouter();

  const unread = notifications.filter(n => !n.read);
  const read   = notifications.filter(n => n.read);

  function onOpen(n: Notification) {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Inbox className="w-6 h-6 text-indigo-400" /> Mes actions
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {unread.length > 0 ? `${unread.length} action(s) en attente` : "Tout est à jour"}
            </p>
          </div>
          {unread.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck className="w-4 h-4" /> Tout marquer comme lu
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <Inbox className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">Aucune notification pour le moment.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-5">
            {unread.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">À traiter</p>
                {unread.map(n => <NotifRow key={n.id} n={n} onOpen={onOpen} />)}
              </div>
            )}
            {read.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Historique</p>
                {read.map(n => <NotifRow key={n.id} n={n} onOpen={onOpen} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
