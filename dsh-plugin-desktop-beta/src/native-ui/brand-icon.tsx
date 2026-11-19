/**
 * The product mark.
 *
 * One inline copy of the shipped app icon so the sign-in gate, the sidebar and the
 * conversation hero all draw the same artwork without shipping a raster asset to the
 * renderer. `build/app-icon.svg` is the canonical vector source; keep this in step with it.
 */
import { useId } from 'react'

/** Gradient and filter ids must be unique per instance, so two marks never capture each other's paint. */
export function BrandIcon({ size = 24, className }: { size?: number; className?: string }): JSX.Element {
  const uid = `tbIcon${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const background = `url(#${uid}Bg)`
  const glow = `url(#${uid}Glow)`
  const planeTop = `url(#${uid}PlaneTop)`
  const planeBottom = `url(#${uid}PlaneBottom)`
  return <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden="true" className={className}>
    <defs>
      <linearGradient id={`${uid}Bg`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2F68F6" />
        <stop offset="0.52" stopColor="#1E9FE8" />
        <stop offset="1" stopColor="#2ECBA6" />
      </linearGradient>
      <radialGradient id={`${uid}Glow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${uid}PlaneTop`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#63A6FF" />
        <stop offset="1" stopColor="#2C74F2" />
      </linearGradient>
      <linearGradient id={`${uid}PlaneBottom`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1B58D8" />
        <stop offset="1" stopColor="#123BA8" />
      </linearGradient>
      <clipPath id={`${uid}Round`}><rect width="512" height="512" rx="116" ry="116" /></clipPath>
      <filter id={`${uid}Shadow`} x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#0B3D9E" floodOpacity="0.26" />
      </filter>
    </defs>
    <g clipPath={`url(#${uid}Round)`}>
      <rect width="512" height="512" rx="116" ry="116" fill={background} />
      <circle cx="420" cy="66" r="270" fill={glow} />
      <path d="M-40 470 Q 256 372 552 470 L 552 552 L -40 552 Z" fill="#FFFFFF" opacity="0.1" />
      <path d="M-40 506 Q 256 424 552 506 L 552 552 L -40 552 Z" fill="#0B48B8" opacity="0.13" />
      <path d="M438 48 C441 70 446 75 468 78 C446 81 441 86 438 108 C435 86 430 81 408 78 C430 75 435 70 438 48 Z" fill="#FFFFFF" opacity="0.96" />
      <g filter={`url(#${uid}Shadow)`}>
        <path d="M168 330 C170 374 152 402 122 422 C111 429 102 417 112 405 L154 346 Z" fill="#FFFFFF" />
        <rect x="96" y="118" width="320" height="236" rx="78" ry="78" fill="#FFFFFF" />
      </g>
      <g transform="translate(256 236) scale(0.88) translate(-256 -236)">
        <path d="M358 160 L150 236 L193 277 Z" fill={planeTop} />
        <path d="M358 160 L193 277 L236 318 Z" fill={planeBottom} />
        <path d="M358 160 L193 277" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      </g>
    </g>
  </svg>
}