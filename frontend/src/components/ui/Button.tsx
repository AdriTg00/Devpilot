import Spinner from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 " +
    "hover:bg-emerald-500/20 hover:border-emerald-400/60 hover:text-emerald-200 " +
    "shadow-[0_0_12px_rgba(34,197,94,0.08)] hover:shadow-[0_0_20px_rgba(34,197,94,0.18)] " +
    "backdrop-blur-sm",
  secondary:
    "border border-slate-700/50 bg-slate-800/30 text-slate-300 " +
    "hover:bg-slate-700/40 hover:border-emerald-500/30 hover:text-emerald-300 " +
    "hover:shadow-[0_0_12px_rgba(34,197,94,0.06)] " +
    "backdrop-blur-sm",
  danger:
    "border border-red-500/40 bg-red-500/10 text-red-300 " +
    "hover:bg-red-500/20 hover:border-red-400/60 hover:text-red-200 " +
    "shadow-[0_0_12px_rgba(239,68,68,0.08)] hover:shadow-[0_0_20px_rgba(239,68,68,0.18)] " +
    "backdrop-blur-sm",
};

export default function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      data-cuelume-press="press"
      data-cuelume-release="release"
      className={`inline-flex items-center justify-center gap-2 rounded-[6px] px-5 py-3 font-medium text-white transition-all duration-200 disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}