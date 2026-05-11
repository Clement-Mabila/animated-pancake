'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Eye, EyeOff, BrainCog } from 'lucide-react'
import {
  signInWithPasswordAction,
  signInWithMagicLinkAction,
  type AuthActionResult,
} from '@/app/admin/actions/auth'

function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.1 268.1-317.1 99.7 0 182.4 65.7 244.7 65.7 59.5 0 152.7-69.7 263.4-69.7 40.4 0 112.7 4 173.4 65.9zm-169.4-99.4c-8.4-36.4-25.1-74.8-51.6-106.7-36.7-43.3-84.3-74.9-131-74.9-4.6 0-9.3.3-13.9 1.1 1.6 43.2 16.9 84.7 45.1 121.9 26.4 35.4 74.3 67 151.4 58.6z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

// Multi-layer radial gradients have no Tailwind equivalent — isolated here as the only inline style.
const RIGHT_PANEL_BG = {
  background: `
    radial-gradient(ellipse 90% 55% at 75% 18%, rgba(120,175,255,0.92) 0%, transparent 52%),
    radial-gradient(ellipse 55% 75% at 25% 85%, rgba(40,90,210,0.80) 0%, transparent 50%),
    radial-gradient(ellipse 70% 45% at 88% 65%, rgba(190,220,255,0.55) 0%, transparent 42%),
    radial-gradient(ellipse 50% 60% at 15% 35%, rgba(60,110,230,0.60) 0%, transparent 45%),
    radial-gradient(ellipse 80% 40% at 60% 90%, rgba(80,140,255,0.45) 0%, transparent 50%),
    linear-gradient(155deg, #060c20 0%, #0b1c5a 35%, #1a3585 65%, #060e22 100%)
  `,
}

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const err = searchParams.get('error')
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const emailRef = useRef('')

  const [pwState, pwAction, pwPending] = useActionState(
    signInWithPasswordAction,
    undefined as AuthActionResult | undefined
  )
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithMagicLinkAction,
    undefined as AuthActionResult | undefined
  )

  useEffect(() => {
    if (pwState?.ok && pwState.step === 'awaiting_otp') {
      router.push(`/admin/login/verify?email=${encodeURIComponent(emailRef.current)}`)
    }
    if (pwState?.ok && pwState.step === 'skip_otp') {
      router.push('/admin')
    }
  }, [pwState, router])

  useEffect(() => {
    if (magicState?.ok) {
      router.push(`/admin/login/verify?email=${encodeURIComponent(emailRef.current)}&hint=magic`)
    }
  }, [magicState, router])

  return (
    // w-4/5 = 80% ≈ 80vw  |  max-w-6xl = 1152px (closest standard to 1100px)  |  min-h-screen = closest standard to 90vh
    <div className="w-4/5 max-w-6xl min-h-screen rounded-3xl overflow-hidden flex shadow-2xl">

      {/* ── Left panel ── */}
      <div className="w-1/2 bg-neutral-100 flex flex-col px-12 py-12 overflow-y-auto">

        {/* Top: Logo + Heading */}
        <div>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <BrainCog size={26} className="text-white" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-tight">MBody Orion Console</span>
          </div>

          {/* text-xl = 20px, closest standard to original 22px */}
          <h1 className="text-xl font-normal text-gray-900">Welcome Back!</h1>
          <p className="text-sm text-gray-500">We Are Happy To See You Again</p>
        </div>

        {/* Middle: Form — vertically centered */}
        <div className="flex-1 flex flex-col justify-center py-5 w-full max-w-sm mx-auto">

          {/* Error banners */}
          {err === 'not_admin' && (
            <p className="text-sm mb-4 font-medium text-red-500">This account is not in the admin allowlist.</p>
          )}
          {err === 'callback' && (
            <p className="text-sm mb-4 font-medium text-red-500">Sign-in link expired or invalid. Try again.</p>
          )}

          {/* Tab switcher */}
          <div className="flex rounded-full border border-gray-200 bg-white p-1 mb-6 w-full max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => setTab('signin')}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                tab === 'signin' ? 'bg-blue-500 text-white' : 'bg-transparent text-gray-500'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${
                tab === 'signup' ? 'bg-blue-500 text-white' : 'bg-transparent text-gray-500'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign In form */}
          {tab === 'signin' && (
            <>
              <form
                action={fd => {
                  emailRef.current = String(fd.get('email') ?? '')
                  return pwAction(fd)
                }}
                className="space-y-4 w-full max-w-sm mx-auto"
              >
                {/* Email */}
                <div className="relative">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 pr-11 rounded-3xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 transition-colors"
                  />
                  <Mail size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>

                {/* Password */}
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-11 rounded-3xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-colors"
                  >
                  </button>
                </div>

                {/* Remember me + Forgot password */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <span className="text-sm text-gray-700">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value ?? ''
                      emailRef.current = email
                      const fd = new FormData()
                      fd.set('email', email)
                      magicAction(fd)
                    }}
                    className="text-sm text-blue-500 font-medium hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Errors */}
                {pwState?.ok === false && (
                  <p className="text-sm text-red-500">{pwState.error}</p>
                )}
                {magicState?.ok === false && (
                  <p className="text-sm text-red-500">{magicState.error}</p>
                )}
                {magicState?.ok === true && (
                  <p className="text-sm text-green-600">Magic link sent — check your email.</p>
                )}

                {/* Login button */}
                <button
                  type="submit"
                  disabled={pwPending || magicPending}
                  className="w-full py-3.5 rounded-full bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 transition-opacity mt-1"
                >
                  {pwPending ? 'Signing in…' : magicPending ? 'Sending link…' : 'Login'}
                </button>
              </form>

              {/* OR divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Social buttons */}
              <div className="space-y-3 w-full max-w-sm mx-auto">
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 rounded-full bg-black text-white text-sm font-medium flex items-center justify-center gap-2.5 opacity-60 cursor-not-allowed"
                >
                  <AppleIcon />
                  Log in with Apple
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 rounded-full border border-gray-200 bg-white text-gray-700 text-sm font-medium flex items-center justify-center gap-2.5 opacity-60 cursor-not-allowed"
                >
                  <GoogleIcon />
                  Log in with Google
                </button>
              </div>
            </>
          )}

          {/* Sign Up panel */}
          {tab === 'signup' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <p className="text-sm text-gray-500">Need an admin account? Contact your administrator or register below.</p>
              <Link
                href="/admin/register"
                className="px-8 py-3.5 rounded-full bg-blue-500 text-white text-sm font-semibold no-underline"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — fluid blue art ── */}
      {/* Multi-layer radial gradient cannot be expressed in Tailwind — one inline style remains */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-end p-8 self-stretch"
        style={RIGHT_PANEL_BG}
      >
        {/* Glassmorphism footer pill                                              */}
        {/* bg-white/10 ≈ rgba(255,255,255,0.10)  |  backdrop-blur-lg = 16px     */}
        {/* border-white/15 ≈ rgba(255,255,255,0.15)  |  text-white/65           */}
        <div className="text-center py-3 px-5 rounded-2xl text-xs leading-relaxed bg-white/10 backdrop-blur-lg border border-white/15 text-white/65">
          <p className="font-medium">© 2026 MBody. All rights reserved.</p>
          <p className="mt-0.5">Unauthorized use or reproduction of any content or materials is prohibited.</p>
        </div>
      </div>

    </div>
  )
}