const SIZE_PX: Record<string, number> = {
  xs: 20,
  sm: 32,
  md: 36,
  lg: 40,
  xl: 56,
}

const SIZE_CLASS: Record<string, string> = {
  xs: 'w-5 h-5',
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-10 h-10',
  xl: 'w-14 h-14',
}

/** Outer wrapper is 2px larger on each side to accommodate the ring */
const RING_SIZE_CLASS: Record<string, string> = {
  xs: 'w-6 h-6',
  sm: 'w-9 h-9',
  md: 'w-10 h-10',
  lg: 'w-11 h-11',
  xl: 'w-16 h-16',
}

const BG_COLORS    = '0a5b83,1c799f,69d2e7,f1f4dc,f88c49'
const SHAPE_COLORS = '0a5b83,1c799f,69d2e7,f1f4dc,f88c49'

type AvatarSize = keyof typeof SIZE_PX

export default function Avatar({
  name,
  email,
  size = 'md',
  square = false,
  glow = false,
  className = '',
}: {
  name?:      string | null
  email?:     string | null
  size?:      AvatarSize
  square?:    boolean
  /** When true, renders the iris gradient ring + subtle glow shadow */
  glow?:      boolean
  className?: string
}) {
  const seed = encodeURIComponent(name || email || 'User')
  const px   = SIZE_PX[size] ?? SIZE_PX.md

  const src = [
    'https://api.dicebear.com/9.x/shapes/svg',
    `?seed=${seed}`,
    `&size=${px * 2}`,
    `&backgroundColor=${BG_COLORS}`,
    `&backgroundType=solid`,
    `&scale=120`,
    `&shape1Color=${SHAPE_COLORS}`,
    `&shape2Color=${SHAPE_COLORS}`,
    `&shape3Color=${SHAPE_COLORS}`,
    `&clip=true`,
    `&randomizeIds=true`,
  ].join('')

  const roundClass = square ? 'rounded-lg' : 'rounded-full'

  if (glow) {
    return (
      /* Gradient ring wrapper */
      <div
        className={`
          flex-shrink-0 flex items-center justify-center p-0.5 bg-none
          ${RING_SIZE_CLASS[size] ?? RING_SIZE_CLASS.md}
          ${roundClass}
          ${className}
        `}
      >
        <div
          className={`
            overflow-hidden w-full h-full
            ${roundClass}
          `}
          /* 1 px border of surface so the ring doesn't bleed into the image */
          style={{ border: '1.5px solid var(--bg-surface)' }}
        >
          <img
            src={src}
            alt={name || 'Avatar'}
            width={px}
            height={px}
            className="block w-full h-full"
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        flex-shrink-0 overflow-hidden
        ${SIZE_CLASS[size] ?? SIZE_CLASS.md}
        ${roundClass}
        ${className}
      `}
    >
      <img
        src={src}
        alt={name || 'Avatar'}
        width={px}
        height={px}
        className="block w-full h-full"
      />
    </div>
  )
}