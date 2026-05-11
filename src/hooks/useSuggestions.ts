'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import type { ConfigSuggestion } from '@/types'

const PAGE_SIZE = 5

// ─── Fuzzy / ranked matching ────────────────────────────────────────────────
// Returns a score: higher = better match.
// Exact prefix → 3, contains whole word → 2, contains substring → 1, no match → 0
function matchScore(value: string, query: string): number {
  const v = value.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return 1                                   // empty query → show all
  if (v === q) return 0                              // exact match → hide (already typed)
  if (v.startsWith(q)) return 3
  const wordBoundary = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  if (wordBoundary.test(v)) return 2
  if (v.includes(q)) return 1
  return 0
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSuggestions(
  sectionId: string | undefined,
  fieldKey:  string | undefined,
  industry?: string | null,
) {
  const enabled = !!(sectionId && fieldKey)

  const [allSuggestions, setAllSuggestions] = useState<ConfigSuggestion[]>([])
  const [open,          setOpen]          = useState(false)
  const [page,          setPage]          = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [activeIndex,   setActiveIndex]   = useState(-1)   // keyboard nav

  const fetchedRef  = useRef(false)
  const abortRef    = useRef<AbortController | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const doFetch = useCallback(async (force = false) => {
    if (!enabled) return
    if (fetchedRef.current && !force) return

    // Cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    fetchedRef.current = true
    setLoading(true)
    try {
      const { getSuggestionsForField } = await import('@/lib/supabase/queries')
      const data = await getSuggestionsForField(sectionId!, fieldKey!, industry)
      setAllSuggestions(data)
    } catch {
      // suggestions are non-critical — fail silently
    } finally {
      setLoading(false)
    }
  }, [enabled, sectionId, fieldKey, industry])

  // ── Optimistic add ─────────────────────────────────────────────────────────
  // Call this immediately after a successful save so the value appears in
  // subsequent dropdowns without waiting for a re-fetch.
  const addOptimistic = useCallback((value: string, ind?: string | null) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setAllSuggestions(prev => {
      const existing = prev.find(
        s => s.value.toLowerCase() === trimmed.toLowerCase(),
      )
      if (existing) {
        // bump usage count in local state
        return prev.map(s =>
          s.id === existing.id
            ? { ...s, usage_count: s.usage_count + 1 }
            : s,
        )
      }
      // Insert as a new optimistic entry (negative id signals it's local-only)
      const optimistic: ConfigSuggestion = {
        id:               `optimistic-${Date.now()}`,
        section_id:       sectionId!,
        field_key:        fieldKey!,
        value:            trimmed,
        usage_count:      1,
        is_mbody_default: false,
        industry:         ind ?? null,
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }
      return [optimistic, ...prev]
    })
  }, [sectionId, fieldKey])

  // Force re-fetch from DB (e.g. after navigating back to this section)
  const refresh = useCallback(() => {
    fetchedRef.current = false
    doFetch(true)
  }, [doFetch])

  // ── Filter + rank ──────────────────────────────────────────────────────────
  function filter(inputValue: string): ConfigSuggestion[] {
    if (!enabled) return []
    const q = inputValue.trim()
    return allSuggestions
      .map(s => ({ s, score: matchScore(s.value, q) }))
      .filter(({ score }) => score > 0)
      // mbody defaults always float to top within the same score tier
      .sort((a, b) =>
        b.score - a.score ||
        Number(b.s.is_mbody_default) - Number(a.s.is_mbody_default) ||
        b.s.usage_count - a.s.usage_count,
      )
      .map(({ s }) => s)
  }

  function getPage(filtered: ConfigSuggestion[]): ConfigSuggestion[] {
    return filtered.slice(0, (page + 1) * PAGE_SIZE)  // cumulative — show more appends
  }

  function hasMore(filtered: ConfigSuggestion[]): boolean {
    return filtered.length > (page + 1) * PAGE_SIZE
  }

  // ── Open / close ───────────────────────────────────────────────────────────
  function onFocus() {
    if (!enabled) return
    doFetch()
    setOpen(true)
    setActiveIndex(-1)
  }

  function onClose() {
    setOpen(false)
    setPage(0)
    setActiveIndex(-1)
  }

  function showMore() {
    setPage(p => p + 1)
    setActiveIndex(-1)
  }

  function resetPage() {
    setPage(0)
    setActiveIndex(-1)
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────
  // Returns the selected value if Enter pressed, otherwise null.
  function handleKey(
    e: React.KeyboardEvent,
    visibleSuggestions: ConfigSuggestion[],
    onSelect: (value: string) => void,
  ) {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, visibleSuggestions.length - 1))
        break

      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, -1))
        break

      case 'Enter':
        if (activeIndex >= 0 && visibleSuggestions[activeIndex]) {
          e.preventDefault()
          onSelect(visibleSuggestions[activeIndex].value)
        }
        break

      case 'Escape':
        e.preventDefault()
        onClose()
        break

      case 'Tab':
        // Accept top suggestion on Tab if nothing manually highlighted
        if (activeIndex === -1 && visibleSuggestions[0]) {
          onSelect(visibleSuggestions[0].value)
        } else if (activeIndex >= 0 && visibleSuggestions[activeIndex]) {
          e.preventDefault()
          onSelect(visibleSuggestions[activeIndex].value)
        }
        break
    }
  }

  return {
    enabled,
    open,
    loading,
    activeIndex,
    filter,
    getPage,
    hasMore,
    onFocus,
    onClose,
    showMore,
    resetPage,
    handleKey,
    addOptimistic,
    refresh,
    PAGE_SIZE,
  }
}