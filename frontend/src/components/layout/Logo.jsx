import { useId } from 'react'

/**
 * Orbit mark: a dark graphite tile (same in every theme, so it reads as a
 * brand mark rather than inverting), a white orbit ring, and a planet in the
 * user's accent colour sitting on the ring with a small gap cut around it.
 */
export function LogoMark({ className = 'size-7' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2A2A30" />
          <stop offset="1" stopColor="#121215" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-tile)`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.12" />
      {/* orbit ring */}
      <circle cx="16" cy="16" r="7.25" fill="none" stroke="#F4F4F5" strokeWidth="2.5" />
      {/* planet, with a tile-coloured halo that cuts the ring */}
      <circle cx="21.13" cy="10.87" r="3.1" fill="var(--accent)" stroke="#1F1F24" strokeWidth="2" paintOrder="stroke" />
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
