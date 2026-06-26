interface BadgeProps {
  children: React.ReactNode;
  variant?: "emerald" | "slate" | "amber";
  className?: string;
}

const variantClasses: Record<string, string> = {
  emerald: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  slate: "bg-slate-700 text-slate-300 border-slate-600",
  amber: "bg-amber-900/50 text-amber-300 border-amber-700",
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
