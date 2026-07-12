import Spinner from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-emerald-500 hover:bg-emerald-400",
  secondary: "bg-slate-700 hover:bg-slate-600",
  danger: "bg-red-600 hover:bg-red-500",
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium text-white transition disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}