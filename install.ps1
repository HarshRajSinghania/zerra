# Zerra One-Line Installer for Windows (PowerShell)
# Usage: irm https://raw.githubusercontent.com/sjsreehari/zerra/main/install.ps1 | iex
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ZerraRepo  = "https://github.com/sjsreehari/zerra"
$ZerraDir   = if ($env:ZERRA_DIR) { $env:ZERRA_DIR } else { Join-Path $HOME ".zerra" }

function Write-Info($msg)    { Write-Host "[zerra] $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[warn]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "[error] $msg" -ForegroundColor Red; exit 1 }
function Write-Heading($msg) { Write-Host "`n── $msg ──" -ForegroundColor Cyan }

# ─── Dependency checks ────────────────────────────────────────
Write-Heading "Checking prerequisites"

function Require-Command($cmd, $url) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Err "Required tool not found: $cmd`n  Install from: $url"
    }
    Write-Info "✓ $cmd found"
}

Require-Command git    "https://git-scm.com/download/win"
Require-Command docker "https://docs.docker.com/desktop/install/windows-install/"

# Check Docker daemon
try {
    docker info 2>&1 | Out-Null
    Write-Info "✓ Docker daemon is running"
} catch {
    Write-Err "Docker daemon is not running. Start Docker Desktop and try again."
}

# ─── Install / update ─────────────────────────────────────────
Write-Heading "Setting up Zerra"

if (Test-Path (Join-Path $ZerraDir ".git")) {
    Write-Info "Found existing installation at $ZerraDir — updating..."
    git -C $ZerraDir pull --ff-only
} else {
    Write-Info "Cloning Zerra to $ZerraDir ..."
    git clone --depth 1 $ZerraRepo $ZerraDir
}

Set-Location $ZerraDir

# ─── Create .env from example if missing ──────────────────────
$envFile = Join-Path $ZerraDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Heading "Configuring environment"
    Copy-Item (Join-Path $ZerraDir ".env.example") $envFile
    
    # Generate secure random secrets
    $bytes = [byte[]]::new(32)
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $jwtSecret = [Convert]::ToBase64String($bytes)
    (Get-Content $envFile) -replace '^JWT_SECRET=.*', "JWT_SECRET=$jwtSecret" | Set-Content $envFile
    Write-Info "✓ Generated secure JWT secret"
    Write-Info "  .env created at $envFile"
    Write-Warn "  Edit $envFile to add GitHub credentials and optional API keys"
}

# ─── Pull & start Docker Compose ──────────────────────────────
Write-Heading "Starting Zerra services"
docker compose -f "$ZerraDir\compose.yaml" --env-file $envFile pull 2>&1 | Out-Null
docker compose -f "$ZerraDir\compose.yaml" --env-file $envFile up -d --build --remove-orphans

# ─── Wait for inference API health ────────────────────────────
Write-Heading "Waiting for services to become healthy"
$timeout = 120
$elapsed = 0
Write-Host -NoNewline "[zerra] Waiting for inference API"
while ($true) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { break }
    } catch {}
    Start-Sleep 2
    $elapsed += 2
    Write-Host -NoNewline "."
    if ($elapsed -ge $timeout) {
        Write-Host ""
        Write-Err "Timed out ($timeout s). Run: docker compose logs inference"
    }
}
Write-Host " ready!"

# ─── Done ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   Zerra is running!                          ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║                                              ║" -ForegroundColor Green
Write-Host "║  Dashboard: http://localhost:3000            ║" -ForegroundColor Green
Write-Host "║  API:       http://localhost:8000            ║" -ForegroundColor Green
Write-Host "║  Gateway:   http://localhost:8080            ║" -ForegroundColor Green
Write-Host "║                                              ║" -ForegroundColor Green
Write-Host "║  Stop:   docker compose stop                 ║" -ForegroundColor Green
Write-Host "║  Logs:   docker compose logs -f              ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Info "Next step: open http://localhost:3000 and log in to your dashboard."
Write-Info "Docs: $ZerraRepo#readme"
