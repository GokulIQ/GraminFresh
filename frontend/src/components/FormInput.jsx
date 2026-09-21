export default function FormInput({
  id,
  label,
  prefix,
  error,
  className = '',
  ...inputProps
}) {
  return (
    <div className={`mb-5 ${className}`}>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-ink/85"
      >
        {label}
      </label>

      <div
        className={`flex min-h-[58px] items-center overflow-hidden rounded-2xl border bg-white/55 shadow-input backdrop-blur-md transition-all duration-200 focus-within:-translate-y-0.5 focus-within:bg-white/80 focus-within:ring-4 ${
          error
            ? 'border-clay/60 focus-within:border-clay focus-within:ring-clay/10'
            : 'border-white/80 focus-within:border-primary/60 focus-within:ring-primary/10'
        }`}
      >
        {prefix && (
          <span className="flex h-7 items-center border-r border-ink/10 px-4 text-sm font-medium text-ink/45">
            {prefix}
          </span>
        )}

        <input
          id={id}
          className="min-w-0 flex-1 bg-transparent px-4 py-4 text-[15px] text-ink outline-none placeholder:text-ink/35 disabled:cursor-not-allowed disabled:opacity-60"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-xs font-medium text-clay"
        >
          {error}
        </p>
      )}
    </div>
  )
}