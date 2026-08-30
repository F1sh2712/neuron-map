import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/SignOutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <nav className="flex items-center justify-between px-6 py-3 border-b border-zinc-900 bg-zinc-950/95 sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/icon.svg" alt="NeuronMap" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-white text-sm">NeuronMap</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              Documents
            </Link>
            <Link href="/upload" className="text-zinc-400 hover:text-white transition-colors">
              Upload
            </Link>
          </div>
        </div>
        <SignOutButton />
      </nav>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  )
}
