export function LogoMark({ className = 'size-7' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--ink)" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="var(--bg)" strokeWidth="2.75" />
      <circle cx="23" cy="9" r="3.25" fill="var(--accent)" stroke="var(--ink)" strokeWidth="1.5" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">Orbit</span>
    </span>
  )
}
