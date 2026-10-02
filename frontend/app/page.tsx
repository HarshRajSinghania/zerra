"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  Shield,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";

export default function HomePage() {
  // Accordion state for right column cards (top open by default like the reference)
  const [openCard, setOpenCard] = useState<"auto-pr" | "manual-fix" | "integrations" | "sandboxes">("auto-pr");
  const [fixedState, setFixedState] = useState(false);
  const [prCreated, setPrCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyInstallCmd = () => {
    navigator.clipboard.writeText("npx zerra init");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F8FA] text-[#111827] font-sans antialiased selection:bg-[#FF6B53] selection:text-white">
      {/* Top Navbar */}
      <header className="max-w-7xl mx-auto px-6 sm:px-10 pt-8 pb-6 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white text-xs font-black shadow-[2px_2px_0px_#FF6B53]">
            ●
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-black">
            zerra
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
          <a href="#how-it-works" className="hover:text-black transition-colors">
            How it works
          </a>
          <a href="#features" className="hover:text-black transition-colors">
            Local engine
          </a>
          <a href="#integrations" className="hover:text-black transition-colors">
            Integrations
          </a>
          <a href="https://github.com/sjsreehari/zerra" target="_blank" rel="noreferrer" className="hover:text-black transition-colors">
            Docs & Architecture
          </a>
        </nav>

        {/* Right CTA Links */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-neutral-700 hover:text-black px-2 py-1 transition-colors hidden sm:inline-block"
          >
            Local Console
          </Link>
          <a
            href="https://github.com/sjsreehari/zerra"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 text-xs font-bold text-black border-2 border-black rounded-xl bg-white shadow-[3px_3px_0px_#111] hover:shadow-[1px_1px_0px_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Star on GitHub
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 sm:px-10 pt-8 pb-24 space-y-12">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          {/* Giant Title */}
          <div className="lg:col-span-8">
            <h1 className="text-5xl sm:text-7xl lg:text-[84px] font-black text-black tracking-[-0.03em] leading-[1.02]">
              Security that <br />
              checks every commit
            </h1>
          </div>

          {/* Subtitle & Quick CTAs */}
          <div className="lg:col-span-4 space-y-5 pb-2">
            <p className="text-base sm:text-lg text-neutral-700 leading-relaxed font-normal">
              Your autonomous blue-team security engineer running strictly on your local machine. It tests every commit in isolated Docker sandboxes, fixes vulnerabilities with a 1-click button, and opens verified Pull Requests on push.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/dashboard"
                className="px-6 py-3.5 bg-black hover:bg-neutral-800 text-white font-bold text-sm rounded-xl shadow-[4px_4px_0px_#FF6B53] hover:shadow-[2px_2px_0px_#FF6B53] hover:translate-x-[2px] hover:translate-y-[2px] transition-all inline-flex items-center gap-2"
              >
                <span>Open Local Dashboard</span>
              </Link>

              <button
                onClick={copyInstallCmd}
                className="px-4 py-3.5 bg-white border-2 border-black text-black font-mono text-xs font-semibold rounded-xl shadow-[3px_3px_0px_#111] hover:shadow-[1px_1px_0px_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all inline-flex items-center gap-2"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>npx zerra init</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid (Matching the Reference UI Layout) */}
        <div id="features" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4">
          {/* Left Column: Big Feature Card (Like "Latest updates" card in reference image) */}
          <div className="lg:col-span-7 bg-white border-2 border-black rounded-[32px] p-7 sm:p-9 shadow-[6px_6px_0px_#111] space-y-6 flex flex-col justify-between min-h-[520px]">
            {/* Header with Title and Version */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-neutral-100 pb-3">
                <span className="text-sm font-bold uppercase tracking-wider text-black">
                  Local Commit Engine
                </span>
                <span className="text-xs font-mono font-bold text-neutral-400">
                  v. 2.4.0 • Sandbox Active
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
                  Checks code locally on every single commit
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
                  Every commit triggers disposable Docker containers on your machine. Zerra seeds throwaway databases with synthetic data, runs Semgrep SAST, scans dependencies, and verifies fixes with <code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-xs text-black border border-neutral-200">git apply --check</code> before anything touches production.
                </p>
              </div>
            </div>

            {/* Visual Isometric Stack / Sandbox Simulator */}
            <div className="relative my-4 p-5 bg-[#F8F8FA] border-2 border-black rounded-2xl shadow-[4px_4px_0px_#111] overflow-hidden space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-500 border-b border-neutral-200 pb-2">
                <span className="flex items-center gap-1.5 text-black font-bold">
                  <GitCommit size={14} className="text-[#FF6B53]" />
                  commit 8f2b41c (feat: checkout endpoint)
                </span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold border border-emerald-300">
                  ● Sandbox: All Tests Passed
                </span>
              </div>

              {/* Layer 1: SAST Finding */}
              <div className="p-3 bg-white border border-neutral-300 rounded-xl space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-red-600 font-bold">SAST • SQL Injection (CWE-89)</span>
                  <span className="text-neutral-400">internal/db/users.go:42</span>
                </div>
                <div className="text-neutral-700 bg-red-50/60 p-2 rounded border border-red-200 text-[11px] overflow-x-auto">
                  <span className="text-red-500 line-through">- query := &quot;SELECT * FROM users WHERE id = &apos;&quot; + id + &quot;&apos;&quot;</span>
                  <br />
                  <span className="text-emerald-600 font-bold">+ row := db.QueryRow(&quot;SELECT * FROM users WHERE id = $1&quot;, id)</span>
                </div>
              </div>

              {/* Layer 2: Verification Status */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="flex items-center gap-1.5 text-neutral-600">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Isolated network bridge (zero internet outbound)
                </span>
                <span className="font-mono text-[11px] text-neutral-400">0 regressions</span>
              </div>
            </div>

            {/* Read full documentation footer link */}
            <div className="pt-2">
              <a
                href="https://github.com/sjsreehari/zerra"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-black group hover:text-[#FF6B53] transition-colors"
              >
                <span className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center group-hover:bg-[#FF6B53] group-hover:text-white transition-all">
                  <ArrowUpRight size={14} />
                </span>
                <span>Read complete system architecture</span>
              </a>
            </div>
          </div>

          {/* Right Column: Stacked Cards (Matching the Red Card + White Accordion in reference) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Card 1: Vibrant Coral Accent Card (Like "Send money" card in reference image) */}
            <div
              className="bg-[#FF6B53] text-white border-2 border-black rounded-[32px] p-7 shadow-[6px_6px_0px_#111] transition-all cursor-pointer"
              onClick={() => setOpenCard(openCard === "auto-pr" ? ("" as any) : "auto-pr")}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  Auto-PR on Push to Prod
                </h3>
                <button
                  type="button"
                  aria-label="Toggle Auto-PR details"
                  className="w-10 h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center shadow-[2px_2px_0px_#111] hover:scale-105 transition-transform shrink-0"
                >
                  {openCard === "auto-pr" ? <Minus size={18} /> : <Plus size={18} />}
                </button>
              </div>

              {openCard === "auto-pr" && (
                <div className="pt-4 space-y-4 text-white/95 text-sm leading-relaxed">
                  <p>
                    When code is pushed toward main or production branches, Zerra autonomously verifies all proposed fixes inside isolated Docker sandboxes and creates a formatted GitHub Pull Request for human review.
                  </p>

                  <div className="p-3 bg-black/20 border border-black/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span>Branch: <code className="text-yellow-200">zerra/fix-cwe-89</code></span>
                      <span className="font-bold text-white bg-black/40 px-2 py-0.5 rounded">Target: main</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrCreated(!prCreated);
                      }}
                      className="w-full py-2 bg-white text-black font-bold text-xs rounded-lg border-2 border-black shadow-[2px_2px_0px_#111] hover:bg-neutral-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      <GitPullRequest size={14} />
                      <span>{prCreated ? "✓ Pull Request Opened on GitHub!" : "Simulate Auto-PR Dispatch"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: 1-Click Manual Fix Button (Like "Recieve money" in reference image) */}
            <div
              className="bg-white border-2 border-black rounded-[32px] p-6 shadow-[6px_6px_0px_#111] transition-all cursor-pointer"
              onClick={() => setOpenCard(openCard === "manual-fix" ? ("" as any) : "manual-fix")}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight text-black">
                  1-Click Manual Fix Button
                </h3>
                <button
                  type="button"
                  aria-label="Toggle Manual Fix details"
                  className="w-10 h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center shadow-[2px_2px_0px_#111] hover:scale-105 transition-transform shrink-0"
                >
                  {openCard === "manual-fix" ? <Minus size={18} /> : <Plus size={18} />}
                </button>
              </div>

              {openCard === "manual-fix" && (
                <div className="pt-4 space-y-3 text-neutral-600 text-xs leading-relaxed border-t border-neutral-100 mt-3">
                  <p>
                    Prefer manual control? Browse findings in your local dashboard and click the <strong className="text-black">Apply Fix</strong> button. Zerra writes the unified patch directly to your working tree and commits it to a clean branch.
                  </p>

                  <div className="p-3 bg-[#F8F8FA] border-2 border-black rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-red-600 font-bold">Stripe Key Exposed (CWE-798)</span>
                      <span className="text-neutral-400">config/payments.py</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFixedState(!fixedState);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg border-2 border-black shadow-[2px_2px_0px_#111] transition-all flex items-center justify-center gap-1.5"
                    >
                      <Zap size={14} className="text-amber-300" />
                      <span>{fixedState ? "✓ Patch Applied & Committed Locally" : "Click 'Apply Fix' Button"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: WhatsApp, Discord & Slack Integration (Like "Cashback" in reference image) */}
            <div
              className="bg-white border-2 border-black rounded-[32px] p-6 shadow-[6px_6px_0px_#111] transition-all cursor-pointer"
              onClick={() => setOpenCard(openCard === "integrations" ? ("" as any) : "integrations")}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight text-black">
                  WhatsApp, Discord & Slack Alerts
                </h3>
                <button
                  type="button"
                  aria-label="Toggle Integrations details"
                  className="w-10 h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center shadow-[2px_2px_0px_#111] hover:scale-105 transition-transform shrink-0"
                >
                  {openCard === "integrations" ? <Minus size={18} /> : <Plus size={18} />}
                </button>
              </div>

              {openCard === "integrations" && (
                <div className="pt-4 space-y-3 text-neutral-600 text-xs leading-relaxed border-t border-neutral-100 mt-3">
                  <p>
                    Instant multi-channel push notifications when critical vulnerabilities are found, with direct 1-click PR review links.
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-center">
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                      WhatsApp Cloud
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold">
                      Discord Webhook
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                      Slack Webhook
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom 3-Column Highlights Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Box 1 */}
          <div className="bg-white border-2 border-black rounded-[28px] p-6 shadow-[5px_5px_0px_#111] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#FF6B53]">
              <Lock size={18} />
            </div>
            <h4 className="text-lg font-bold text-black">100% Local-First</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Your source code, databases, and credentials never touch external SaaS clouds. Everything executes inside your local Docker daemon.
            </p>
          </div>

          {/* Box 2 */}
          <div className="bg-white border-2 border-black rounded-[28px] p-6 shadow-[5px_5px_0px_#111] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#FF6B53]">
              <ShieldCheck size={18} />
            </div>
            <h4 className="text-lg font-bold text-black">Blue-Team Defense Only</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Strictly find, fix, and prove. No dangerous exploitation scripts or offensive tooling. Verified fixes pass real tests and linters.
            </p>
          </div>

          {/* Box 3 */}
          <div className="bg-white border-2 border-black rounded-[28px] p-6 shadow-[5px_5px_0px_#111] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#FF6B53]">
              <GitBranch size={18} />
            </div>
            <h4 className="text-lg font-bold text-black">Human in the Loop</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Every automated patch arrives as an authored Pull Request or GitHub Issue. Zerra never pushes directly to your default branch.
            </p>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="bg-black text-white border-2 border-black rounded-[36px] p-8 sm:p-12 shadow-[8px_8px_0px_#FF6B53] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Ready to secure your local repositories?
            </h3>
            <p className="text-sm text-neutral-400 max-w-xl">
              Install the Zerra CLI or start the local web console at <code className="text-[#FF6B53] font-mono">http://localhost:3000</code>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="px-7 py-3.5 bg-[#FF6B53] text-white font-bold text-sm rounded-xl border-2 border-white shadow-[3px_3px_0px_#FFFFFF] hover:shadow-[1px_1px_0px_#FFFFFF] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Open Dashboard
            </Link>
          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-mono">
          <div>
            © 2026 Zerra Security Platform. Open source under GPL-3.0.
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/sjsreehari/zerra" target="_blank" rel="noreferrer" className="hover:text-black transition-colors">
              GitHub
            </a>
            <Link href="/dashboard" className="hover:text-black transition-colors">
              Dashboard
            </Link>
            <a href="https://github.com/sjsreehari/zerra/blob/main/docs/ARCHITECTURE.md" target="_blank" rel="noreferrer" className="hover:text-black transition-colors">
              Architecture Spec
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
