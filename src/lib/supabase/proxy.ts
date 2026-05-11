import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase client for Next.js Proxy — follows @supabase/ssr middleware pattern
 * so auth cookie updates are applied to the outgoing response.
 */
export function createProxySupabase(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  return { supabase, getResponse: () => response }
}

export function redirectWithSupabaseCookies(url: URL, supabaseResponse: NextResponse) {
  const redirect = NextResponse.redirect(url)
  const setCookies = supabaseResponse.headers.getSetCookie?.() ?? []
  for (const c of setCookies) {
    redirect.headers.append('Set-Cookie', c)
  }
  return redirect
}
