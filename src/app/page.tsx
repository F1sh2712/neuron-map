import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      <style>{`
        @keyframes orbit-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbit-fast { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.9; } }
        .orbit-ring-1 { animation: orbit-slow 28s linear infinite; }
        .orbit-ring-2 { animation: orbit-slow 44s linear infinite; }
        .orbit-moon { animation: orbit-fast 9s linear infinite; }
        .star-tw { animation: twinkle 3.2s ease-in-out infinite; }
      `}</style>

      {/* starfield */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        {[
          [7, 12, 1.5, 0], [18, 68, 1, 1.1], [26, 30, 2, 0.4], [37, 82, 1, 2.1],
          [44, 15, 1.5, 1.6], [55, 55, 1, 0.2], [63, 24, 2, 2.6], [71, 74, 1, 0.9],
          [79, 38, 1.5, 1.9], [86, 61, 1, 0.6], [92, 20, 2, 1.4], [12, 45, 1, 2.4],
          [31, 58, 1, 3], [49, 88, 1.5, 0.8], [68, 8, 1, 2.2], [95, 84, 1.5, 2.8],
        ].map(([x, y, size, delay], i) => (
          <span
            key={i}
            className="star-tw absolute rounded-full bg-white"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>

      {/* nav */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="NeuronMap" className="w-8 h-8 rounded-lg" />
          <span className="font-bold">NeuronMap</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="bg-violet-600 hover:bg-violet-500 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Open your universe
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-zinc-400 hover:text-white px-3 py-2 transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="bg-violet-600 hover:bg-violet-500 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-2 gap-12 items-center pt-10 md:pt-20 pb-16">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Turn your notes into a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-amber-300">
                universe
              </span>
            </h1>
            <p className="mt-5 text-lg text-zinc-400 leading-relaxed">
              Upload your Markdown study notes. AI maps every concept and how they
              connect — then renders them as a living cosmic graph you can explore.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                href={user ? '/dashboard' : '/register'}
                className="bg-violet-600 hover:bg-violet-500 font-medium rounded-xl px-6 py-3 transition-colors"
              >
                {user ? 'Open your universe' : 'Start mapping — free'}
              </Link>
              <a
                href="https://github.com/F1sh2712/neuron-map"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                View source on GitHub →
              </a>
            </div>
          </div>

          {/* orbital visual */}
          <div aria-hidden className="relative h-72 md:h-96 flex items-center justify-center">
            {/* star */}
            <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 shadow-[0_0_60px_12px_rgba(245,158,11,0.35)]" />
            {/* planet orbit */}
            <div className="orbit-ring-1 absolute w-56 h-56 rounded-full border border-white/10">
              <div className="absolute -top-2.5 left-1/2 -ml-2.5 w-5 h-5 rounded-full bg-gradient-to-br from-violet-300 to-violet-600 shadow-[0_0_24px_4px_rgba(139,92,246,0.4)]">
                {/* asteroid around the planet */}
                <div className="orbit-moon absolute inset-0">
                  <div className="absolute -top-3 left-1/2 -ml-1 w-2 h-2 rounded-full bg-zinc-300" />
                </div>
              </div>
            </div>
            {/* second planet orbit */}
            <div className="orbit-ring-2 absolute w-80 h-80 rounded-full border border-white/10">
              <div className="absolute top-1/2 -right-2 -mt-2 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-200 to-cyan-500 shadow-[0_0_20px_3px_rgba(34,211,238,0.35)]" />
            </div>
          </div>
        </div>

        {/* how it works */}
        <section className="pb-24">
          <h2 className="text-center text-sm uppercase tracking-widest text-zinc-500 mb-10">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Upload your notes',
                body: 'Drop in a Markdown file — lecture notes, textbook chapters, anything with headings.',
              },
              {
                step: '02',
                title: 'AI maps the knowledge',
                body: 'AI extracts every concept, tiers them into stars, planets and asteroids, and finds the relationships between them.',
              },
              {
                step: '03',
                title: 'Explore your universe',
                body: 'Watch planets orbit their stars, drag them around, and click any body to read what it means.',
              },
            ].map((f) => (
              <div key={f.step} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6">
                <div className="text-violet-500 font-mono text-sm mb-3">{f.step}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between text-xs text-zinc-600">
          <span>NeuronMap — an AI-supervised engineering project</span>
          <a
            href="https://github.com/F1sh2712/neuron-map"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
