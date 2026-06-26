import { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-emerald-500 ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
export default Input;
