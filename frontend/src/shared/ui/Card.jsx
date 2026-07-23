export default function Card({ children, className = "" }) {
  return (
    <div
      className={`
        rounded-xl
        border
        border-zinc-800
        bg-zinc-900/80
        backdrop-blur-sm
        p-8
        shadow-2xl
        ${className}
      `}
    >
      {children}
    </div>
  );
}
