import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "blue" | "green" | "purple" | "amber" | "red" | "gray";

const variants = {
  default:  "bg-slate-800 text-slate-300 border-slate-700",
  blue:     "bg-blue-900/40 text-blue-300 border-blue-800",
  green:    "bg-green-900/40 text-green-300 border-green-800",
  purple:   "bg-purple-900/40 text-purple-300 border-purple-800",
  amber:    "bg-amber-900/40 text-amber-300 border-amber-800",
  red:      "bg-red-900/40 text-red-300 border-red-800",
  gray:     "bg-slate-800 text-slate-400 border-slate-700",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
