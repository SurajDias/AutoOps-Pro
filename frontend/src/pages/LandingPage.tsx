import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Globe, Award, Activity } from 'lucide-react';
import { AutoOpsLogo } from '../components/ui/AutoOpsLogo';
import { Link } from 'react-router-dom';
import { HeroSequence } from '../components/landing/HeroSequence';
import { WorkspaceCardSwap } from '../components/landing/WorkspaceCardSwap';
import { WhyAutoOps } from '../components/landing/WhyAutoOps';
import { ArchitectureDiagram } from '../components/landing/ArchitectureDiagram';
import { ColorBends } from '../components/ui/ColorBends';
import { PixelGrid } from '../components/ui/PixelGrid';
import { WebThreads } from '../components/ui/WebThreads';
import Scanner from '../components/ui/Scanner';

// ─── Particles ───────────────────────────────────────────────
const particles = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  left: `${(i * 5.2) % 100}%`,
  delay: `${(i * 0.45).toFixed(1)}s`,
  duration: `${(7 + (i % 6)).toFixed(1)}s`,
  size: `${(1.5 + (i % 2.5)).toFixed(0)}px`,
}));

export const LandingPage: React.FC = () => {
  const [introComplete, setIntroComplete] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Session-based intro skip
  useEffect(() => {
    if (sessionStorage.getItem('autoops_intro_run') === 'true') setIntroComplete(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem('autoops_intro_run', 'true');
    setIntroComplete(true);
  };

  const scrollRatio = Math.min(1, scrollY / 600);

  // ─── Intro animation ────────────────────────────────────────
  if (!introComplete) {
    return (
      <div className="fixed inset-0 bg-background z-[999] flex items-center justify-center overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 grid-pattern opacity-[0.06]" />
        {/* Ambient radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,139,255,0.10),transparent_60%)]" />

        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 40 }}
          animate={{
            scale:   [0.5, 1.1, 1.0, 1.0, 0.92],
            opacity: [0, 1, 1, 1, 0],
            y:       [40, 0, -8, -20, -80],
            filter:  ['blur(20px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(12px)'],
          }}
          transition={{
            duration: 3.8,
            times: [0, 0.28, 0.6, 0.82, 1.0],
            ease: ['easeOut', 'easeOut', 'easeInOut', 'easeIn'],
          }}
          onAnimationComplete={handleIntroComplete}
          className="relative"
        >
          <h1 className="text-[clamp(3rem,12vw,9rem)] font-heading font-bold tracking-[0.2em] text-text-primary uppercase text-center pl-[0.2em] select-none">
            AUTOOPS PRO
          </h1>
          {/* Glow underline */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-background text-text-primary relative overflow-x-hidden"
    >
      {/* ─── Fixed background elements ─── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 50% 35%, rgba(79,139,255,${0.06 + scrollRatio * 0.10}) 0%, transparent 65%)`
        }}
      />
      <div className="fixed inset-0 grid-pattern opacity-[0.10] pointer-events-none z-0" />

      {/* Floating particles */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: 0.08 + scrollRatio * 0.25 }}
      >
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute bg-accent/60 rounded-full particle-item"
            style={{ left: p.left, bottom: '-10px', width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}
      </div>

      {/* ─── Navigation ─────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 ${
          scrollY > 40
            ? 'h-14 bg-background/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.03)]'
            : 'h-20 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <AutoOpsLogo
              size={28}
              className="transition-[filter] duration-300 ease-out group-hover:[filter:drop-shadow(0_0_5px_rgba(6,182,212,0.7))]"
            />
            <span className="text-base font-bold font-heading tracking-tight text-text-primary">
              AutoOps <span className="text-primary">Pro</span>
            </span>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium">
            {[
              { label: 'Workspace',    href: '#workspace' },
              { label: 'Comparison',   href: '#why-autoops' },
              { label: 'Architecture', href: '#architecture' },
              { label: 'About',        href: '#about' },
            ].map(l => (
              <a key={l.label} href={l.href} className="text-text-muted hover:text-text-primary transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
              Log in
            </Link>
            <Link
              to="/signup"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-background font-bold text-sm hover:shadow-neon hover:-translate-y-px transition-all"
            >
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Main content ────────────────────────────────────── */}
      <main className="relative z-10">

        {/* ═══ HERO SECTION ═══════════════════════════════════ */}
        <section className="relative min-h-screen pt-24 pb-12 flex flex-col items-center justify-center overflow-hidden">
          {/* React Bits Pixel Grid Background */}
          <PixelGrid />

          {/* Laptop sequence */}
          <div className="w-full max-w-6xl px-6 mb-6 relative z-10">
            <div className="absolute inset-0 bg-primary/[0.06] rounded-3xl blur-[100px] pointer-events-none" />
            <HeroSequence />
          </div>

          {/* Hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="text-center max-w-lg px-6 flex flex-col items-center relative z-10"
          >
            <p className="text-text-muted text-lg font-medium mb-8 tracking-wide">
              AI-Powered Autonomous Operations Engineer
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                to="/signup"
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-bold text-sm hover:shadow-neon hover:-translate-y-px transition-all"
              >
                Launch Platform <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => { document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-surface text-text-primary font-bold text-sm border border-white/[0.08] hover:border-primary/30 hover:bg-elevated transition-all"
              >
                View Demo
              </button>
            </div>
          </motion.div>
        </section>

        {/* ═══ WORKSPACE SECTION ══════════════════════════════ */}
        <section id="workspace" className="py-24 relative border-y border-white/[0.05] overflow-hidden bg-[#060E1E]">
          {/* ─── ColorBends animated background ─── */}
          <ColorBends
            color="#06B6D4"
            speed={0.1}
            frequency={1.2}
            noise={0.06}
            bandWidth={0.40}
            rotation={45}
            fadeTop={0.95}
            iterations={2}
            intensity={1.1}
          />
          {/* Dark gradient overlay — keeps text and cards legible */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(6,14,30,0.82) 0%, rgba(6,14,30,0.60) 40%, rgba(6,14,30,0.82) 100%)',
            }}
          />

          {/* ─── Two-column layout ─── */}
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div style={{ display: 'flex', alignItems: 'center', minHeight: 680, gap: 0 }}>

              {/* LEFT — copy */}
              <motion.div
                initial={{ opacity: 0, x: -28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                style={{ flex: '0 0 38%', paddingRight: 40, zIndex: 2 }}
              >
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.18)',
                  borderRadius: 6, padding: '4px 10px', marginBottom: 20,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px #38BDF8', display: 'inline-block' }} />
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#38BDF8', fontFamily: 'Inter, sans-serif' }}>Interactive Preview</span>
                </div>

                <h2 className="text-3xl md:text-5xl font-bold font-heading mb-5 text-text-primary tracking-tight leading-tight">
                  Inside<br />AutoOps Pro
                </h2>
                <p className="text-text-muted text-lg leading-relaxed mb-8">
                  Explore every module through interactive previews. Each card represents a live capability of the platform.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Live Telemetry',         color: '#10B981' },
                    { label: 'Anomaly Detection',       color: '#EF4444' },
                    { label: 'Root Cause Analysis',     color: '#A78BFA' },
                    { label: 'Predictive Intelligence', color: '#F59E0B' },
                    { label: 'AI Recommendations',      color: '#38BDF8' },
                  ].map(m => (
                    <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, boxShadow: `0 0 6px ${m.color}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.75)', fontFamily: 'Inter, sans-serif' }}>{m.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px #38BDF8', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.45)', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em' }}>
                    Hover to pause · auto-advances every 5s
                  </span>
                </div>
              </motion.div>

              {/* RIGHT — card stack anchored at bottom, fans upward */}
              <motion.div
                initial={{ opacity: 0, x: 28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.15 }}
                style={{ flex: 1, height: 640, position: 'relative', overflow: 'visible' }}
              >
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: 560, height: 400 }}>
                  <WorkspaceCardSwap />
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ═══ WHY AUTOOPS SECTION ════════════════════════════ */}
        <section id="why-autoops" className="py-28 relative overflow-hidden bg-[#060E1E] border-b border-white/[0.05]">
          {/* React Bits Web Threads background */}
          <WebThreads />
          {/* Dark gradient overlay — keeps table perfectly readable */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(6,14,30,0.85) 0%, rgba(6,14,30,0.70) 50%, rgba(6,14,30,0.85) 100%)',
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16 max-w-xl mx-auto"
            >
              <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-text-primary tracking-tight">
                Autonomous Over Legacy
              </h2>
              <p className="text-text-muted text-lg">
                Traditional dashboards react. AutoOps Pro predicts, explains, and remediates.
              </p>
            </motion.div>
            <WhyAutoOps />
          </div>
        </section>

        {/* ═══ ARCHITECTURE SECTION ═══════════════════════════ */}
        <section id="architecture" className="py-28 border-y border-white/[0.05] bg-bg-secondary/50 relative">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16 max-w-xl mx-auto"
            >
              <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-text-primary tracking-tight">
                Pipeline Architecture
              </h2>
              <p className="text-text-muted text-lg">
                High-throughput telemetry ingestion fed directly into diagnostic models.
              </p>
            </motion.div>
            <ArchitectureDiagram />
          </div>
        </section>

        {/* ═══ ABOUT SECTION ══════════════════════════════════ */}
        <section id="about" className="py-28 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

              {/* Left */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <h2 className="text-3xl md:text-5xl font-bold font-heading text-text-primary tracking-tight leading-tight">
                  Engineering the Future of Autonomic Operations
                </h2>
                <p className="text-text-muted text-lg leading-relaxed">
                  We are building an AI-powered operations intelligence platform. AutoOps Pro analyzes telemetry to detect anomalies, predict failures, identify root causes, and generate actionable insights.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: 'Our Mission', body: 'Help operations teams detect anomalies, understand incidents, and make faster, data-driven decisions.' },
                    { title: 'Our Vision',  body: 'A more intelligent and explainable operations workflow powered by predictive analytics and narrative intelligence.' },
                  ].map(card => (
                    <div key={card.title} className="p-5 rounded-2xl bg-surface border border-white/[0.06]">
                      <h3 className="font-heading font-semibold text-text-primary text-sm mb-2">{card.title}</h3>
                      <p className="text-text-muted text-xs leading-relaxed">{card.body}</p>
                    </div>
                  ))}
                </div>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-bold text-sm hover:shadow-neon hover:-translate-y-px transition-all"
                >
                  Try AutoOps Pro <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              {/* Right — stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-5"
              >
                <p className="text-[10px] text-text-muted uppercase tracking-widest">Prototype capability summary · not live operational telemetry</p>
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { icon: Shield, label: 'Telemetry modes', value: 'Live + Demo', color: '#4F8BFF' },
                    { icon: Globe, label: 'Incident records', value: 'PostgreSQL', color: '#63D6FF' },
                    { icon: Award, label: 'Detection', value: 'Hybrid scoring', color: '#4F8BFF' },
                    { icon: Activity, label: 'Decision support', value: 'What-if simulation', color: '#63D6FF' },
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="p-6 rounded-2xl bg-surface/70 border border-white/[0.06] flex flex-col justify-between h-40 shadow-glass">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                          <Icon className="w-4 h-4" style={{ color: stat.color }} />
                        </div>
                        <div>
                          <div className="text-xl font-heading font-bold text-text-primary mb-1">{stat.value}</div>
                          <div className="text-[10px] text-text-muted tracking-wider uppercase font-medium">{stat.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Telemetry card */}
                <div className="p-5 rounded-2xl bg-elevated/60 border border-white/[0.06] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/[0.08] rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-mono text-xs text-text-primary font-semibold">agent-telemetry-daemon</span>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted tracking-wider uppercase">Live</span>
                  </div>
                  <div className="font-mono text-[10px] text-text-muted space-y-1.5 leading-relaxed">
                    <div>[04:22:15] <span className="text-emerald-400">OK</span> Ingested CPU=22.4% MEM=54.1% LAT=8ms</div>
                    <div>[04:22:18] <span className="text-primary">INFO</span> Anomaly score: 0.02 (low)</div>
                    <div>[04:22:21] <span className="text-emerald-400">OK</span> All nodes healthy — cluster index 100%</div>
                    <div className="flex items-center gap-1"><span className="animate-blink text-accent">▋</span></div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══ CTA SECTION ════════════════════════════════════ */}
        <section className="py-32 relative overflow-hidden border-t border-white/[0.05] bg-[#060E1E]">
          {/* React Bits Scanner — WebGL scanning signal field (blue/cyan palette) */}
          <Scanner
            color1="#060E1E"
            color2="#06B6D4"
            color3="#38BDF8"
            speed={0.30}
            sweepSpeed={0.14}
            sweepWidth={1.8}
            sweepFalloff={5}
            scale={1.6}
            frequency={1.8}
            ripple={0.20}
            bandDensity={10}
            lineSharpness={5.0}
            glow={0.20}
            scanDirection="vertical"
            colorSpread={0.55}
            brightness={0.95}
            contrast={1.1}
            softness={1.5}
            vignette={0.50}
            scanline={false}
            grain={false}
            grainIntensity={0}
            opacity={0.85}
            mouseInteraction={false}
          />
          {/* Gradient overlay — preserves text contrast */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(6,14,30,0.55) 0%, rgba(6,14,30,0.88) 100%)',
            }}
          />
          <div className="max-w-3xl mx-auto px-6 text-center space-y-8 relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-bold font-heading text-text-primary tracking-tight leading-tight"
            >
              Ready to automate<br />your operations?
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex flex-col sm:flex-row justify-center items-center gap-3"
            >
              <Link
                to="/signup"
                className="flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-background font-bold text-sm hover:shadow-neon-lg hover:-translate-y-0.5 transition-all"
              >
                Launch Platform <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-12 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-text-muted">
          <div className="flex items-center gap-2.5">
            <AutoOpsLogo size={20} />
            <span className="font-heading font-bold text-text-primary text-sm tracking-tight">AutoOps Pro</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">GitHub</a>
            <a href="#architecture" className="hover:text-text-primary transition-colors">Documentation</a>
            <a href="#about" className="hover:text-text-primary transition-colors">About</a>
          </div>
          <div className="text-text-muted/60 text-xs">
            &copy; {new Date().getFullYear()} AutoOps Pro Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </motion.div>
  );
};
