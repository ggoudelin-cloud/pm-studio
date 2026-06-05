// Style (icône + couleur) associé à chaque type de notification.
// Partagé par le panneau (cloche) et la page « Mes actions ».
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList, AlertTriangle, CheckCircle2, Clock, FileCheck,
  XCircle, Milestone, Euro, Bell,
} from "lucide-react";

export interface NotifStyle { icon: LucideIcon; color: string }

export function notifStyle(type: string): NotifStyle {
  switch (type) {
    case "task_assigned":         return { icon: ClipboardList, color: "text-indigo-400" };
    case "task_blocked":          return { icon: AlertTriangle, color: "text-red-400" };
    case "task_done":             return { icon: CheckCircle2,  color: "text-green-400" };
    case "task_due_soon":         return { icon: Clock,         color: "text-amber-400" };
    case "deliverable_submitted": return { icon: FileCheck,     color: "text-amber-400" };
    case "deliverable_approved":  return { icon: CheckCircle2,  color: "text-green-400" };
    case "deliverable_rejected":  return { icon: XCircle,       color: "text-red-400" };
    case "milestone_missed":      return { icon: Milestone,     color: "text-red-400" };
    case "budget_alert":          return { icon: Euro,          color: "text-amber-400" };
    default:                      return { icon: Bell,          color: "text-slate-400" };
  }
}
