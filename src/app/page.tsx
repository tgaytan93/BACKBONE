'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

type TerminalLine = { text: string; delay: number; accent?: boolean };

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function BackboneLanding() {
  const [uptime, setUptime] = useState(99.99);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [loopKey, setLoopKey] = useState(0);

  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [whatsBroken, setWhatsBroken] = useState('');
  const [tier, setTier] = useState('');
  const [budget, setBudget] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitState === 'submitting') return;

    if (!name.trim() || !whatsBroken.trim()) {
      setErrorMsg('Name and what is not working are required.');
      setSubmitState('error');
      return;
    }

    setSubmitState('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          business,
          whats_broken: whatsBroken,
          tier,
          budget,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed.');
      }

      setSubmitState('success');
    } catch {
      setErrorMsg('Something went wrong. Try again or email tgaytan@backbonemade.com.');
      setSubmitState('error');
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime((u) => {
        const next = u + (Math.random() - 0.5) * 0.001;
        return Math.max(99.95, Math.min(99.999, next));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sequence: TerminalLine[] = [
      { text: '> backbone init --client', delay: 400 },
      { text: '  ✓ scoping requirements', delay: 700 },
      { text: '  ✓ architecting system', delay: 700 },
      { text: '  ✓ multi-tenant ready', delay: 700 },
      { text: '> deploy --production', delay: 600 },
      { text: '  ✓ frontend live', delay: 500 },
      { text: '  ✓ admin panel live', delay: 500 },
      { text: '  ✓ devops handoff complete', delay: 500 },
      { text: '> system online', delay: 600, accent: true },
    ];

    let cancelled = false;
    let acc = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    sequence.forEach((line) => {
      acc += line.delay;
      const t = setTimeout(() => {
        if (!cancelled) setTerminalLines((prev) => [...prev, line]);
      }, acc);
      timeouts.push(t);
    });

    const loop = setTimeout(() => {
      if (!cancelled) {
        setTerminalLines([]);
        setLoopKey((k) => k + 1);
      }
    }, acc + 4000);
    timeouts.push(loop);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [loopKey]);

  return (
    <div className="bg-black text-white min-h-screen">
      <nav className="border-b border-white/10 px-6 md:px-12 py-4 flex justify-between items-center sticky top-0 bg-black/90 backdrop-blur z-50">
        <div className="flex items-center gap-3">
          <Image
            src="/backbone-lockup-white.png"
            alt="Backbone"
            width={140}
            height={28}
            priority
            className="h-7 w-auto"
          />
        </div>
        <div className="hidden md:flex gap-8 text-xs tracking-widest">
          <a href="#work" className="hover:text-cyan-400 transition">WORK</a>
          <a href="#tiers" className="hover:text-cyan-400 transition">TIERS</a>
          <a href="#process" className="hover:text-cyan-400 transition">PROCESS</a>
          <a href="#contact" className="hover:text-cyan-400 transition">CONTACT</a>
        </div>
        <a href="#contact" className="bg-cyan-400 text-black px-3 py-1.5 text-xs font-bold tracking-wider hover:bg-white transition">START →</a>
      </nav>

      <section className="px-6 md:px-12 pt-16 md:pt-24 pb-16 max-w-7xl mx-auto">
        <div className="mb-6 font-mono text-xs">
          <span className="text-cyan-400 animate-pulse">●</span>
          <span className="text-white/60 ml-2 tracking-widest">SYS_STATUS: ONLINE — ACCEPTING NEW CLIENTS</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] mb-6">
              Systems that<br />work for you,<br />
              <span className="relative inline-block">
                not against you.
                <span className="absolute -bottom-1 left-0 w-32 h-1 bg-cyan-400" />
              </span>
            </h1>
            <p className="text-base md:text-lg text-white/70 max-w-xl mb-8 leading-relaxed">
              Custom software for businesses tired of fighting their tools. Built right the first time. Built to last.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#contact" className="bg-white text-black px-6 py-3 text-sm font-bold tracking-wider inline-flex items-center justify-center gap-2 hover:bg-cyan-400 transition group">
                START A PROJECT
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </a>
              <a href="#work" className="border border-white/20 text-white px-6 py-3 text-sm font-bold tracking-wider inline-flex items-center justify-center gap-2 hover:border-cyan-400 hover:text-cyan-400 transition">
                SEE THE WORK
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="border border-white/10 bg-zinc-950 overflow-hidden">
              <div className="border-b border-white/10 px-4 py-2 flex items-center gap-2 bg-zinc-900">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="ml-2 text-[10px] text-white/40 tracking-widest font-mono">~/backbone-studio</div>
              </div>
              <div className="p-5 h-72 overflow-hidden font-mono text-[12px]">
                {terminalLines.map((line, i) => (
                  <div key={i} className={line.accent ? 'text-cyan-400 font-bold' : 'text-white/80'} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    {line.text}
                  </div>
                ))}
                <span className="inline-block w-2 h-3 bg-cyan-400 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
          {[
            { label: 'UPTIME', value: `${uptime.toFixed(3)}%` },
            { label: 'CLIENTS', value: '01' },
            { label: 'SHIPPED', value: '03' },
            { label: 'AVG BUILD', value: '6 WKS' },
          ].map((stat) => (
            <div key={stat.label} className="bg-black px-5 py-4">
              <div className="text-xs text-white/40 mb-1.5 tracking-widest font-mono">{stat.label}</div>
              <div className="text-xl md:text-2xl font-bold tabular-nums">{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 px-6 md:px-12 py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-8 mb-10">
            <div className="md:col-span-5">
              <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">01 — THE PROBLEM</div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">Most small business software is broken on purpose.</h2>
            </div>
            <div className="md:col-span-7 md:pt-12">
              <p className="text-white/70 text-base leading-relaxed">
                Templates that almost fit. Plugins that break during your busy season. Five tools that don&apos;t talk. You spend Sunday night fixing what should just work.
              </p>
            </div>
          </div>

          <div className="border border-white/20 bg-black p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border-4 border-red-500/60 p-5">
                <div className="text-xs text-red-400 tracking-[0.25em] mb-5 font-mono pt-1">✕ TEMPLATE STACK</div>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li className="flex gap-2"><span className="text-red-400">✕</span>Manual customer entry into spreadsheets</li>
                  <li className="flex gap-2"><span className="text-red-400">✕</span>Plugins break during busy season</li>
                  <li className="flex gap-2"><span className="text-red-400">✕</span>Call dev to change a phone number</li>
                  <li className="flex gap-2"><span className="text-red-400">✕</span>Five tools, none integrated</li>
                  <li className="flex gap-2"><span className="text-red-400">✕</span>8+ hours/week of admin</li>
                </ul>
              </div>
              <div className="border-4 border-cyan-400/70 p-5">
                <div className="text-xs text-cyan-400 tracking-[0.25em] mb-5 font-mono pt-1">✓ BACKBONE SYSTEM</div>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span>Auto-captured into your database</li>
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span>Built on infra that doesn&apos;t fail</li>
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span>Edit anything in your admin panel</li>
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span>One system, fully connected</li>
                  <li className="flex gap-2"><span className="text-cyan-400">✓</span>Hours back. Every week.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="work" className="border-t border-white/10 px-6 md:px-12 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-8 mb-10">
            <div className="md:col-span-5">
              <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">02 — PROOF</div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">Real systems.<br />Real operators.</h2>
            </div>
            <div className="md:col-span-7 md:pt-12">
              <p className="text-white/70 text-base leading-relaxed">Every project shipped is a working system in production — not a portfolio piece.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            {[
              { tag: 'ESPORTS · SAAS', title: 'Serenyx League', subtitle: 'SerenyxLeague.com', link: 'https://www.serenyxleague.com', blurb: 'Fully automated league management. Player PWA, staff app, admin tooling.', specs: [['SCALE', '100+ teams · 3K members'], ['BUILD', '~1 month, solo'], ['STACK', 'Multi-tenant SaaS']] },
              { tag: 'AUTOMOTIVE · TOOL', title: 'OffsetLabs', subtitle: 'offsetlabs.studio', link: 'https://www.offsetlabs.studio', blurb: 'Heavy-math wheel fitment calculator. NHTSA + wheelsize.com integrations.', specs: [['DOMAIN', 'JDM / stance / fitment'], ['APIS', '2 third-party'], ['MODEL', 'Niche + affiliate']] },
              { tag: 'HVAC · COMING SOON', title: 'Conway Comfort', subtitle: 'Conway Comfort', link: '', blurb: 'Custom field service system. Job tracking, customer DB, invoicing, scheduling.', specs: [['VERTICAL', 'Trades / field service'], ['STATUS', 'In progress'], ['ARCH', 'Multi-tenant day one']] },
            ].map((c) => {
              const inner = (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-xs tracking-widest text-cyan-400 font-mono">{c.tag}</div>
                    <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-cyan-400 group-hover:scale-110 transition" />
                  </div>
                  <div className="mb-4 h-24 border border-white/10 bg-gradient-to-br from-zinc-900 to-black relative overflow-hidden">
                    <Image
                      src="/backbone-icon-white.png"
                      alt=""
                      width={24}
                      height={24}
                      className="absolute bottom-3 right-3 h-6 w-6 opacity-20"
                    />
                  </div>
                  <h3 className="text-lg font-black mb-2">{c.subtitle}</h3>
                  <p className="text-white/60 text-[13px] leading-relaxed mb-4">{c.blurb}</p>
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    {c.specs.map(([label, value]) => (
                      <div key={label} className="flex justify-between text-xs font-mono">
                        <span className="text-white/40 tracking-widest">{label}</span>
                        <span className="text-white/80 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
              return c.link ? (
                <a key={c.title} href={c.link} target="_blank" rel="noopener noreferrer" className="bg-black p-5 hover:bg-zinc-950 transition group cursor-pointer block">
                  {inner}
                </a>
              ) : (
                <div key={c.title} className="bg-black p-5 hover:bg-zinc-950 transition group cursor-pointer">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="tiers" className="border-t border-white/10 px-6 md:px-12 py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-8 mb-10">
            <div className="md:col-span-5">
              <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">03 — OFFERINGS</div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">Three ways to work together.</h2>
            </div>
            <div className="md:col-span-7 md:pt-12">
              <p className="text-white/70 text-base leading-relaxed">Each tier is a complete system, not a stripped-down version of the next.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            {[
              { num: '01', name: 'Foundation', price: '$8k–$12k', time: '3–4 wks', tagline: 'Looks like your business actually cares.', specs: ['Custom design (no templates)', 'Mobile + SEO ready', 'Lead capture + customer DB', 'Real hosting setup'] },
              { num: '02', name: 'Operator', price: '$20k–$30k', time: '6–10 wks', tagline: 'You stop being your own software.', featured: true, specs: ['Everything in Foundation', 'Customer portal + booking', 'Stripe payments + invoicing', 'Recurring billing', 'Full admin panel'] },
              { num: '03', name: 'Autopilot', price: '$40k–$55k', time: '3–5 mo', tagline: 'The system runs itself.', specs: ['Everything in Operator', 'Automated reminders (email/SMS)', 'Contract renewals + drip', 'Inventory + estimates', 'Reporting dashboard', 'DevOps panel — full control'] },
            ].map((tier) => (
              <div key={tier.num} className={`bg-black p-5 hover:bg-zinc-900 transition group relative ${tier.featured ? 'border-t-2 border-t-cyan-400' : ''}`}>
                {tier.featured && <div className="absolute top-0 right-0 bg-cyan-400 text-black text-xs px-2 py-1 font-bold tracking-widest">MOST COMMON</div>}
                <div className="flex justify-between items-baseline mb-4">
                  <div className="text-xs tracking-widest text-white/40 font-mono">TIER {tier.num}</div>
                  <div className="text-xs tracking-widest text-white/40 font-mono">{tier.time}</div>
                </div>
                <div className="text-xl font-black mb-2">{tier.name}</div>
                <div className="text-lg font-bold mb-4 pb-4 border-b border-white/10 tabular-nums">{tier.price}</div>
                <ul className="space-y-1.5 mb-4 text-[13px] text-white/70">
                  {tier.specs.map((s) => (
                    <li key={s} className="flex gap-2"><span className="text-cyan-400">▸</span><span>{s}</span></li>
                  ))}
                </ul>
                <p className="text-cyan-400 text-[13px] font-semibold italic pt-3 border-t border-white/10">&ldquo;{tier.tagline}&rdquo;</p>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-white/50 text-center tracking-widest font-mono">
            + SEO FOUNDATION ADD-ON · $1K–$2K · BUILT INTO LAUNCH
          </div>
        </div>
      </section>

      <section id="process" className="border-t border-white/10 px-6 md:px-12 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-8 mb-10">
            <div className="md:col-span-5">
              <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">04 — PROCESS</div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">Four steps.<br />No mystery.</h2>
            </div>
            <div className="md:col-span-7 md:pt-12">
              <p className="text-white/70 text-base leading-relaxed">Transparent from first call to handoff. You know what&apos;s happening at every stage.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-px bg-white/10">
            {[
              { num: '01', title: 'Discovery', desc: "Talk through what's broken and whether we're a fit. Free, no pressure." },
              { num: '02', title: 'Scope', desc: 'Written proposal: deliverables, timeline, fixed price. No surprises.' },
              { num: '03', title: 'Build', desc: 'You see progress as it happens. Not a black box at the end.' },
              { num: '04', title: 'Handoff', desc: 'Real onboarding. DevOps panel. You own and operate the system.' },
            ].map((step) => (
              <div key={step.num} className="bg-black p-4">
                <div className="flex items-baseline gap-3 mb-3">
                  <div className="text-cyan-400 text-sm font-bold font-mono">{step.num}</div>
                  <h3 className="text-base font-black">{step.title}</h3>
                </div>
                <p className="text-white/60 text-[13px] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 md:px-12 py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-8 mb-10">
            <div className="md:col-span-5">
              <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">05 — FIT CHECK</div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">Built for operators.<br />Not for everyone.</h2>
            </div>
            <div className="md:col-span-7 md:pt-12">
              <p className="text-white/70 text-base leading-relaxed">Backbone is premium-only. Standards don&apos;t drop. They go up over time.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-cyan-400/30 p-6 bg-black">
              <div className="text-xs tracking-[0.25em] text-cyan-400 mb-5 font-mono">✓ FOR YOU IF</div>
              <ul className="space-y-3 text-white/80 text-sm">
                <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">✓</span>You run a real business and need software that runs with you</li>
                <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">✓</span>You&apos;re tired of fighting Wix, plugins, or a developer who ghosted</li>
                <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">✓</span>You want to own your system, not rent it</li>
              </ul>
            </div>
            <div className="border border-white/10 p-6 bg-black">
              <div className="text-xs tracking-[0.25em] text-white/40 mb-5 font-mono">✕ NOT FOR YOU IF</div>
              <ul className="space-y-3 text-white/50 text-sm">
                <li className="flex gap-2"><span className="text-white/30 mt-0.5">✕</span>You&apos;re looking for the cheapest option</li>
                <li className="flex gap-2"><span className="text-white/30 mt-0.5">✕</span>You want a 5-page brochure site</li>
                <li className="flex gap-2"><span className="text-white/30 mt-0.5">✕</span>You want me to keep the keys after handoff</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 md:px-12 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-8 mb-10">
            <div className="md:col-span-5">
              <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">06 — ABOUT</div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">One person. Every line.</h2>
            </div>
            <div className="md:col-span-7 md:pt-12">
              <p className="text-white/70 text-base leading-relaxed">
                Backbone is a one-person studio run by Tyler — a tradesman who codes. Every line of code, every design decision, every client call: same person. No handoffs. No juniors. No agency markup. Just systems built right, by the person who&apos;s actually building them.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
            {[
              { label: 'ROLE', value: 'FOUNDER + BUILDER' },
              { label: 'BASED', value: 'INDIANAPOLIS, IN' },
              { label: 'BACKGROUND', value: 'HVAC + CODE' },
              { label: 'AVAILABILITY', value: '1 CLIENT/MO' },
            ].map((stat) => (
              <div key={stat.label} className="bg-black px-5 py-4">
                <div className="text-xs text-white/40 mb-1.5 tracking-widest font-mono">{stat.label}</div>
                <div className="text-xl md:text-2xl font-bold tabular-nums">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-white/10 px-6 md:px-12 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">07 — START</div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">Tell me what&apos;s broken.</h2>
          <p className="text-white/70 text-base mb-10">Every inquiry gets a real reply within 48 hours. No bots, no auto-responders.</p>

          {submitState === 'success' ? (
            <div className="border border-cyan-400/40 bg-cyan-400/5 p-6">
              <div className="text-xs tracking-[0.25em] text-cyan-400 mb-3 font-mono">✓ RECEIVED</div>
              <p className="text-cyan-400 text-lg font-bold">Got it. I&apos;ll reply within 48 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs tracking-widest text-white/50 block mb-2 font-mono">YOUR NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Operator"
                  disabled={submitState === 'submitting'}
                  className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs tracking-widest text-white/50 block mb-2 font-mono">BUSINESS + WHAT YOU DO</label>
                <input
                  type="text"
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  placeholder="Acme HVAC — residential service in Phoenix"
                  disabled={submitState === 'submitting'}
                  className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs tracking-widest text-white/50 block mb-2 font-mono">WHAT&apos;S NOT WORKING</label>
                <textarea
                  rows={3}
                  value={whatsBroken}
                  onChange={(e) => setWhatsBroken(e.target.value)}
                  placeholder="Wix site is slow, can't take payments, manually scheduling jobs..."
                  disabled={submitState === 'submitting'}
                  className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs tracking-widest text-white/50 block mb-2 font-mono">TIER</label>
                <input
                  type="text"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  placeholder="Foundation / Operator / Autopilot / Not sure"
                  disabled={submitState === 'submitting'}
                  className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs tracking-widest text-white/50 block mb-2 font-mono">BUDGET</label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="$10k / $25k / $50k+ / Open"
                  disabled={submitState === 'submitting'}
                  className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 disabled:opacity-50"
                />
              </div>

              {submitState === 'error' && errorMsg && (
                <div className="border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-400 font-mono">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitState === 'submitting'}
                className="bg-cyan-400 text-black px-6 py-3 text-sm font-bold tracking-widest inline-flex items-center gap-2 hover:bg-white transition mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitState === 'submitting' ? 'SENDING...' : 'SEND →'}
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 md:px-12 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <Image
                src="/backbone-lockup-white.png"
                alt="Backbone"
                width={140}
                height={32}
                className="h-8 w-auto"
              />
              <div className="text-xs text-white/40 mt-2">custom systems for forward-thinking businesses</div>
            </div>
            <div className="text-xs text-white/40 tracking-widest font-mono">
              <div>USEBACKBONE.COM</div>
              <div className="mt-0.5">© 2026 — BUILT ON PURPOSE. ENGINEERED TO LAST.</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
