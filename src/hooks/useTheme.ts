'use client'

import { useState, useEffect } from 'react'

const COOKIE = 'mbody-theme'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function readThemeCookie(): 'dark' | 'light' | null {
  const match = document.cookie.match(/(?:^|;\s*)mbody-theme=(dark|light)/)
  return (match?.[1] as 'dark' | 'light') ?? null
}

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = readThemeCookie()
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = saved ?? (prefersDark ? 'dark' : 'light')
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const toggle = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      document.cookie = `${COOKIE}=${next};path=/;max-age=${MAX_AGE};SameSite=Lax`
      return next
    })
  }

  return { theme, toggle }
}
