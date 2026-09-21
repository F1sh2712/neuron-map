import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/SignOutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    // Locked to the viewport: the app shell never scrolls. Pages scroll inside
    // the wrapper below; the chat panel scrolls inside its own message list.
    <div className="h-dvh overflow-hidden text-ink flex flex-col">
      <nav className="flex-none flex items-baseline justify-between px-7 py-3.5 border-b-[1.5px] border-ink z-20">
        <div className="flex items-baseline gap-8">
          <Link href="/dashboard" className="font-semibold tracking-[0.2em] hover:text-vermilion transition-colors">
            NEURONMAP
          </Link>
          <div className="flex items-baseline gap-6 text-[15px]">
            <Link href="/dashboard" className="italic text-ink-faded hover:text-ink transition-colors">
              Documents
            </Link>
            <Link href="/universe" className="italic text-ink-faded hover:text-ink transition-colors">
              Universe
            </Link>
            <Link href="/upload" className="italic text-ink-faded hover:text-ink transition-colors">
              Upload
            </Link>
          </div>
        </div>
        <div className="flex items-baseline gap-6 text-[15px]">
          <Link href="/settings" className="italic text-ink-faded hover:text-ink transition-colors">
            Settings
          </Link>
          <SignOutButton />
        </div>
      </nav>
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">{children}</div>
    </div>
  )
}
