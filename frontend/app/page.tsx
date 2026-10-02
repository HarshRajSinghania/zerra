"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Play,
  Terminal,
  ArrowRight,
  CheckCircle2,
  Lock,
  GitBranch,
  Search,
  Bug,
  Bell,
  MessageCircle,
  Mail,
  Users,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  Menu,
  X,
  Check,
  Flame,
  Award,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"sast" | "secrets" | "sca" | "iac" | "db">("sast");
  const [prSimulated, setPrSimulated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const demoData = {
    sast: {
      category: "SAST • SQL Injection (CWE-89)",
      file: "internal/db/users.go:42",
      vulnSnippet: `// Vulnerable: Unsanitized SQL string concatenation\nquery := "SELECT * FROM users WHERE id = '" + userID + "'"\nrow := db.QueryRow(query)`,
      fixSnippet: `// Remediation: Parameterized query placeholder ($1)\nrow := db.QueryRow("SELECT * FROM users WHERE id = $1", userID)`,
      explanation: "Zerra detected unparameterized user input in SQL statement. Verified patch replaces concatenation with safe positional argument and passes sandbox regression tests.",
      branch: "zerra/fix-cwe-89-users-go",
      severity: "CRITICAL",
      cvss: 9.8,
      sandbox: "Verified in Docker sandbox (go test ./... PASS)",
    },
    secrets: {
      category: "Secrets • Plaintext Stripe API Key (CWE-798)",
      file: "config/payments.py:14",
      vulnSnippet: `# Compromised: Hardcoded live Stripe secret key\nSTRIPE_SECRET_KEY = "sk_test_51NABC1234567890abcdefghijklmnopqrstuvwxyz"`,
      fixSnippet: `# Remediation: Load from secure environment variable\nimport os\nSTRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")`,
      explanation: "Live production credential exposed in source tree. Auto-PR migrates key to environment variable, updates .gitignore, and rotates secret.",
      branch: "zerra/fix-cwe-798-stripe-key",
      severity: "CRITICAL",
      cvss: 9.9,
      sandbox: "Verified in Docker sandbox (git apply --check PASS)",
    },
    sca: {
      category: "SCA • Vulnerable Dependency urllib3 (CVE-2023-45803)",
      file: "requirements.txt:18",
      vulnSnippet: `# Vulnerable: urllib3 < 2.0.7 leaks auth headers on redirect\nurllib3==1.26.15`,
      fixSnippet: `# Remediation: Upgrade to nearest safe patched release\nurllib3>=2.0.7`,
      explanation: "Known supply-chain CVE with public exploit. Auto-PR bumps package constraint and proves zero breaking changes by executing project test suite in sandbox.",
      branch: "zerra/fix-cve-2023-45803-urllib3",
      severity: "HIGH",
      cvss: 7.5,
      sandbox: "Verified in Docker sandbox (pytest -v PASS)",
    },
    iac: {
      category: "IaC & CI/CD • GitHub Actions Write-All Permissions (CWE-732)",
      file: ".github/workflows/deploy.yml:12",
      vulnSnippet: `# Insecure: Excessive workflow permissions grant write-all token\npermissions: write-all`,
      fixSnippet: `# Remediation: Apply principle of least privilege\npermissions:\n  contents: read\n  pull-requests: write\n  issues: write`,
      explanation: "Over-privileged CI/CD execution context flagged. Auto-PR scopes token permissions strictly to required pull-request and issue creation capabilities.",
      branch: "zerra/fix-actions-least-privilege",
      severity: "HIGH",
      cvss: 8.2,
      sandbox: "Verified in Docker sandbox (actionlint PASS)",
    },
    db: {
      category: "Database Audit • Missing Row-Level Security (CWE-284)",
      file: "db/migrations/20260901_orders.sql:28",
      vulnSnippet: `-- Missing tenant isolation policy on sensitive table\nCREATE TABLE customer_orders (\n  id UUID PRIMARY KEY,\n  tenant_id UUID NOT NULL,\n  amount DECIMAL\n);`,
      fixSnippet: `-- Hardening: Enable Row-Level Security (RLS) & tenant isolation\nALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;\nCREATE POLICY tenant_isolation ON customer_orders\n  USING (tenant_id = current_setting('app.current_tenant')::UUID);`,
      explanation: "Unenforced multi-tenant data boundary. Auto-PR enables PostgreSQL Row-Level Security and executes synthetic tenant isolation tests in throwaway DB sandbox.",
      branch: "zerra/fix-db-rls-tenant-isolation",
      severity: "CRITICAL",
      cvss: 9.1,
      sandbox: "Verified in Throwaway DB sandbox (pgTAP isolation PASS)",
    },
  };

  const currentDemo = demoData[activeTab];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] selection:bg-blue-500/30 selection:text-blue-200">
      {/* Ambient Radial Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-purple-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-[45%] left-1/4 w-[600px] h-[400px] bg-emerald-500/5 blur-[160px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                Z
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Zerra
              </span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Autonomous Security v2.0
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#demo" className="hover:text-white transition-colors">
              Auto-PR Engine
            </a>
            <a href="#notifications" className="hover:text-white transition-colors">
              Alert Channels
            </a>
            <a href="#compliance" className="hover:text-white transition-colors">
              SARIF & Compliance
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/sjsreehari/zerra"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-2 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <GitBranch size={14} />
              <span>GitHub</span>
            </a>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <span>Open Console</span>
              <ArrowRight size={13} />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.08] bg-[#09090b]/95 px-6 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-zinc-300">Features</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-zinc-300">Auto-PR Engine</a>
            <a href="#notifications" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-zinc-300">Alert Channels</a>
            <Link href="/dashboard" className="block text-sm text-blue-400 font-semibold">Open Console →</Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-medium text-blue-300 shadow-sm backdrop-blur-md">
          <Sparkles size={13} className="text-amber-400" />
          <span>Local-First · Self-Hosted Blue-Team Security</span>
          <span className="text-zinc-500">|</span>
          <span className="text-emerald-400">Isolated Docker Sandbox Proofs</span>
        </div>

        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            A Local-First,{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              Blue-Team Security Platform.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-300 max-w-3xl mx-auto leading-relaxed">
            Your personal security engineer, running strictly on your own workstation. Zerra provisions isolated Docker sandboxes, tests code across SAST, dependency supply chains, and databases, verifies every fix against your real test suite, and opens GitHub Pull Requests directly from your device.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-emerald-400" /> 100% Local-first (No SaaS Code Uploads)</span>
            <span>•</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-emerald-400" /> Blue-Team Defense Only</span>
            <span>•</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-emerald-400" /> Human-in-the-Loop PRs</span>
          </div>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/dashboard/repositories"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <GitBranch size={16} className="text-white" />
            <span>Connect Local Project</span>
            <ArrowRight size={15} />
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.2] text-white font-semibold text-sm transition-all"
          >
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Open Security Console</span>
          </Link>
        </div>

        {/* Multi-Channel Alerts Marquee */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-zinc-400">
          <span className="text-zinc-500">Integrated Delivery & Alert Channels:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <GitBranch size={13} /> GitHub Pull Requests
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <MessageCircle size={13} /> WhatsApp Cloud API
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Zap size={13} /> Discord Webhook
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Users size={13} /> Microsoft Teams
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Mail size={13} /> SMTP Email
          </span>
        </div>

        {/* Interactive Dual-Panel Auto-PR Engine Showcase */}
        <div id="demo" className="pt-12 text-left">
          <div className="rounded-2xl border border-white/[0.12] bg-[#121215]/90 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl overflow-hidden relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs font-mono text-zinc-400 ml-2">
                  zerra-verification-gate // sandbox-isolated
                </span>
              </div>

              {/* Selector Tabs */}
              <div className="flex flex-wrap items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                {[
                  { key: "sast", label: "1. SAST (SQLi)" },
                  { key: "secrets", label: "2. Secrets Leak" },
                  { key: "sca", label: "3. Supply Chain" },
                  { key: "iac", label: "4. IaC & CI/CD" },
                  { key: "db", label: "5. DB Security" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key as any);
                      setPrSimulated(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.key
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Screen: Vulnerability vs Auto-PR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Left Column: Finding Details */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame size={14} /> 1. Real-time Detection
                  </span>
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold">
                    CVSS {currentDemo.cvss} • {currentDemo.severity}
                  </span>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4 space-y-2.5">
                  <div className="text-zinc-400 text-[11px] flex items-center justify-between">
                    <span>{currentDemo.category}</span>
                    <code className="text-blue-400">{currentDemo.file}</code>
                  </div>
                  <pre className="text-red-300 bg-white/[0.02] p-3 rounded-lg border border-red-500/20 overflow-x-auto whitespace-pre-wrap">
                    {currentDemo.vulnSnippet}
                  </pre>
                  <p className="text-[11px] text-zinc-400 border-t border-white/[0.05] pt-2">
                    {currentDemo.explanation}
                  </p>
                </div>
              </div>

              {/* Right Column: Automated Fix PR */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch size={14} /> 2. Automated Remediation PR
                  </span>
                  <button
                    onClick={() => setPrSimulated(!prSimulated)}
                    className={`text-[11px] px-3 py-1 rounded-lg font-bold border transition-all ${
                      prSimulated
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {prSimulated ? "✓ PR Opened on GitHub" : "Click to Create PR 🚀"}
                  </button>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4 space-y-2.5">
                  <div className="text-zinc-400 text-[11px] flex items-center justify-between">
                    <span>Branch: <code className="text-emerald-400">{currentDemo.branch}</code></span>
                    <span className="text-emerald-400 font-bold">Base: main</span>
                  </div>
                  <pre className="text-emerald-300 bg-white/[0.02] p-3 rounded-lg border border-emerald-500/20 overflow-x-auto whitespace-pre-wrap">
                    {currentDemo.fixSnippet}
                  </pre>
                  <div className="text-[11px] text-zinc-400 border-t border-white/[0.05] pt-2 flex items-center justify-between">
                    <span>
                      Alert Status:{" "}
                      <strong className="text-emerald-400">
                        {prSimulated ? "Dispatched to WhatsApp & Discord" : "Ready to Dispatch"}
                      </strong>
                    </span>
                    <span className="text-blue-400">Auto-Remediated in 1.4s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Stage Verification Pipeline Architecture */}
        <div className="pt-20 text-left space-y-8">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              STRICT VERIFICATION GATEWAY
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              The 5-Stage Blue-Team Pipeline
            </h2>
            <p className="text-sm text-zinc-400">
              Nothing reaches GitHub until it has been synthesized, applied, tested, and proved inside a local, network-isolated Docker sandbox on your device.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
              <div className="text-xs font-mono font-bold text-blue-400">STAGE 01</div>
              <h4 className="text-sm font-bold text-white">1. Detect</h4>
              <p className="text-xs text-zinc-400">SAST AST patterns, secret entropy, Syft SBOM CVEs, and database audits run locally.</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
              <div className="text-xs font-mono font-bold text-amber-400">STAGE 02</div>
              <h4 className="text-sm font-bold text-white">2. Triage</h4>
              <p className="text-xs text-zinc-400">Deduplicates findings, evaluates CVSS severity, maps to CWE / OWASP Top 10, and applies policy.</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
              <div className="text-xs font-mono font-bold text-purple-400">STAGE 03</div>
              <h4 className="text-sm font-bold text-white">3. Synthesize Fix</h4>
              <p className="text-xs text-zinc-400">Generates minimal unified diff patch with confidence scoring via local Ollama or cloud LLM.</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
              <div className="text-xs font-mono font-bold text-emerald-400">STAGE 04 (GATE)</div>
              <h4 className="text-sm font-bold text-emerald-300">4. Sandbox Gate</h4>
              <p className="text-xs text-zinc-300">Docker container runs <code className="text-emerald-400 text-[11px]">git apply</code>, your test suite, and re-scans to prove fix with zero regressions.</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
              <div className="text-xs font-mono font-bold text-cyan-400">STAGE 05</div>
              <h4 className="text-sm font-bold text-white">5. Safe Delivery</h4>
              <p className="text-xs text-zinc-400">Creates local branch and opens a GitHub Pull Request or Issue from your machine. Never touches main.</p>
            </div>
          </div>
        </div>

        {/* 6 Pillars of Continuous Security */}
        <div id="features" className="pt-20 text-left space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              6 Deep Defense Layers
            </h2>
            <p className="text-sm text-zinc-400">
              Comprehensive blue-team coverage spanning code, dependencies, credentials, databases, infrastructure, and automated sandboxes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-blue-500/40 transition-all">
              <span className="p-3 rounded-xl bg-blue-500/10 text-blue-400 inline-block border border-blue-500/20">
                <Code2 size={20} />
              </span>
              <h3 className="text-base font-bold text-white">1. Code Security (SAST)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Powered by Semgrep and custom rules. Detects SQL injection, Command Injection, XSS, SSRF, Path Traversal, and Insecure Deserialization across Python, Go, TypeScript, and Java.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-amber-500/40 transition-all">
              <span className="p-3 rounded-xl bg-amber-500/10 text-amber-400 inline-block border border-amber-500/20">
                <ShieldAlert size={20} />
              </span>
              <h3 className="text-base font-bold text-white">2. Secrets & Git History</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Entropy analysis and 25+ pattern detectors catch live API keys, private keys, and tokens. Audits historical Git commits and automates migration to environment variables.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-emerald-500/40 transition-all">
              <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 inline-block border border-emerald-500/20">
                <Layers size={20} />
              </span>
              <h3 className="text-base font-bold text-white">3. Supply Chain & SCA</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Syft SBOM generation and real-time queries to OSV.dev across package.json, requirements.txt, go.mod, and Cargo.toml. Prepares and verifies safe version bumps.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-indigo-500/40 transition-all">
              <span className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 inline-block border border-indigo-500/20">
                <Cpu size={20} />
              </span>
              <h3 className="text-base font-bold text-white">4. Local Database Audits</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Audits local PostgreSQL, MySQL, MongoDB, Redis, and SQLite instances for default passwords, missing authentication, plaintext password fields, and unconfigured Row-Level Security.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-cyan-500/40 transition-all">
              <span className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 inline-block border border-cyan-500/20">
                <Lock size={20} />
              </span>
              <h3 className="text-base font-bold text-white">5. Isolated Docker Sandboxes</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Disposable app containers and throwaway databases seeded strictly with synthetic mock data. Runs with zero outbound internet access to prevent credential leakage.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-purple-500/40 transition-all">
              <span className="p-3 rounded-xl bg-purple-500/10 text-purple-400 inline-block border border-purple-500/20">
                <Award size={20} />
              </span>
              <h3 className="text-base font-bold text-white">6. IaC & CI/CD Pipeline Review</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Scans Dockerfiles for non-root enforcement and pinned hashes, checks Terraform and K8s manifests, and detects over-privileged write-all GitHub Actions tokens.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Channel Alerts Showcase Section */}
        <div id="notifications" className="pt-24 text-left space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Push Alerts Straight to Your Incident Channels
            </h2>
            <p className="text-sm text-zinc-400">
              When a critical vulnerability is pushed, your on-call engineering team is notified in seconds via their preferred communication channel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <MessageCircle size={18} /> WhatsApp Alerts
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct WhatsApp messages via Meta Cloud API with repository name, vulnerability count, and 1-click PR review links.
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Zap size={18} /> Discord Webhooks
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Rich color-coded embeds with severity badges, CVSS scores, code snippets, and author attribution.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-950/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Users size={18} /> Microsoft Teams
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Enterprise Adaptive Cards formatted with collapsible details, facts tables, and action buttons for SOC workflows.
              </p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Mail size={18} /> Email Reports
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Clean HTML security digests with executive posture summary and tabular findings sent via SMTP.
              </p>
            </div>
          </div>
        </div>

        {/* Local Credential Vault & Zero-Telemetry Privacy Guarantees */}
        <div id="compliance" className="pt-24 text-left space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-semibold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              ZERO-TELEMETRY GUARANTEE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Your Code & Credentials Never Leave Your Machine
            </h2>
            <p className="text-sm text-zinc-400">
              Zerra is engineered from the ground up for strict sovereign privacy, enterprise compliance, and zero cloud dependency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                <Lock size={20} />
              </div>
              <h3 className="text-base font-bold text-white">OS-Native Keychain Vault</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                GitHub PATs, SSH keys, and database credentials are stored in your operating system keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service).
              </p>
              <div className="text-[11px] text-zinc-500 font-mono">
                Fallback: AES-256-GCM + scrypt (0o600)
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Disposable Docker Sandboxes</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Every patch verification and test execution happens in disposable containers with synthetic mock data. Sandboxes run on an internal network bridge with zero outbound internet access.
              </p>
              <div className="text-[11px] text-emerald-400 font-mono">
                Automatic clean teardown on finish
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                <Award size={20} />
              </div>
              <h3 className="text-base font-bold text-white">Tamper-Evident Audit & SARIF</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generates OASIS SARIF v2.1.0 for GitHub Security tab integration, SPDX/CycloneDX SBOMs, and cryptographic hash-chained audit trails of every scan decision.
              </p>
              <div className="text-[11px] text-purple-400 font-mono">
                OWASP Top 10 & CWE mapped
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA Strip */}
        <div className="pt-24">
          <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-black p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-2xl">
            <div className="space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Secure Your Repositories Autonomously
              </h2>
              <p className="text-sm sm:text-base text-zinc-400">
                Connect your GitHub repository and let Zerra autonomously audit your code on every push and pull request.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/dashboard/repositories"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Connect Your First Repo
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-semibold text-sm transition-all"
              >
                Open Unified Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-10 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              Z
            </div>
            <span className="font-semibold text-zinc-300">Zerra Security</span>
            <span>• Autonomous Continuous Security & Auto-PR Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Console</Link>
            <Link href="/dashboard/repositories" className="hover:text-zinc-300 transition-colors">Repositories</Link>
            <Link href="/dashboard/scans" className="hover:text-zinc-300 transition-colors">Scans</Link>
            <Link href="/dashboard/findings" className="hover:text-zinc-300 transition-colors">Findings</Link>
            <Link href="/dashboard/notifications" className="hover:text-zinc-300 transition-colors">Notifications</Link>
            <a href="https://github.com/sjsreehari/zerra" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
