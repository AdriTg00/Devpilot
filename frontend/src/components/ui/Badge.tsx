interface BadgeProps {
  children: React.ReactNode;
  variant?: "emerald" | "slate" | "amber";
  className?: string;
}

const variantClasses: Record<string, string> = {
  emerald: "bg-emerald-900/30 text-emerald-300 border-emerald-700/40 shadow-[0_0_8px_rgba(34,197,94,0.08)]",
  slate: "bg-slate-800/60 text-slate-300 border-slate-700/40",
  amber: "bg-amber-900/30 text-amber-300 border-amber-700/40 shadow-[0_0_8px_rgba(245,158,11,0.08)]",
};

export default function Badge({ children, variant = "slate", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
