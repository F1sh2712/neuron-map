// Engraved marks for the three knowledge tiers: star, planet, moon.
export function LevelMark({ level, className = 'w-4 h-4 flex-none' }: { level: string; className?: string }) {
  if (level === 'star') {
    return (
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
        <path d="M 8 1 L 9.4 6.6 L 15 8 L 9.4 9.4 L 8 15 L 6.6 9.4 L 1 8 L 6.6 6.6 Z" fill="#43301a"></path>
      </svg>
    )
  }
  if (level === 'planet') {
    return (
      <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="#43301a" strokeWidth="1.4"></circle>
        <circle cx="8" cy="8" r="1.8" fill="#43301a"></circle>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="2.6" fill="#6b5637"></circle>
    </svg>
  )
}
