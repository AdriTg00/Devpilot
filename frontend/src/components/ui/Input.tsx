import { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex-1 rounded-lg border border-emerald-900/30 bg-slate-800/60 px-4 py-3 text-white outline-none backdrop-blur-sm transition-all duration-200 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.15)] placeholder:text-slate-600 ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
export default Input;
