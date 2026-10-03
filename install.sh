#!/usr/bin/env bash
# Zerra One-Line Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/sjsreehari/zerra/main/install.sh | bash
set -euo pipefail

ZERRA_REPO="https://github.com/sjsreehari/zerra"
ZERRA_DIR="${ZERRA_DIR:-$HOME/.zerra}"
COMPOSE_URL="https://raw.githubusercontent.com/sjsreehari/zerra/main/compose.yaml"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${GREEN}[zerra]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[warn]${RESET}  $*"; }
error()   { echo -e "${RED}[error]${RESET} $*" >&2; }
heading() { echo -e "\n${BOLD}── $* ──${RESET}"; }

# ─── Dependency checks ────────────────────────────────────────
heading "Checking prerequisites"

require() {
  if ! command -v "$1" &>/dev/null; then
    error "Required tool not found: $1"
    echo "  Install it from: $2"
    exit 1
  fi
  info "✓ $1 found"
}

require docker  "https://docs.docker.com/get-docker/"
require git     "https://git-scm.com/downloads"

# Check Docker daemon is running
if ! docker info &>/dev/null 2>&1; then
  error "Docker daemon is not running. Please start Docker Desktop and try again."
  exit 1
fi
info "✓ Docker daemon is running"

# ─── Install / update ─────────────────────────────────────────
heading "Setting up Zerra"

if [ -d "$ZERRA_DIR/.git" ]; then
  info "Found existing installation at $ZERRA_DIR — updating..."
  git -C "$ZERRA_DIR" pull --ff-only
else
  info "Cloning Zerra to $ZERRA_DIR ..."
  git clone --depth 1 "$ZERRA_REPO" "$ZERRA_DIR"
fi

cd "$ZERRA_DIR"

# ─── Create .env from example if missing ──────────────────────
if [ ! -f "$ZERRA_DIR/.env" ]; then
  heading "Configuring environment"
  cp "$ZERRA_DIR/.env.example" "$ZERRA_DIR/.env"
  # Generate secure random secrets
  JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))")
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ZERRA_DIR/.env"
  info "✓ Generated secure JWT secret"
  info "  .env created at $ZERRA_DIR/.env"
  warn "  Edit $ZERRA_DIR/.env to add GitHub credentials and optional API keys"
fi

# ─── Pull & start Docker Compose ──────────────────────────────
heading "Starting Zerra services"
docker compose -f "$ZERRA_DIR/compose.yaml" --env-file "$ZERRA_DIR/.env" pull --quiet 2>/dev/null || true
docker compose -f "$ZERRA_DIR/compose.yaml" --env-file "$ZERRA_DIR/.env" up -d --build --remove-orphans

# ─── Wait for dashboard to become healthy ─────────────────────
heading "Waiting for services to become healthy"
TIMEOUT=120
ELAPSED=0
printf "[zerra] Waiting for inference API"
while ! curl -sf http://localhost:8000/health &>/dev/null; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  printf "."
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo ""
    error "Timed out waiting for inference API (${TIMEOUT}s). Check: docker compose logs inference"
    exit 1
  fi
done
echo " ready!"

# ─── Install CLI ──────────────────────────────────────────────
heading "Installing Zerra CLI"
if command -v npm &>/dev/null; then
  if [ -f "$ZERRA_DIR/cli/package.json" ]; then
    cd "$ZERRA_DIR"
    npm install --silent 2>/dev/null || warn "npm install encountered warnings"
    info "✓ Zerra CLI available via: node $ZERRA_DIR/cli/src/index.ts"
  fi
else
  warn "npm not found — CLI install skipped. Install Node.js 18+ from https://nodejs.org to enable CLI."
fi

# ─── Done ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   Zerra is running!                          ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║                                              ║${RESET}"
echo -e "${BOLD}${GREEN}║  Dashboard: http://localhost:3000            ║${RESET}"
echo -e "${BOLD}${GREEN}║  API:       http://localhost:8000            ║${RESET}"
echo -e "${BOLD}${GREEN}║  Gateway:   http://localhost:8080            ║${RESET}"
echo -e "${BOLD}${GREEN}║                                              ║${RESET}"
echo -e "${BOLD}${GREEN}║  Stop:   docker compose stop                ║${RESET}"
echo -e "${BOLD}${GREEN}║  Logs:   docker compose logs -f              ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
echo ""
info "Next step: open http://localhost:3000 and log in to your dashboard."
info "Docs: $ZERRA_REPO#readme"
