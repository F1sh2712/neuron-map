import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function EngravedChart() {
  return (
    <svg viewBox="0 0 780 560" className="w-full h-auto" role="img" aria-label="An engraved star chart of one document's concepts">
      {/* degree ring */}
      <g stroke="#43301a" fill="none">
        <circle cx="390" cy="280" r="256" strokeWidth="1.4"></circle>
        <circle cx="390" cy="280" r="248" strokeWidth="0.6"></circle>
      </g>
      <g stroke="#43301a" strokeWidth="1">
        <line x1="390" y1="24" x2="390" y2="36"></line>
        <line x1="390" y1="524" x2="390" y2="536"></line>
        <line x1="134" y1="280" x2="146" y2="280"></line>
        <line x1="634" y1="280" x2="646" y2="280"></line>
        <line x1="209" y1="99" x2="217" y2="108"></line>
        <line x1="571" y1="99" x2="563" y2="108"></line>
        <line x1="209" y1="461" x2="217" y2="452"></line>
        <line x1="571" y1="461" x2="563" y2="452"></line>
      </g>
      {/* orbits as fine double lines */}
      <g stroke="#6b5637" fill="none">
        <circle cx="390" cy="280" r="92" strokeWidth="0.8"></circle>
        <circle cx="390" cy="280" r="95" strokeWidth="0.4"></circle>
        <circle cx="390" cy="280" r="164" strokeWidth="0.8"></circle>
        <circle cx="390" cy="280" r="167" strokeWidth="0.4"></circle>
      </g>
      {/* the thread of shared ideas, in vermilion */}
      <path d="M 160 390 C 260 310, 520 250, 620 170" stroke="#b33a22" strokeWidth="1.2" fill="none" strokeDasharray="7 5"></path>
      <text x="596" y="158" fill="#b33a22" fontSize="13" fontStyle="italic">the thread of shared ideas</text>
      {/* central 8-point engraved star */}
      <g>
        <path d="M 390 228 L 398 268 L 438 280 L 398 292 L 390 332 L 382 292 L 342 280 L 382 268 Z" fill="#43301a"></path>
        <path d="M 390 250 L 395 275 L 420 280 L 395 285 L 390 310 L 385 285 L 360 280 L 385 275 Z" fill="#a97f26"></path>
      </g>
      <g stroke="#8a744e" strokeWidth="0.6">
        <line x1="390" y1="210" x2="390" y2="222"></line>
        <line x1="390" y1="338" x2="390" y2="350"></line>
        <line x1="320" y1="280" x2="332" y2="280"></line>
        <line x1="448" y1="280" x2="460" y2="280"></line>
      </g>
      {/* planets: engraved ringed circles */}
      <g>
        <circle cx="311" cy="221" r="7" fill="none" stroke="#43301a" strokeWidth="1.3"></circle>
        <circle cx="311" cy="221" r="2.4" fill="#43301a"></circle>
        <circle cx="524" cy="353" r="7" fill="none" stroke="#43301a" strokeWidth="1.3"></circle>
        <circle cx="524" cy="353" r="2.4" fill="#43301a"></circle>
        <circle cx="258" cy="376" r="7" fill="none" stroke="#43301a" strokeWidth="1.3"></circle>
        <circle cx="258" cy="376" r="2.4" fill="#43301a"></circle>
      </g>
      {/* gilt star: a concept shared with another document */}
      <path d="M 524 330 L 527 346 L 543 353 L 527 360 L 524 376 L 521 360 L 505 353 L 521 346 Z" fill="none" stroke="#a97f26" strokeWidth="1.2"></path>
      {/* moons */}
      <circle cx="290" cy="206" r="2.2" fill="#6b5637"></circle>
      <circle cx="332" cy="236" r="2.2" fill="#6b5637"></circle>
      {/* labels */}
      <g fill="#43301a">
        <text x="390" y="362" fontSize="17" fontWeight="600" textAnchor="middle" letterSpacing="0.12em">GRAPH ALGORITHMS</text>
        <text x="311" y="198" fontSize="15" fontStyle="italic" textAnchor="middle">Graph Traversal</text>
        <text x="524" y="398" fontSize="15" fontStyle="italic" textAnchor="middle">Shortest Paths</text>
        <text x="258" y="402" fontSize="15" fontStyle="italic" textAnchor="middle">Representations</text>
      </g>
      {/* compass rosette */}
      <g transform="translate(706, 480)" stroke="#43301a" fill="none">
        <circle r="20" strokeWidth="1"></circle>
        <path d="M 0 -20 L 4 0 L 0 20 L -4 0 Z" fill="#43301a" stroke="none"></path>
        <path d="M -20 0 L 0 4 L 20 0 L 0 -4 Z" fill="#8a744e" stroke="none"></path>
      </g>
    </svg>
  )
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen text-ink relative">
      {/* plate border */}
      <div aria-hidden className="pointer-events-none fixed inset-4 border-[1.5px] border-ink hidden md:block"></div>
      <div aria-hidden className="pointer-events-none fixed inset-[22px] border-[0.5px] border-ink-line hidden md:block"></div>

      <div className="relative max-w-6xl mx-auto px-8 md:px-14 py-10">
        {/* nav */}
        <nav className="flex items-baseline justify-between gap-6 flex-wrap">
          <div className="font-semibold text-lg tracking-[0.22em]">NEURONMAP</div>
          <div className="flex items-baseline gap-7">
            <a href="#how-it-works" className="italic text-ink-faded hover:text-ink transition-colors">How it works</a>
            {user ? (
              <Link
                href="/dashboard"
                className="tracking-[0.1em] border-[1.5px] border-ink px-5 py-2 shadow-plate-sm hover:bg-paper-card transition-colors"
              >
                OPEN YOUR ATLAS
              </Link>
            ) : (
              <>
                <Link href="/login" className="italic text-ink-faded hover:text-ink transition-colors">Sign in</Link>
                <Link
                  href="/register"
                  className="tracking-[0.1em] border-[1.5px] border-ink px-5 py-2 shadow-plate-sm hover:bg-paper-card transition-colors"
                >
                  BEGIN YOUR ATLAS
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* hero */}
        <div className="flex items-center gap-14 mt-14 md:mt-10 flex-col lg:flex-row">
          <div className="lg:w-[460px] flex-none">
            <p className="italic text-ink-faded">Atlas of one&apos;s own knowledge, drawn anew</p>
            <h1 className="text-5xl md:text-6xl leading-[1.05] font-semibold mt-3">Your notes are a universe.</h1>
            <p className="text-lg leading-relaxed text-ink-soft mt-5 max-w-md">
              Upload your study notes and NeuronMap charts every concept they
              contain — core topics as stars, subtopics in orbit around them —
              then lets you explore the map and ask it questions.
            </p>
            <div className="flex items-center gap-6 mt-8 flex-wrap">
              <Link
                href={user ? '/upload' : '/register'}
                className="tracking-[0.08em] text-paper-card bg-ink px-7 py-3 shadow-plate hover:bg-ink-soft transition-colors"
              >
                {user ? 'Chart new notes' : 'Begin your atlas'}
              </Link>
              <Link href={user ? '/universe' : '/login'} className="italic border-b border-ink-line pb-px hover:text-vermilion transition-colors">
                {user ? 'or open your universe' : 'or view a finished chart'}
              </Link>
            </div>
            <p className="italic text-sm text-ink-line mt-9">Markdown in, universe out — free while in beta</p>
          </div>

          <div className="flex-1 w-full max-w-2xl relative">
            <EngravedChart />
            <p className="italic text-[13px] text-ink-faded text-center mt-1">
              Fig. I — The system of Graph Algorithms, eleven bodies, as surveyed from one student&apos;s notes
            </p>
          </div>
        </div>

        {/* three steps */}
        <div id="how-it-works" className="grid grid-cols-1 md:grid-cols-3 border-t-[1.5px] border-ink mt-14">
          <div className="py-6 md:pr-8">
            <h2 className="text-xl font-semibold">I. Upload your notes</h2>
            <p className="text-[15px] leading-relaxed text-ink-soft mt-1">Any Markdown file — lecture notes, summaries, readings.</p>
          </div>
          <div className="py-6 md:px-8 md:border-l-[0.75px] border-ink-line">
            <h2 className="text-xl font-semibold">II. AI draws the chart</h2>
            <p className="text-[15px] leading-relaxed text-ink-soft mt-1">Every concept is placed — stars, planets, moons — with the links between them.</p>
          </div>
          <div className="py-6 md:pl-8 md:border-l-[0.75px] border-ink-line">
            <h2 className="text-xl font-semibold">III. Explore and ask</h2>
            <p className="text-[15px] leading-relaxed text-ink-soft mt-1">Wander the map and question it — answers cite the exact concepts.</p>
          </div>
        </div>

        {/* footer */}
        <footer className="flex items-baseline justify-between border-t-[0.75px] border-ink-line pt-5 pb-2 mt-2">
          <p className="italic text-sm text-ink-faded">Drawn with care by a student, for students.</p>
          <a
            href="https://github.com/F1sh2712/neuron-map"
            target="_blank"
            rel="noreferrer"
            className="italic text-sm text-ink-faded hover:text-ink transition-colors"
          >
            The making of this atlas, on GitHub
          </a>
        </footer>
      </div>
    </div>
  )
}
