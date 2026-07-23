export default function Input({ label, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-zinc-300">{label}</label>
      )}

      <input
        className={`
          w-full
          rounded-xl
          border
          border-zinc-700
          bg-zinc-900
          px-4
          py-3
          text-white
          outline-none
          transition-all
          duration-200

          placeholder:text-zinc-500

          focus:border-red-500
          focus:ring-2
          focus:ring-red-500/20

          ${className}
        `}
        {...props}
      />
    </div>
  );
}
