type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl
        border
        border-slate-800
        bg-slate-900
        p-6
        shadow-lg
        ${className}
      `}
    >
      {children}
    </div>
  );
}