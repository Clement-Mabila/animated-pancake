import type { CSSProperties } from 'react'

/** Minimum listbox width so suggestions stay readable in narrow preview columns */
export const SUGGESTION_DROPDOWN_MIN_WIDTH_PX = 260

/** Above admin shell / modals (z-50 ≈ 50, some overlays use 100) */
export const SUGGESTION_DROPDOWN_Z_INDEX = 10_050

const VIEWPORT_PAD = 8

/**
 * Fixed position for a portaled suggestion list: at least {@link SUGGESTION_DROPDOWN_MIN_WIDTH_PX},
 * aligned to the field but clamped so the panel does not overflow the viewport.
 */
export function getFixedSuggestionDropdownStyle(rect: DOMRect): CSSProperties {
  const maxPanel = window.innerWidth - VIEWPORT_PAD * 2
  const panelWidth = Math.max(
    SUGGESTION_DROPDOWN_MIN_WIDTH_PX,
    Math.min(rect.width, maxPanel),
  )
  let left = rect.left
  const maxLeft = window.innerWidth - VIEWPORT_PAD - panelWidth
  if (left > maxLeft) left = Math.max(VIEWPORT_PAD, maxLeft)
  return {
    position: 'fixed',
    top:      rect.bottom + 4,
    left,
    width:    panelWidth,
    zIndex:   SUGGESTION_DROPDOWN_Z_INDEX,
  }
}
