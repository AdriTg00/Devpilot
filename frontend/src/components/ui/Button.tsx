type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        rounded-xl
        bg-emerald-500
        px-5
        py-3
        font-medium
        text-white
        transition
        hover:bg-emerald-400
        disabled:opacity-50
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}