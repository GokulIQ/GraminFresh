export default function SectionHeader({
  eyebrow,
  title,
  count,
  countLabel = 'items',
}) {
  const showCount = count !== undefined && count !== null

  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
      </div>

      {showCount && (
        <small>
          {count} {countLabel}
        </small>
      )}
    </div>
  )
}