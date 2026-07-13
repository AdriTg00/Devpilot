type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        rounded-[6px]
        border
        border-emerald-900/30
        bg-slate-900/40
        p-6
        shadow-lg
        backdrop-blur-sm
        cyber-glow
        ${className}
      `}
    >
      {children}
    </div>
  );
}