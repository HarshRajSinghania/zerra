"use client";

import React, { useState } from "react";
import {
  Settings,
  ShieldCheck,
  Server,
  Zap,
  Check,
  Sliders,
  Lock,
  Cpu,
  Key,
  Database,
  FolderGit2,
  HardDrive,
} from "lucide-react";

export default function SettingsPage() {
  const [vaultBackend, setVaultBackend] = useState<"keychain" | "aes-gcm">("keychain");
  const [githubPat, setGithubPat] = useState("");
  const [zerraUrl, setZerraUrl] = useState("http://localhost:8000");
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:8080");
  const [llmProvider, setLlmProvider] = useState<"ollama" | "anthropic" | "openai">("ollama");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [llmModel, setLlmModel] = useState("llama3.2:latest");
  const [confidenceGate, setConfidenceGate] = useState(85);
  const [sandboxNetworkIsolated, setSandboxNetworkIsolated] = useState(true);
  const [syntheticDataOnly, setSyntheticDataOnly] = useState(true);
  const [autoPR, setAutoPR] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-800 to-black/80 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-emerald-400">
                Local-First Sovereign Security
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="h-6 w-6 text-text-primary" />
              Credential Vault & Engine Configuration
            </h1>
            <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
              Configure your local-first security platform. Your credentials, databases, and source code stay strictly on your workstation with zero cloud telemetry.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Encrypted Local Credential Vault */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Lock size={16} className="text-blue-500" />
              Encrypted Local Credential Vault
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Zero Telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Vault Storage Provider
              </label>
              <select
                value={vaultBackend}
                onChange={(e) => setVaultBackend(e.target.value as any)}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus"
              >
                <option value="keychain">OS Keychain (Windows Credential Manager / macOS / Linux)</option>
                <option value="aes-gcm">AES-256-GCM + scrypt Encrypted File (.zerra/vault.enc)</option>
              </select>
              <p className="text-[11px] text-text-muted mt-1">
                Secrets are decrypted in-memory only at the instant a GitHub PR or scan is dispatched.
              </p>
            </div>

            <div>
              <label className="block text-text-secondary font-medium mb-1">
                GitHub Fine-Grained PAT or Deploy Key
              </label>
              <input
                type="password"
                value={githubPat}
                onChange={(e) => setGithubPat(e.target.value)}
                placeholder="github_pat_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus font-mono"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Requires only `Contents: Write` & `Pull Requests: Write` scoped strictly to target repos.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Isolated Docker Sandbox Settings */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <HardDrive size={16} className="text-emerald-500" />
              Isolated Docker Sandbox Verification Gate
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Disposable Containers
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border-default">
              <div>
                <span className="font-semibold text-text-primary block">
                  Zero Outbound Network Access in Sandboxes
                </span>
                <span className="text-text-muted text-[11px]">
                  Containers run on an isolated Docker internal bridge with default egress blocked to prevent exfiltration.
                </span>
              </div>
              <input
                type="checkbox"
                checked={sandboxNetworkIsolated}
                onChange={(e) => setSandboxNetworkIsolated(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border-default">
              <div>
                <span className="font-semibold text-text-primary block">
                  Throwaway Databases Seeded Exclusively with Synthetic Data
                </span>
                <span className="text-text-muted text-[11px]">
                  Postgres, MySQL, MongoDB, and Redis instances run locally on synthetic mock fixtures—never real production data.
                </span>
              </div>
              <input
                type="checkbox"
                checked={syntheticDataOnly}
                onChange={(e) => setSyntheticDataOnly(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-semibold text-text-primary block">
                  Automated Pull Request Dispatch (Human in the Loop)
                </span>
                <span className="text-text-muted text-[11px]">
                  Verified patches open a PR for you to review and merge. Zerra never commits directly to main.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoPR}
                onChange={(e) => setAutoPR(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. AI Fix Engine & Confidence Gate */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Cpu size={16} className="text-purple-500" />
            AI Fix Engine & Confidence Scorer
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-text-secondary font-medium mb-1">
                LLM Inference Backend
              </label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value as any)}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus"
              >
                <option value="ollama">Local Ollama (100% Offline / Sovereign)</option>
                <option value="anthropic">Anthropic Claude API (Encrypted Key)</option>
                <option value="openai">OpenAI GPT-4o API (Encrypted Key)</option>
              </select>
              <span className="text-[11px] text-text-muted mt-1 block">
                Local Ollama ensures your proprietary source code never leaves your local network.
              </span>
            </div>

            <div>
              <label className="block text-text-secondary font-medium mb-1">
                {llmProvider === "ollama" ? "Ollama Endpoint URL" : "Model Identifier"}
              </label>
              <input
                type="text"
                value={llmProvider === "ollama" ? ollamaUrl : llmModel}
                onChange={(e) =>
                  llmProvider === "ollama" ? setOllamaUrl(e.target.value) : setLlmModel(e.target.value)
                }
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-text-secondary font-medium">
                  Autonomous PR Confidence Gate: {confidenceGate}%
                </label>
                <span className="text-[11px] text-text-muted">
                  High confidence (≥{confidenceGate}%) → Auto-PR • Low confidence → GitHub Issue
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                value={confidenceGate}
                onChange={(e) => setConfidenceGate(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 4. Local Core Services Endpoints */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Server size={16} className="text-cyan-500" />
            Local Service Endpoints
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Zerra Core Engine (FastAPI)
              </label>
              <input
                type="text"
                value={zerraUrl}
                onChange={(e) => setZerraUrl(e.target.value)}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus font-mono"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Reverse Proxy Gateway (Go Service)
              </label>
              <input
                type="text"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <Check size={14} /> Vault & Engine Settings Updated
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98]"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
