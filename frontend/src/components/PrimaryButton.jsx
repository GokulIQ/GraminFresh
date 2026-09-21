export default function PrimaryButton({
  children,
  loading = false,
  className = '',
  disabled,
  ...buttonProps
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`group flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-dark via-primary to-primary-light px-5 py-3.5 font-semibold text-white shadow-crate transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-12px_rgba(47,82,51,0.55)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...buttonProps}
    >
      {loading && (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
      )}

      <span>
        {loading ? 'Please wait...' : children}
      </span>

      {!loading && (
        <span className="transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      )}
    </button>
  )
}