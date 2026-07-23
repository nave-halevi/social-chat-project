const variants = {
  primary:
    "bg-red-600 hover:bg-red-500 text-white border border-red-600",

  secondary:
    "bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700",

  danger:
    "bg-red-700 hover:bg-red-600 text-white border border-red-700",

  ghost:
    "bg-transparent hover:bg-zinc-900 text-zinc-300 border border-zinc-700",
};

export default function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}) {
  return (
    <button
      type={type}
      className={`
        inline-flex
        items-center
        justify-center
        rounded-xl
        px-5
        py-2.5
        font-semibold
        transition-all
        duration-200
        focus:outline-none
        focus:ring-2
        focus:ring-red-500
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
