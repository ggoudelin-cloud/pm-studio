import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export type BadgeVariant = "default" | "blue" | "green" | "purple" | "amber" | "red" | "gray";

export function getMethodologyColor(m: string | null): BadgeVariant {
  switch (m) {
    case "cycle_v": return "blue";
    case "agile":   return "green";
    case "hybrid":  return "purple";
    default:        return "gray";
  }
}

export function getMethodologyLabel(m: string | null) {
  switch (m) {
    case "cycle_v": return "Cycle en V";
    case "agile":   return "Agile";
    case "hybrid":  return "Hybride";
    default:        return "Non défini";
  }
}

export function getStatusLabel(s: string) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    active: "Actif",
    paused: "En pause",
    closed: "Clôturé",
    todo: "À faire",
    in_progress: "En cours",
    review: "En révision",
    blocked: "Bloqué",
    done: "Terminé",
    cancelled: "Annulé",
    pending: "En attente",
    achieved: "Atteint",
    missed: "Manqué",
  };
  return labels[s] ?? s;
}
