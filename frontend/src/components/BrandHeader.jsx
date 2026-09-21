export default function BrandHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="pt-10 pb-6 px-6">
      <div className="flex items-center gap-2.5 mb-6">
        <img
          src="/graminfresh-logo.svg"
          alt=""
          className="h-[34px] w-[34px]"
        />
        <span className="font-display font-semibold text-primary text-lg tracking-tight">
          GraminFresh
        </span>
      </div>

      {eyebrow && (
        <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-2">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-2xl font-semibold text-ink leading-snug">
        {title}
      </h1>
      {subtitle && <p className="text-ink/60 text-sm mt-2">{subtitle}</p>}
    </div>
  )
}
