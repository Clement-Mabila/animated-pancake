import type { Metadata } from 'next'
import { ToastProvider } from '@/context/ToastContext'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'MBody AI — Client Onboarding',
  description: 'Orchestrator client onboarding checklist',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" className={cn("scroll-smooth", "font-sans", geist.variable)}>
      <body className="font-sans bg-[var(--bg-primary)] text-[var(--text-body)] min-h-screen antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}